package com.thestillfoundation.myexplorer.navigation

import android.app.Application
import android.content.Context
import com.google.android.libraries.mapsplatform.turnbyturn.model.Maneuver as SdkManeuver
import com.google.android.libraries.mapsplatform.turnbyturn.model.NavState
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

private class FakeNavigatorHandle : NavigatorHandle {
  var pendingRouteCallback: ((SdkRouteStatus) -> Unit)? = null
  var startGuidanceCalls = 0
  var stopGuidanceCalls = 0
  var clearDestinationsCalls = 0
  var registerFeedCalls = 0
  var unregisterFeedCalls = 0
  var continueToNextDestinationCalls = 0
  var feedShouldSucceed = true
  var arrivalListenerCount = 0
  var timeDistanceListenerCount = 0
  var timeAndDistance: Pair<Int, Int>? = 1000 to 120

  private var arrivalListener: ((SdkArrivalInfo) -> Unit)? = null
  private var timeDistanceListener: (() -> Unit)? = null

  override fun setDestinations(waypoints: List<NavStop>, onResult: (SdkRouteStatus) -> Unit) {
    pendingRouteCallback = onResult
  }

  override fun startGuidance() {
    startGuidanceCalls++
  }

  override fun stopGuidance() {
    stopGuidanceCalls++
  }

  override fun clearDestinations() {
    clearDestinationsCalls++
  }

  override fun continueToNextDestination() {
    continueToNextDestinationCalls++
  }

  override fun setVoiceGuidanceEnabled() {}

  override fun currentTimeAndDistance(): Pair<Int, Int>? = timeAndDistance

  override fun setArrivalListener(listener: (SdkArrivalInfo) -> Unit) {
    arrivalListenerCount++
    arrivalListener = listener
  }

  override fun setTimeDistanceListener(listener: () -> Unit) {
    timeDistanceListenerCount++
    timeDistanceListener = listener
  }

  override fun registerGuidanceFeed(): Boolean {
    registerFeedCalls++
    return feedShouldSucceed
  }

  override fun unregisterGuidanceFeed() {
    unregisterFeedCalls++
  }

  fun fireArrival(info: SdkArrivalInfo) {
    arrivalListener?.invoke(info)
  }

  fun fireTimeDistance() {
    timeDistanceListener?.invoke()
  }
}

private class FakeNavigationEnvironment(
  private val nav: FakeNavigatorHandle,
) : NavigationEnvironment {
  var hasPermission = true
  var termsAccepted = true
  var foregroundStartResult: Result<Unit> = Result.success(Unit)
  var autoCompleteServiceStart = true
  var pendingAcquireCallback: ((Result<NavigatorHandle>) -> Unit)? = null
  var autoCompleteAcquire = true
  var startForegroundServiceCalls = 0
  var stopForegroundServiceCalls = 0

  override fun hasPreciseLocationPermission(): Boolean = hasPermission

  override fun areTermsAccepted(): Boolean = termsAccepted

  override fun showTermsDialog(title: String, onResult: (Boolean) -> Unit) {
    onResult(termsAccepted)
  }

  override fun acquireNavigator(onResult: (Result<NavigatorHandle>) -> Unit) {
    if (autoCompleteAcquire) {
      onResult(Result.success(nav))
    } else {
      pendingAcquireCallback = onResult
    }
  }

  override fun startForegroundService(): Result<Unit> {
    startForegroundServiceCalls++
    if (foregroundStartResult.isFailure) {
      NavigationForegroundService.isServiceStartPending = false
      NavigationForegroundService.isServiceRunning = false
      return foregroundStartResult
    }
    NavigationForegroundService.isServiceStartPending = true
    if (autoCompleteServiceStart) {
      NavigationForegroundService.isServiceStartPending = false
      NavigationForegroundService.isServiceRunning = true
      val unsafeClass = Class.forName("sun.misc.Unsafe")
      val unsafe = unsafeClass.getDeclaredField("theUnsafe").apply { isAccessible = true }.get(null)
      val dummyContext = unsafeClass
        .getMethod("allocateInstance", Class::class.java)
        .invoke(unsafe, Application::class.java) as Context
      NavigationController.onForegroundServiceStarted(dummyContext)
    }
    return foregroundStartResult
  }

  override fun stopForegroundService() {
    stopForegroundServiceCalls++
    NavigationForegroundService.isServiceStartPending = false
    NavigationForegroundService.isServiceRunning = false
  }
}

