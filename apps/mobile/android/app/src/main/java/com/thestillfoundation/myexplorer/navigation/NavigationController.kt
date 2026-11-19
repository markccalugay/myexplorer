package com.thestillfoundation.myexplorer.navigation

import android.Manifest
import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.thestillfoundation.myexplorer.BuildConfig
import java.util.UUID
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.abs

/**
 * Coordinates Google Navigation SDK lifecycle, main-thread serialized mutations,
 * route-replacement feed teardown, and recoverable guidance-feed registration.
 */
object NavigationController {
  private val operationSeq = AtomicLong(0L)

  @Volatile
  private var dispatcher: MainThreadDispatcher = AndroidMainThreadDispatcher

  @Volatile
  private var navigatorHandle: NavigatorHandle? = null

  @Volatile
  private var sdkListenersRegistered = false

  @Volatile
  private var guidanceFeedRegistered = false

  @Volatile
  private var activeRouteOpId: Long = 0L

  @Volatile
  private var activeEnv: NavigationEnvironment? = null

  @Volatile
  internal var environmentFactory: ((Context) -> NavigationEnvironment)? = null

  fun hasPreciseLocationPermission(context: Context): Boolean =
    ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
      PackageManager.PERMISSION_GRANTED

  internal fun configureForTest(testDispatcher: MainThreadDispatcher) {
    dispatcher = testDispatcher
    navigatorHandle = null
    sdkListenersRegistered = false
    guidanceFeedRegistered = false
    activeRouteOpId = 0L
    operationSeq.set(0L)
  }

  internal fun resetForProd() {
    dispatcher = AndroidMainThreadDispatcher
    environmentFactory = null
  }

  private fun resolveEnvironment(context: Context): NavigationEnvironment? {
    environmentFactory?.let { return it(context) }
    val app = context.applicationContext as? Application ?: return activeEnv
    return AndroidNavigationEnvironment(app, null)
  }

  fun startTripNavigation(
    application: Application,
    activity: Activity?,
    tripId: String,
    tripName: String,
    stops: List<NavStop>,
    onComplete: (Result<NavigationSessionSnapshot>) -> Unit,
  ) {
    NavigationSessionRepository.init(application)
    startTripNavigationWithEnv(
      env = AndroidNavigationEnvironment(application, activity),
      tripId = tripId,
      tripName = tripName,
      stops = stops,
      onComplete = onComplete,
    )
  }

  internal fun startTripNavigationWithEnv(
    env: NavigationEnvironment,
    tripId: String,
    tripName: String,
    stops: List<NavStop>,
    onComplete: (Result<NavigationSessionSnapshot>) -> Unit,
  ) {
    if (stops.size < 2) {
      val msg = "At least two stops (start and destination) are required to start navigation."
      NavigationSessionRepository.update { it.copy(lastError = msg) }
      onComplete(Result.failure(IllegalArgumentException(msg)))
      return
    }

    if (!env.hasPreciseLocationPermission()) {
      val msg = "Precise location permission (ACCESS_FINE_LOCATION) is required before starting navigation."
      NavigationSessionRepository.update {
        it.clearGuidanceFields().copy(
          status = NavigationSessionStatus.PAUSED,
          lastError = msg,
        )
      }
      onComplete(Result.failure(SecurityException(msg)))
      return
    }

    val opId = operationSeq.incrementAndGet()
    val sessionId = "nav-${UUID.randomUUID().toString().take(8)}"

    NavigationSessionRepository.update {
      NavigationSessionSnapshot(
        sessionId = sessionId,
        tripId = tripId,
        tripName = tripName,
        status = NavigationSessionStatus.PREPARING,
        stops = stops,
        currentStopIndex = 1,
        currentLegIndex = 0,
        guidanceFeedRegistered = false,
        lastError = null,
      )
    }

    dispatcher.post {
      if (!isOperationCurrent(opId, sessionId)) {
        onComplete(Result.failure(IllegalStateException("Navigation start was cancelled.")))
        return@post
      }

      // Tear down any previous route/guidance feed before initializing a replacement trip
      teardownPreviousRouteOnMainThread(env)

      ensureNavigator(env) { navResult ->
        if (!isOperationCurrent(opId, sessionId)) {
          onComplete(Result.failure(IllegalStateException("Navigation start was superseded or ended.")))
          return@ensureNavigator
        }

        navResult.onFailure { err ->
          val message = err.message ?: "Navigation SDK initialization failed."
          NavigationSessionRepository.update {
            if (it.sessionId == sessionId) {
              it.clearGuidanceFields().copy(
                status = NavigationSessionStatus.PAUSED,
                guidanceFeedRegistered = false,
                lastError = message,
              )
            } else {
              it
            }
          }
          onComplete(Result.failure(err))
        }.onSuccess { nav ->
          val waypoints = stops.drop(1)
          nav.setDestinations(waypoints) { routeStatus ->
            if (!isOperationCurrent(opId, sessionId)) {
              onComplete(Result.failure(IllegalStateException("Navigation route callback ignored; session ended or superseded.")))
              return@setDestinations
            }

            if (routeStatus != SdkRouteStatus.OK) {
              val msg = "Route calculation failed: $routeStatus"
              NavigationSessionRepository.update {
                if (it.sessionId == sessionId) {
                  it.clearGuidanceFields().copy(
                    status = NavigationSessionStatus.PAUSED,
                    guidanceFeedRegistered = false,
                    lastError = msg,
                  )
                } else {
                  it
                }
              }
              onComplete(Result.failure(IllegalStateException(msg)))
              return@setDestinations
            }

            activateGuidanceSession(env, nav, opId, sessionId, onComplete)
          }
        }
      }
    }
  }

