package com.thestillfoundation.myexplorer.navigation

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.libraries.navigation.NavigationView
import org.json.JSONObject
import java.lang.ref.WeakReference

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

    val holder = LifecycleHolder(navView, reactContext)
    holder.onCreate()
    holder.onResume()

    navView.getMapAsync { googleMap ->
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
    val navView: NavigationView,
    val reactContext: ThemedReactContext,
  ) : LifecycleEventListener {
    private var created = false
    private var started = false
    private var resumed = false
    private var destroyed = false

    fun onCreate() {
      if (created || destroyed) return
      navView.onCreate(null)
      created = true
    }

    fun onStart() {
      if (!created || started || destroyed) return
      navView.onStart()
      started = true
    }

    fun onResume() {
      if (destroyed) return
      onCreate()
      onStart()
      if (!resumed) {
        navView.onResume()
        resumed = true
      }
    }

    fun onPause() {
      if (!resumed || destroyed) return
      navView.onPause()
      resumed = false
    }

    fun onStop() {
      if (destroyed) return
      onPause()
      if (started) {
        navView.onStop()
        started = false
      }
    }

    fun onDestroy() {
      if (destroyed) return
      onStop()
      if (created) {
        navView.onDestroy()
      }
      destroyed = true
    }

    override fun onHostResume() = onResume()

    override fun onHostPause() = onStop()

    override fun onHostDestroy() {
      reactContext.removeLifecycleEventListener(this)
      onDestroy()
    }
  }

  companion object {
    const val REACT_CLASS = "MyExplorerNavigationView"
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile
    private var activeMapRef: WeakReference<GoogleMap>? = null

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
