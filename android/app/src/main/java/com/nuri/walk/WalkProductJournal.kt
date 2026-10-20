package com.nuri.walk

import java.math.BigDecimal
import java.math.RoundingMode
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.GregorianCalendar
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import org.json.JSONObject

// This journal is encrypted INSIDE metadata/finish envelopes, not a new runtime
// state machine or a plaintext Room owner/pet/finish queue.
enum class WalkProductPhase {
  PREPARED, RESERVED, START_REQUESTED, START_FAILED, RUNNING,
  FINISH_PENDING, FINISH_INVALID, CANCEL_PENDING, RESOLVED,
}

data class WalkProductJournal(
  val phase: WalkProductPhase = WalkProductPhase.PREPARED,
  val createdWallMs: Long,
  val reservationConfirmed: Boolean = false,
  val payloadJson: String? = null,
  val payloadDigest: String? = null,
  val filteredDistanceM: String? = null,
  val receiptJson: String? = null,
  val routeErased: Boolean = false,
  val routeDeletePending: Boolean = false,
  val sessionDeletePending: Boolean = false,
  val lastErrorCode: String? = null,
) {
  val pending get() = phase != WalkProductPhase.RESOLVED || routeDeletePending || sessionDeletePending
  override fun toString() = "WalkProductJournal(redacted)"
  fun encode(): String = JSONObject().apply {
    put("schemaVersion", 1); put("purpose", "PRODUCT"); put("phase", phase.name)
    put("createdWallMs", createdWallMs.toString()); put("reservationConfirmed", reservationConfirmed)
    put("payloadJson", payloadJson ?: JSONObject.NULL); put("payloadDigest", payloadDigest ?: JSONObject.NULL)
    put("filteredDistanceM", filteredDistanceM ?: JSONObject.NULL); put("receiptJson", receiptJson ?: JSONObject.NULL)
    put("routeErased", routeErased); put("routeDeletePending", routeDeletePending)
    put("sessionDeletePending", sessionDeletePending); put("lastErrorCode", lastErrorCode ?: JSONObject.NULL)
  }.toString()

  companion object {
    fun decode(raw: String): WalkProductJournal {
      if (raw.length > 32768) throw WalkFailure("WALK_LOCAL_DATABASE_ERROR")
      val v = JSONObject(raw)
      productExact(v, setOf("schemaVersion", "purpose", "phase", "createdWallMs", "reservationConfirmed",
        "payloadJson", "payloadDigest", "filteredDistanceM", "receiptJson", "routeErased",
        "routeDeletePending", "sessionDeletePending", "lastErrorCode"))
      if (v.get("schemaVersion") != 1 || v.get("purpose") != "PRODUCT") throw WalkFailure("WALK_LOCAL_DATABASE_ERROR")
      val result = WalkProductJournal(WalkProductPhase.valueOf(productString(v, "phase")),
        productDecimal(productString(v, "createdWallMs")), productBoolean(v, "reservationConfirmed"),
        productNullable(v, "payloadJson"), productNullable(v, "payloadDigest"),
        productNullable(v, "filteredDistanceM"), productNullable(v, "receiptJson"),
        productBoolean(v, "routeErased"), productBoolean(v, "routeDeletePending"),
        productBoolean(v, "sessionDeletePending"), productNullable(v, "lastErrorCode"))
      if ((result.payloadJson == null) != (result.payloadDigest == null)
        || (result.payloadJson == null) != (result.filteredDistanceM == null)
        || (result.payloadJson != null && (result.payloadJson.length > 8192 || productDigest(result.payloadJson) != result.payloadDigest))
        || (result.lastErrorCode != null && !Regex("WALK_[A-Z0-9_]{1,72}").matches(result.lastErrorCode)))
        throw WalkFailure("WALK_LOCAL_DATABASE_ERROR")
      result.receiptJson?.let { WalkProductReceipt.decode(it) }
      if (result.phase == WalkProductPhase.FINISH_PENDING && result.payloadJson == null)
        throw WalkFailure("WALK_LOCAL_DATABASE_ERROR")
      if (result.phase == WalkProductPhase.RESOLVED && result.receiptJson?.let { WalkProductReceipt.decode(it).terminal } != true)
        throw WalkFailure("WALK_LOCAL_DATABASE_ERROR")
      return result
    }
  }
}

internal fun productExact(v: JSONObject, keys: Set<String>) {
  if (v.keys().asSequence().toSet() != keys) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
}
internal fun productString(v: JSONObject, key: String): String = (v.get(key) as? String)
  ?: throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
