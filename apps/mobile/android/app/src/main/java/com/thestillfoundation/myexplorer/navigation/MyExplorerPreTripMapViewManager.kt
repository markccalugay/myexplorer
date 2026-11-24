package com.thestillfoundation.myexplorer.navigation

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.MapView
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.PolylineOptions
import org.json.JSONArray
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicLong

internal data class PreTripMapStop(
  val id: String,
  val name: String,
  val lat: Double,
  val lng: Double,
  val type: String,
  val order: Int,
)

internal object PreTripMapPayloadParser {
  fun parseStops(stopsJson: String?): List<PreTripMapStop> {
    if (stopsJson.isNullOrBlank()) return emptyList()
    return runCatching {
      val array = JSONArray(stopsJson)
      val out = mutableListOf<PreTripMapStop>()
      for (i in 0 until array.length()) {
        val obj = array.optJSONObject(i) ?: continue
        val lat = obj.optDouble("lat", Double.NaN)
        val lng = obj.optDouble("lng", Double.NaN)
        if (!lat.isFinite() || !lng.isFinite()) continue
        if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) continue
        val id = obj.optString("id", "").ifBlank { "stop-$i" }
        val name = obj.optString("name", "").ifBlank { "Stop ${i + 1}" }
        val type = obj.optString("type", "stop")
        val order = obj.optInt("order", i + 1)
        out.add(PreTripMapStop(id = id, name = name, lat = lat, lng = lng, type = type, order = order))
      }
      out
    }.getOrDefault(emptyList())
  }

  fun decodePolyline(encoded: String?): List<LatLng> {
    if (encoded.isNullOrBlank()) return emptyList()
    val points = mutableListOf<LatLng>()
    var index = 0
    val len = encoded.length
    var lat = 0
    var lng = 0

    try {
      while (index < len) {
        var result = 0
        var shift = 0
        var b: Int
        do {
          if (index >= len) return emptyList()
          b = encoded[index++].code - 63
          result = result or ((b and 0x1f) shl shift)
          shift += 5
        } while (b >= 0x20)
        val dlat = if ((result and 1) != 0) (result shr 1).inv() else (result shr 1)
        lat += dlat

        result = 0
        shift = 0
        do {
          if (index >= len) return emptyList()
          b = encoded[index++].code - 63
          result = result or ((b and 0x1f) shl shift)
          shift += 5
        } while (b >= 0x20)
        val dlng = if ((result and 1) != 0) (result shr 1).inv() else (result shr 1)
        lng += dlng

        val decodedLat = lat / 1e5
        val decodedLng = lng / 1e5
        if (decodedLat in -90.0..90.0 && decodedLng in -180.0..180.0) {
          points.add(LatLng(decodedLat, decodedLng))
        }
      }
    } catch (_: Throwable) {
      return emptyList()
    }
    return points
  }
}

/**
 * Interactive native pre-trip map powered by Google Maps [MapView] (bundled via
 * the project's Google Navigation SDK dependency) without starting turn-by-turn
 * guidance or locking camera followMyLocation.
 */
class MyExplorerPreTripMapViewManager : SimpleViewManager<FrameLayout>() {
  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
    val container = MapTouchContainer(reactContext)
    val mapView = MapView(reactContext).apply {
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }
    container.addView(mapView)

    val viewId = nextViewId.incrementAndGet()
    val holder = PreTripMapHolder(viewId, mapView, reactContext)
    holder.onCreate()
    holder.onResume()

