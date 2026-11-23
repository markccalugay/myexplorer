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
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.libraries.navigation.NavigationView
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.abs

internal interface NavigationViewLifecycleTarget {
  fun onCreate()
  fun onStart()
  fun onResume()
  fun onPause()
  fun onStop()
  fun onDestroy()
}

internal class NavigationViewLifecycleStateMachine(
  private val viewId: Long,
  private val target: NavigationViewLifecycleTarget,
  private val onDestroyedCleanup: (Long) -> Unit,
) {
  private var created = false
  private var started = false
  private var resumed = false
  private var destroyed = false

  fun isDestroyed(): Boolean = destroyed

  fun onCreate() {
    if (created || destroyed) return
    target.onCreate()
    created = true
  }

  fun onStart() {
    if (!created || started || destroyed) return
    target.onStart()
    started = true
  }

  fun onResume() {
    if (destroyed) return
    onCreate()
    onStart()
    if (!resumed) {
      target.onResume()
      resumed = true
    }
  }

  fun onPause() {
    if (!resumed || destroyed) return
    target.onPause()
    resumed = false
  }

  fun onStop() {
    if (destroyed) return
    onPause()
    if (started) {
      target.onStop()
      started = false
    }
  }

  fun onDestroy() {
    if (destroyed) return
    onStop()
    destroyed = true
    onDestroyedCleanup(viewId)
    if (created) {
      target.onDestroy()
      created = false
    }
  }
}

/**
 * Pure, testable coordinator for map-ready, camera-zoom-idle, and view-destroy
 * events so stale destroyed views never clobber recreated views and pan-only
 * camera idle callbacks without zoom changes do not spam JS.
 */
internal class MapZoomEventCoordinator(
  private val emitEvent: (JSONObject) -> Unit,
) {
  private var activeViewId: Long = 0L
  private var lastEmitted: ZoomSnapshot? = null

  private data class ZoomSnapshot(
    val available: Boolean,
    val zoom: Float,
    val minZoom: Float,
    val maxZoom: Float,
  ) {
    fun toJson(): JSONObject = JSONObject().apply {
      put("available", available)
      put("zoom", zoom.toDouble())
      put("minZoom", minZoom.toDouble())
      put("maxZoom", maxZoom.toDouble())
    }
  }

  @Synchronized
  fun onMapReady(viewId: Long, zoom: Float, minZoom: Float, maxZoom: Float) {
    activeViewId = viewId
    val next = ZoomSnapshot(true, zoom, minZoom, maxZoom)
    lastEmitted = next
    emitEvent(next.toJson())
  }

  @Synchronized
  fun onCameraZoomIdle(viewId: Long, zoom: Float, minZoom: Float, maxZoom: Float) {
    if (viewId == 0L || viewId != activeViewId) return
    val prev = lastEmitted
    if (
      prev != null &&
      prev.available &&
      abs(prev.zoom - zoom) < 0.005f &&
      abs(prev.minZoom - minZoom) < 0.005f &&
      abs(prev.maxZoom - maxZoom) < 0.005f
    ) {
      return
    }
    val next = ZoomSnapshot(true, zoom, minZoom, maxZoom)
    lastEmitted = next
    emitEvent(next.toJson())
  }

  @Synchronized
  fun onViewDestroyed(viewId: Long) {
    if (viewId == 0L || viewId != activeViewId) return
    activeViewId = 0L
    val next = ZoomSnapshot(false, 15f, 2f, 21f)
    lastEmitted = next
    emitEvent(next.toJson())
  }

  @Synchronized
  fun currentActiveViewId(): Long = activeViewId
}

/**
 * React Native ViewManager hosting the authoritative Google Navigation SDK [NavigationView]
 * for the phone experience, preserving Google attribution and strictly guarding lifecycle
 * transitions (`onCreate -> onStart -> onResume -> onPause -> onStop -> onDestroy`).
 */
class MyExplorerNavigationViewManager : SimpleViewManager<FrameLayout>() {
  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
    val container = MapTouchContainer(reactContext)
    val navView = NavigationView(reactContext).apply {
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }
    container.addView(navView)

    val viewId = nextViewId.incrementAndGet()
    val holder = LifecycleHolder(viewId, navView, reactContext)
    holder.onCreate()
    holder.onResume()

    navView.getMapAsync { googleMap ->
      if (holder.isDestroyed()) {
        return@getMapAsync
      }
      activeReactContextRef = WeakReference(reactContext)
      activeMapRef = WeakReference(googleMap)
      if (NavigationController.hasPreciseLocationPermission(reactContext)) {
        runCatching { googleMap.isMyLocationEnabled = true }
        runCatching { googleMap.followMyLocation(GoogleMap.CameraPerspective.TILTED) }
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
      zoomCoordinator.onMapReady(
        viewId = viewId,
        zoom = googleMap.cameraPosition.zoom,
        minZoom = googleMap.minZoomLevel,
        maxZoom = googleMap.maxZoomLevel,
      )
    }

    reactContext.addLifecycleEventListener(holder)
    container.tag = holder
    return container
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

  override fun onDropViewInstance(view: FrameLayout) {
    val holder = view.tag as? LifecycleHolder
    if (holder != null) {
      holder.reactContext.removeLifecycleEventListener(holder)
      holder.onDestroy()
      view.tag = null
    }
    super.onDropViewInstance(view)
  }

  private class LifecycleHolder(
    val viewId: Long,
    val navView: NavigationView,
    val reactContext: ThemedReactContext,
  ) : LifecycleEventListener {
    private val machine = NavigationViewLifecycleStateMachine(
      viewId = viewId,
      target = object : NavigationViewLifecycleTarget {
        override fun onCreate() = navView.onCreate(null)
        override fun onStart() = navView.onStart()
        override fun onResume() = navView.onResume()
        override fun onPause() = navView.onPause()
        override fun onStop() = navView.onStop()
        override fun onDestroy() = navView.onDestroy()
      },
      onDestroyedCleanup = { destroyedViewId ->
        if (zoomCoordinator.currentActiveViewId() == destroyedViewId) {
          activeMapRef?.get()?.setOnCameraIdleListener(null)
          activeMapRef = null
        }
        zoomCoordinator.onViewDestroyed(destroyedViewId)
      },
    )

    fun isDestroyed(): Boolean = machine.isDestroyed()

    fun onCreate() = machine.onCreate()

    fun onStart() = machine.onStart()

    fun onResume() = machine.onResume()

    fun onPause() = machine.onPause()

    fun onStop() = machine.onStop()

    fun onDestroy() = machine.onDestroy()

    override fun onHostResume() = onResume()

    override fun onHostPause() = onStop()

    override fun onHostDestroy() {
      reactContext.removeLifecycleEventListener(this)
      onDestroy()
    }
  }

  companion object {
    const val REACT_CLASS = "MyExplorerNavigationView"
    const val EVENT_MAP_ZOOM_CHANGED = "MyExplorerNavigationMapZoomChanged"
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
          onComplete(Result.failure(IllegalStateException("Navigation map is not ready yet.")))
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
