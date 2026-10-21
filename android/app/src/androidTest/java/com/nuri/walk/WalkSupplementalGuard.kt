package com.nuri.walk

import java.net.URI
import java.net.URLDecoder
import java.io.IOException
import java.util.Locale
import java.util.UUID

// Test APK policy only. No Auth, networking, filesystem or production mutation.
internal class SupplementalBlocked(val code: String) : IllegalStateException(code)
internal fun supplementalCheck(value: Boolean, code: String) {
  if (!value) throw SupplementalBlocked(code)
}
internal fun supplementalUuid(value: String): String {
  supplementalCheck(runCatching { UUID.fromString(value).toString() == value }.getOrDefault(false), "INVALID_BINDING")
  return value
}

internal object SupplementalCleanupPolicy {
  fun decide(stage: String, bound: Boolean, session: Boolean, request: Boolean,
    identity: Boolean, absent: Boolean, ack: Boolean, journalEmpty: Boolean, quiescent: Boolean): String {
    if (stage !in setOf("READY", "PET_CREATED", "REMOTE_SUCCESS_HELD", "BACKOUT_REAL_RESPONSE_RETURNED", "PRODUCT_RECOVERY_OBSERVED")
      || stage == "READY" && (bound || session || request) || stage != "READY" && !bound)
      return "BLOCK_INVALID_MANIFEST"
    if (bound && !identity) return "BLOCK_REVIEW_IDENTITY_MISMATCH"
    if (!journalEmpty || !quiescent || bound && (!absent || !ack)) return "KEEP_PRODUCT_RECONCILIATION_REQUIRED"
    return "REMOVE"
  }
}

// Pure policy shared by the live selector and host-side behavioral checks.
internal object SupplementalLiveAuditPolicy {
  const val SELECTOR = "com.nuri.walk.WalkProductResponseLossTest#liveAuditStoredStateNoRestart"
  fun requireAttach(args: Map<String, String?>, pid: Int, sdk: Int) {
    supplementalCheck(sdk >= 31, "LIVE_AUDIT_SDK_UNSUPPORTED")
    supplementalCheck(args.keys == setOf("class", "hostExpectedPid", "hostNoRestartValidated", "waitForActivitiesToComplete")
      && args["class"] == SELECTOR && args["hostNoRestartValidated"] == "TRUE"
      && args["waitForActivitiesToComplete"] == "false", "LIVE_AUDIT_ARGUMENTS_UNSAFE")
    val expected = args["hostExpectedPid"]
    supplementalCheck(expected != null && Regex("[1-9][0-9]{0,9}").matches(expected)
      && expected.toIntOrNull() == pid && pid > 0, "LIVE_AUDIT_PID_MISMATCH")
  }
  fun requireSafe(runtime: SupplementalRuntimeCounts?, journalHealthy: Boolean, journalCount: Int, unchanged: Boolean) {
    val observed = runtime ?: throw SupplementalBlocked("LIVE_AUDIT_DATABASE_UNREADABLE")
    supplementalCheck(unchanged, "LIVE_AUDIT_OBSERVATION_CHANGED")
    supplementalCheck(journalHealthy && journalCount == 0, "EXISTING_JOURNAL_BLOCKS_UI")
    supplementalCheck(observed.quiescent(), "EXISTING_RUNTIME_NOT_QUIESCENT")
  }
}

internal class SupplementalRuntimeCounts {
  companion object {
    const val MAX_ROWS = 20000
    val STATES = listOf("IDLE", "STARTING", "WALKING", "PAUSED", "FINISHING", "FINISHED_LOCAL", "RECOVERY_REQUIRED", "CANCELLED_LOCAL")
    // Native CANCELLED_LOCAL has no outgoing edge and releases activeSlot.
    val QUIESCENT_STATES = setOf("IDLE", "FINISHED_LOCAL", "CANCELLED_LOCAL")
  }
  private val states = STATES.associateWith { 0 }.toMutableMap()
  var rows = 0; private set
  var activeSlots = 0; private set
  var invalidSlots = 0; private set
  var nullStates = 0; private set
  var unknownStates = 0; private set
  fun row(state: String?, activeSlot: Boolean, validSlot: Boolean = true) {
    supplementalCheck(rows < MAX_ROWS, "LIVE_AUDIT_ROW_LIMIT")
    rows++
    if (activeSlot) activeSlots++
    if (!validSlot) invalidSlots++
    if (state == null) nullStates++ else if (state !in states) unknownStates++ else states[state] = states.getValue(state) + 1
  }
  fun publicCounts(): Map<String, Int> = states.toMap() + mapOf("rows" to rows, "activeSlots" to activeSlots,
    "invalidSlots" to invalidSlots, "nullStates" to nullStates, "unknownStates" to unknownStates)
  fun quiescent() = activeSlots == 0 && invalidSlots == 0 && nullStates == 0 && unknownStates == 0
    && QUIESCENT_STATES.sumOf { states.getValue(it) } == rows
}

internal class SupplementalProbeGate {
  @Volatile var closed = false
    private set
  fun close() { closed = true }
  fun <T> dispatch(passThrough: () -> T, observe: () -> T): T = if (closed) passThrough() else observe()
}
internal class SupplementalBinding(val marker: String, val origin: String, val owner: String, val pet: String) {
  init {
    supplementalCheck(Regex("NQ[0-9a-f]{12}").matches(marker), "INVALID_MARKER")
    supplementalUuid(owner); supplementalUuid(pet)
    supplementalCheck(SupplementalGuard.origin(origin) == origin, "INVALID_ORIGIN")
  }
  override fun toString() = "SupplementalBinding(REDACTED)"
}

