package com.thestillfoundation.myexplorer.navigation

import android.app.Application
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

class NavigationBridgeModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private val listener: (NavigationSessionSnapshot) -> Unit = { snapshot ->
    emitSessionChanged(snapshot)
  }

  init {
    NavigationSessionRepository.init(reactContext.applicationContext)
    NavigationSessionRepository.addListener(listener)
  }

  override fun getName(): String = "MyExplorerNavigation"

  override fun invalidate() {
    NavigationSessionRepository.removeListener(listener)
    super.invalidate()
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required for React Native NativeEventEmitter
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for React Native NativeEventEmitter
  }

  @ReactMethod
  fun getSessionState(promise: Promise) {
    val reconciled = NavigationController.reconcileSessionState(reactContext.applicationContext)
    promise.resolve(reconciled.toJson().toString())
  }

  @ReactMethod
  fun startNavigation(tripJson: String, promise: Promise) {
    runCatching {
      val obj = JSONObject(tripJson)
      val tripId = obj.optString("id", "trip")
      val tripName = obj.optString("name", "MyExplorer Trip")
      val stopsArray = obj.optJSONArray("stops") ?: JSONArray()
      val stops = NavStop.parseStopList(stopsArray)
      Triple(tripId, tripName, stops)
    }.onFailure { err ->
      promise.reject("INVALID_TRIP", err.message, err)
    }.onSuccess { (tripId, tripName, stops) ->
      val app = reactContext.applicationContext as Application
      NavigationController.startTripNavigation(
        application = app,
        activity = reactContext.currentActivity,
        tripId = tripId,
        tripName = tripName,
        stops = stops,
      ) { result ->
        result.onSuccess { snapshot ->
          promise.resolve(snapshot.toJson().toString())
        }.onFailure { err ->
          promise.reject("NAVIGATION_START_FAILED", err.message, err)
        }
      }
    }
  }

  @ReactMethod
  fun pauseNavigation(promise: Promise) {
    val snapshot = NavigationController.pauseNavigation(reactContext.applicationContext)
    promise.resolve(snapshot.toJson().toString())
  }

  @ReactMethod
  fun resumeNavigation(promise: Promise) {
    val app = reactContext.applicationContext as Application
    val snapshot = NavigationController.resumeNavigation(app, reactContext.currentActivity)
    promise.resolve(snapshot.toJson().toString())
  }

  @ReactMethod
  fun stopNavigation(promise: Promise) {
    val snapshot = NavigationController.stopNavigation(reactContext.applicationContext)
    promise.resolve(snapshot.toJson().toString())
  }

  private fun emitSessionChanged(snapshot: NavigationSessionSnapshot) {
    if (!reactContext.hasActiveReactInstance()) return
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_SESSION_CHANGED, snapshot.toJson().toString())
  }

  companion object {
    const val EVENT_SESSION_CHANGED = "MyExplorerNavigationStateChanged"
  }
}