  fun pauseNavigation(context: Context): NavigationSessionSnapshot {
    return pauseNavigationWithEnv(resolveEnvironment(context))
  }

  internal fun pauseNavigationWithEnv(env: NavigationEnvironment?): NavigationSessionSnapshot {
    operationSeq.incrementAndGet()
    activeRouteOpId = 0L
    dispatcher.post {
      navigatorHandle?.stopGuidance()
      navigatorHandle?.unregisterGuidanceFeed()
      guidanceFeedRegistered = false
      env?.stopForegroundService()
    }
    return NavigationSessionRepository.update {
      if (it.status.isRunnable()) {
        it.clearGuidanceFields().copy(
          status = NavigationSessionStatus.PAUSED,
          guidanceFeedRegistered = false,
        )
      } else {
        it
      }
    }
  }

  fun resumeNavigation(application: Application, activity: Activity?): NavigationSessionSnapshot {
    NavigationSessionRepository.init(application)
    return resumeNavigationWithEnv(AndroidNavigationEnvironment(application, activity)) {}
  }

  internal fun resumeNavigationWithEnv(
    env: NavigationEnvironment,
    onComplete: (Result<NavigationSessionSnapshot>) -> Unit,
  ): NavigationSessionSnapshot {
    val current = NavigationSessionRepository.snapshot()
    if (current.stops.size < 2 ||
      current.status == NavigationSessionStatus.ABANDONED ||
      current.status == NavigationSessionStatus.COMPLETED ||
      current.status == NavigationSessionStatus.IDLE
    ) {
      val msg = "No paused or active navigation session is available to resume."
      val unchanged = NavigationSessionRepository.update { it.copy(lastError = msg) }
      onComplete(Result.failure(IllegalStateException(msg)))
      return unchanged
    }

    if (!env.hasPreciseLocationPermission()) {
      val msg = "Precise location permission is required to resume navigation."
      val paused = NavigationSessionRepository.update {
        it.clearGuidanceFields().copy(
          status = NavigationSessionStatus.PAUSED,
          guidanceFeedRegistered = false,
          lastError = msg,
        )
      }
      onComplete(Result.failure(SecurityException(msg)))
      return paused
    }

    val opId = operationSeq.incrementAndGet()
    val sessionId = current.sessionId
    val updated = NavigationSessionRepository.update {
      it.clearGuidanceFields().copy(
        status = NavigationSessionStatus.RECONNECTING,
        guidanceFeedRegistered = false,
        lastError = null,
      )
    }

    dispatcher.post {
      if (!isOperationCurrent(opId, sessionId)) {
        onComplete(Result.failure(IllegalStateException("Resume cancelled.")))
        return@post
      }

      teardownPreviousRouteOnMainThread(env)

      ensureNavigator(env) { res ->
        if (!isOperationCurrent(opId, sessionId)) {
          onComplete(Result.failure(IllegalStateException("Resume superseded or ended.")))
          return@ensureNavigator
        }

        res.onSuccess { nav ->
          val remainingStops = updated.stops.drop(updated.currentStopIndex.coerceAtLeast(1))
          if (remainingStops.isEmpty()) {
            onComplete(Result.failure(IllegalStateException("No remaining stops to resume.")))
            return@onSuccess
          }
          nav.setDestinations(remainingStops) { routeStatus ->
            if (!isOperationCurrent(opId, sessionId)) {
              onComplete(Result.failure(IllegalStateException("Resume route callback ignored.")))
              return@setDestinations
            }
            if (routeStatus == SdkRouteStatus.OK) {
              activateGuidanceSession(env, nav, opId, sessionId, onComplete)
            } else {
              val msg = "Reconnect route failed: $routeStatus"
              val paused = NavigationSessionRepository.update {
                if (it.sessionId == sessionId) {
                  it.clearGuidanceFields().copy(
                    status = NavigationSessionStatus.PAUSED,
                    guidanceFeedRegistered = false,
                    lastError = msg,
                  )
                } else {
                  it
                }
              }
              onComplete(Result.failure(IllegalStateException(msg)))
            }
          }
        }.onFailure { err ->
          NavigationSessionRepository.update {
            if (it.sessionId == sessionId) {
              it.clearGuidanceFields().copy(
                status = NavigationSessionStatus.PAUSED,
                guidanceFeedRegistered = false,
                lastError = err.message,
              )
            } else {
              it
            }
          }
          onComplete(Result.failure(err))
        }
      }
    }
    return updated
  }