internal class SupplementalGuard(val marker: String, private val approvedOrigin: String) {
  private var installed = false
  private var creationClaimed = false
  private var holdClaimed = false
  @Volatile var binding: SupplementalBinding? = null
    private set
  @Volatile var ownedSession: String? = null
    private set
  @Volatile var acceptedZero = false
    private set
  @Volatile var factoryObserved = false
    private set
  @Synchronized fun networkModuleCreated() {
    supplementalCheck(installed, "FACTORY_NOT_INSTALLED")
    factoryObserved = true
  }

  @Synchronized fun session(id: String, pet: String) {
    supplementalCheck(binding?.pet == pet && (ownedSession == null || ownedSession == id), "SESSION_ALLOWLIST_MISMATCH")
    ownedSession = supplementalUuid(id)
  }
  @Synchronized fun accepted(id: String, pet: String, distance: String, active: String, eligible: String, claim: Boolean) {
    supplementalCheck(ownedSession == id && binding?.pet == pet && distance == "0" && !claim
      && eligible == "PROGRESSION_INELIGIBLE_QUALITY" && Regex("[0-9]{1,5}").matches(active)
      && active.toLong() in 1..59999, "OWNED_SMOKE_RESULT_UNSAFE")
    acceptedZero = true
  }

  @Synchronized fun install(activityPresent: Boolean) {
    supplementalCheck(!activityPresent && !installed, "FACTORY_LATE_OR_DUPLICATE")
    supplementalCheck(origin(approvedOrigin) == approvedOrigin, "INVALID_APPROVED_ORIGIN")
    supplementalCheck(Regex("NQ[0-9a-f]{12}").matches(marker), "INVALID_MARKER")
    installed = true
  }
  @Synchronized fun claimCreation(method: String, url: String, name: String): Boolean {
    if (method != "POST" || name != marker || path(url) != "/rest/v1/pets") return false
    supplementalCheck(installed && !creationClaimed && binding == null, "DUPLICATE_OR_UNREADY_CREATION")
    supplementalCheck(origin(url) == approvedOrigin, "UNAPPROVED_ORIGIN")
    creationClaimed = true
    return true
  }
  @Synchronized fun created(url: String, inputOwner: String, returnedOwner: String, pet: String, returnedName: String) {
    supplementalCheck(creationClaimed && binding == null && returnedName == marker && inputOwner == returnedOwner
      && origin(url) == approvedOrigin, "CREATION_BINDING_MISMATCH")
    binding = SupplementalBinding(marker, origin(url) ?: throw SupplementalBlocked("INVALID_ORIGIN"), returnedOwner, pet)
  }
  @Synchronized fun restore(value: SupplementalBinding) {
    supplementalCheck(installed && binding == null && value.marker == marker && value.origin == approvedOrigin, "RESTORE_BINDING_MISMATCH")
    binding = value
    creationClaimed = true
  }
  @Synchronized fun exactDelete(method: String, url: String, bodyEmpty: Boolean): Boolean {
    val b = binding ?: return false
    if (method != "DELETE" || !bodyEmpty || origin(url) != b.origin || path(url) != "/rest/v1/pets") return false
    val query = query(url) ?: return false
    return query == mapOf("id" to "eq.${b.pet}", "user_id" to "eq.${b.owner}", "select" to "id")
  }
  @Synchronized fun denyOwnedMemoryBeforeSend(method: String, url: String, session: String?, pet: String?, denied: () -> Unit) {
    val b = binding ?: return
    val owned = ownedSession ?: return
    if (method != "POST" || origin(url) != approvedOrigin || origin(url) != b.origin
      || path(url) != "/rest/v1/rpc/create_walk_memory_from_session_v1" || session != owned || pet != b.pet) return
    denied()
    throw IOException("WALK_SUPPLEMENTAL_SCOPED_ABORT")
  }
  @Synchronized fun claimHold(nativePending: Boolean, quiescent: Boolean) {
    supplementalCheck(installed && binding != null && !holdClaimed && nativePending && quiescent && acceptedZero, "HOLD_DENIED")
    holdClaimed = true
  }
  companion object {
    fun validJournal(version: Int, confirmed: Boolean, done: Boolean, armed: Boolean, state: String?): Boolean =
      version in 1..2 && (!done || confirmed) && (version != 2 || (
        state in setOf(null, "PENDING", "FINAL", "ACKNOWLEDGED")
          && (!confirmed || state in setOf("FINAL", "ACKNOWLEDGED"))
          && (state != "ACKNOWLEDGED" || confirmed && done)
          && (!armed || state != null)))
    fun origin(url: String): String? = try {
      val u = URI(url)
      if (u.scheme != "https" || u.host.isNullOrEmpty() || u.rawUserInfo != null || u.rawFragment != null || u.port !in setOf(-1, 443)) null
      else "https://${u.host.lowercase(Locale.US)}"
    } catch (_: Exception) { null }
    fun path(url: String): String? = try { URI(url).rawPath } catch (_: Exception) { null }
    fun query(url: String): Map<String, String>? = try {
      val raw = URI(url).rawQuery ?: return null
      val pairs = raw.split('&').map { part ->
        val split = part.split('=', limit = 2)
        if (split.size != 2) return null
        URLDecoder.decode(split[0], "UTF-8") to URLDecoder.decode(split[1], "UTF-8")
      }
      if (pairs.map { it.first }.distinct().size != pairs.size) null else pairs.toMap()
    } catch (_: Exception) { null }
  }
}