internal fun productBoolean(v: JSONObject, key: String): Boolean = (v.get(key) as? Boolean)
  ?: throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
internal fun productNullable(v: JSONObject, key: String): String? = if (v.get(key) == JSONObject.NULL) null else productString(v, key)
internal fun productDecimal(value: String): Long = value.takeIf { Regex("0|[1-9][0-9]*").matches(it) }
  ?.toLongOrNull()?.takeIf { it >= 0 } ?: throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
internal fun productUuid(value: String): String = try {
  UUID.fromString(value).toString().also { if (it != value) throw WalkFailure("WALK_INVALID_IDENTIFIER") }
} catch (_: Exception) { throw WalkFailure("WALK_INVALID_IDENTIFIER") }
internal fun productDigest(value: String): String = MessageDigest.getInstance("SHA-256")
  .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
internal fun productIso(wall: Long): String {
  val result = productDateFormat().format(Date(wall))
  if (!Regex("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z").matches(result)
    || result.take(4).toInt() < 100) throw WalkFailure("WALK_CLOCK_DISCONTINUITY")
  return result
}
private fun productDateFormat() = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
  calendar = GregorianCalendar(TimeZone.getTimeZone("UTC"), Locale.US).apply { gregorianChange = Date(Long.MIN_VALUE) }
  isLenient = false
}
private fun productTimestamp(raw: String): Long {
  if (!Regex("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z").matches(raw) || raw.take(4).toInt() < 100)
    throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
  val format = productDateFormat()
  val parsed = format.parse(raw) ?: throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
  if (format.format(parsed) != raw) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
  return parsed.time
}

// Only these scalar fields cross the finish boundary. Rolling distance buffers
// and raw/accepted route points never enter the payload or journal.
internal object WalkProductFinish {
  private fun canonical(fields: List<Pair<String, Any>>): String = fields.joinToString(",", "{", "}") { (key, value) ->
    JSONObject.quote(key) + ":" + when (value) {
      is String -> JSONObject.quote(value)
      is Boolean, is Int -> value.toString()
      is List<*> -> throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
      else -> throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
    }
  }
  fun seal(session: String, meta: WalkMetadata, distance: WalkDistanceState): WalkProductJournal {
    val journal = meta.product ?: throw WalkFailure("WALK_PRODUCT_REQUIRED")
    if (!journal.reservationConfirmed || distance.legacySession) throw WalkFailure("WALK_PRODUCT_RESERVATION_REQUIRED")
    if (journal.payloadJson != null) return journal
    distance.validate()
    val measured = try { Math.addExact(meta.timing.activeMs, meta.timing.pausedMs) }
      catch (_: ArithmeticException) { throw WalkFailure("WALK_CLOCK_DISCONTINUITY") }
    val wallDuration = try { Math.subtractExact(meta.finishedWall, meta.startedWall) }
      catch (_: ArithmeticException) { throw WalkFailure("WALK_CLOCK_DISCONTINUITY") }
    if (meta.startedWall <= 0 || measured <= 0 || wallDuration <= 0 || measured > wallDuration
      || meta.timing.activeMs < 0 || meta.timing.pausedMs < 0 || distance.gapMs > measured)
      throw WalkFailure("WALK_CLOCK_DISCONTINUITY")
    val filtered = WalkDistanceEngineV1.decimal(distance.acceptedM)
    val proposal = BigDecimal(filtered).setScale(0, RoundingMode.FLOOR).toPlainString()
    val quality = canonical(listOf(
      "schemaVersion" to 1, "totalFixCount" to Math.toIntExact(distance.total),
      "acceptedFixCount" to Math.toIntExact(distance.counts[0]),
      "rejectedAccuracyCount" to Math.toIntExact(distance.counts[1]),
      "rejectedTimestampCount" to Math.toIntExact(distance.counts[2]),
      "rejectedDuplicateCount" to Math.toIntExact(distance.counts[3]),
      "rejectedJumpCount" to Math.toIntExact(distance.counts[4]),
      "rejectedSpeedCount" to Math.toIntExact(distance.counts[5]),
      "stationarySuppressedCount" to Math.toIntExact(distance.counts[6]),
      "segmentCount" to Math.toIntExact(distance.segments),
      "gpsGapDurationMs" to distance.gapMs.toString(), "maxGapDurationMs" to distance.maxGapMs.toString(),
      "mockLocationObserved" to distance.mockObserved))
    val first = canonical(listOf("payloadVersion" to 1, "clientSessionId" to productUuid(session),
      "petId" to productUuid(meta.pet), "startedAt" to productIso(meta.startedWall),
      "endedAt" to productIso(meta.finishedWall), "measuredDurationMs" to measured.toString(),
      "activeDurationMs" to meta.timing.activeMs.toString(), "measuredDistanceM" to proposal,
      "algorithmVersion" to 1, "qualitySchemaVersion" to 1))
    val payload = first.dropLast(1) + ",\"qualitySummary\":" + quality + ",\"routeBackupChoice\":\"LOCAL_ONLY\"}"
    return journal.copy(phase = WalkProductPhase.FINISH_PENDING, payloadJson = payload,
      payloadDigest = productDigest(payload), filteredDistanceM = filtered, lastErrorCode = null)
  }
}