    runCatching {
      mapView.getMapAsync { googleMap ->
        if (holder.isDestroyed()) return@getMapAsync
        holder.googleMap = googleMap
        activeReactContextRef = WeakReference(reactContext)
        activeMapRef = WeakReference(googleMap)

        if (NavigationController.hasPreciseLocationPermission(reactContext)) {
          runCatching { googleMap.isMyLocationEnabled = true }
        }
        googleMap.uiSettings.apply {
          isCompassEnabled = true
          isZoomGesturesEnabled = true
          isScrollGesturesEnabled = true
          isScrollGesturesEnabledDuringRotateOrZoom = true
          isZoomControlsEnabled = false
        }
        googleMap.setOnCameraIdleListener {
          if (!holder.isDestroyed()) {
            zoomCoordinator.onCameraZoomIdle(
              viewId = viewId,
              zoom = googleMap.cameraPosition.zoom,
              minZoom = googleMap.minZoomLevel,
              maxZoom = googleMap.maxZoomLevel,
            )
          }
        }
        holder.render(frameCamera = true)
        zoomCoordinator.onMapReady(
          viewId = viewId,
          zoom = googleMap.cameraPosition.zoom,
          minZoom = googleMap.minZoomLevel,
          maxZoom = googleMap.maxZoomLevel,
        )
      }
    }