  fun stopNavigation(context: Context): NavigationSessionSnapshot {
    return stopNavigationWithEnv(resolveEnvironment(context))
  }

  fun simulateCurrentRouteForDebug(speedMultiplier: Float): Boolean {
    if (!BuildConfig.DEBUG) return false
    val nav = navigatorHandle ?: return false
    dispatcher.post {
      runCatching { nav.simulateLocationsAlongExistingRoute(speedMultiplier) }
    }
    return true
  }

  fun setSimulatedLocationForDebug(lat: Double, lng: Double): Boolean {
    if (!BuildConfig.DEBUG) return false
    val nav = navigatorHandle ?: return false
    dispatcher.post {
      runCatching { nav.setSimulatedLocation(lat, lng) }
    }
    return true
  }

  internal fun stopNavigationWithEnv(env: NavigationEnvironment?): NavigationSessionSnapshot {
    operationSeq.incrementAndGet()
    activeRouteOpId = 0L
    dispatcher.post {
      navigatorHandle?.stopGuidance()
      navigatorHandle?.clearDestinations()
      navigatorHandle?.unregisterGuidanceFeed()
      guidanceFeedRegistered = false
      env?.stopForegroundService()
    }
    return NavigationSessionRepository.update {
      it.clearGuidanceFields().copy(
        status = NavigationSessionStatus.ABANDONED,
        remainingDistanceMeters = 0,
        remainingDurationSeconds = 0,
        finalRemainingDistanceMeters = 0,
        finalRemainingDurationSeconds = 0,
        isRerouting = false,
        needsNavigatorReconnect = false,
        guidanceFeedRegistered = false,
      )
    }
  }

  private fun activateGuidanceSession(
    env: NavigationEnvironment,
    nav: NavigatorHandle,
    opId: Long,
    sessionId: String,
    onComplete: (Result<NavigationSessionSnapshot>) -> Unit,
  ) {
    if (!isOperationCurrent(opId, sessionId)) {
      onComplete(Result.failure(IllegalStateException("Session ended before activation.")))
      return
    }

    activeEnv = env
    ensureSdkListenersRegistered(nav)

    // Register guidance feed before claiming ACTIVE; failure leaves session recoverable (PAUSED).
    if (!guidanceFeedRegistered) {
      NavigationSessionRepository.beginFeedRegistration()
      guidanceFeedRegistered = nav.registerGuidanceFeed()
      if (!guidanceFeedRegistered) {
        NavigationSessionRepository.invalidateFeedGeneration()
      }
    }

    if (!guidanceFeedRegistered) {
      val msg = "Turn-by-turn guidance feed registration failed. Retry to reconnect."
      NavigationSessionRepository.update {
        if (it.sessionId == sessionId) {
          it.clearGuidanceFields().copy(
            status = NavigationSessionStatus.PAUSED,
            guidanceFeedRegistered = false,
            lastError = msg,
          )
        } else {
          it
        }
      }
      onComplete(Result.failure(IllegalStateException(msg)))
      return
    }

    val serviceResult = env.startForegroundService()
    if (serviceResult.isFailure) {
      nav.unregisterGuidanceFeed()
      NavigationSessionRepository.invalidateFeedGeneration()
      guidanceFeedRegistered = false
      val msg = "Foreground navigation service could not start: ${serviceResult.exceptionOrNull()?.message}"
      NavigationSessionRepository.update {
        if (it.sessionId == sessionId) {
          it.clearGuidanceFields().copy(
            status = NavigationSessionStatus.PAUSED,
            guidanceFeedRegistered = false,
            lastError = msg,
          )
        } else {
          it
        }
      }
      onComplete(Result.failure(serviceResult.exceptionOrNull() ?: IllegalStateException(msg)))
      return
    }

    activeRouteOpId = opId
    nav.setVoiceGuidanceEnabled()
    nav.startGuidance()
    val active = NavigationSessionRepository.update {
      if (it.sessionId == sessionId) {
        it.copy(
          status = NavigationSessionStatus.ACTIVE,
          needsNavigatorReconnect = false,
          guidanceFeedRegistered = true,
          lastError = null,
        )
      } else {
        it
      }
    }
    onComplete(Result.success(active))
  }