internal class WalkProductReceipt private constructor(val json: String, val session: String, val pet: String,
  val state: String, val digest: String?, val routeRevision: Long?, val routeDeleted: Boolean) {
  val terminal get() = state != "ACTIVE"
  override fun toString() = "WalkProductReceipt(redacted)"
  companion object {
    fun decode(raw: String): WalkProductReceipt {
      if (raw.length > 16384) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
      try {
      val v = JSONObject(raw)
      productExact(v, setOf("clientSessionId", "petId", "state", "payloadDigest", "deletedAt", "recordClaimExists", "summary", "rejectionCode"))
      val state = productString(v, "state")
      if (state !in setOf("ACTIVE", "ACCEPTED_SERVER", "REJECTED_SERVER", "NOT_ACCEPTED_FINAL", "DELETED"))
        throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
      val digest = productNullable(v, "payloadDigest")
      if (digest != null && !Regex("[0-9a-f]{64}").matches(digest)) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
      val deleted = productNullable(v, "deletedAt")?.also(::productTimestamp)
      val claimed = productBoolean(v, "recordClaimExists")
      val rejected = productNullable(v, "rejectionCode")
      var routeRevision: Long? = null
      var routeDeleted = false
      if (state == "ACCEPTED_SERVER") {
        val s = v.getJSONObject("summary")
        productExact(s, setOf("sessionId", "startedAt", "endedAt", "measuredDurationMs", "activeDurationMs",
          "measuredDistanceM", "acceptedDistanceM", "eligibility", "acceptedAt", "routeBackupChoice", "routeRevision", "routeDeletedAt"))
        productUuid(productString(s, "sessionId"))
        val measured = productDecimal(productString(s, "measuredDurationMs"))
        val active = productDecimal(productString(s, "activeDurationMs"))
        val proposed = productDecimal(productString(s, "measuredDistanceM"))
        val accepted = productDecimal(productString(s, "acceptedDistanceM"))
        val start = productTimestamp(productString(s, "startedAt"))
        val end = productTimestamp(productString(s, "endedAt"))
        productTimestamp(productString(s, "acceptedAt"))
        val eligibility = productString(s, "eligibility")
        if (end <= start || measured <= 0 || measured > end - start || active > measured || accepted > proposed
          || (eligibility == "PROGRESSION_INELIGIBLE_QUALITY" && accepted != 0L)
          || eligibility !in setOf("PROGRESSION_ELIGIBLE", "PROGRESSION_INELIGIBLE_QUALITY")
          || productString(s, "routeBackupChoice") !in setOf("LOCAL_ONLY", "PRIVATE_BACKUP")) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
        routeRevision = productDecimal(productString(s, "routeRevision")); routeDeleted = productNullable(s, "routeDeletedAt")?.also(::productTimestamp) != null
      } else if (v.get("summary") != JSONObject.NULL) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
      if ((state in setOf("ACCEPTED_SERVER", "REJECTED_SERVER") && digest == null)
        || ((state in setOf("NOT_ACCEPTED_FINAL", "DELETED")) != (deleted != null))
        || (state in setOf("ACTIVE", "NOT_ACCEPTED_FINAL") && (digest != null || claimed))
        || (state == "REJECTED_SERVER" && (rejected != "WALK_OVERLAP_CONFLICT" || claimed))
        || (state != "REJECTED_SERVER" && rejected != null)) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
      return WalkProductReceipt(v.toString(), productUuid(productString(v, "clientSessionId")),
        productUuid(productString(v, "petId")), state, digest, routeRevision, routeDeleted)
      } catch (_: Exception) { throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT") }
    }
  }
}