    reactContext.addLifecycleEventListener(holder)
    container.tag = holder
    return container
  }

  @ReactProp(name = "stopsJson")
  fun setStopsJson(view: FrameLayout, stopsJson: String?) {
    val holder = view.tag as? PreTripMapHolder ?: return
    holder.stops = PreTripMapPayloadParser.parseStops(stopsJson)
    holder.render(frameCamera = true)
  }

  @ReactProp(name = "encodedPolyline")
  fun setEncodedPolyline(view: FrameLayout, encodedPolyline: String?) {
    val holder = view.tag as? PreTripMapHolder ?: return
    holder.encodedPolyline = encodedPolyline
    holder.render(frameCamera = false)
  }

  override fun onDropViewInstance(view: FrameLayout) {
    val holder = view.tag as? PreTripMapHolder
    if (holder != null) {
      holder.reactContext.removeLifecycleEventListener(holder)
      holder.onDestroy()
      view.tag = null
    }
    super.onDropViewInstance(view)
  }

  private class MapTouchContainer(context: Context) : FrameLayout(context) {
    override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
      when (ev?.actionMasked) {
        MotionEvent.ACTION_DOWN,
        MotionEvent.ACTION_POINTER_DOWN,
        MotionEvent.ACTION_MOVE -> parent?.requestDisallowInterceptTouchEvent(true)
        MotionEvent.ACTION_UP,
        MotionEvent.ACTION_CANCEL -> parent?.requestDisallowInterceptTouchEvent(false)
      }
      return super.onInterceptTouchEvent(ev)
    }
  }

  private class PreTripMapHolder(
    val viewId: Long,
    val mapView: MapView,
    val reactContext: ThemedReactContext,
  ) : LifecycleEventListener {
    var googleMap: GoogleMap? = null
    var stops: List<PreTripMapStop> = emptyList()
    var encodedPolyline: String? = null

    private val machine = NavigationViewLifecycleStateMachine(
      viewId = viewId,
      target = object : NavigationViewLifecycleTarget {
        override fun onCreate() = mapView.onCreate(null)
        override fun onStart() = mapView.onStart()
        override fun onResume() = mapView.onResume()
        override fun onPause() = mapView.onPause()
        override fun onStop() = mapView.onStop()
        override fun onDestroy() = mapView.onDestroy()
      },
      onDestroyedCleanup = { destroyedViewId ->
        if (zoomCoordinator.currentActiveViewId() == destroyedViewId) {
          activeMapRef?.get()?.setOnCameraIdleListener(null)
          activeMapRef = null
        }
        googleMap = null
        zoomCoordinator.onViewDestroyed(destroyedViewId)
      },
    )

    fun isDestroyed(): Boolean = machine.isDestroyed()

    fun onCreate() = machine.onCreate()

    fun onResume() = machine.onResume()

    fun onStop() = machine.onStop()

    fun onDestroy() = machine.onDestroy()

    override fun onHostResume() = onResume()

    override fun onHostPause() = onStop()

    override fun onHostDestroy() {
      reactContext.removeLifecycleEventListener(this)
      onDestroy()
    }

    fun render(frameCamera: Boolean) {
      val map = googleMap ?: return
      if (isDestroyed()) return
      runCatching {
        map.clear()
        stops.forEach { stop ->
          map.addMarker(
            MarkerOptions()
              .position(LatLng(stop.lat, stop.lng))
              .title("${stop.order}. ${stop.name}")
              .snippet(stop.type),
          )
        }
        val polyPoints = PreTripMapPayloadParser.decodePolyline(encodedPolyline)
        if (polyPoints.size >= 2) {
          map.addPolyline(
            PolylineOptions()
              .addAll(polyPoints)
              .color(0xFF2C7BE5.toInt())
              .width(10f),
          )
        }
        if (frameCamera && stops.isNotEmpty()) {
          if (stops.size == 1) {
            val only = stops[0]
            map.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(only.lat, only.lng), 13f))
          } else {
            val boundsBuilder = LatLngBounds.Builder()
            stops.forEach { boundsBuilder.include(LatLng(it.lat, it.lng)) }
            val bounds = boundsBuilder.build()
            val width = mapView.width
            val height = mapView.height
            if (width > 0 && height > 0) {
              map.moveCamera(CameraUpdateFactory.newLatLngBounds(bounds, width, height, 64))
            } else {
              mapView.post {
                if (!isDestroyed() && mapView.width > 0 && mapView.height > 0) {
                  runCatching {
                    map.moveCamera(
                      CameraUpdateFactory.newLatLngBounds(bounds, mapView.width, mapView.height, 64),
                    )
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  companion object {
    const val REACT_CLASS = "MyExplorerPreTripMapView"
    const val EVENT_MAP_ZOOM_CHANGED = "MyExplorerPreTripMapZoomChanged"
    private val mainHandler = Handler(Looper.getMainLooper())
    private val nextViewId = AtomicLong(0L)

    @Volatile
    private var activeReactContextRef: WeakReference<ThemedReactContext>? = null

    @Volatile
    private var activeMapRef: WeakReference<GoogleMap>? = null

    private val zoomCoordinator = MapZoomEventCoordinator { payload ->
      val ctx = activeReactContextRef?.get() ?: return@MapZoomEventCoordinator
      if (!ctx.hasActiveReactInstance()) return@MapZoomEventCoordinator
      runCatching {
        ctx
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit(EVENT_MAP_ZOOM_CHANGED, payload.toString())
      }
    }

    fun zoomActiveMap(delta: Float, onComplete: (Result<JSONObject>) -> Unit) {
      mainHandler.post {
        val map = activeMapRef?.get()
        if (map == null) {
          onComplete(Result.failure(IllegalStateException("Pre-trip map is not ready yet.")))
          return@post
        }
        runCatching {
          val currentZoom = map.cameraPosition.zoom
          val minZoom = map.minZoomLevel
          val maxZoom = map.maxZoomLevel
          val targetZoom = (currentZoom + delta).coerceIn(minZoom, maxZoom)
          map.animateCamera(CameraUpdateFactory.zoomTo(targetZoom))
          JSONObject().apply {
            put("available", true)
            put("zoom", targetZoom.toDouble())
            put("minZoom", minZoom.toDouble())
            put("maxZoom", maxZoom.toDouble())
          }
        }.onSuccess { json ->
          onComplete(Result.success(json))
        }.onFailure { err ->
          onComplete(Result.failure(err))
        }
      }
    }

    fun getActiveMapZoomState(onComplete: (JSONObject) -> Unit) {
      mainHandler.post {
        val map = activeMapRef?.get()
        val json = if (map == null) {
          JSONObject().apply {
            put("available", false)
            put("zoom", 15.0)
            put("minZoom", 2.0)
            put("maxZoom", 21.0)
          }
        } else {
          JSONObject().apply {
            put("available", true)
            put("zoom", map.cameraPosition.zoom.toDouble())
            put("minZoom", map.minZoomLevel.toDouble())
            put("maxZoom", map.maxZoomLevel.toDouble())
          }
        }
        onComplete(json)
      }
    }
  }
}
