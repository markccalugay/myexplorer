package com.thestillfoundation.myexplorer.navigation

import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.google.android.gms.maps.GoogleMap
import com.google.android.libraries.navigation.NavigationView

/**
 * React Native ViewManager hosting the authoritative Google Navigation SDK [NavigationView]
 * for the phone experience, preserving Google attribution and strictly guarding lifecycle
 * transitions (`onCreate -> onStart -> onResume -> onPause -> onStop -> onDestroy`).
 */
class MyExplorerNavigationViewManager : SimpleViewManager<FrameLayout>() {
  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
    val container = FrameLayout(reactContext)
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
      if (NavigationController.hasPreciseLocationPermission(reactContext)) {
        runCatching { googleMap.isMyLocationEnabled = true }
        runCatching { googleMap.followMyLocation(GoogleMap.CameraPerspective.TILTED) }
      }
      googleMap.uiSettings.isCompassEnabled = true
    }

    reactContext.addLifecycleEventListener(holder)
    container.tag = holder
    return container
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
  }
}