class NavigationControllerTest {
  private lateinit var fakeNav: FakeNavigatorHandle
  private lateinit var fakeEnv: FakeNavigationEnvironment

  private val trip1Stops = listOf(
    NavStop("s1", "Origin 1", null, 14.5995, 120.9842, "start"),
    NavStop("s2", "Dest 1", null, 14.1153, 120.9621, "destination"),
  )

  private val trip2Stops = listOf(
    NavStop("s3", "Origin 2", null, 14.6500, 121.0500, "start"),
    NavStop("s4", "Dest 2", null, 15.1450, 120.5887, "destination"),
  )

  @Before
  fun setUp() {
    fakeNav = FakeNavigatorHandle()
    fakeEnv = FakeNavigationEnvironment(fakeNav)
    NavigationController.configureForTest(MainThreadDispatcher { it() })
    NavigationSessionRepository.update { NavigationSessionSnapshot() }
  }

  @After
  fun tearDown() {
    NavigationController.resetForProd()
  }

  @Test
  fun pendingStartThenEndPreventsStaleRouteFromStartingGuidance() {
    var startResult: Result<NavigationSessionSnapshot>? = null
    NavigationController.startTripNavigationWithEnv(
      fakeEnv,
      "trip-1",
      "Trip 1",
      trip1Stops,
    ) { startResult = it }

    assertEquals(NavigationSessionStatus.PREPARING, NavigationSessionRepository.snapshot().status)
    assertNotNull(fakeNav.pendingRouteCallback)

    val stopped = NavigationController.stopNavigationWithEnv(fakeEnv)
    assertEquals(NavigationSessionStatus.ABANDONED, stopped.status)

    // Stale route calculation finishes after End Navigation
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)

