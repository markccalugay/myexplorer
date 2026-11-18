package com.thestillfoundation.myexplorer.navigation

import com.google.android.libraries.mapsplatform.turnbyturn.model.Maneuver as SdkManeuver
import com.google.android.libraries.mapsplatform.turnbyturn.model.NavState
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

private class FakeNavigatorHandle : NavigatorHandle {
  var pendingRouteCallback: ((SdkRouteStatus) -> Unit)? = null
  var startGuidanceCalls = 0
  var stopGuidanceCalls = 0
  var clearDestinationsCalls = 0
  var registerFeedCalls = 0
  var unregisterFeedCalls = 0
  var continueToNextDestinationCalls = 0
  var feedShouldSucceed = true
  var arrivalListenerCount = 0
  var timeDistanceListenerCount = 0
  var timeAndDistance: Pair<Int, Int>? = 1000 to 120

  private var arrivalListener: ((SdkArrivalInfo) -> Unit)? = null
  private var timeDistanceListener: (() -> Unit)? = null

  override fun setDestinations(waypoints: List<NavStop>, onResult: (SdkRouteStatus) -> Unit) {
    pendingRouteCallback = onResult
  }

  override fun startGuidance() {
    startGuidanceCalls++
  }

  override fun stopGuidance() {
    stopGuidanceCalls++
  }

  override fun clearDestinations() {
    clearDestinationsCalls++
  }

  override fun continueToNextDestination() {
    continueToNextDestinationCalls++
  }

  override fun setVoiceGuidanceEnabled() {}

  override fun currentTimeAndDistance(): Pair<Int, Int>? = timeAndDistance

  override fun setArrivalListener(listener: (SdkArrivalInfo) -> Unit) {
    arrivalListenerCount++
    arrivalListener = listener
  }

  override fun setTimeDistanceListener(listener: () -> Unit) {
    timeDistanceListenerCount++
    timeDistanceListener = listener
  }

  override fun registerGuidanceFeed(): Boolean {
    registerFeedCalls++
    return feedShouldSucceed
  }

  override fun unregisterGuidanceFeed() {
    unregisterFeedCalls++
  }

  fun fireArrival(info: SdkArrivalInfo) {
    arrivalListener?.invoke(info)
  }

  fun fireTimeDistance() {
    timeDistanceListener?.invoke()
  }
}

private class FakeNavigationEnvironment(
  private val nav: FakeNavigatorHandle,
) : NavigationEnvironment {
  var hasPermission = true
  var termsAccepted = true
  var foregroundStartResult: Result<Unit> = Result.success(Unit)
  var pendingAcquireCallback: ((Result<NavigatorHandle>) -> Unit)? = null
  var autoCompleteAcquire = true
  var startForegroundServiceCalls = 0
  var stopForegroundServiceCalls = 0

  override fun hasPreciseLocationPermission(): Boolean = hasPermission

  override fun areTermsAccepted(): Boolean = termsAccepted

  override fun showTermsDialog(title: String, onResult: (Boolean) -> Unit) {
    onResult(termsAccepted)
  }

  override fun acquireNavigator(onResult: (Result<NavigatorHandle>) -> Unit) {
    if (autoCompleteAcquire) {
      onResult(Result.success(nav))
    } else {
      pendingAcquireCallback = onResult
    }
  }

  override fun startForegroundService(): Result<Unit> {
    startForegroundServiceCalls++
    return foregroundStartResult
  }

  override fun stopForegroundService() {
    stopForegroundServiceCalls++
  }
}

class NavigationControllerTest {
  private lateinit var fakeNav: FakeNavigatorHandle
  private lateinit var fakeEnv: FakeNavigationEnvironment

  private val trip1Stops = listOf(
    NavStop("s1", "Origin 1", null, 14.5995, 120.9842, "start"),
    NavStop("s2", "Dest 1", null, 14.1153, 120.9621, "destination"),
  )

  private val trip2Stops = listOf(
    NavStop("s3", "Origin 2", null, 14.6500, 121.0500, "start"),
    NavStop("s4", "Dest 2", null, 15.1450, 120.5887, "destination"),
  )

  @Before
  fun setUp() {
    fakeNav = FakeNavigatorHandle()
    fakeEnv = FakeNavigationEnvironment(fakeNav)
    NavigationController.configureForTest(MainThreadDispatcher { it() })
    NavigationSessionRepository.update { NavigationSessionSnapshot() }
  }

  @After
  fun tearDown() {
    NavigationController.resetForProd()
  }

  @Test
  fun pendingStartThenEndPreventsStaleRouteFromStartingGuidance() {
    var startResult: Result<NavigationSessionSnapshot>? = null
    NavigationController.startTripNavigationWithEnv(
      fakeEnv,
      "trip-1",
      "Trip 1",
      trip1Stops,
    ) { startResult = it }

    assertEquals(NavigationSessionStatus.PREPARING, NavigationSessionRepository.snapshot().status)
    assertNotNull(fakeNav.pendingRouteCallback)

    val stopped = NavigationController.stopNavigationWithEnv(fakeEnv)
    assertEquals(NavigationSessionStatus.ABANDONED, stopped.status)

    // Stale route calculation finishes after End Navigation
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)

