package com.thestillfoundation.myexplorer.auto

import com.thestillfoundation.myexplorer.navigation.MainThreadDispatcher
import com.thestillfoundation.myexplorer.navigation.NavigationSessionSnapshot
import com.thestillfoundation.myexplorer.navigation.NavigationSessionStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class CarHostUpdateCoordinatorTest {
  @Test
  fun dispatchesOnMainThreadOrdersSnapshotsAndStopsOnTeardown() {
    val mainQueue = ArrayDeque<Runnable>()
    val dispatcher = MainThreadDispatcher { block -> mainQueue.addLast(Runnable { block() }) }

    var startedCount = 0
    var endedCount = 0
    var invalidateCount = 0

    val coordinator = CarHostUpdateCoordinator(
      mainDispatcher = dispatcher,
      onNavigationStarted = { startedCount++ },
      onNavigationEnded = { endedCount++ },
      onInvalidateScreen = { invalidateCount++ },
    )

    coordinator.onScreenStarted(NavigationSessionSnapshot(status = NavigationSessionStatus.IDLE, versionSeq = 1))
    mainQueue.removeFirst().run()
    assertEquals(0, startedCount)
    assertEquals(1, invalidateCount)

    // Simulate bridge-originated start -> pause -> end, plus out-of-order delayed snapshot
    coordinator.onSnapshotChanged(NavigationSessionSnapshot(status = NavigationSessionStatus.ACTIVE, versionSeq = 3))
    coordinator.onSnapshotChanged(NavigationSessionSnapshot(status = NavigationSessionStatus.PAUSED, versionSeq = 2))
    coordinator.onSnapshotChanged(NavigationSessionSnapshot(status = NavigationSessionStatus.ABANDONED, versionSeq = 4))

    while (mainQueue.isNotEmpty()) {
      mainQueue.removeFirst().run()
    }

    assertEquals(1, startedCount)
    assertEquals(1, endedCount)
    assertEquals(3, invalidateCount)

    // Queue an update and then stop the screen before main thread drains it
    coordinator.onSnapshotChanged(NavigationSessionSnapshot(status = NavigationSessionStatus.ACTIVE, versionSeq = 5))
    coordinator.onScreenStopped()

    while (mainQueue.isNotEmpty()) {
      mainQueue.removeFirst().run()
    }

    assertEquals(1, startedCount)
    assertEquals(3, invalidateCount)
  }

  @Test
  fun isolatesQueuedCallbacksAcrossScreenLifecycleRestart() {
    val mainQueue = ArrayDeque<Runnable>()
    val dispatcher = MainThreadDispatcher { block -> mainQueue.addLast(Runnable { block() }) }

    var startedCount = 0
    var endedCount = 0
    var invalidateCount = 0

    val coordinator = CarHostUpdateCoordinator(
      mainDispatcher = dispatcher,
      onNavigationStarted = { startedCount++ },
      onNavigationEnded = { endedCount++ },
      onInvalidateScreen = { invalidateCount++ },
    )

    // 1. Start lifecycle A and drain its initial callback
    coordinator.onScreenStarted(NavigationSessionSnapshot(status = NavigationSessionStatus.IDLE, versionSeq = 1))
    mainQueue.removeFirst().run()
    assertEquals(1, invalidateCount)

    // Queue an ACTIVE update during lifecycle A
    coordinator.onSnapshotChanged(NavigationSessionSnapshot(status = NavigationSessionStatus.ACTIVE, versionSeq = 2))
    val queuedFromA = mainQueue.removeFirst()

    // 2. Stop A, then start lifecycle B before draining A's queued callback
    coordinator.onScreenStopped()
    coordinator.onScreenStarted(NavigationSessionSnapshot(status = NavigationSessionStatus.IDLE, versionSeq = 10))
    val initialFromB = mainQueue.removeFirst()

    // 3. Execute A's queued callback before B's initial callback -> must be rejected
    queuedFromA.run()
    assertEquals(0, startedCount)
    assertEquals(1, invalidateCount)

    // 4. B's initial and current updates work
    initialFromB.run()
    assertEquals(2, invalidateCount)

    coordinator.onSnapshotChanged(NavigationSessionSnapshot(status = NavigationSessionStatus.ACTIVE, versionSeq = 12))
    mainQueue.removeFirst().run()
    assertEquals(1, startedCount)
    assertEquals(3, invalidateCount)

    // 5. Out-of-order current-lifecycle snapshot (seq 11 < 12) is rejected
    coordinator.onSnapshotChanged(NavigationSessionSnapshot(status = NavigationSessionStatus.PAUSED, versionSeq = 11))
    mainQueue.removeFirst().run()
    assertEquals(0, endedCount)
    assertEquals(3, invalidateCount)
  }
}
