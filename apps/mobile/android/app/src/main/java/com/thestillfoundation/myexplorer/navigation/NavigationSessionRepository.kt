package com.thestillfoundation.myexplorer.navigation

import android.content.Context
import com.google.android.libraries.mapsplatform.turnbyturn.model.Maneuver as SdkManeuver
import com.google.android.libraries.mapsplatform.turnbyturn.model.NavState
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.CopyOnWriteArraySet

enum class NavigationSessionStatus(val wireValue: String) {
  IDLE("idle"),
  PREPARING("preparing"),
  ACTIVE("active"),
  PAUSED("paused"),
  RECONNECTING("reconnecting"),
  COMPLETED("completed"),
  ABANDONED("abandoned");

  fun isRunnable(): Boolean =
    this == PREPARING || this == ACTIVE || this == RECONNECTING

  fun isGuidanceReady(): Boolean =
    this == ACTIVE || this == RECONNECTING

  companion object {
    fun fromWire(value: String?): NavigationSessionStatus =
      entries.firstOrNull { it.wireValue == value } ?: IDLE
  }
}

data class NavStop(
  val id: String,
  val name: String,
  val formattedAddress: String?,
  val lat: Double,
  val lng: Double,
  val type: String,
) {
  fun toJson(): JSONObject = JSONObject().apply {
    put("id", id)
    put("name", name)
    if (formattedAddress != null) put("formattedAddress", formattedAddress)
    put("lat", lat)
    put("lng", lng)
    put("type", type)
  }

  companion object {
    private fun extractFiniteCoordinate(source: JSONObject?, key: String): Double? {
      if (source == null || !source.has(key) || source.isNull(key)) {
        return null
      }
      val raw = source.opt(key)
      if (raw !is Number) {
        return null
      }
      val value = raw.toDouble()
      return value.takeIf { it.isFinite() }
    }

    fun fromJson(obj: JSONObject): NavStop {
      val name = obj.optString("name", "").trim()
      val stopLabel = if (name.isNotEmpty()) " \"$name\"" else ""
      val loc = obj.optJSONObject("location")
      val lat = extractFiniteCoordinate(loc, "lat") ?: extractFiniteCoordinate(obj, "lat")
      val lng = extractFiniteCoordinate(loc, "lng") ?: extractFiniteCoordinate(obj, "lng")
      if (
        lat == null ||
        lng == null ||
        lat !in -90.0..90.0 ||
        lng !in -180.0..180.0
      ) {
        throw IllegalArgumentException(
          "Stop$stopLabel has missing, malformed, or out-of-range coordinates.",
        )
      }
      return NavStop(
        id = obj.optString("id").takeIf { it.isNotBlank() } ?: UUID.randomUUID().toString(),
        name = name.ifEmpty { "Stop" },
        formattedAddress = obj.optString("formattedAddress").takeIf { it.isNotBlank() },
        lat = lat,
        lng = lng,
        type = obj.optString("type").takeIf { it.isNotBlank() } ?: "stop",
      )
    }

    fun parseStopList(stopsArray: JSONArray): List<NavStop> {
      val stops = ArrayList<NavStop>(stopsArray.length())
      for (i in 0 until stopsArray.length()) {
        val stopObj = stopsArray.optJSONObject(i)
          ?: throw IllegalArgumentException("Stop ${i + 1} is malformed.")
        stops.add(fromJson(stopObj))
      }
      return stops
    }
  }
}

