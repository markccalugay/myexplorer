package com.thestillfoundation.myexplorer.navigation

import android.app.Application
import android.location.Address
import android.location.Geocoder
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.Executors

class NavigationBridgeModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private val searchExecutor = Executors.newSingleThreadExecutor()

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

  @ReactMethod
  fun discardCorruptRecoverySession(promise: Promise) {
    val snapshot = NavigationController.discardCorruptRecoverySession(reactContext.applicationContext)
    promise.resolve(snapshot.toJson().toString())
  }

  @ReactMethod
  fun searchPlaces(query: String, promise: Promise) {
    val trimmed = query.trim()
    if (trimmed.isEmpty()) {
      promise.reject("INVALID_QUERY", "Enter a place name or address to search.")
      return
    }
    if (!Geocoder.isPresent()) {
      promise.reject(
        "GEOCODER_UNAVAILABLE",
        "Place search service is unavailable on this device.",
      )
      return
    }
    val geocoder = Geocoder(reactContext.applicationContext, Locale.getDefault())
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      geocoder.getFromLocationName(
        trimmed,
        8,
        object : Geocoder.GeocodeListener {
          override fun onGeocode(addresses: MutableList<Address>) {
            promise.resolve(addressesToJson(addresses).toString())
          }

          override fun onError(errorMessage: String?) {
            promise.reject(
              "SEARCH_FAILED",
              errorMessage?.takeIf { it.isNotBlank() }
                ?: "Place search failed. Check your connection and try again.",
            )
          }
        },
      )
    } else {
      searchExecutor.execute {
        runCatching {
          @Suppress("DEPRECATION")
          geocoder.getFromLocationName(trimmed, 8).orEmpty()
        }.onSuccess { addresses ->
          promise.resolve(addressesToJson(addresses).toString())
        }.onFailure { err ->
          promise.reject(
            "SEARCH_FAILED",
            err.message?.takeIf { it.isNotBlank() }
              ?: "Place search failed. Check your connection and try again.",
            err,
          )
        }
      }
    }
  }

  private fun addressesToJson(addresses: List<Address>): JSONArray {
    val array = JSONArray()
    for (i in addresses.indices) {
      val addr = addresses[i]
      if (!addr.hasLatitude() || !addr.hasLongitude()) continue
      val lat = addr.latitude
      val lng = addr.longitude
      if (!lat.isFinite() || !lng.isFinite() || lat !in -90.0..90.0 || lng !in -180.0..180.0) {
        continue
      }
      val fullAddress = (0..addr.maxAddressLineIndex)
        .mapNotNull { idx -> addr.getAddressLine(idx)?.trim()?.takeIf { it.isNotEmpty() } }
        .joinToString(", ")
      val primaryName = addr.featureName?.trim()?.takeIf { it.isNotEmpty() }
        ?: addr.thoroughfare?.trim()?.takeIf { it.isNotEmpty() }
        ?: addr.locality?.trim()?.takeIf { it.isNotEmpty() }
        ?: fullAddress.substringBefore(",").trim().ifEmpty { "Place ${i + 1}" }
      array.put(
        JSONObject().apply {
          put("id", "place-${i + 1}-${lat}-${lng}")
          put("name", primaryName)
          if (fullAddress.isNotEmpty()) put("formattedAddress", fullAddress)
          put("lat", lat)
          put("lng", lng)
        },
      )
    }
    return array
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
