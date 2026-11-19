package com.thestillfoundation.myexplorer.navigation

import android.Manifest
import android.app.Activity
import android.app.Application
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.google.android.gms.maps.model.LatLng
import com.google.android.libraries.navigation.ArrivalEvent
import com.google.android.libraries.navigation.NavigationApi
import com.google.android.libraries.navigation.NavigationUpdatesOptions
import com.google.android.libraries.navigation.Navigator
import com.google.android.libraries.navigation.SimulationOptions
import com.google.android.libraries.navigation.Waypoint

fun interface MainThreadDispatcher {
  fun post(block: () -> Unit)
}

object AndroidMainThreadDispatcher : MainThreadDispatcher {
  private val handler by lazy { Handler(Looper.getMainLooper()) }

  override fun post(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      block()
    } else {
      handler.post(block)
    }
  }
}

enum class SdkRouteStatus {
  OK,
  FAILED,
}

data class SdkArrivalInfo(
  val title: String?,
  val lat: Double?,
  val lng: Double?,
)

interface NavigatorHandle {
  fun setDestinations(waypoints: List<NavStop>, onResult: (SdkRouteStatus) -> Unit)
  fun startGuidance()
  fun stopGuidance()
  fun clearDestinations()
  fun continueToNextDestination()
  fun setVoiceGuidanceEnabled()
  fun currentTimeAndDistance(): Pair<Int, Int>?
  fun setArrivalListener(listener: (SdkArrivalInfo) -> Unit)
  fun setTimeDistanceListener(listener: () -> Unit)
  fun registerGuidanceFeed(): Boolean
  fun unregisterGuidanceFeed()
  fun simulateLocationsAlongExistingRoute(speedMultiplier: Float) {}
  fun setSimulatedLocation(lat: Double, lng: Double) {}
}

interface NavigationEnvironment {
  fun hasPreciseLocationPermission(): Boolean
  fun areTermsAccepted(): Boolean
  fun showTermsDialog(title: String, onResult: (Boolean) -> Unit)
  fun acquireNavigator(onResult: (Result<NavigatorHandle>) -> Unit)
  fun startForegroundService(): Result<Unit>
  fun stopForegroundService()
}

class AndroidNavigatorHandle(
  private val application: Application,
  private val nav: Navigator,
) : NavigatorHandle {
  private var arrivalListener: Navigator.ArrivalListener? = null
  private var timeDistanceListener: Navigator.RemainingTimeOrDistanceChangedListener? = null

  override fun setDestinations(waypoints: List<NavStop>, onResult: (SdkRouteStatus) -> Unit) {
    val sdkWaypoints = waypoints.map { stop ->
      Waypoint.builder()
        .setLatLng(stop.lat, stop.lng)
        .setTitle(stop.name)
        .build()
    }
    nav.setDestinations(sdkWaypoints).setOnResultListener { routeStatus ->
      if (routeStatus == Navigator.RouteStatus.OK) {
        onResult(SdkRouteStatus.OK)
      } else {
        onResult(SdkRouteStatus.FAILED)
      }
    }
  }

  override fun startGuidance() = nav.startGuidance()

  override fun stopGuidance() = nav.stopGuidance()

  override fun clearDestinations() = nav.clearDestinations()

  override fun continueToNextDestination() {
    nav.continueToNextDestination()
  }

  override fun setVoiceGuidanceEnabled() {
    nav.setAudioGuidance(Navigator.AudioGuidance.VOICE_ALERTS_AND_GUIDANCE)
  }

  override fun currentTimeAndDistance(): Pair<Int, Int>? {
    val td = nav.currentTimeAndDistance ?: return null
    return td.meters to td.seconds
  }

  override fun setArrivalListener(listener: (SdkArrivalInfo) -> Unit) {
    arrivalListener?.let { nav.removeArrivalListener(it) }
    val sdkListener = Navigator.ArrivalListener { event: ArrivalEvent ->
      val wp = event.waypoint
      listener(
        SdkArrivalInfo(
          title = wp?.title,
          lat = wp?.position?.latitude,
          lng = wp?.position?.longitude,
        ),
      )
    }
    arrivalListener = sdkListener
    nav.addArrivalListener(sdkListener)
  }

  override fun setTimeDistanceListener(listener: () -> Unit) {
    timeDistanceListener?.let { nav.removeRemainingTimeOrDistanceChangedListener(it) }
    val sdkListener = Navigator.RemainingTimeOrDistanceChangedListener {
      listener()
    }
    timeDistanceListener = sdkListener
    nav.addRemainingTimeOrDistanceChangedListener(0, 0, sdkListener)
  }

  override fun registerGuidanceFeed(): Boolean = try {
    val options = NavigationUpdatesOptions.builder()
      .setNumNextStepsToPreview(0)
      .setGeneratedStepImagesType(NavigationUpdatesOptions.GeneratedStepImagesType.NONE)
      .setDisplayMetrics(application.resources.displayMetrics)
      .build()
    val ok = nav.registerServiceForNavUpdates(
      application.packageName,
      NavigationForegroundService::class.java.name,
      options,
    )
    if (!ok) {
      android.util.Log.w("MyExplorerNavSdk", "registerServiceForNavUpdates returned false")
    }
    ok
  } catch (t: Throwable) {
    android.util.Log.w("MyExplorerNavSdk", "registerServiceForNavUpdates threw", t)
    false
  }

  override fun unregisterGuidanceFeed() {
    runCatching { nav.unregisterServiceForNavUpdates() }
  }

  override fun simulateLocationsAlongExistingRoute(speedMultiplier: Float) {
    nav.simulator.simulateLocationsAlongExistingRoute(
      SimulationOptions().speedMultiplier(speedMultiplier),
    )
  }

  override fun setSimulatedLocation(lat: Double, lng: Double) {
    nav.simulator.setUserLocation(LatLng(lat, lng))
  }
}

class AndroidNavigationEnvironment(
  private val application: Application,
  private val activity: Activity?,
) : NavigationEnvironment {
  override fun hasPreciseLocationPermission(): Boolean =
    ContextCompat.checkSelfPermission(application, Manifest.permission.ACCESS_FINE_LOCATION) ==
      PackageManager.PERMISSION_GRANTED

  override fun areTermsAccepted(): Boolean = NavigationApi.areTermsAccepted(application)

  override fun showTermsDialog(title: String, onResult: (Boolean) -> Unit) {
    val hostActivity = activity
    if (hostActivity == null) {
      onResult(false)
      return
    }
    NavigationApi.showTermsAndConditionsDialog(hostActivity, title) { accepted ->
      onResult(accepted)
    }
  }

  override fun acquireNavigator(onResult: (Result<NavigatorHandle>) -> Unit) {
    NavigationApi.getNavigator(
      application,
      object : NavigationApi.NavigatorListener {
        override fun onNavigatorReady(nav: Navigator) {
          onResult(Result.success(AndroidNavigatorHandle(application, nav)))
        }

        override fun onError(errorCode: Int) {
          onResult(Result.failure(IllegalStateException("Navigation SDK error code: $errorCode")))
        }
      },
    )
  }

  override fun startForegroundService(): Result<Unit> =
    NavigationForegroundService.start(application)

  override fun stopForegroundService() {
    NavigationForegroundService.stop(application)
  }
}
