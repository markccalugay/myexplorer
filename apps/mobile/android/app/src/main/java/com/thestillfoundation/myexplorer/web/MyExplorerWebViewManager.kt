package com.thestillfoundation.myexplorer.web

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.view.ViewGroup
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event

class MyExplorerWebViewManager : SimpleViewManager<WebView>() {

  override fun getName(): String = REACT_CLASS

  private var pendingGeoOrigin: String? = null
  private var pendingGeoCallback: GeolocationPermissions.Callback? = null

  @SuppressLint("SetJavaScriptEnabled")
  override fun createViewInstance(reactContext: ThemedReactContext): WebView {
    val webView = WebView(reactContext).apply {
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
      settings.javaScriptEnabled = true
      settings.domStorageEnabled = true
      settings.databaseEnabled = true
      settings.setGeolocationEnabled(true)
      settings.useWideViewPort = true
      settings.loadWithOverviewMode = true
      settings.builtInZoomControls = false
      settings.displayZoomControls = false
      settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
    }

    webView.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val uri = request.url ?: return false
        return handleUrlNavigation(reactContext, uri)
      }

      override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
        emitEvent(reactContext, view.id, "onWebLoadStart", Arguments.createMap().apply {
          putString("url", url ?: "")
        })
        emitNavigationState(reactContext, view)
      }

      override fun onPageFinished(view: WebView, url: String?) {
        emitEvent(reactContext, view.id, "onWebLoadEnd", Arguments.createMap().apply {
          putString("url", url ?: "")
        })
        emitNavigationState(reactContext, view)
      }

      override fun onReceivedError(
        view: WebView,
        request: WebResourceRequest,
        error: WebResourceError,
      ) {
        if (!request.isForMainFrame) return
        emitEvent(reactContext, view.id, "onWebLoadError", Arguments.createMap().apply {
          putInt("code", error.errorCode)
          putString("description", error.description?.toString() ?: "Failed to load page")
          putString("url", request.url?.toString() ?: "")
        })
      }

      override fun onReceivedHttpError(
        view: WebView,
        request: WebResourceRequest,
        errorResponse: WebResourceResponse,
      ) {
        if (!request.isForMainFrame || errorResponse.statusCode < 400) return
        emitEvent(reactContext, view.id, "onWebLoadError", Arguments.createMap().apply {
          putInt("code", errorResponse.statusCode)
          putString("description", "HTTP ${errorResponse.statusCode}")
          putString("url", request.url?.toString() ?: "")
        })
      }
    }

    webView.webChromeClient = object : WebChromeClient() {
      override fun onGeolocationPermissionsShowPrompt(
        origin: String,
        callback: GeolocationPermissions.Callback,
      ) {
        if (!isAllowedOrigin(origin)) {
          callback.invoke(origin, false, false)
          return
        }
        val fine = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION) ==
          PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_COARSE_LOCATION) ==
          PackageManager.PERMISSION_GRANTED
        if (fine || coarse) {
          callback.invoke(origin, true, false)
        } else {
          pendingGeoOrigin = origin
          pendingGeoCallback = callback
          emitEvent(reactContext, webView.id, "onGeolocationPermissionRequested", Arguments.createMap().apply {
            putString("origin", origin)
          })
        }
      }
    }

    return webView
  }

  @ReactProp(name = "url")
  fun setUrl(view: WebView, url: String?) {
    val target = url?.trim().orEmpty()
    if (target.isEmpty()) return
    val uri = Uri.parse(target)
    if (isAllowedUri(uri) && view.url != target) {
      view.loadUrl(target)
    }
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    mapOf(
      "onWebLoadStart" to mapOf("registrationName" to "onWebLoadStart"),
      "onWebLoadEnd" to mapOf("registrationName" to "onWebLoadEnd"),
      "onWebLoadError" to mapOf("registrationName" to "onWebLoadError"),
      "onWebNavigationStateChange" to mapOf("registrationName" to "onWebNavigationStateChange"),
      "onGeolocationPermissionRequested" to mapOf("registrationName" to "onGeolocationPermissionRequested"),
    )

  override fun getCommandsMap(): Map<String, Int> =
    mapOf(
      "goBack" to CMD_GO_BACK,
      "reload" to CMD_RELOAD,
      "resolveGeolocation" to CMD_RESOLVE_GEO,
    )

  override fun receiveCommand(root: WebView, commandId: String?, args: ReadableArray?) {
    when (commandId) {
      "goBack" -> if (root.canGoBack()) root.goBack()
      "reload" -> root.reload()
      "resolveGeolocation" -> resolvePendingGeolocation(args?.getBoolean(0) == true)
    }
  }

  @Suppress("DEPRECATION")
  override fun receiveCommand(root: WebView, commandId: Int, args: ReadableArray?) {
    when (commandId) {
      CMD_GO_BACK -> if (root.canGoBack()) root.goBack()
      CMD_RELOAD -> root.reload()
      CMD_RESOLVE_GEO -> resolvePendingGeolocation(args?.getBoolean(0) == true)
    }
  }

  override fun onDropViewInstance(view: WebView) {
    pendingGeoCallback = null
    pendingGeoOrigin = null
    view.stopLoading()
    view.destroy()
    super.onDropViewInstance(view)
  }

  private fun resolvePendingGeolocation(granted: Boolean) {
    val origin = pendingGeoOrigin
    val cb = pendingGeoCallback
    pendingGeoOrigin = null
    pendingGeoCallback = null
    if (origin != null && cb != null) {
      cb.invoke(origin, granted, false)
    }
  }

  private fun handleUrlNavigation(context: ThemedReactContext, uri: Uri): Boolean {
    val scheme = uri.scheme?.lowercase() ?: return true
    if (scheme == "about") return false
    if (isAllowedUri(uri)) return false

    if (scheme == "http" || scheme == "https" || scheme == "tel" || scheme == "mailto" || scheme == "geo") {
      runCatching {
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      }
    }
    return true
  }

  private fun isAllowedUri(uri: Uri): Boolean {
    val scheme = uri.scheme?.lowercase()
    val host = uri.host?.lowercase()
    return scheme == "https" && host == ALLOWED_HOST
  }

  private fun isAllowedOrigin(origin: String): Boolean {
    val uri = runCatching { Uri.parse(origin) }.getOrNull() ?: return false
    return isAllowedUri(uri)
  }

  private fun emitNavigationState(context: ThemedReactContext, view: WebView) {
    emitEvent(context, view.id, "onWebNavigationStateChange", Arguments.createMap().apply {
      putBoolean("canGoBack", view.canGoBack())
      putString("url", view.url ?: "")
      putString("title", view.title ?: "")
    })
  }

  private fun emitEvent(
    context: ThemedReactContext,
    viewId: Int,
    eventName: String,
    payload: WritableMap,
  ) {
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId) ?: return
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    dispatcher.dispatchEvent(SimpleWebEvent(surfaceId, viewId, eventName, payload))
  }

  private class SimpleWebEvent(
    surfaceId: Int,
    viewId: Int,
    private val name: String,
    private val data: WritableMap,
  ) : Event<SimpleWebEvent>(surfaceId, viewId) {
    override fun getEventName(): String = name
    override fun getEventData(): WritableMap = data
  }

  companion object {
    const val REACT_CLASS = "MyExplorerWebView"
    private const val ALLOWED_HOST = "myexplorer-travel.vercel.app"
    private const val CMD_GO_BACK = 1
    private const val CMD_RELOAD = 2
    private const val CMD_RESOLVE_GEO = 3
  }
}
