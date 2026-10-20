package com.nuri.walk

import android.util.AtomicFile
import java.io.File
import java.nio.ByteBuffer
import java.util.UUID
import java.security.SecureRandom
import org.json.JSONArray
import org.json.JSONObject

// Separate encrypted deletion journal: never reuses metadata/finish envelopes,
// runtime revision, Room schema or keys. Only a captured capability can confirm
// final deletion after logout. Unknown/grace-period results do not confirm it.
internal class WalkFinalCleanup(private val storage: WalkStorage, private val directory: File,
  private val promote: (AtomicFile, java.io.FileOutputStream) -> Unit = { target, stream -> target.finishWrite(stream) },
  private val erase: (AtomicFile) -> Unit = { it.delete() }) {
  private val blocked = mutableSetOf<Pair<String, String?>>()
  private val armedInMemory = mutableMapOf<String, Pair<String, String?>>()
  private fun file(id: String) = AtomicFile(File(directory, productUuid(id)))
  private fun read(id: String): JSONObject {
    if (!file(id).baseFile.exists() && !File(directory, "$id.bak").exists()) throw WalkFailure("WALK_FINAL_CLEANUP_NOT_FOUND")
    val raw = try { file(id).readFully() }
      catch (_: java.io.FileNotFoundException) { throw WalkFailure("WALK_FINAL_CLEANUP_NOT_FOUND") }
      catch (_: java.io.IOException) { throw WalkFailure("WALK_FINAL_CLEANUP_PENDING") }
    if (raw.size < 32 || raw.size > 4096) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
    val plain = try { storage.cipher.decrypt(WalkSealedBytes(raw.copyOfRange(0, 12), raw.copyOfRange(12, raw.size)), WalkCipher.aad(id, "final-cleanup-v1", 1)) }
      catch (error: WalkFailure) {
        if (error.code == "WALK_LOCAL_KEY_INVALIDATED") throw error
        throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      }
    return try { JSONObject(String(plain, Charsets.UTF_8)) }
      catch (_: Exception) { throw WalkFailure("WALK_FINAL_CLEANUP_INVALID") }
      finally { plain.fill(0); raw.fill(0) }
  }
  private fun write(id: String, value: JSONObject) {
    if (!directory.exists() && !directory.mkdirs()) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
    val bytes = value.toString().toByteArray(Charsets.UTF_8)
    val sealed = try { storage.cipher.encrypt(bytes, WalkCipher.aad(id, "final-cleanup-v1", 1)) } finally { bytes.fill(0) }
    val target = file(id); val stream = try { target.startWrite() } catch (_: java.io.IOException) { throw WalkFailure("WALK_FINAL_CLEANUP_PENDING") }
    val expected = ByteBuffer.allocate(sealed.nonce.size + sealed.ciphertext.size).put(sealed.nonce).put(sealed.ciphertext).array()
    try { stream.write(expected); stream.fd.sync(); promote(target, stream) }
    catch (_: java.io.IOException) { try { target.failWrite(stream) } catch (_: Exception) { /* Pending journal is retained. */ }; throw WalkFailure("WALK_FINAL_CLEANUP_PENDING") }
    // AtomicFile may only log a failed rename. Verify the committed envelope,
    // not the uncommitted .new file, before acknowledging durable progress.
    val committed = try { target.readFully() } catch (_: java.io.IOException) { throw WalkFailure("WALK_FINAL_CLEANUP_PENDING") }
    if (!committed.contentEquals(expected)) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
    val decoded = read(id)
    if (decoded.length() != value.length() || value.keys().asSequence().any { decoded.opt(it) != value.opt(it) }) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
  }
  private fun ids(): List<String> = (directory.listFiles() ?: if (directory.exists()) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING") else emptyArray()).mapNotNull { f ->
    // A legacy .bak is recoverable; an initial orphan .new is NOT committed.
    if (f.name.endsWith(".new")) return@mapNotNull null
    val name = f.name.removeSuffix(".bak")
    try { productUuid(name) } catch (_: Exception) { null }
  }.distinct().also { if (it.size > 256) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING") }
  private fun pet(v: JSONObject): String? = if (v.isNull("pet")) null else productUuid(v.getString("pet"))
  fun matches(v: JSONObject, owner: String, petId: String) = v.getString("owner") == owner && (pet(v) == null || pet(v) == petId)
  fun assertAllowed(owner: String, pet: String) {
    if (blocked.any { it.first == owner && (it.second == null || it.second == pet) }
      || ids().any { read(it).let { v -> (v.getBoolean("confirmed") || (v.optInt("version", 1) == 2 && proof(v)?.optString("state") in setOf("FINAL", "ACKNOWLEDGED"))) && matches(v, owner, pet) } }) throw WalkFailure("WALK_SESSION_DELETED")
    if (armedInMemory.values.any { it.first == owner && (it.second == null || it.second == pet) }
      || ids().any { read(it).let { v -> v.optInt("version", 1) == 2 && v.getBoolean("armed") && matches(v, owner, pet) } })
      throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
  }
  // Existing V1 bytes remain readable. Only new explicit deletion uses V2.
  fun captureV2(owner: String, pet: String?): String {
    productUuid(owner); pet?.let(::productUuid)
    ids().firstOrNull { read(it).let { v -> v.optInt("version", 1) == 2 && v.getString("owner") == owner && pet(v) == pet } }?.let { return it }
    if (ids().size >= 256) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
    val id = UUID.randomUUID().toString()
    val secret = ByteArray(32).also { SecureRandom().nextBytes(it) }
    val capability = try { secret.joinToString("") { "%02x".format(it.toInt() and 255) } } finally { secret.fill(0) }
    write(id, JSONObject().put("version", 2).put("owner", owner).put("pet", pet ?: JSONObject.NULL)
      .put("confirmed", false).put("after", "").put("nativeDone", false).put("armed", false).put("outcome", "NOT_STARTED").put("attempt", "0")
      .put("requestId", id).put("capability", capability).put("proof", ""))
    return id
  }
  private fun proof(v: JSONObject): JSONObject? = v.optString("proof", "").takeIf { it.isNotEmpty() }?.let(::JSONObject)
  fun view(id: String): JSONObject = read(id).let { v ->
    JSONObject().put("version", v.optInt("version", 1)).put("ticket", productUuid(id))
      .put("ownerId", productUuid(v.getString("owner"))).put("petId", pet(v) ?: JSONObject.NULL)
      .put("confirmed", v.getBoolean("confirmed")).put("nativeDone", v.getBoolean("nativeDone")).apply {
        if (v.optInt("version", 1) == 2) {
          val p = proof(v)
          val intent = JSONObject().put("requestId", productUuid(v.getString("requestId")))
            .put("purpose", if (pet(v) == null) "ACCOUNT_FINAL" else "PET_FINAL")
            .put("petId", pet(v) ?: JSONObject.NULL).put("capability", v.getString("capability"))
          if (p != null) intent.put("resourceBinding", p.getString("resourceBinding"))
          put("intent", intent).put("armed", v.getBoolean("armed")).put("outcome", v.getString("outcome")).put("attempt", v.optLong("attempt", 0L).toString()).put("proofState", p?.getString("state") ?: JSONObject.NULL)
          if (v.has("restoreRequest")) put("restoreIntent", JSONObject().put("requestId", productUuid(v.getString("restoreRequest"))).put("attempt", v.getString("restoreAttempt")))
          if (v.has("accountRequest")) put("accountRequestId", productUuid(v.getString("accountRequest")))
        }
      }
  }
  private fun checkedProof(id: String, input: String): JSONObject {
    if (input.length > 1500) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
    val v = read(id)
    if (v.optInt("version", 1) != 2) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
    try {
      val p = JSONObject(input)
      productExact(p, setOf("version", "requestId", "purpose", "resourceBinding", "state", "registeredAt", "confirmedAt", "acknowledgedAt"))
      if (p.opt("version") != 1 || listOf("requestId", "purpose", "resourceBinding", "state", "registeredAt").any { p.opt(it) !is String }
        || listOf("confirmedAt", "acknowledgedAt").any { !p.isNull(it) && p.opt(it) !is String }) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      if (p.getInt("version") != 1 || productUuid(p.getString("requestId")) != id || v.getString("requestId") != id
        || p.getString("purpose") != if (pet(v) == null) "ACCOUNT_FINAL" else "PET_FINAL") throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      if (!Regex("[0-9a-f]{64}").matches(p.getString("resourceBinding"))) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      fun stamp(key: String): Long? {
        if (p.isNull(key)) return null
        val raw = p.getString(key)
        val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC"); isLenient = false }
        if (!Regex("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z").matches(raw) || raw.take(4).toInt() < 100) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
        val parsed = format.parse(raw) ?: throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
        if (format.format(parsed) != raw) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
        return parsed.time
      }
      stamp("registeredAt") ?: throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      val confirmed = stamp("confirmedAt"); val acknowledged = stamp("acknowledgedAt")
      // Server transaction-start timestamps can invert under row contention.
      // State/identity are authoritative; wall-clock ordering is not a policy.
      when (p.getString("state")) {
        "PENDING" -> if (confirmed != null || acknowledged != null) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
        "FINAL" -> if (confirmed == null || acknowledged != null) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
        "ACKNOWLEDGED" -> if (confirmed == null || acknowledged == null
          || !v.getBoolean("confirmed") || !v.getBoolean("nativeDone")) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
        else -> throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      }
      proof(v)?.let { old ->
        if (old.getString("resourceBinding") != p.getString("resourceBinding") || old.getString("registeredAt") != p.getString("registeredAt")
          || (old.getString("state") != "PENDING" && (p.getString("state") == "PENDING" || old.opt("confirmedAt") != p.opt("confirmedAt")))
          || (old.getString("state") == "ACKNOWLEDGED" && (p.getString("state") != "ACKNOWLEDGED" || old.opt("acknowledgedAt") != p.opt("acknowledgedAt")))) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      }
      return p
    } catch (e: WalkFailure) { throw e } catch (_: Exception) { throw WalkFailure("WALK_FINAL_CLEANUP_INVALID") }
  }
  fun validateFinalProof(id: String, input: String): JSONObject = checkedProof(id, input).also {
    if (it.getString("state") !in setOf("FINAL", "ACKNOWLEDGED")) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
    if (proof(read(id)) == null) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
  }
  fun validateProof(id: String, input: String): JSONObject = checkedProof(id, input)
  fun recordProof(id: String, input: String, confirm: Boolean = false) {
    val p = if (confirm) validateFinalProof(id, input) else checkedProof(id, input)
    val v = read(id).put("proof", p.toString())
    if (confirm) v.put("confirmed", true)
    write(id, v)
  }
  fun armBlock(id: String): JSONObject = read(id).also { v ->
    if (v.optInt("version", 1) != 2 || v.getBoolean("confirmed") || proof(v)?.getString("state") != "PENDING") throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
    armedInMemory[id] = v.getString("owner") to pet(v)
  }
  fun persistArm(id: String) {
    val v = read(id); val attempt = v.optLong("attempt", 0L)
    if (attempt < 0 || attempt == Long.MAX_VALUE) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
    v.remove("restoreRequest"); v.remove("restoreAttempt"); v.remove("accountRequest")
    write(id, v.put("armed", true).put("outcome", "UNKNOWN").put("attempt", (attempt + 1).toString()))
  }
  fun restoreIntent(id: String, input: String) {
    val v = read(id)
    if (v.optInt("version", 1) != 2 || pet(v) != null || v.getBoolean("confirmed") || proof(v)?.getString("state") != "PENDING") throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
    try {
      val intent = JSONObject(input); productExact(intent, setOf("requestId", "attempt"))
      if (intent.opt("attempt") !is String || intent.getString("attempt") != v.optLong("attempt", 0L).toString()) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      if (v.has("accountRequest") && intent.getString("requestId") != v.getString("accountRequest")) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      write(id, v.put("restoreRequest", productUuid(intent.getString("requestId"))).put("restoreAttempt", intent.getString("attempt")))
    } catch (e: WalkFailure) { throw e } catch (_: Exception) { throw WalkFailure("WALK_FINAL_CLEANUP_INVALID") }
  }
  fun accountRequest(id: String, input: String) {
    val v = read(id)
    if (v.optInt("version", 1) != 2 || pet(v) != null || !v.getBoolean("armed") || v.getBoolean("confirmed") || proof(v)?.getString("state") != "PENDING") throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
    try {
      val request = JSONObject(input); productExact(request, setOf("requestId", "attempt"))
      if (request.opt("attempt") !is String || request.getString("attempt") != v.optLong("attempt", 0L).toString()
        || (v.has("accountRequest") && request.getString("requestId") != v.getString("accountRequest"))) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      write(id, v.put("accountRequest", productUuid(request.getString("requestId"))))
    } catch (e: WalkFailure) { throw e } catch (_: Exception) { throw WalkFailure("WALK_FINAL_CLEANUP_INVALID") }
  }
  fun release(id: String, input: String) {
    val v = read(id)
    if (v.optInt("version", 1) != 2 || v.getBoolean("confirmed") || proof(v)?.getString("state") != "PENDING") throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
    val evidence = try { JSONObject(input) } catch (_: Exception) { throw WalkFailure("WALK_FINAL_CLEANUP_INVALID") }
    if (evidence.opt("attempt") !is String || evidence.getString("attempt") != v.optLong("attempt", 0L).toString()) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
    val outcome = evidence.optString("outcome")
    when (outcome) {
      "RESTORABLE" -> {
        productExact(evidence, setOf("outcome", "status", "actualStatus", "canRestore", "attempt"))
        if (pet(v) != null || !evidence.getBoolean("canRestore") || evidence.getString("actualStatus") !in setOf("pending_grace_period", "cancelled")
          || evidence.getString("status") !in setOf("completed", "pending_grace_period", "cancelled")) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      }
      "RESTORED" -> {
        productExact(evidence, setOf("outcome", "status", "actualStatus", "attempt", "requestId"))
        if (pet(v) != null || evidence.getString("actualStatus") != "cancelled"
          || !v.has("restoreRequest") || evidence.getString("requestId") != v.getString("restoreRequest") || evidence.getString("attempt") != v.getString("restoreAttempt")
          || evidence.getString("status") !in setOf("cancelled", "completed")) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      }
      "ROLLED_BACK", "NOT_STARTED" -> {
        productExact(evidence, setOf("outcome", "code", "attempt"))
        if ((outcome == "NOT_STARTED" && evidence.getString("code") != "NOT_INVOKED")
          || (outcome == "ROLLED_BACK" && evidence.getString("code") !in setOf("42501", "23503", "23514", "22023")
            && !(pet(v) == null && evidence.getString("code") == "P0001"))) throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
      }
      else -> throw WalkFailure("WALK_FINAL_CLEANUP_INVALID")
    }
    v.remove("restoreRequest"); v.remove("restoreAttempt")
    write(id, v.put("armed", false).put("outcome", outcome)); armedInMemory.remove(id)
  }
  fun capture(owner: String, pet: String?): String {
    productUuid(owner); pet?.let(::productUuid)
    ids().firstOrNull { read(it).let { v -> v.getString("owner") == owner && pet(v) == pet } }?.let { return it }
    if (ids().size >= 256) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
    val id = UUID.randomUUID().toString()
    write(id, JSONObject().put("owner", owner).put("pet", pet ?: JSONObject.NULL).put("confirmed", false).put("after", "").put("nativeDone", false))
    return id
  }
  fun block(id: String): JSONObject = read(id).also { v -> blocked.add(v.getString("owner") to pet(v)) }
  fun confirm(id: String): JSONObject = block(id).also { v -> v.put("confirmed", true); write(id, v) }
  fun scope(id: String): JSONObject = read(id)
  fun pending(): JSONArray = JSONArray().apply {
    for (id in ids()) put(view(id))
  }
  fun step(id: String): Boolean {
    val v = read(id)
    if (!v.getBoolean("confirmed")) throw WalkFailure("WALK_INVALID_STATE_TRANSITION")
    if (v.getBoolean("nativeDone")) return true
    val rows = storage.dao.scan(v.getString("after"), 100)
    storage.transaction {
      for (row in rows) {
        val meta = storage.metadata(row)
        if (matches(v, meta.owner, meta.pet)) {
          storage.dao.deleteChunks(row.sessionId); storage.dao.deleteSessionReceipts(row.sessionId); storage.dao.deleteSession(row.sessionId)
        }
      }
      // V1 QA protocol is private owned data too, but ordinary PRODUCT cleanup
      // remains purpose restricted and never calls this path.
      storage.dao.qaProtocol()?.let { row ->
        val bytes = storage.cipher.decrypt(WalkSealedBytes(row.nonce, row.ciphertext), WalkCipher.aad("qa-protocol", "protocol-v1", row.revision))
        val protocol = try { JSONObject(String(bytes, Charsets.UTF_8)) } finally { bytes.fill(0) }
        if (matches(v, protocol.getString("owner"), protocol.getString("pet"))) storage.dao.deleteQaProtocol()
      }
    }
    v.put("after", rows.lastOrNull()?.sessionId ?: v.getString("after")); v.put("nativeDone", rows.size < 100)
    // If process dies between DB commit and cursor write, repeating the same
    // keyset page is harmless; no remaining row can be skipped.
    write(id, v); return v.getBoolean("nativeDone")
  }
  fun acknowledge(id: String) {
    val v = read(id); if (!v.getBoolean("confirmed") || !v.getBoolean("nativeDone")) throw WalkFailure("WALK_INVALID_STATE_TRANSITION")
    if (v.optInt("version", 1) == 2 && proof(v)?.getString("state") != "ACKNOWLEDGED") throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
    erase(file(id))
    if (listOf(id, "$id.bak", "$id.new").any { File(directory, it).exists() }) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
    armedInMemory.remove(id)
  }
}
