package com.thestillfoundation.myexplorer.web

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject
import org.json.JSONTokener
import java.net.URI
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Non-user-facing, read-only reader for the hosted MyExplorer WebView origin's
 * `localStorage` keys (`myexplorer.saved-trips`, `myexplorer.navigation-session`).
 *
 * Uses `loadDataWithBaseURL` scoped strictly to [ALLOWED_ORIGIN_URL] and a fixed
 * read-only `evaluateJavascript` snippet without exposing any JS bridge or mutating
 * WebView storage. Live Android WebView behavior (online and offline) must be
 * verified on a real device/emulator before wiring automatic migration.
 */
object LegacyWebStorageReader {
  const val ALLOWED_HOST = "myexplorer-travel.vercel.app"
  const val ALLOWED_ORIGIN_URL = "https://$ALLOWED_HOST/"
  const val KEY_SAVED_TRIPS = "myexplorer.saved-trips"
  const val KEY_NAV_SESSION = "myexplorer.navigation-session"
  private const val DEFAULT_TIMEOUT_MS = 5_000L

  sealed class ReadResult {
    data class Success(
      val savedTripsJson: String?,
      val navSessionJson: String?,
    ) : ReadResult()

    data class MissingStorage(val reason: String) : ReadResult()
    data class MalformedPayload(val reason: String, val raw: String?) : ReadResult()
    data class OriginRejected(val actualOrigin: String?) : ReadResult()
    data class Interrupted(val reason: String) : ReadResult()
  }

  internal val READ_ONLY_LOCAL_STORAGE_SCRIPT = """
    (function() {
      try {
        var origin = window.location && window.location.origin ? window.location.origin : '';
        if (!window.localStorage) {
          return JSON.stringify({ status: 'missing_storage', origin: origin });
        }
        return JSON.stringify({
          status: 'ok',
          origin: origin,
          savedTripsJson: window.localStorage.getItem('$KEY_SAVED_TRIPS'),
          navSessionJson: window.localStorage.getItem('$KEY_NAV_SESSION')
        });
      } catch (e) {
        return JSON.stringify({
          status: 'error',
          message: e && e.message ? String(e.message) : 'localStorage read failed'
        });
      }
    })();
  """.trimIndent()

  fun isAllowedOrigin(origin: String?): Boolean {
    if (origin.isNullOrBlank()) return false
    val uri = runCatching { URI(origin) }.getOrNull() ?: return false
    return uri.scheme?.lowercase() == "https" && uri.host?.lowercase() == ALLOWED_HOST
  }

  internal fun parseRawEvaluateResult(rawEvaluateOutput: String?): ReadResult {
    if (rawEvaluateOutput.isNullOrBlank() || rawEvaluateOutput == "null") {
      return ReadResult.Interrupted("WebView evaluation returned no result.")
    }
    val jsonString = runCatching {
      JSONTokener(rawEvaluateOutput).nextValue() as? String
    }.getOrNull() ?: return ReadResult.MalformedPayload(
      "Could not decode WebView evaluation string.",
      rawEvaluateOutput,
    )

    val obj = runCatching { JSONObject(jsonString) }.getOrNull()
      ?: return ReadResult.MalformedPayload("WebView storage payload is not valid JSON.", jsonString)

    when (obj.optString("status")) {
      "missing_storage" -> return ReadResult.MissingStorage("window.localStorage is unavailable.")
      "error" -> return ReadResult.Interrupted(
        obj.optString("message").ifBlank { "WebView storage read failed." },
      )
    }

    val origin = obj.optString("origin").takeIf { it.isNotBlank() }
    if (!isAllowedOrigin(origin)) {
      return ReadResult.OriginRejected(origin)
    }

    val savedTripsJson =
      if (obj.isNull("savedTripsJson")) null else obj.optString("savedTripsJson").takeIf { it.isNotBlank() }
    val navSessionJson =
      if (obj.isNull("navSessionJson")) null else obj.optString("navSessionJson").takeIf { it.isNotBlank() }

    if (savedTripsJson == null && navSessionJson == null) {
      return ReadResult.MissingStorage("No legacy saved trips or navigation session found.")
    }
    return ReadResult.Success(savedTripsJson = savedTripsJson, navSessionJson = navSessionJson)
  }

  /**
   * Reads legacy WebView storage on the main thread using an offscreen WebView
   * scoped to [ALLOWED_ORIGIN_URL]. Returns a cancel handle to interrupt safely.
   */
  fun readAsync(
    context: Context,
    timeoutMs: Long = DEFAULT_TIMEOUT_MS,
    onResult: (ReadResult) -> Unit,
  ): () -> Unit {
    val mainHandler = Handler(Looper.getMainLooper())
    val settled = AtomicBoolean(false)
    var webView: WebView? = null

    fun finish(result: ReadResult) {
      if (!settled.compareAndSet(false, true)) return
      mainHandler.post {
        runCatching {
          webView?.stopLoading()
          webView?.destroy()
        }
        webView = null
        onResult(result)
      }
    }

    val timeoutRunnable = Runnable {
      finish(ReadResult.Interrupted("Legacy WebView storage read timed out after ${timeoutMs}ms."))
    }

    mainHandler.post {
      if (settled.get()) return@post
      runCatching {
        val wv = WebView(context.applicationContext)
        webView = wv
        wv.settings.javaScriptEnabled = true
        wv.settings.domStorageEnabled = true
        wv.settings.allowFileAccess = false
        wv.settings.allowContentAccess = false
        wv.webViewClient = object : WebViewClient() {
          override fun onPageFinished(view: WebView?, url: String?) {
            if (settled.get()) return
            if (!isAllowedOrigin(url)) {
              finish(ReadResult.OriginRejected(url))
              return
            }
            wv.evaluateJavascript(READ_ONLY_LOCAL_STORAGE_SCRIPT) { raw ->
              mainHandler.removeCallbacks(timeoutRunnable)
              finish(parseRawEvaluateResult(raw))
            }
          }
        }
        mainHandler.postDelayed(timeoutRunnable, timeoutMs)
        wv.loadDataWithBaseURL(
          ALLOWED_ORIGIN_URL,
          "<!doctype html><html><head></head><body></body></html>",
          "text/html",
          "utf-8",
          null,
        )
      }.onFailure { err ->
        mainHandler.removeCallbacks(timeoutRunnable)
        finish(ReadResult.Interrupted(err.message ?: "Failed to initialize WebView reader."))
      }
    }

    return {
      mainHandler.removeCallbacks(timeoutRunnable)
      finish(ReadResult.Interrupted("Legacy WebView storage read was interrupted."))
    }
  }
}