    assertEquals(0, fakeNav.startGuidanceCalls)
    assertEquals(NavigationSessionStatus.ABANDONED, NavigationSessionRepository.snapshot().status)
    assertTrue(startResult?.isFailure == true)
  }

  @Test
  fun pendingResumeThenEndPreventsResurrectingEndedSession() {
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-1", "Trip 1", trip1Stops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)

    NavigationController.pauseNavigationWithEnv(fakeEnv)
    assertEquals(NavigationSessionStatus.PAUSED, NavigationSessionRepository.snapshot().status)

    var resumeResult: Result<NavigationSessionSnapshot>? = null
    NavigationController.resumeNavigationWithEnv(fakeEnv) { resumeResult = it }
    assertEquals(NavigationSessionStatus.RECONNECTING, NavigationSessionRepository.snapshot().status)

    NavigationController.stopNavigationWithEnv(fakeEnv)
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)

    assertEquals(1, fakeNav.startGuidanceCalls)
    assertEquals(NavigationSessionStatus.ABANDONED, NavigationSessionRepository.snapshot().status)
    assertTrue(resumeResult?.isFailure == true)
  }

  @Test
  fun replacementTripIgnoresPreparingGuidanceEventsAndOldRouteArrival() {
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-1", "Trip 1", trip1Stops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)

    // Start replacement Trip 2; while PREPARING, feed is unregistered and active telemetry is ignored
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-2", "Trip 2", trip2Stops) {}
    assertEquals(NavigationSessionStatus.PREPARING, NavigationSessionRepository.snapshot().status)
    assertTrue(fakeNav.unregisterFeedCalls >= 1)

    NavigationSessionRepository.applyNavInfo(
      navState = NavState.ENROUTE,
      instructionText = "Old Trip 1 turn",
      roadName = "Old Rd",
      maneuverCode = SdkManeuver.TURN_LEFT,
      roundaboutExitNumber = null,
      stepDistanceMeters = 100,
      nextDestDistanceMeters = 500,
      nextDestTimeSeconds = 60,
      finalDestDistanceMeters = 500,
      finalDestTimeSeconds = 60,
    )
    assertEquals("", NavigationSessionRepository.snapshot().nextInstructionText)

    fakeNav.fireTimeDistance()
    assertEquals(0, NavigationSessionRepository.snapshot().remainingDistanceMeters)

    // Activate Trip 2
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)

    // Arrival for Trip 1's destination must not complete Trip 2
    fakeNav.fireArrival(SdkArrivalInfo("Dest 1", 14.1153, 120.9621))
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)

    // Arrival for Trip 2's destination completes Trip 2
    fakeNav.fireArrival(SdkArrivalInfo("Dest 2", 15.1450, 120.5887))
    assertEquals(NavigationSessionStatus.COMPLETED, NavigationSessionRepository.snapshot().status)
  }

  @Test
  fun guidanceFeedFailureIsRecoverableWithoutDuplicateListeners() {
    fakeNav.feedShouldSucceed = false
    var firstResult: Result<NavigationSessionSnapshot>? = null
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-1", "Trip 1", trip1Stops) {
      firstResult = it
    }
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)

    assertTrue(firstResult?.isFailure == true)
    var snap = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.PAUSED, snap.status)
    assertFalse(snap.guidanceFeedRegistered)
    assertNotNull(snap.lastError)
    assertEquals(0, fakeNav.startGuidanceCalls)
    assertEquals(1, fakeNav.arrivalListenerCount)

    // Repeated failure stays PAUSED with error and no duplicate listeners
    NavigationController.resumeNavigationWithEnv(fakeEnv) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    snap = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.PAUSED, snap.status)
    assertFalse(snap.guidanceFeedRegistered)
    assertNotNull(snap.lastError)
    assertEquals(1, fakeNav.arrivalListenerCount)

    // Retry succeeds -> ACTIVE, clears error, still only 1 SDK listener
    fakeNav.feedShouldSucceed = true
    NavigationController.resumeNavigationWithEnv(fakeEnv) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    snap = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.ACTIVE, snap.status)
    assertTrue(snap.guidanceFeedRegistered)
    assertNull(snap.lastError)
    assertEquals(1, fakeNav.startGuidanceCalls)
    assertEquals(1, fakeNav.arrivalListenerCount)
  }

  @Test
  fun oldFeedMessagesRejectedAfterRouteReplacement() {
    // 1. Activate trip A and capture its bound feed receiver
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-a", "Trip A", trip1Stops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)
    val feedA = BoundFeedReceiver(NavigationSessionRepository.currentFeedGeneration())

    // 2. Replace A with B and fully activate B
    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-b", "Trip B", trip2Stops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)
    val feedB = BoundFeedReceiver(NavigationSessionRepository.currentFeedGeneration())

    // Seed B with known good instruction, maneuver, and estimates
    feedB.onNavInfo(
      navState = NavState.ENROUTE,
      instructionText = "Turn right onto NLEX",
      roadName = "NLEX",
      maneuverCode = SdkManeuver.TURN_RIGHT,
      roundaboutExitNumber = null,
      stepDistanceMeters = 300,
      nextDestDistanceMeters = 12000,
      nextDestTimeSeconds = 900,
      finalDestDistanceMeters = 12000,
      finalDestTimeSeconds = 900,
    )

    // 3. Deliver retained instruction message and STOPPED message from A
    feedA.onNavInfo(
      navState = NavState.ENROUTE,
      instructionText = "Old Trip A turn left",
      roadName = "Old Rd",
      maneuverCode = SdkManeuver.TURN_LEFT,
      roundaboutExitNumber = null,
      stepDistanceMeters = 50,
      nextDestDistanceMeters = 100,
      nextDestTimeSeconds = 10,
      finalDestDistanceMeters = 100,
      finalDestTimeSeconds = 10,
    )
    feedA.onNavInfo(
      navState = NavState.STOPPED,
      instructionText = null,
      roadName = null,
      maneuverCode = SdkManeuver.UNKNOWN,
      roundaboutExitNumber = null,
      stepDistanceMeters = null,
      nextDestDistanceMeters = null,
      nextDestTimeSeconds = null,
      finalDestDistanceMeters = null,
      finalDestTimeSeconds = null,
    )

    // 4. Assert B remains active and unchanged
    val snapAfterOld = NavigationSessionRepository.snapshot()
    assertEquals("trip-b", snapAfterOld.tripId)
    assertEquals(NavigationSessionStatus.ACTIVE, snapAfterOld.status)
    assertEquals("Turn right onto NLEX", snapAfterOld.nextInstructionText)
    assertEquals(SdkManeuver.TURN_RIGHT, snapAfterOld.maneuverCode)
    assertEquals(12000, snapAfterOld.remainingDistanceMeters)
    assertEquals(900, snapAfterOld.remainingDurationSeconds)
    assertEquals(1, snapAfterOld.currentStopIndex)

    // 5. Assert current-B messages (including REROUTING) still apply
    feedB.onNavInfo(
      navState = NavState.REROUTING,
      instructionText = null,
      roadName = null,
      maneuverCode = SdkManeuver.UNKNOWN,
      roundaboutExitNumber = null,
      stepDistanceMeters = null,
      nextDestDistanceMeters = 12500,
      nextDestTimeSeconds = 950,
      finalDestDistanceMeters = 12500,
      finalDestTimeSeconds = 950,
    )
    val snapRerouting = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.RECONNECTING, snapRerouting.status)
    assertTrue(snapRerouting.isRerouting)
    assertEquals("", snapRerouting.nextInstructionText)
  }

  @Test
  fun intermediateAndFinalArrivalManageForegroundServiceAndDuplicateCompletion() {
    val multiStops = listOf(
      NavStop("s1", "Start", null, 14.5995, 120.9842, "start"),
      NavStop("s2", "Mid Stop", null, 14.3000, 120.9700, "stop"),
      NavStop("s3", "Final Dest", null, 14.1153, 120.9621, "destination"),
    )

    NavigationController.startTripNavigationWithEnv(fakeEnv, "trip-multi", "Multi", multiStops) {}
    fakeNav.pendingRouteCallback?.invoke(SdkRouteStatus.OK)
    assertEquals(NavigationSessionStatus.ACTIVE, NavigationSessionRepository.snapshot().status)
    val stopsBefore = fakeEnv.stopForegroundServiceCalls

    // Intermediate arrival advances stop without stopping foreground service
    fakeNav.fireArrival(SdkArrivalInfo("Mid Stop", 14.3000, 120.9700))
    val afterMid = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.ACTIVE, afterMid.status)
    assertEquals(2, afterMid.currentStopIndex)
    assertEquals(1, fakeNav.continueToNextDestinationCalls)
    assertEquals(stopsBefore, fakeEnv.stopForegroundServiceCalls)

    // Final arrival stops guidance, unregisters feed, and stops foreground service
    fakeNav.fireArrival(SdkArrivalInfo("Final Dest", 14.1153, 120.9621))
    val afterFinal = NavigationSessionRepository.snapshot()
    assertEquals(NavigationSessionStatus.COMPLETED, afterFinal.status)
    assertEquals(0, afterFinal.remainingDistanceMeters)
    assertEquals(0, afterFinal.remainingDurationSeconds)
    assertFalse(afterFinal.guidanceFeedRegistered)
    assertEquals(stopsBefore + 1, fakeEnv.stopForegroundServiceCalls)
    assertTrue(fakeNav.unregisterFeedCalls >= 1)

    // Duplicate completion is safe and does not restart guidance or corrupt COMPLETED
    fakeNav.fireArrival(SdkArrivalInfo("Final Dest", 14.1153, 120.9621))
    assertEquals(NavigationSessionStatus.COMPLETED, NavigationSessionRepository.snapshot().status)
    assertEquals(1, fakeNav.startGuidanceCalls)
  }
}