  private fun teardownPreviousRouteOnMainThread(env: NavigationEnvironment) {
    activeRouteOpId = 0L
    NavigationSessionRepository.invalidateFeedGeneration()
    navigatorHandle?.stopGuidance()
    navigatorHandle?.clearDestinations()
    if (guidanceFeedRegistered) {
      navigatorHandle?.unregisterGuidanceFeed()
      guidanceFeedRegistered = false
    }
    env.stopForegroundService()
  }

  private fun isOperationCurrent(opId: Long, sessionId: String): Boolean {
    if (operationSeq.get() != opId) return false
    val snap = NavigationSessionRepository.snapshot()
    return snap.sessionId == sessionId && snap.status.isRunnable()
  }

  private fun ensureNavigator(
    env: NavigationEnvironment,
    callback: (Result<NavigatorHandle>) -> Unit,
  ) {
    val existing = navigatorHandle
    if (existing != null) {
      callback(Result.success(existing))
      return
    }

    val acquire = {
      env.acquireNavigator { result ->
        result.onSuccess { nav ->
          navigatorHandle = nav
        }
        callback(result)
      }
    }

    if (env.areTermsAccepted()) {
      acquire()
    } else {
      env.showTermsDialog("MyExplorer Navigation") { accepted ->
        if (accepted) {
          acquire()
        } else {
          callback(Result.failure(IllegalStateException("Navigation terms were declined.")))
        }
      }
    }
  }

  private fun ensureSdkListenersRegistered(nav: NavigatorHandle) {
    if (sdkListenersRegistered) return
    sdkListenersRegistered = true

    nav.setArrivalListener { arrivalInfo ->
      val current = NavigationSessionRepository.snapshot()
      val boundOpId = activeRouteOpId
      if (boundOpId == 0L || boundOpId != operationSeq.get()) return@setArrivalListener
      if (!current.status.isGuidanceReady()) return@setArrivalListener

      val expectedStop = current.stops.getOrNull(current.currentStopIndex) ?: return@setArrivalListener
      if (!arrivalMatchesStop(arrivalInfo, expectedStop)) {
        return@setArrivalListener
      }

      val nextStopIndex = current.currentStopIndex + 1
      if (nextStopIndex >= current.stops.size) {
        nav.stopGuidance()
        nav.unregisterGuidanceFeed()
        NavigationSessionRepository.invalidateFeedGeneration()
        guidanceFeedRegistered = false
        activeRouteOpId = 0L
        activeEnv?.stopForegroundService()
        NavigationSessionRepository.update {
          if (!it.status.isGuidanceReady() || it.sessionId != current.sessionId) return@update it
          it.clearGuidanceFields().copy(
            status = NavigationSessionStatus.COMPLETED,
            nextInstructionText = "Arrived at destination",
            remainingDistanceMeters = 0,
            remainingDurationSeconds = 0,
            finalRemainingDistanceMeters = 0,
            finalRemainingDurationSeconds = 0,
            isRerouting = false,
            guidanceFeedRegistered = false,
          )
        }
      } else {
        nav.continueToNextDestination()
        NavigationSessionRepository.update {
          if (!it.status.isGuidanceReady() || it.sessionId != current.sessionId) return@update it
          it.clearGuidanceFields().copy(
            currentStopIndex = nextStopIndex,
            currentLegIndex = it.currentLegIndex + 1,
            nextInstructionText = "Continuing to ${current.stops[nextStopIndex].name}",
          )
        }
      }
    }

    nav.setTimeDistanceListener {
      val current = NavigationSessionRepository.snapshot()
      val boundOpId = activeRouteOpId
      if (boundOpId == 0L || boundOpId != operationSeq.get()) return@setTimeDistanceListener
      if (!current.status.isGuidanceReady()) return@setTimeDistanceListener
      val (meters, seconds) = nav.currentTimeAndDistance() ?: return@setTimeDistanceListener
      NavigationSessionRepository.update {
        if (!it.status.isGuidanceReady() || it.sessionId != current.sessionId) return@update it
        it.copy(
          remainingDistanceMeters = meters,
          remainingDurationSeconds = seconds,
        )
      }
    }
  }

  private fun arrivalMatchesStop(arrivalInfo: SdkArrivalInfo, expectedStop: NavStop): Boolean {
    if (arrivalInfo.lat != null && arrivalInfo.lng != null) {
      val latDiff = abs(arrivalInfo.lat - expectedStop.lat)
      val lngDiff = abs(arrivalInfo.lng - expectedStop.lng)
      if (latDiff > 0.02 || lngDiff > 0.02) {
        return false
      }
    }
    if (!arrivalInfo.title.isNullOrBlank() && arrivalInfo.title != expectedStop.name) {
      return false
    }
    return true
  }
}
