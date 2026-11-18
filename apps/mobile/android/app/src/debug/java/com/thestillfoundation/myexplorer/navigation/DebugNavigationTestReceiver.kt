package com.thestillfoundation.myexplorer.navigation

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.thestillfoundation.myexplorer.BuildConfig
import org.json.JSONArray

/**
 * Debug-only test hook for driving Navigation SDK simulation and inspecting
 * session state on an attached emulator/device. Excluded from release builds.
 */
class DebugNavigationTestReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (!BuildConfig.DEBUG) return

    val app = context.applicationContext as Application
    NavigationSessionRepository.init(app)

    when (intent.getStringExtra("cmd")) {
      "simulate_route" -> {
        val speed = intent.getFloatExtra("speed", 5.0f)
        val started = NavigationController.simulateCurrentRouteForDebug(speed)
        Log.i(TAG, "simulate_route started=$started speed=$speed")
      }
      "set_location" -> {
        val lat = intent.getDoubleExtra("lat", 0.0)
        val lng = intent.getDoubleExtra("lng", 0.0)
        val ok = NavigationController.setSimulatedLocationForDebug(lat, lng)
        Log.i(TAG, "set_location ok=$ok lat=$lat lng=$lng")
      }
      "start" -> {
        val tripId = intent.getStringExtra("tripId") ?: "debug-trip"
        val tripName = intent.getStringExtra("tripName") ?: "Debug Trip"
        val stopsRaw = intent.getStringExtra("stopsJson") ?: "[]"
        val stopsArray = JSONArray(stopsRaw)
        val stops = buildList {
          for (i in 0 until stopsArray.length()) {
            stopsArray.optJSONObject(i)?.let { add(NavStop.fromJson(it)) }
          }
        }
        NavigationController.startTripNavigation(app, null, tripId, tripName, stops) { res ->
          Log.i(TAG, "start result=${res.isSuccess} err=${res.exceptionOrNull()?.message} snap=${NavigationSessionRepository.snapshot().toJson()}")
        }
      }
      "pause" -> {
        val snap = NavigationController.pauseNavigation(app)
        Log.i(TAG, "pause snap=${snap.toJson()}")
      }
      "resume" -> {
        val snap = NavigationController.resumeNavigation(app, null)
        Log.i(TAG, "resume snap=${snap.toJson()}")
      }
      "stop" -> {
        val snap = NavigationController.stopNavigation(app)
        Log.i(TAG, "stop snap=${snap.toJson()}")
      }
      "dump" -> {
        Log.i(TAG, "dump snap=${NavigationSessionRepository.snapshot().toJson()}")
      }
    }
  }

  companion object {
    private const val TAG = "MyExplorerDebugNav"
  }
}