data class NavigationSessionSnapshot(
  val sessionId: String = "",
  val tripId: String = "",
  val tripName: String = "",
  val status: NavigationSessionStatus = NavigationSessionStatus.IDLE,
  val stops: List<NavStop> = emptyList(),
  val currentStopIndex: Int = 0,
  val currentLegIndex: Int = 0,
  val nextInstructionText: String = "",
  val nextRoadName: String = "",
  val maneuverCode: Int = SdkManeuver.UNKNOWN,
  val roundaboutExitNumber: Int? = null,
  val stepDistanceMeters: Int = 0,
  val remainingDistanceMeters: Int = 0,
  val remainingDurationSeconds: Int = 0,
  val finalRemainingDistanceMeters: Int = 0,
  val finalRemainingDurationSeconds: Int = 0,
  val isRerouting: Boolean = false,
  val needsNavigatorReconnect: Boolean = false,
  val guidanceFeedRegistered: Boolean = false,
  val versionSeq: Long = 0L,
  val updatedAtMs: Long = 0L,
  val lastError: String? = null,
) {
  fun clearGuidanceFields(): NavigationSessionSnapshot = copy(
    nextInstructionText = "",
    nextRoadName = "",
    maneuverCode = SdkManeuver.UNKNOWN,
    roundaboutExitNumber = null,
    stepDistanceMeters = 0,
  )

  fun toJson(): JSONObject = JSONObject().apply {
    put("sessionId", sessionId)
    put("tripId", tripId)
    put("tripName", tripName)
    put("status", status.wireValue)
    put("stops", JSONArray().apply { stops.forEach { put(it.toJson()) } })
    put("currentStopIndex", currentStopIndex)
    put("currentLegIndex", currentLegIndex)
    put("nextInstructionText", nextInstructionText)
    put("nextRoadName", nextRoadName)
    put("maneuverCode", maneuverCode)
    if (roundaboutExitNumber != null) put("roundaboutExitNumber", roundaboutExitNumber)
    put("stepDistanceMeters", stepDistanceMeters)
    put("remainingDistanceMeters", remainingDistanceMeters)
    put("remainingDurationSeconds", remainingDurationSeconds)
    put("finalRemainingDistanceMeters", finalRemainingDistanceMeters)
    put("finalRemainingDurationSeconds", finalRemainingDurationSeconds)
    put("isRerouting", isRerouting)
    put("needsNavigatorReconnect", needsNavigatorReconnect)
    put("guidanceFeedRegistered", guidanceFeedRegistered)
    put("versionSeq", versionSeq)
    put("updatedAtMs", updatedAtMs)
    if (lastError != null) put("lastError", lastError)
  }

  companion object {
    fun fromJson(obj: JSONObject): NavigationSessionSnapshot {
      val stops = if (obj.has("stops") && !obj.isNull("stops")) {
        val stopsArray = obj.optJSONArray("stops")
          ?: throw IllegalArgumentException("Persisted stops are malformed.")
        NavStop.parseStopList(stopsArray)
      } else {
        emptyList()
      }
      val roundaboutExit =
        if (obj.has("roundaboutExitNumber") && !obj.isNull("roundaboutExitNumber")) {
          obj.optInt("roundaboutExitNumber")
        } else {
          null
        }
      return NavigationSessionSnapshot(
        sessionId = obj.optString("sessionId", ""),
        tripId = obj.optString("tripId", ""),
        tripName = obj.optString("tripName", ""),
        status = NavigationSessionStatus.fromWire(obj.optString("status")),
        stops = stops,
        currentStopIndex = obj.optInt("currentStopIndex", 0),
        currentLegIndex = obj.optInt("currentLegIndex", 0),
        nextInstructionText = obj.optString("nextInstructionText", ""),
        nextRoadName = obj.optString("nextRoadName", ""),
        maneuverCode = obj.optInt("maneuverCode", SdkManeuver.UNKNOWN),
        roundaboutExitNumber = roundaboutExit,
        stepDistanceMeters = obj.optInt("stepDistanceMeters", 0),
        remainingDistanceMeters = obj.optInt("remainingDistanceMeters", 0),
        remainingDurationSeconds = obj.optInt("remainingDurationSeconds", 0),
        finalRemainingDistanceMeters = obj.optInt("finalRemainingDistanceMeters", 0),
        finalRemainingDurationSeconds = obj.optInt("finalRemainingDurationSeconds", 0),
        isRerouting = obj.optBoolean("isRerouting", false),
        needsNavigatorReconnect = obj.optBoolean("needsNavigatorReconnect", false),
        guidanceFeedRegistered = obj.optBoolean("guidanceFeedRegistered", false),
        versionSeq = obj.optLong("versionSeq", 0L),
        updatedAtMs = obj.optLong("updatedAtMs", 0L),
        lastError = obj.optString("lastError").takeIf { it.isNotBlank() },
      )
    }
  }
}

