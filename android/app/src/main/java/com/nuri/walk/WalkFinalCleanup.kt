package com.nuri.walk

import android.util.AtomicFile
import java.io.File
import java.nio.ByteBuffer
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

// Separate encrypted deletion journal: never reuses metadata/finish envelopes,
// runtime revision, Room schema or keys. Only a captured capability can confirm
// final deletion after logout. Unknown/grace-period results do not confirm it.
internal class WalkFinalCleanup(private val storage: WalkStorage, private val directory: File,
  private val promote: (AtomicFile, java.io.FileOutputStream) -> Unit = { target, stream -> target.finishWrite(stream) },
  private val erase: (AtomicFile) -> Unit = { it.delete() }) {
  private val blocked = mutableSetOf<Pair<String, String?>>()
  private fun file(id: String) = AtomicFile(File(directory, productUuid(id)))
  private fun read(id: String): JSONObject {
    if (!file(id).baseFile.exists() && !File(directory, "$id.bak").exists()) throw WalkFailure("WALK_FINAL_CLEANUP_NOT_FOUND")
    val raw = try { file(id).readFully() }
      catch (_: java.io.FileNotFoundException) { throw WalkFailure("WALK_FINAL_CLEANUP_NOT_FOUND") }
      catch (_: java.io.IOException) { throw WalkFailure("WALK_FINAL_CLEANUP_PENDING") }
    if (raw.size < 32 || raw.size > 2048) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
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
      || ids().any { read(it).let { v -> v.getBoolean("confirmed") && matches(v, owner, pet) } }) throw WalkFailure("WALK_SESSION_DELETED")
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
    for (id in ids()) { val v = read(id); if (v.getBoolean("confirmed")) put(JSONObject().put("ticket", id).put("ownerId", v.getString("owner")).put("petId", pet(v) ?: JSONObject.NULL)) }
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
    erase(file(id))
    if (listOf(id, "$id.bak", "$id.new").any { File(directory, it).exists() }) throw WalkFailure("WALK_FINAL_CLEANUP_PENDING")
  }
}
