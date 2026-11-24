package com.thestillfoundation.myexplorer.navigation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PreTripMapPayloadParserTest {
  @Test
  fun parseStopsFiltersInvalidAndOutOfBoundsCoordinates() {
    val json = """
      [
        {"id":"s1","name":"Manila","lat":14.5995,"lng":120.9842,"type":"start","order":1},
        {"id":"bad-lat","name":"Bad Lat","lat":95.0,"lng":120.0,"type":"stop","order":2},
        {"id":"bad-lng","name":"Bad Lng","lat":14.0,"lng":-181.0,"type":"stop","order":3},
        {"id":"s2","name":"Tagaytay","lat":14.1153,"lng":120.9621,"type":"destination","order":4}
      ]
    """.trimIndent()

    val parsed = PreTripMapPayloadParser.parseStops(json)
    assertEquals(2, parsed.size)
    assertEquals("s1", parsed[0].id)
    assertEquals("Manila", parsed[0].name)
    assertEquals("s2", parsed[1].id)
    assertEquals("Tagaytay", parsed[1].name)
  }

  @Test
  fun parseStopsHandlesNullAndMalformedJson() {
    assertTrue(PreTripMapPayloadParser.parseStops(null).isEmpty())
    assertTrue(PreTripMapPayloadParser.parseStops("{not-an-array").isEmpty())
  }

  @Test
  fun decodePolylineDecodesValidAndRejectsTruncatedOrBlank() {
    val points = PreTripMapPayloadParser.decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
    assertEquals(3, points.size)
    assertEquals(38.5, points[0].latitude, 0.001)
    assertEquals(-120.2, points[0].longitude, 0.001)
    assertEquals(43.252, points[2].latitude, 0.001)
    assertEquals(-126.453, points[2].longitude, 0.001)

    assertTrue(PreTripMapPayloadParser.decodePolyline(null).isEmpty())
    assertTrue(PreTripMapPayloadParser.decodePolyline("").isEmpty())
    assertTrue(PreTripMapPayloadParser.decodePolyline("_p~iF~ps").isEmpty())
  }
}