/**
 * Thread-safe, phone-owned single source of truth for active navigation state,
 * shared between React Native UI, Navigation SDK controller, and Android Auto.
 */
object NavigationSessionRepository {
  private const val PREFS_NAME = "myexplorer_nav_session"
  private const val KEY_SNAPSHOT = "snapshot_json"

  private val stateLock = Any()
  private val listeners = CopyOnWriteArraySet<(NavigationSessionSnapshot) -> Unit>()

  @Volatile
  private var current: NavigationSessionSnapshot = NavigationSessionSnapshot()

  @Volatile
  private var activeFeedGeneration: Long = 0L

  private var nextFeedGenerationSeq: Long = 0L

  @Volatile
  private var appContext: Context? = null

  fun beginFeedRegistration(): Long {
    synchronized(stateLock) {
      val gen = ++nextFeedGenerationSeq
      activeFeedGeneration = gen
      return gen
    }
  }

  fun invalidateFeedGeneration() {
    synchronized(stateLock) {
      activeFeedGeneration = 0L
    }
  }

  fun currentFeedGeneration(): Long = activeFeedGeneration

  fun init(context: Context) {
    synchronized(stateLock) {
      if (appContext != null) return
      appContext = context.applicationContext
      val raw = appContext
        ?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        ?.getString(KEY_SNAPSHOT, null)
      if (!raw.isNullOrBlank()) {
        runCatching { NavigationSessionSnapshot.fromJson(JSONObject(raw)) }
          .onSuccess { restored ->
            // After process death, an SDK navigator is not yet initialized; never claim ACTIVE
            // and never resurrect an ABANDONED or COMPLETED session.
            current = when (restored.status) {
              NavigationSessionStatus.ACTIVE,
              NavigationSessionStatus.PREPARING,
              NavigationSessionStatus.RECONNECTING -> restored
                .clearGuidanceFields()
                .copy(
                  status = NavigationSessionStatus.PAUSED,
                  isRerouting = false,
                  needsNavigatorReconnect = true,
                )
              else -> restored
            }
          }
          .onFailure { err ->
            // Preserve the raw SharedPreferences payload for investigation/retry;
            // never construct a partial trip from corrupt stop coordinates.
            current = NavigationSessionSnapshot(
              status = NavigationSessionStatus.PAUSED,
              needsNavigatorReconnect = true,
              lastError = err.message ?: "Failed to recover saved navigation stops.",
            )
          }
      }
    }
  }

  fun snapshot(): NavigationSessionSnapshot = current

  fun update(transform: (NavigationSessionSnapshot) -> NavigationSessionSnapshot): NavigationSessionSnapshot {
    val next: NavigationSessionSnapshot
    synchronized(stateLock) {
      val transformed = transform(current)
      next = transformed.copy(
        versionSeq = current.versionSeq + 1L,
        updatedAtMs = System.currentTimeMillis(),
      )
      current = next
      persistLocked(next)
    }
    listeners.forEach { it(next) }
    return next
  }

  /**
   * Applies TurnByTurn [NavState] and step telemetry only when [boundFeedGeneration]
   * matches the currently active feed registration, rejecting messages from older
   * route bindings.
   */
  fun applyNavInfoForFeedGeneration(
    boundFeedGeneration: Long,
    navState: Int,
    instructionText: String?,
    roadName: String?,
    maneuverCode: Int,
    roundaboutExitNumber: Int?,
    stepDistanceMeters: Int?,
    nextDestDistanceMeters: Int?,
    nextDestTimeSeconds: Int?,
    finalDestDistanceMeters: Int?,
    finalDestTimeSeconds: Int?,
  ): NavigationSessionSnapshot {
    if (boundFeedGeneration == 0L || boundFeedGeneration != activeFeedGeneration) {
      return current
    }
    return applyNavInfo(
      navState = navState,
      instructionText = instructionText,
      roadName = roadName,
      maneuverCode = maneuverCode,
      roundaboutExitNumber = roundaboutExitNumber,
      stepDistanceMeters = stepDistanceMeters,
      nextDestDistanceMeters = nextDestDistanceMeters,
      nextDestTimeSeconds = nextDestTimeSeconds,
      finalDestDistanceMeters = finalDestDistanceMeters,
      finalDestTimeSeconds = finalDestTimeSeconds,
    )
  }

