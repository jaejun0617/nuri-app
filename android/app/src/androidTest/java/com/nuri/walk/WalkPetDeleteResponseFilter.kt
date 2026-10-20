package com.nuri.walk

import java.io.IOException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import okio.Buffer
import org.json.JSONArray
import org.json.JSONObject

// Application interceptor (outside OkHttp's transport retry interceptor).
// Never reads headers, changes TLS/cookies/Auth, manufactures a proof, issues
// a request, or invokes a Native command. All non-test responses pass through.
internal class WalkPetDeleteResponseFilter(
  val guard: SupplementalGuard,
  private val audit: WalkReadOnlyJournalAudit,
  private val manifest: SupplementalManifest,
  private val recovery: Boolean,
) : Interceptor {
  @Volatile var fault: String? = null
    private set
  @Volatile var held = false
    private set
  @Volatile var recoveredFinal = false
    private set
  @Volatile var acknowledged = false
    private set
  private val gate = SupplementalProbeGate()
  private val release = CountDownLatch(1)
  init {
    if (recovery) manifest.load().let {
      recoveredFinal = it.optBoolean("recoveredFinal")
      acknowledged = it.optBoolean("nativeDoneObserved") && it.optBoolean("serverAckObserved")
    }
  }
  fun close() { gate.close(); release.countDown() }
  private fun fail(error: Exception) { fault = if (error is SupplementalBlocked) error.code else "PROBE_BOUNDARY_ERROR" }

  override fun intercept(chain: Interceptor.Chain): Response = gate.dispatch(
    passThrough = { chain.proceed(chain.request()) }, observe = { interceptOpen(chain) })

  private fun interceptOpen(chain: Interceptor.Chain): Response {
    val request = chain.request()
    if (gate.closed) return chain.proceed(request)
    val url = request.url.toString(); val method = request.method
    val path = SupplementalGuard.path(url)
    if (method == "POST" && SupplementalGuard.origin(url) == guard.binding?.origin
      && path == "/rest/v1/rpc/create_walk_memory_from_session_v1") {
      val parameters = runCatching { body(request) }.getOrNull()
      // Only exact typed RPC keys bind the forbidden test-owned mutation.
      // This throw is deliberately BEFORE proceed and outside the later
      // observation catch, so no Memory/XP request can already have been sent.
      guard.denyOwnedMemoryBeforeSend(method, url,
        parameters?.opt("p_client_session_id") as? String, parameters?.opt("p_pet_id") as? String) {
        fault = "OWNED_MEMORY_CALL_NOT_AUTHORIZED"
      }
    }
    var creation = false
    var creationAttempt = false
    var creationOwner: String? = null
    var exactDelete = false
    // Inspect only the new marker's Pet POST, known Walk scalar RPCs and the
    // capability RPC request identity. No arbitrary response or Auth body dump.
    try {
      if (!recovery && method == "POST" && path == "/rest/v1/pets") {
        val body = body(request)
        if (body.optString("name") == guard.marker) {
          creationAttempt = true
          creation = guard.claimCreation(method, url, guard.marker)
          supplementalCheck(body.isNull("weight_kg") && body.isNull("profile_image_url"), "NEW_PET_MUST_HAVE_NO_WEIGHT_OR_IMAGE")
          creationOwner = supplementalUuid(body.getString("user_id"))
        }
      }
      exactDelete = guard.exactDelete(method, url, request.body == null || request.body?.contentLength() == 0L)
      if (exactDelete) {
        supplementalCheck(!recovery && fault == null && guard.acceptedZero, "DELETE_PROTOCOL_NOT_READY")
        audit.requireQuiescent(); manifest.requireBaseline(audit)
        val b = guard.binding ?: throw SupplementalBlocked("NO_BINDING")
        val pending = audit.pendingFor(b)
        val v = manifest.load()
        supplementalCheck(v.getString("request") == pending.ticket && v.getString("resourceBinding") == pending.binding, "DURABLE_BINDING_REQUIRED")
      }
    } catch (e: Exception) {
      fail(e)
      // Deny only an unsafe test-owned operation before it is sent. No claim of
      // remote rollback is made; any existing product intent remains pending.
      if (creationAttempt || exactDelete)
        throw IOException("WALK_SUPPLEMENTAL_SCOPED_ABORT")
    }

    val response = chain.proceed(request)
    if (gate.closed) return response
    try {
      if (creation) {
        supplementalCheck(response.isSuccessful && response.request.url == request.url, "CREATION_NOT_CONFIRMED")
        val row = responseObject(response)
        guard.created(url, creationOwner ?: throw SupplementalBlocked("NO_CREATION_OWNER"), row.getString("user_id"), row.getString("id"), row.getString("name"))
        val b = guard.binding ?: throw SupplementalBlocked("NO_BINDING")
        manifest.update { it.put("origin", b.origin).put("owner", b.owner).put("pet", b.pet).put("stage", "PET_CREATED") }
      }
      val b = guard.binding
      if (b != null && method == "POST" && SupplementalGuard.origin(url) == b.origin && path?.startsWith("/rest/v1/rpc/") == true) {
        observeRpc(path.removePrefix("/rest/v1/rpc/"), request, response, b)
      }
      if (exactDelete && response.isSuccessful) {
        supplementalCheck(response.request.url == request.url, "DELETE_REDIRECT_DENIED")
        val rows = JSONArray(responseText(response, 4096))
        supplementalCheck(rows.length() == 1 && rows.getJSONObject(0).length() == 1
          && rows.getJSONObject(0).getString("id") == b?.pet, "DELETE_REPRESENTATION_MISMATCH")
        val pending = audit.pendingFor(b ?: throw SupplementalBlocked("NO_BINDING"))
        audit.requireQuiescent(); manifest.requireBaseline(audit)
        guard.claimHold(nativePending = pending.state == "PENDING", quiescent = true)
        manifest.update { it.put("stage", "REMOTE_SUCCESS_HELD").put("heldPid", android.os.Process.myPid()) }
        held = true
        // Host verifies status/PID/FGS before an explicit kill. If no kill is
        // authorized in time, release the genuine 2xx, never fake failure or
        // cleanup. That backout is a FAILED response-loss experiment.
        val released = release.await(90, TimeUnit.SECONDS)
        held = false
        fault = if (released) "HOLD_RELEASED_BACKOUT" else "HOLD_TIMEOUT_BACKOUT"
        manifest.update { it.put("stage", "BACKOUT_REAL_RESPONSE_RETURNED") }
      } else if (exactDelete) throw SupplementalBlocked("DELETE_NOT_CONFIRMED")
    } catch (e: Exception) { held = false; fail(e) }
    // A post-commit instrumentation error must not turn real server success
    // into a fabricated product failure. Stop the experiment, return reality.
    return response
  }

  private fun observeRpc(name: String, request: Request, response: Response, b: SupplementalBinding) {
    if (name !in setOf("start_walk_v1", "finish_walk_v1", "get_walk_sessions_v1", "prepare_walk_final_deletion_v1", "recover_walk_final_deletion_v1", "ack_walk_final_deletion_v1")) return
    val input = body(request)
    if (name == "start_walk_v1" && input.optString("p_pet_id") == b.pet) {
      supplementalCheck(!recovery, "RECOVERY_MUST_NOT_START_WALK")
      val id = supplementalUuid(input.getString("p_client_session_id"))
      guard.session(id, b.pet)
      manifest.update { it.put("session", id) }
      if (response.isSuccessful) {
        val result = responseObject(response)
        supplementalCheck(result.getString("clientSessionId") == id && result.getString("petId") == b.pet
          && result.getString("state") == "ACTIVE", "RESERVATION_BINDING_MISMATCH")
      }
      return
    }
    if (name in setOf("finish_walk_v1", "get_walk_sessions_v1") && response.isSuccessful) {
      val results = if (name == "finish_walk_v1") listOf(responseObject(response)) else {
        val rows = JSONArray(responseText(response)); (0 until rows.length()).map { rows.getJSONObject(it) }
      }
      for (row in results) if (row.optString("clientSessionId") == guard.ownedSession && row.optString("state") == "ACCEPTED_SERVER") {
        val summary = row.getJSONObject("summary")
        guard.accepted(row.getString("clientSessionId"), row.getString("petId"), summary.getString("acceptedDistanceM"), summary.getString("activeDurationMs"), summary.getString("eligibility"), row.getBoolean("recordClaimExists"))
        manifest.update { it.put("acceptedZero", true).put("activeMs", summary.getString("activeDurationMs")) }
      }
      return
    }
    if (!name.endsWith("walk_final_deletion_v1") || !response.isSuccessful || input.optString("p_purpose") != "PET_FINAL") return
    val requestId = supplementalUuid(input.getString("p_request_id"))
    if (name == "prepare_walk_final_deletion_v1") {
      if (input.optString("p_pet_id") != b.pet) return
      supplementalCheck(!recovery, "RECOVERY_MUST_NOT_PREPARE")
    } else if (manifest.load().optString("request") != requestId) return
    val proof = responseObject(response)
    supplementalCheck(proof.getInt("version") == 1 && proof.getString("requestId") == requestId
      && proof.getString("purpose") == "PET_FINAL" && Regex("[0-9a-f]{64}").matches(proof.getString("resourceBinding")), "PROOF_IDENTITY_MISMATCH")
    val state = proof.getString("state")
    supplementalCheck(state in setOf("PENDING", "FINAL", "ACKNOWLEDGED"), "PROOF_STATE_UNKNOWN")
    supplementalCheck((state == "PENDING") == proof.isNull("confirmedAt")
      && (state == "ACKNOWLEDGED") == !proof.isNull("acknowledgedAt"), "PROOF_STATE_INVALID")
    val prior = manifest.load()
    if (prior.has("request")) supplementalCheck(prior.getString("request") == requestId
      && prior.getString("resourceBinding") == proof.getString("resourceBinding")
      && prior.getString("registeredAt") == proof.getString("registeredAt"), "PROOF_BINDING_CHANGED")
    manifest.update {
      it.put("request", requestId).put("resourceBinding", proof.getString("resourceBinding")).put("registeredAt", proof.getString("registeredAt"))
      if (recovery && state in setOf("FINAL", "ACKNOWLEDGED")) it.put("recoveredFinal", true)
    }
    if (recovery && state in setOf("FINAL", "ACKNOWLEDGED")) recoveredFinal = true
    if (name == "ack_walk_final_deletion_v1") {
      supplementalCheck(recovery && state == "ACKNOWLEDGED", "ACK_NOT_CONFIRMED")
      val auditResult = audit.scan()
      supplementalCheck(auditResult.healthy() && auditResult.facts.size == 1, "ACK_NATIVE_JOURNAL_MISSING")
      val native = auditResult.facts.single()
      supplementalCheck(native.ticket == requestId && native.owner == b.owner && native.pet == b.pet && native.confirmed && native.nativeDone, "ACK_BEFORE_NATIVE_DONE")
      manifest.update { it.put("nativeDoneObserved", true).put("serverAckObserved", true) }
      acknowledged = true
    }
    if (recovery && name == "recover_walk_final_deletion_v1" && state == "ACKNOWLEDGED") {
      val a = audit.scan()
      supplementalCheck(a.healthy() && a.facts.size == 1 && a.facts.single().let {
        it.ticket == requestId && it.owner == b.owner && it.pet == b.pet && it.confirmed && it.nativeDone
      }, "ACK_REPLAY_BEFORE_NATIVE_DONE")
      manifest.update { it.put("nativeDoneObserved", true).put("serverAckObserved", true) }
      acknowledged = true
    }
  }
  private fun body(request: Request): JSONObject {
    val source = request.body ?: throw SupplementalBlocked("REQUEST_BODY_REQUIRED")
    supplementalCheck(source.contentLength() in 0..65536 && !source.isOneShot() && !source.isDuplex(), "REQUEST_BODY_UNBOUNDED")
    val buffer = Buffer()
    return try { source.writeTo(buffer); supplementalCheck(buffer.size <= 65536, "REQUEST_BODY_UNBOUNDED"); JSONObject(buffer.readUtf8()) }
    finally { buffer.clear() }
  }
  private fun responseText(response: Response, max: Long = 65536): String {
    val copy = response.peekBody(max + 1)
    return copy.use { supplementalCheck(it.contentLength() <= max, "RESPONSE_UNBOUNDED"); it.string() }
  }
  private fun responseObject(response: Response) = JSONObject(responseText(response))
}
