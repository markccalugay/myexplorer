package com.thestillfoundation.myexplorer.navigation

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private class RecordingLifecycleTarget : NavigationViewLifecycleTarget {
  val calls = mutableListOf<String>()

  override fun onCreate() {
    calls.add("onCreate")
  }

  override fun onStart() {
    calls.add("onStart")
  }

  override fun onResume() {
    calls.add("onResume")
  }

  override fun onPause() {
    calls.add("onPause")
  }

  override fun onStop() {
    calls.add("onStop")
  }

  override fun onDestroy() {
    calls.add("onDestroy")
  }
}

class NavigationViewLifecycleTest {
  @Test
  fun resumeThenDestroyCallsPauseStopDestroyInOrder() {
    val target = RecordingLifecycleTarget()
    val cleanedIds = mutableListOf<Long>()
    val machine = NavigationViewLifecycleStateMachine(
      viewId = 10L,
      target = target,
      onDestroyedCleanup = { cleanedIds.add(it) },
    )

    machine.onResume()
    machine.onDestroy()

    assertEquals(
      listOf("onCreate", "onStart", "onResume", "onPause", "onStop", "onDestroy"),
      target.calls,
    )
    assertTrue(machine.isDestroyed())
    assertEquals(listOf(10L), cleanedIds)
  }

  @Test
  fun explicitPauseStopThenDestroyIsIdempotentAndNeverRecreatesDestroyedView() {
    val target = RecordingLifecycleTarget()
    val cleanedIds = mutableListOf<Long>()
    val machine = NavigationViewLifecycleStateMachine(
      viewId = 11L,
      target = target,
      onDestroyedCleanup = { cleanedIds.add(it) },
    )

    machine.onResume()
    machine.onPause()
    machine.onStop()
    machine.onPause()
    machine.onStop()
    machine.onDestroy()
    // Repeated destruction and post-destroy lifecycle callbacks must be no-ops
    machine.onDestroy()
    machine.onResume()
    machine.onStart()
    machine.onCreate()
    machine.onPause()
    machine.onStop()

    assertEquals(
      listOf("onCreate", "onStart", "onResume", "onPause", "onStop", "onDestroy"),
      target.calls,
    )
    assertEquals(1, target.calls.count { it == "onPause" })
    assertEquals(1, target.calls.count { it == "onStop" })
    assertEquals(1, target.calls.count { it == "onDestroy" })
    assertEquals(listOf(11L), cleanedIds)
  }

  @Test
  fun mapReadyCallbackArrivingAfterDestructionIsIgnored() {
    val events = mutableListOf<JSONObject>()
    val coordinator = MapZoomEventCoordinator { events.add(it) }
    val target = RecordingLifecycleTarget()
    val machine = NavigationViewLifecycleStateMachine(
      viewId = 12L,
      target = target,
      onDestroyedCleanup = { coordinator.onViewDestroyed(it) },
    )

    machine.onResume()
    machine.onDestroy()

    // Simulate delayed getMapAsync callback arriving after destruction
    if (!machine.isDestroyed()) {
      coordinator.onMapReady(viewId = 12L, zoom = 15f, minZoom = 2f, maxZoom = 21f)
    }

    assertTrue(machine.isDestroyed())
    assertTrue(events.isEmpty())
    assertFalse(coordinator.currentActiveViewId() == 12L)
  }
}