  /**
   * Applies TurnByTurn [NavState] and step telemetry atomically, clearing obsolete
   * maneuver/road/distance data on REROUTING, STOPPED, or missing step, and ignoring
   * stale callbacks when the session is not in an active/reconnecting guidance state.
   */
  fun applyNavInfo(
    navState: Int,
    instructionText: String?,
    roadName: String?,
    maneuverCode: Int,
    roundaboutExitNumber: Int?,
    stepDistanceMeters: Int?,
    nextDestDistanceMeters: Int?,
    nextDestTimeSeconds: Int?,
    finalDestDistanceMeters: Int?,
    finalDestTimeSeconds: Int?,
  ): NavigationSessionSnapshot = update { snap ->
    if (!snap.status.isGuidanceReady()) {
      return@update snap
    }

    when (navState) {
      NavState.REROUTING -> snap.clearGuidanceFields().copy(
        status = NavigationSessionStatus.RECONNECTING,
        isRerouting = true,
        remainingDistanceMeters = nextDestDistanceMeters ?: 0,
        remainingDurationSeconds = nextDestTimeSeconds ?: 0,
        finalRemainingDistanceMeters = finalDestDistanceMeters ?: 0,
        finalRemainingDurationSeconds = finalDestTimeSeconds ?: 0,
      )

      NavState.STOPPED -> snap.clearGuidanceFields().copy(
        status = NavigationSessionStatus.PAUSED,
        isRerouting = false,
        remainingDistanceMeters = 0,
        remainingDurationSeconds = 0,
        finalRemainingDistanceMeters = 0,
        finalRemainingDurationSeconds = 0,
      )

      NavState.ENROUTE -> {
        val validInstruction = instructionText?.trim().orEmpty()
        if (validInstruction.isEmpty()) {
          snap.clearGuidanceFields().copy(
            status = NavigationSessionStatus.ACTIVE,
            isRerouting = false,
            remainingDistanceMeters = nextDestDistanceMeters ?: snap.remainingDistanceMeters,
            remainingDurationSeconds = nextDestTimeSeconds ?: snap.remainingDurationSeconds,
            finalRemainingDistanceMeters = finalDestDistanceMeters ?: snap.finalRemainingDistanceMeters,
            finalRemainingDurationSeconds = finalDestTimeSeconds ?: snap.finalRemainingDurationSeconds,
          )
        } else {
          snap.copy(
            status = NavigationSessionStatus.ACTIVE,
            isRerouting = false,
            needsNavigatorReconnect = false,
            nextInstructionText = validInstruction,
            nextRoadName = roadName?.trim().orEmpty(),
            maneuverCode = maneuverCode,
            roundaboutExitNumber = roundaboutExitNumber,
            stepDistanceMeters = (stepDistanceMeters ?: 0).coerceAtLeast(0),
            remainingDistanceMeters = (nextDestDistanceMeters ?: snap.remainingDistanceMeters).coerceAtLeast(0),
            remainingDurationSeconds = (nextDestTimeSeconds ?: snap.remainingDurationSeconds).coerceAtLeast(0),
            finalRemainingDistanceMeters = (finalDestDistanceMeters ?: snap.finalRemainingDistanceMeters).coerceAtLeast(0),
            finalRemainingDurationSeconds = (finalDestTimeSeconds ?: snap.finalRemainingDurationSeconds).coerceAtLeast(0),
          )
        }
      }

      else -> snap.clearGuidanceFields().copy(isRerouting = false)
    }
  }

  fun addListener(listener: (NavigationSessionSnapshot) -> Unit) {
    listeners.add(listener)
  }

  fun removeListener(listener: (NavigationSessionSnapshot) -> Unit) {
    listeners.remove(listener)
  }

  private fun persistLocked(snapshot: NavigationSessionSnapshot) {
    appContext
      ?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      ?.edit()
      ?.putString(KEY_SNAPSHOT, snapshot.toJson().toString())
      ?.apply()
  }
}
