package com.nuri.walk

import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import org.junit.Assert.*
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.Locale

class WalkProductCodecTest {
  private fun fixture(version: Int): ByteArray {
    val bytes = ByteArrayOutputStream()
    DataOutputStream(bytes).use { out ->
      out.writeInt(version)
      out.writeUTF("11111111-1111-4111-8111-111111111111")
      out.writeUTF("22222222-2222-4222-8222-222222222222")
      repeat(12) { out.writeLong(0) }
      out.writeInt(0)
      if (version == 2) out.writeUTF("""{"schemaVersion":1,"purpose":"PRODUCT","phase":"PREPARED","createdWallMs":"1000","reservationConfirmed":false,"payloadJson":null,"payloadDigest":null,"filteredDistanceM":null,"receiptJson":null,"routeErased":false,"routeDeletePending":false,"sessionDeletePending":false,"lastErrorCode":null}""")
    }
    return bytes.toByteArray()
  }

  @Test fun legacyV1ByteRoundtripAndTrailingBytesRemainStrict() {
    val old = fixture(1)
    assertArrayEquals(old, WalkCodec.encode(WalkCodec.decode(old)))
    try { WalkCodec.decode(old + byteArrayOf(0)); fail("Trailing bytes must reject") }
    catch (e: WalkFailure) { assertEquals("WALK_LOCAL_DATABASE_ERROR", e.code) }
  }

  @Test fun explicitV2ProductJournalSurvivesCodecRoundtrip() {
    val encoded = fixture(2)
    val decoded = WalkCodec.decode(encoded)
    // Internal journal JSON ordering is not the finish canonical-byte contract.
    assertEquals(WalkProductPhase.PREPARED, decoded.product?.phase)
    assertEquals(decoded, WalkCodec.decode(WalkCodec.encode(decoded)))
    assertNull(WalkCodec.decode(fixture(1)).product)
  }

  @Test fun finishedScalarPayloadMatchesDomainV1GoldenAndNeverDiagnosticDistance() {
    val start = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
      .parse("2026-10-13T00:00:00.000Z")!!.time
    val session = "11111111-1111-4111-8111-111111111111"
    val pet = "22222222-2222-4222-8222-222222222222"
    val meta = WalkMetadata(session, pet, start, 1, WalkTiming(1000, start, 1800000, 120000), finishedWall = start + 1920000,
      product = WalkProductJournal(createdWallMs = start, reservationConfirmed = true))
    val distance = WalkDistanceState(measuredM = 9999.9, acceptedM = 2430.99999, counts = listOf(5, 1, 1, 1, 1, 0, 1), segments = 1, gapMs = 1000, maxGapMs = 1000)
    val sealed = WalkProductFinish.seal(session, meta, distance)
    assertEquals("2430.99999", sealed.filteredDistanceM)
    assertEquals("dc77b2bc30280200bf5da43babce17b37134a090ec8f87c2e4c64dd72918b6fd", sealed.payloadDigest)
    assertEquals("2430", org.json.JSONObject(sealed.payloadJson!!).getString("measuredDistanceM"))
    assertFalse(sealed.payloadJson.contains("9999")); assertFalse(sealed.payloadJson.contains("latitude"))
    assertEquals(sealed, WalkProductFinish.seal(session, meta.copy(product = sealed, finishedWall = start + 9999999), distance))
    try { WalkProductFinish.seal(session, meta.copy(finishedWall = start + 1), distance); fail("Invalid clock must not clamp") }
    catch (e: WalkFailure) { assertEquals("WALK_CLOCK_DISCONTINUITY", e.code) }
    try { WalkProductFinish.seal(session, meta, distance.copy(legacySession = true)); fail("Legacy must not become product") }
    catch (e: WalkFailure) { assertEquals("WALK_PRODUCT_RESERVATION_REQUIRED", e.code) }
  }
}