    assertEquals(0, fakeNav.startGuidanceCalls)
    assertEquals(NavigationSessionStatus.ABANDONED, NavigationSessionRepository.snapshot().status)
    assertTrue(startResult?.isFailure == true)
  }

  @Test
  fun pendingResumeThenEndPreventsResurrectingEndedSession() {
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-1", "Trip 1", trip1Stops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)

    NavigationController.pauseNavigationWithEnv(fakeEnv)
    assertEquals(NavigationSessionStatus.PAUSED, NavigationSessionRepository.snapshot().status)

    var resumeResult: Result<NavigationSessionSnapshot>? = null
    NavigationController.resumeNavigationWithEnv(fakeEnv) { resumeResult = it }
    assertEquals(NavigationSessionStatus.RECONNECTING, NavigationSessionRepository.snapshot().status)

    NavigationController.stopNavigationWithEnv(fakeEnv)
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)

    assertEquals(1, fakeNav.startGuidanceCalls)
    assertEquals(NavigationSessionStatus.ABANDONED, NavigationSessionRepository.snapshot().status)
    assertTrue(resumeResult?.isFailure == true)
  }

  @Test
  fun replacementTripIgnoresPreparingGuidanceEventsAndOldRouteArrival() {
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-1", "Trip 1", trip1Stops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)

    // Start replacement Trip 2; while PREPARING, feed is unregistered and active telemetry is ignored
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-2", "Trip 2", trip2Stops) {}
    assertEquals(NavigationSessionStatus.PREPARING, NavigationSessionRepository.snapshot().status)
    assertTrue(fakeNav.unregisterFeedCalls >= 1)

    NavigationSessionRepository.applyNavInfo(
      navState = NavState.ENROUTE,
      instructionText = "Old Trip 1 turn",
      roadName = "Old Rd",
      maneuverCode = SdkManeuver.TURN_LEFT,
      roundaboutExitNumber = null,
      stepDistanceMeters = 100,
      nextDestDistanceMeters = 500,
      nextDestTimeSeconds = 60,
      finalDestDistanceMeters = 500,
      finalDestTimeSeconds = 60,
    )
    assertEquals("", NavigationSessionRepository.snapshot().nextInstructionText)

    fakeNav.fireTimeDistance()
    assertEquals(0, NavigationSessionRepository.snapshot().remainingDistanceMeters)

    // Activate Trip 2
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)

    // Arrival for Trip 1's destination must not complete Trip 2
    fakeNav.fireArrival(SdkArrivalInfo("Dest 1", 14.1153, 120.9621))
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)

    // Arrival for Trip 2's destination completes Trip 2
    fakeNav.fireArrival(SdkArrivalInfo("Dest 2", 15.1450, 120.5887))
    assertEquals(NavigationSessionStatus.COMPLETED, NavigationSessionRepository.snapshot().status)
  }

  @Test
  fun guidanceFeedFailureIsRecoverableWithoutDuplicateListeners() {
    fakeNav.feedShouldSucceed = false
    var firstResult: Result<NavigationSessionSnapshot>? = null
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-1", "Trip 1", trip1Stops) {
      firstResult = it
    }
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)

    assertTrue(firstResult?.isFailure == true)
    var snap = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.PAUSED, snap.status)
    assertFalse(snap.guidanceFeedRegistered)
    assertNotNull(snap.lastError)
    assertEquals(0, fakeNav.startGuidanceCalls)
    assertEquals(1, fakeNav.arrivalListenerCount)

    // Repeated failure stays PAUSED with error and no duplicate listeners
    NavigationController.resumeNavigationWithEnv(fakeEnv) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    snap = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.PAUSED, snap.status)
    assertFalse(snap.guidanceFeedRegistered)
    assertNotNull(snap.lastError)
    assertEquals(1, fakeNav.arrivalListenerCount)

    // Retry succeeds -> ACTIVE, clears error, still only 1 SDK listener
    fakeNav.feedShouldSucceed = true
    NavigationController.resumeNavigationWithEnv(fakeEnv) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    snap = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.ACTIVE, snap.status)
    assertTrue(snap.guidanceFeedRegistered)
    assertNull(snap.lastError)
    assertEquals(1, fakeNav.startGuidanceCalls)
    assertEquals(1, fakeNav.arrivalListenerCount)
  }

  @Test
  fun oldFeedMessagesRejectedAfterRouteReplacement() {
    // 1. Activate trip A and capture its bound feed receiver
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-a", "Trip A", trip1Stops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)
    val feedA = BoundFeedReceiver(NavigationSessionRepository.currentFeedGeneration())

    // 2. Replace A with B and fully activate B
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-b", "Trip B", trip2Stops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)
    val feedB = BoundFeedReceiver(NavigationSessionRepository.currentFeedGeneration())

    // Seed B with known good instruction, maneuver, and estimates
    feedB.onNavInfo(
      navState = NavState.ENROUTE,
      instructionText = "Turn right onto NLEX",
      roadName = "NLEX",
      maneuverCode = SdkManeuver.TURN_RIGHT,
      roundaboutExitNumber = null,
      stepDistanceMeters = 300,
      nextDestDistanceMeters = 12000,
      nextDestTimeSeconds = 900,
      finalDestDistanceMeters = 12000,
      finalDestTimeSeconds = 900,
    )

    // 3. Deliver retained instruction message and STOPPED message from A
    feedA.onNavInfo(
      navState = NavState.ENROUTE,
      instructionText = "Old Trip A turn left",
      roadName = "Old Rd",
      maneuverCode = SdkManeuver.TURN_LEFT,
      roundaboutExitNumber = null,
      stepDistanceMeters = 50,
      nextDestDistanceMeters = 100,
      nextDestTimeSeconds = 10,
      finalDestDistanceMeters = 100,
      finalDestTimeSeconds = 10,
    )
    feedA.onNavInfo(
      navState = NavState.STOPPED,
      instructionText = null,
      roadName = null,
      maneuverCode = SdkManeuver.UNKNOWN,
      roundaboutExitNumber = null,
      stepDistanceMeters = null,
      nextDestDistanceMeters = null,
      nextDestTimeSeconds = null,
      finalDestDistanceMeters = null,
      finalDestTimeSeconds = null,
    )

    // 4. Assert B remains active and unchanged
    val snapAfterOld = NavigationSessionRepository.snapshot()
    assertEquals("trip-b", snapAfterOld.tripId)
    assertEquals(NavigationSessionStatus.ACTIVE, snapAfterOld.status)
    assertEquals("Turn right onto NLEX", snapAfterOld.nextInstructionText)
    assertEquals(SdkManeuver.TURN_RIGHT, snapAfterOld.maneuverCode)
    assertEquals(12000, snapAfterOld.remainingDistanceMeters)
    assertEquals(900, snapAfterOld.remainingDurationSeconds)
    assertEquals(1, snapAfterOld.currentStopIndex)

    // 5. Assert current-B messages (including REROUTING) still apply
    feedB.onNavInfo(
      navState = NavState.REROUTING,
      instructionText = null,
      roadName = null,
      maneuverCode = SdkManeuver.UNKNOWN,
      roundaboutExitNumber = null,
      stepDistanceMeters = null,
      nextDestDistanceMeters = 12500,
      nextDestTimeSeconds = 950,
      finalDestDistanceMeters = 12500,
      finalDestTimeSeconds = 950,
    )
    val snapRerouting = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.RECONNECTING, snapRerouting.status)
    assertTrue(snapRerouting.isRerouting)
    assertEquals("", snapRerouting.nextInstructionText)
  }

  @Test
  fun intermediateAndFinalArrivalManageForegroundServiceAndDuplicateCompletion() {
    val multiStops = listOf(
      NavStop("s1", "Start", null, 14.5995, 120.9842, "start"),
      NavStop("s2", "Mid Stop", null, 14.3000, 120.9700, "stop"),
      NavStop("s3", "Final Dest", null, 14.1153, 120.9621, "destination"),
    )

    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-multi", "Multi", multiStops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)
    val stopsBefore = fakeEnv.stopForegroundServiceCalls

    // Intermediate arrival advances stop without stopping foreground service
    fakeNav.fireArrival(SdkArrivalInfo("Mid Stop", 14.3000, 120.9700))
    val afterMid = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.ACTIVE, afterMid.status)
    assertEquals(2, afterMid.currentStopIndex)
    assertEquals(1, fakeNav.continueToNextDestinationCalls)
    assertEquals(stopsBefore, fakeEnv.stopForegroundServiceCalls)

    // Final arrival stops guidance, unregisters feed, and stops foreground service
    fakeNav.fireArrival(SdkArrivalInfo("Final Dest", 14.1153, 120.9621))
    val afterFinal = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.COMPLETED, afterFinal.status)
    assertEquals(0, afterFinal.remainingDistanceMeters)
    assertEquals(0, afterFinal.remainingDurationSeconds)
    assertFalse(afterFinal.guidanceFeedRegistered)
    assertEquals(stopsBefore + 1, fakeEnv.stopForegroundServiceCalls)
    assertTrue(fakeNav.unregisterFeedCalls >= 1)

    // Duplicate completion is safe and does not restart guidance or corrupt COMPLETED
    fakeNav.fireArrival(SdkArrivalInfo("Final Dest", 14.1153, 120.9621))
    assertEquals(NavigationSessionStatus.COMPLETED, NavigationSessionRepository.snapshot().status)
    assertEquals(1, fakeNav.startGuidanceCalls)
  }

  @Test
  fun publicPauseNavigationStopsForegroundServicePreservesTripAndAllowsResumeToArrival() {
    val unsafeClass = Class.forName("sun.misc.Unsafe")
    val unsafe = unsafeClass.getDeclaredField("theUnsafe").apply { isAccessible = true }.get(null)
    val dummyContext = unsafeClass
      .getMethod("allocateInstance", Class::class.java)
      .invoke(unsafe, Application::class.java) as Context
    NavigationController.environmentFactory = { fakeEnv }

    // 1. Start trip -> ACTIVE with foreground service running
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-pause", "Pause Flow", trip1Stops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)
    assertEquals(1, fakeEnv.startForegroundServiceCalls)
    val stopsBeforePause = fakeEnv.stopForegroundServiceCalls

    // 2. Public pauseNavigation(context) -> PAUSED, foreground service stopped, trip preserved
    val paused = NavigationController.pauseNavigation(dummyContext)
    assertEquals(NavigationSessionStatus.PAUSED, paused.status)
    assertEquals("trip-pause", paused.tripId)
    assertEquals(2, paused.stops.size)
    assertFalse(paused.guidanceFeedRegistered)
    assertEquals(1, fakeNav.stopGuidanceCalls)
    assertTrue(fakeNav.unregisterFeedCalls >= 1)
    assertEquals(stopsBeforePause + 1, fakeEnv.stopForegroundServiceCalls)

    // 3. Repeated pauseNavigation(context) is safe and preserves PAUSED state
    val pausedAgain = NavigationController.pauseNavigation(dummyContext)
    assertEquals(NavigationSessionStatus.PAUSED, pausedAgain.status)
    assertEquals("trip-pause", pausedAgain.tripId)
    assertEquals(2, pausedAgain.stops.size)

    // 4. Resume restarts foreground service and guidance
    NavigationController.resumeNavigationWithEnv(fakeEnv) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    val resumed = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.ACTIVE, resumed.status)
    assertTrue(resumed.guidanceFeedRegistered)
    assertEquals(2, fakeEnv.startForegroundServiceCalls)
    assertEquals(2, fakeNav.startGuidanceCalls)

    // 5. Final arrival completes and stops foreground service again
    fakeNav.fireArrival(SdkArrivalInfo("Dest 1", 14.1153, 120.9621))
    val completed = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.COMPLETED, completed.status)
    assertFalse(completed.guidanceFeedRegistered)
    assertTrue(fakeEnv.stopForegroundServiceCalls >= 3)
  }

  @Test
  fun reconcileSessionStateDowngradesStaleActiveWhenServiceDeadAndNeverResurrectsTerminal() {
    val unsafeClass = Class.forName("sun.misc.Unsafe")
    val unsafe = unsafeClass.getDeclaredField("theUnsafe").apply { isAccessible = true }.get(null)
    val dummyContext = unsafeClass
      .getMethod("allocateInstance", Class::class.java)
      .invoke(unsafe, Application::class.java) as Context
    NavigationController.environmentFactory = { fakeEnv }

    // 1. Start trip -> ACTIVE
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-rec", "Reconnect Trip", trip1Stops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)

    // 2. If foreground service is NOT running, reconcile downgrades ACTIVE -> PAUSED + needsNavigatorReconnect
    val reconciled = NavigationController.reconcileSessionState(dummyContext, isServiceRunning = false)
    assertEquals(NavigationSessionStatus.PAUSED, reconciled.status)
    assertTrue(reconciled.needsNavigatorReconnect)
    assertFalse(reconciled.guidanceFeedRegistered)
    assertEquals("trip-rec", reconciled.tripId)
    assertEquals(2, reconciled.stops.size)

    // 3. Re-activate and simulate external service destruction -> PAUSED + needsNavigatorReconnect
    NavigationController.resumeNavigationWithEnv(fakeEnv) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)
    NavigationController.onForegroundServiceDestroyed(dummyContext)
    val afterDestroy = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.PAUSED, afterDestroy.status)
    assertTrue(afterDestroy.needsNavigatorReconnect)
    assertFalse(afterDestroy.guidanceFeedRegistered)

    // 4. Stop -> ABANDONED; reconcile & service destroy must NEVER resurrect ABANDONED
    NavigationController.stopNavigationWithEnv(fakeEnv)
    assertEquals(NavigationSessionStatus.ABANDONED, NavigationSessionRepository.snapshot().status)
    NavigationController.onForegroundServiceDestroyed(dummyContext)
    val afterStopReconcile = NavigationController.reconcileSessionState(dummyContext, isServiceRunning = false)
    assertEquals(NavigationSessionStatus.ABANDONED, afterStopReconcile.status)
  }

  @Test
  fun foregroundServiceStartupRaceDoesNotDowngradeDuringStartupAndDetectsFailureOrDestruction() {
    val unsafeClass = Class.forName("sun.misc.Unsafe")
    val unsafe = unsafeClass.getDeclaredField("theUnsafe").apply { isAccessible = true }.get(null)
    val dummyContext = unsafeClass
      .getMethod("allocateInstance", Class::class.java)
      .invoke(unsafe, Application::class.java) as Context

    fakeEnv.autoCompleteServiceStart = false
    var startResult: Result<NavigationSessionSnapshot>? = null
    NavigationController.startTripNavigationWithEnv(
      fakeEnv,
      "trip-race",
      "Race Trip",
      trip1Stops,
    ) { startResult = it }
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)

    // 1. Service start was requested, but onStartCommand has not fired yet:
    // guidance must NOT be ACTIVE yet, and reconciliation must NOT downgrade to PAUSED.
    assertEquals(1, fakeEnv.startForegroundServiceCalls)
    assertTrue(NavigationForegroundService.isServiceStartPending)
    assertFalse(NavigationForegroundService.isServiceRunning)
    assertEquals(0, fakeNav.startGuidanceCalls)
    assertEquals(NavigationSessionStatus.PREPARING, NavigationSessionRepository.snapshot().status)

    val duringStartup = NavigationController.reconcileSessionState(dummyContext)
    assertEquals(NavigationSessionStatus.PREPARING, duringStartup.status)
    assertFalse(duringStartup.needsNavigatorReconnect)
    assertNull(startResult)

    // 2. Service startup callback completes -> guidance starts and session becomes ACTIVE.
    NavigationForegroundService.isServiceStartPending = false
    NavigationForegroundService.isServiceRunning = true
    NavigationController.onForegroundServiceStarted(dummyContext)

    assertEquals(1, fakeNav.startGuidanceCalls)
    assertTrue(startResult?.isSuccess == true)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)

    // 3. Subsequent service destruction -> downgrades ACTIVE to PAUSED + needsNavigatorReconnect.
    NavigationForegroundService.isServiceRunning = false
    NavigationController.onForegroundServiceDestroyed(dummyContext)
    val afterDestroy = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.PAUSED, afterDestroy.status)
    assertTrue(afterDestroy.needsNavigatorReconnect)

    // 4. Resume where service genuinely fails to start -> PAUSED, no guidance started, failure reported.
    var resumeResult: Result<NavigationSessionSnapshot>? = null
    NavigationController.resumeNavigationWithEnv(fakeEnv) { resumeResult = it }
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.RECONNECTING, NavigationSessionRepository.snapshot().status)

    NavigationForegroundService.isServiceStartPending = false
    NavigationForegroundService.isServiceRunning = false
    NavigationController.onForegroundServiceStartFailed(dummyContext, "Foreground start rejected")

    assertEquals(1, fakeNav.startGuidanceCalls)
    assertTrue(resumeResult?.isFailure == true)
    val afterFail = NavigationController.reconcileSessionState(dummyContext)
    assertEquals(NavigationSessionStatus.PAUSED, afterFail.status)
    assertTrue(afterFail.needsNavigatorReconnect)
    assertEquals("Foreground start rejected", afterFail.lastError)
  }

  @Test
  fun hostAndPhoneStopsPreserveCorruptRecoveryUntilExplicitDiscardWhileHealthyStopAbandons() {
    val prefsMap = mutableMapOf<String, String?>()
    val editorProxy = java.lang.reflect.Proxy.newProxyInstance(
      android.content.SharedPreferences.Editor::class.java.classLoader,
      arrayOf(android.content.SharedPreferences.Editor::class.java),
    ) { proxy, method, args ->
      when (method.name) {
        "putString" -> {
          prefsMap[args[0] as String] = args[1] as String?
          proxy
        }
        "remove" -> {
          prefsMap.remove(args[0] as String)
          proxy
        }
        "apply", "commit" -> if (method.returnType == java.lang.Boolean.TYPE) true else Unit
        else -> proxy
      }
    } as android.content.SharedPreferences.Editor

    val prefsProxy = java.lang.reflect.Proxy.newProxyInstance(
      android.content.SharedPreferences::class.java.classLoader,
      arrayOf(android.content.SharedPreferences::class.java),
    ) { _, method, args ->
      when (method.name) {
        "getString" -> prefsMap[args[0] as String] ?: (args[1] as String?)
        "edit" -> editorProxy
        else -> null
      }
    } as android.content.SharedPreferences

    val context = object : android.content.ContextWrapper(null) {
      override fun getApplicationContext(): Context = this
      override fun getSharedPreferences(name: String?, mode: Int): android.content.SharedPreferences =
        prefsProxy
    }

    val corruptPayload = """{"sessionId":"nav-c","tripId":"trip-c","tripName":"Corrupt","status":"active","stops":[{"id":"s1","name":"Start","lat":14.59,"lng":120.98},{"id":"s2","name":"BadMid","lat":14.4}]}"""

    try {
      NavigationSessionRepository.resetForRestartTest()
      prefsMap["snapshot_json"] = corruptPayload
      NavigationSessionRepository.init(context)
      assertTrue(NavigationSessionRepository.hasCorruptRecoveryPayload())
      assertTrue(NavigationSessionRepository.snapshot().hasCorruptRecovery)

      // 1. Starting a new trip (valid OR invalid) while corrupt payload is quarantined must NOT erase backup
      var blockedStartResult: Result<NavigationSessionSnapshot>? = null
      NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-new", "New Trip", trip1Stops) {
        blockedStartResult = it
      }
      assertTrue(blockedStartResult?.isFailure == true)
      assertTrue(NavigationSessionRepository.hasCorruptRecoveryPayload())
      assertEquals(0, fakeEnv.startForegroundServiceCalls)
      assertEquals(corruptPayload, prefsMap["snapshot_json"])
      assertEquals(corruptPayload, prefsMap["corrupt_snapshot_backup_json"])

      // Failed start (< 2 stops) also preserves corrupt backup
      var invalidStartResult: Result<NavigationSessionSnapshot>? = null
      NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-bad", "Bad", trip1Stops.take(1)) {
        invalidStartResult = it
      }
      assertTrue(invalidStartResult?.isFailure == true)
      assertTrue(NavigationSessionRepository.hasCorruptRecoveryPayload())
      assertEquals(corruptPayload, prefsMap["corrupt_snapshot_backup_json"])

      // 2. Android Auto host / phone stopNavigation must NOT clear the quarantined corrupt payload
      val afterHostStop = NavigationController.stopNavigationWithEnv(fakeEnv)
      assertTrue(afterHostStop.hasCorruptRecovery)
      assertEquals(NavigationSessionStatus.PAUSED, afterHostStop.status)
      assertTrue(afterHostStop.stops.isEmpty())
      assertEquals("", afterHostStop.tripId)
      assertNotNull(afterHostStop.lastError)
      assertEquals(corruptPayload, prefsMap["snapshot_json"])
      assertEquals(corruptPayload, prefsMap["corrupt_snapshot_backup_json"])

      // 3. Ordinary update + app restart still preserves original payload and error
      NavigationSessionRepository.update { it.copy(needsNavigatorReconnect = true) }
      NavigationSessionRepository.resetForRestartTest()
      NavigationSessionRepository.init(context)
      assertTrue(NavigationSessionRepository.hasCorruptRecoveryPayload())
      assertEquals(corruptPayload, prefsMap["snapshot_json"])
      assertEquals(corruptPayload, prefsMap["corrupt_snapshot_backup_json"])

      // 4. Explicit user discard clears the quarantined payload, then starting a new trip succeeds
      val afterExplicitDiscard = NavigationController.discardCorruptRecoverySessionWithEnv(fakeEnv)
      assertFalse(NavigationSessionRepository.hasCorruptRecoveryPayload())
      assertFalse(afterExplicitDiscard.hasCorruptRecovery)
      assertEquals(NavigationSessionStatus.ABANDONED, afterExplicitDiscard.status)
      assertNull(prefsMap["corrupt_snapshot_backup_json"])

      // 5. Healthy session start & stop still work normally
      NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-h", "Healthy", trip1Stops) {}
      fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
      assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)
      val afterHealthyStop = NavigationController.stopNavigationWithEnv(fakeEnv)
      assertEquals(NavigationSessionStatus.ABANDONED, afterHealthyStop.status)
      assertFalse(afterHealthyStop.hasCorruptRecovery)
    } finally {
      NavigationSessionRepository.resetForRestartTest()
    }
  }
}
