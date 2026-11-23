package com.thestillfoundation.myexplorer.navigation

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MapZoomEventCoordinatorTest {
  @Test
  fun mapReadyCameraChangesDeduplicationAndStaleDestroyedViewSafety() {
    val events = mutableListOf<JSONObject>()
    val coordinator = MapZoomEventCoordinator { events.add(it) }

    // 1. View 1 becomes ready
    coordinator.onMapReady(viewId = 1L, zoom = 15.0f, minZoom = 2.0f, maxZoom = 21.0f)
    assertEquals(1, events.size)
    assertTrue(events.last().getBoolean("available"))
    assertEquals(15.0, events.last().getDouble("zoom"), 0.01)

    // 2. Pan-only camera idle with unchanged zoom does NOT emit duplicate event
    coordinator.onCameraZoomIdle(viewId = 1L, zoom = 15.0f, minZoom = 2.0f, maxZoom = 21.0f)
    assertEquals(1, events.size)

    // 3. Zoom to max boundary emits, and zooming back away emits recovery
    coordinator.onCameraZoomIdle(viewId = 1L, zoom = 21.0f, minZoom = 2.0f, maxZoom = 21.0f)
    assertEquals(2, events.size)
    assertEquals(21.0, events.last().getDouble("zoom"), 0.01)

    coordinator.onCameraZoomIdle(viewId = 1L, zoom = 18.5f, minZoom = 2.0f, maxZoom = 21.0f)
    assertEquals(3, events.size)
    assertEquals(18.5, events.last().getDouble("zoom"), 0.01)

    // 4. Recreated View 2 becomes ready; destroying old View 1 must NOT clobber View 2
    coordinator.onMapReady(viewId = 2L, zoom = 12.0f, minZoom = 2.0f, maxZoom = 21.0f)
    assertEquals(4, events.size)
    coordinator.onViewDestroyed(viewId = 1L)
    assertEquals(4, events.size)
    assertEquals(2L, coordinator.currentActiveViewId())

    // Late camera idle from destroyed View 1 is ignored
    coordinator.onCameraZoomIdle(viewId = 1L, zoom = 5.0f, minZoom = 2.0f, maxZoom = 21.0f)
    assertEquals(4, events.size)

    // 5. Destroying active View 2 emits available=false
    coordinator.onViewDestroyed(viewId = 2L)
    assertEquals(5, events.size)
    assertFalse(events.last().getBoolean("available"))
    assertEquals(0L, coordinator.currentActiveViewId())
  }
}
