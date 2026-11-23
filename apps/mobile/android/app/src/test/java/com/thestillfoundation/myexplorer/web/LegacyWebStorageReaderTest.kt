package com.thestillfoundation.myexplorer.web

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LegacyWebStorageReaderTest {
  @Test
  fun parseRawEvaluateResultHandlesSuccessMissingOriginMismatchMalformedAndInterrupted() {
    // 1. Valid payload from allowed origin
    val validInner = JSONObject().apply {
      put("status", "ok")
      put("origin", "https://myexplorer-travel.vercel.app")
      put("savedTripsJson", """[{"id":"t1","name":"Manila","stops":[]}]""")
      put("navSessionJson", JSONObject.NULL)
    }.toString()
    val validQuoted = JSONObject.quote(validInner)
    val ok = LegacyWebStorageReader.parseRawEvaluateResult(validQuoted)
    assertTrue(ok is LegacyWebStorageReader.ReadResult.Success)
    ok as LegacyWebStorageReader.ReadResult.Success
    assertEquals("""[{"id":"t1","name":"Manila","stops":[]}]""", ok.savedTripsJson)
    assertEquals(null, ok.navSessionJson)

    // 2. Origin mismatch rejected
    val badOriginInner = JSONObject().apply {
      put("status", "ok")
      put("origin", "https://evil.example.com")
      put("savedTripsJson", "[]")
    }.toString()
    val rejected = LegacyWebStorageReader.parseRawEvaluateResult(JSONObject.quote(badOriginInner))
    assertTrue(rejected is LegacyWebStorageReader.ReadResult.OriginRejected)

    // 3. Missing storage / empty keys
    val emptyInner = JSONObject().apply {
      put("status", "ok")
      put("origin", "https://myexplorer-travel.vercel.app")
      put("savedTripsJson", JSONObject.NULL)
      put("navSessionJson", JSONObject.NULL)
    }.toString()
    val missing = LegacyWebStorageReader.parseRawEvaluateResult(JSONObject.quote(emptyInner))
    assertTrue(missing is LegacyWebStorageReader.ReadResult.MissingStorage)

    // 4. Malformed payload
    val malformed = LegacyWebStorageReader.parseRawEvaluateResult(JSONObject.quote("not-json"))
    assertTrue(malformed is LegacyWebStorageReader.ReadResult.MalformedPayload)

    // 5. Interrupted / null evaluate result
    val interrupted = LegacyWebStorageReader.parseRawEvaluateResult("null")
    assertTrue(interrupted is LegacyWebStorageReader.ReadResult.Interrupted)
  }
}
