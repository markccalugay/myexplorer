package com.thestillfoundation.myexplorer.auto

import com.thestillfoundation.myexplorer.navigation.MainThreadDispatcher
import com.thestillfoundation.myexplorer.navigation.NavigationSessionSnapshot
import java.util.concurrent.atomic.AtomicLong

/**
 * Ensures all Android Auto [NavigationManager] and [Screen.invalidate] updates
 * execute on the main thread, reject callbacks queued during stopped/previous
 * screen lifecycles, and preserve [NavigationSessionSnapshot.versionSeq] ordering
 * within the active lifecycle.
 */
class CarHostUpdateCoordinator(
  private val mainDispatcher: MainThreadDispatcher,
  private val onNavigationStarted: () -> Unit,
  private val onNavigationEnded: () -> Unit,
  private val onInvalidateScreen: () -> Unit,
) {
  private val lifecycleSeq = AtomicLong(0L)

  @Volatile
  private var activeLifecycleGen: Long = 0L

  private var carNavigationStarted = false
  private var latestAppliedSeq = -1L

  fun onScreenStarted(initialSnapshot: NavigationSessionSnapshot) {
    val gen = lifecycleSeq.incrementAndGet()
    activeLifecycleGen = gen
    mainDispatcher.post {
      if (activeLifecycleGen != gen) return@post
      latestAppliedSeq = -1L
      applySnapshotOnMainThread(initialSnapshot)
    }
  }

  fun onScreenStopped() {
    activeLifecycleGen = 0L
  }

  fun onSnapshotChanged(snapshot: NavigationSessionSnapshot) {
    val capturedGen = activeLifecycleGen
    if (capturedGen == 0L) return
    mainDispatcher.post {
      if (activeLifecycleGen != capturedGen) return@post
      applySnapshotOnMainThread(snapshot)
    }
  }

  private fun applySnapshotOnMainThread(snapshot: NavigationSessionSnapshot) {
    if (snapshot.versionSeq < latestAppliedSeq) return
    latestAppliedSeq = snapshot.versionSeq

    val shouldBeStarted = snapshot.status.isRunnable()
    if (shouldBeStarted && !carNavigationStarted) {
      runCatching {
        onNavigationStarted()
        carNavigationStarted = true
      }
    } else if (!shouldBeStarted && carNavigationStarted) {
      runCatching {
        onNavigationEnded()
        carNavigationStarted = false
      }
    }

    onInvalidateScreen()
  }
}
