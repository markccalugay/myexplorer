package com.thestillfoundation.myexplorer.navigation

import com.google.android.libraries.mapsplatform.turnbyturn.model.Maneuver as SdkManeuver
import com.google.android.libraries.mapsplatform.turnbyturn.model.NavState
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class NavigationSessionRepositoryTest {
  @Test
  fun snapshotRoundTripPreservesFields() {
    val original = NavigationSessionSnapshot(
      sessionId = "nav-123",
      tripId = "trip-1",
      tripName = "Manila to Tagaytay",
      status = NavigationSessionStatus.ACTIVE,
      stops = listOf(
        NavStop("s1", "Manila", "Manila, PH", 14.5995, 120.9842, "start"),
        NavStop("s2", "Tagaytay", "Tagaytay, PH", 14.1153, 120.9621, "destination"),
      ),
      currentStopIndex = 1,
      currentLegIndex = 0,
      nextInstructionText = "Turn right onto Aguinaldo Hwy",
      nextRoadName = "Aguinaldo Hwy",
      maneuverCode = SdkManeuver.TURN_RIGHT,
      roundaboutExitNumber = null,
      stepDistanceMeters = 450,
      remainingDistanceMeters = 42000,
      remainingDurationSeconds = 3600,
      finalRemainingDistanceMeters = 55000,
      finalRemainingDurationSeconds = 4800,
      updatedAtMs = 1700000000000L,
    )

    val parsed = NavigationSessionSnapshot.fromJson(original.toJson())
    assertEquals(original.sessionId, parsed.sessionId)
    assertEquals(original.tripName, parsed.tripName)
    assertEquals(NavigationSessionStatus.ACTIVE, parsed.status)
    assertEquals(SdkManeuver.TURN_RIGHT, parsed.maneuverCode)
    assertEquals(55000, parsed.finalRemainingDistanceMeters)
    assertEquals(4800, parsed.finalRemainingDurationSeconds)
  }

  @Test
  fun reroutingAndStoppedClearObsoleteInstructionsAndIgnoreStaleCallbacks() {
    NavigationSessionRepository.update {
      NavigationSessionSnapshot(
        sessionId = "nav-active",
        tripId = "trip-1",
        tripName = "Test Trip",
        status = NavigationSessionStatus.ACTIVE,
        nextInstructionText = "Turn left onto Ayala Ave",
        nextRoadName = "Ayala Ave",
        maneuverCode = SdkManeuver.TURN_LEFT,
        stepDistanceMeters = 200,
        remainingDistanceMeters = 5000,
        remainingDurationSeconds = 600,
      )
    }

    val rerouting = NavigationSessionRepository.applyNavInfo(
      navState = NavState.REROUTING,
      instructionText = "Old instruction",
      roadName = "Old Road",
      maneuverCode = SdkManeuver.TURN_LEFT,
      roundaboutExitNumber = null,
      stepDistanceMeters = 200,
      nextDestDistanceMeters = 0,
      nextDestTimeSeconds = 0,
      finalDestDistanceMeters = 0,
      finalDestTimeSeconds = 0,
    )
    assertEquals(NavigationSessionStatus.RECONNECTING, rerouting.status)
    assertTrue(rerouting.isRerouting)
    assertEquals("", rerouting.nextInstructionText)
    assertEquals("", rerouting.nextRoadName)
    assertEquals(SdkManeuver.UNKNOWN, rerouting.maneuverCode)
    assertNull(rerouting.roundaboutExitNumber)
    assertEquals(0, rerouting.stepDistanceMeters)

    val stopped = NavigationSessionRepository.applyNavInfo(
      navState = NavState.STOPPED,
      instructionText = "Should be cleared",
      roadName = "Road",
      maneuverCode = SdkManeuver.TURN_RIGHT,
      roundaboutExitNumber = null,
      stepDistanceMeters = 100,
      nextDestDistanceMeters = 100,
      nextDestTimeSeconds = 10,
      finalDestDistanceMeters = 100,
      finalDestTimeSeconds = 10,
    )
    assertEquals(NavigationSessionStatus.PAUSED, stopped.status)
    assertFalse(stopped.isRerouting)
    assertEquals("", stopped.nextInstructionText)

    // Mark abandoned and verify stale ENROUTE callback cannot resurrect it
    NavigationSessionRepository.update { it.copy(status = NavigationSessionStatus.ABANDONED) }
    val afterStale = NavigationSessionRepository.applyNavInfo(
      navState = NavState.ENROUTE,
      instructionText = "Zombie instruction",
      roadName = "Zombie Rd",
      maneuverCode = SdkManeuver.TURN_RIGHT,
      roundaboutExitNumber = null,
      stepDistanceMeters = 300,
      nextDestDistanceMeters = 1200,
      nextDestTimeSeconds = 120,
      finalDestDistanceMeters = 1200,
      finalDestTimeSeconds = 120,
    )
    assertEquals(NavigationSessionStatus.ABANDONED, afterStale.status)
    assertEquals("", afterStale.nextInstructionText)
  }

  @Test
  fun navStopFromJsonRejectsMissingMalformedAndOutOfRangeWhileAllowingZeroZero() {
    // Valid explicit (0.0, 0.0)
    val zeroZero = NavStop.fromJson(
      JSONObject().apply {
        put("id", "s0")
        put("name", "Null Island")
        put("lat", 0.0)
        put("lng", 0.0)
        put("type", "stop")
      },
    )
    assertEquals(0.0, zeroZero.lat, 0.0001)
    assertEquals(0.0, zeroZero.lng, 0.0001)

    // Missing latitude
    assertThrows(IllegalArgumentException::class.java) {
      NavStop.fromJson(
        JSONObject().apply {
          put("id", "s-no-lat")
          put("name", "No Lat")
          put("lng", 120.98)
        },
      )
    }

    // Missing longitude
    assertThrows(IllegalArgumentException::class.java) {
      NavStop.fromJson(
        JSONObject().apply {
          put("id", "s-no-lng")
          put("name", "No Lng")
          put("lat", 14.59)
        },
      )
    }

    // Malformed non-numeric coordinate
    assertThrows(IllegalArgumentException::class.java) {
      NavStop.fromJson(
        JSONObject().apply {
          put("id", "s-bad")
          put("name", "Bad Coord")
          put("lat", "14.59")
          put("lng", 120.98)
        },
      )
    }

    // Out-of-range coordinates
    assertThrows(IllegalArgumentException::class.java) {
      NavStop.fromJson(
        JSONObject().apply {
          put("id", "s-oor-lat")
          put("name", "OOR Lat")
          put("lat", 90.1)
          put("lng", 120.98)
        },
      )
    }
    assertThrows(IllegalArgumentException::class.java) {
      NavStop.fromJson(
        JSONObject().apply {
          put("id", "s-oor-lng")
          put("name", "OOR Lng")
          put("lat", 14.59)
          put("lng", -180.5)
        },
      )
    }

    // Invalid middle stop in snapshot rejects entire snapshot rather than creating partial trip
    val badSnapshotJson = JSONObject().apply {
      put("sessionId", "nav-bad-mid")
      put("tripId", "trip-bad-mid")
      put("tripName", "Three Stop")
      put("status", "paused")
      put(
        "stops",
        JSONArray().apply {
          put(JSONObject().apply { put("id", "s1"); put("name", "Start"); put("lat", 14.59); put("lng", 120.98) })
          put(JSONObject().apply { put("id", "s2"); put("name", "Mid Missing Lng"); put("lat", 14.40) })
          put(JSONObject().apply { put("id", "s3"); put("name", "End"); put("lat", 14.11); put("lng", 120.96) })
        },
      )
    }
    assertThrows(IllegalArgumentException::class.java) {
      NavigationSessionSnapshot.fromJson(badSnapshotJson)
    }
  }
}
