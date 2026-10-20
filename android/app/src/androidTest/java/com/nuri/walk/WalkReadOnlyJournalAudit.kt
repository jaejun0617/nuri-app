package com.nuri.walk

import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.util.AtomicFile
import java.io.File
import java.nio.ByteBuffer
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

internal class SupplementalJournalFact(
  val ticket: String, val owner: String, val pet: String?, val version: Int,
  val confirmed: Boolean, val nativeDone: Boolean, val armed: Boolean,
  val state: String?, val binding: String?,
) {
  override fun toString() = "SupplementalJournalFact(REDACTED)"
}
internal class SupplementalAudit(val facts: List<SupplementalJournalFact>, val partial: Int, val corrupt: Int, val keyError: Int, val unknown: Int) {
  fun healthy() = partial == 0 && corrupt == 0 && keyError == 0 && unknown == 0
  fun publicCounts(): String = JSONObject().put("committed", facts.size).put("v1", facts.count { it.version == 1 })
    .put("v2", facts.count { it.version == 2 }).put("confirmed", facts.count { it.confirmed })
    .put("nativeDone", facts.count { it.nativeDone }).put("armed", facts.count { it.armed })
    .put("partial", partial).put("corrupt", corrupt).put("keyError", keyError).put("unknown", unknown).toString()
  fun requireEmpty() = supplementalCheck(healthy() && facts.isEmpty(), "EXISTING_JOURNAL_BLOCKS_UI")
}

// No WalkRuntime/WalkStorage/Room/AtomicFile reader is used for product data.
// Ordinary reads deliberately do not recover .bak or remove .new files.
internal class WalkReadOnlyJournalAudit(context: Context) {
  private val root = context.noBackupFilesDir.canonicalFile
  private fun checked(file: File): File {
    supplementalCheck(file.absoluteFile == file.canonicalFile && file.canonicalFile.toPath().startsWith(root.toPath()), "UNSAFE_PRODUCT_READ_PATH")
    return file
  }
  fun scan(): SupplementalAudit {
    val dir = checked(File(root, "walk-final-cleanup-v1"))
    if (!dir.exists()) return SupplementalAudit(emptyList(), 0, 0, 0, 0)
    val files = dir.listFiles() ?: return SupplementalAudit(emptyList(), 0, 0, 0, 1)
    if (files.size > 768) return SupplementalAudit(emptyList(), 0, 0, 0, 1)
    var partial = 0; var corrupt = 0; var keys = 0; var unknown = 0
    val facts = mutableListOf<SupplementalJournalFact>()
    for (file in files) {
      try {
        checked(file)
        if (!file.isFile) { unknown++; continue }
        if (file.name.endsWith(".new") || file.name.endsWith(".bak")) { partial++; continue }
        val ticket = supplementalUuid(file.name)
        supplementalCheck(file.length() in 32..4096, "CORRUPT_JOURNAL")
        val before = file.length() to file.lastModified()
        val raw = file.readBytes()
        val plain = try {
          WalkCipher { WalkKeyStore.key(allowCreate = false) }.decrypt(
            WalkSealedBytes(raw.copyOfRange(0, 12), raw.copyOfRange(12, raw.size)), WalkCipher.aad(ticket, "final-cleanup-v1", 1))
        } finally { raw.fill(0) }
        try {
          val v = JSONObject(String(plain, Charsets.UTF_8))
          supplementalCheck(v.has("pet") && v.opt("owner") is String && v.opt("after") is String
            && (!v.has("version") || v.opt("version") is Int), "CORRUPT_JOURNAL")
          val version = if (!v.has("version")) 1 else v.getInt("version")
          supplementalCheck(version in 1..2 && v.opt("confirmed") is Boolean && v.opt("nativeDone") is Boolean, "CORRUPT_JOURNAL")
          val owner = supplementalUuid(v.getString("owner"))
          val pet = if (v.isNull("pet")) null else supplementalUuid(v.getString("pet"))
          var state: String? = null; var binding: String? = null
          if (version == 2) {
            supplementalCheck(v.getString("requestId") == ticket && v.opt("armed") is Boolean
              && v.opt("proof") is String && v.opt("capability") is String
              && Regex("[0-9a-f]{64}").matches(v.getString("capability")), "CORRUPT_JOURNAL")
            val proof = v.getString("proof")
            if (proof.isNotEmpty()) {
              val p = JSONObject(proof)
              state = p.getString("state"); binding = p.getString("resourceBinding")
              supplementalCheck(p.getString("requestId") == ticket && p.getString("purpose") == if (pet == null) "ACCOUNT_FINAL" else "PET_FINAL", "CORRUPT_JOURNAL")
              supplementalCheck(state in setOf("PENDING", "FINAL", "ACKNOWLEDGED") && Regex("[0-9a-f]{64}").matches(binding), "CORRUPT_JOURNAL")
            }
          }
          supplementalCheck(SupplementalGuard.validJournal(version, v.getBoolean("confirmed"), v.getBoolean("nativeDone"), version == 2 && v.getBoolean("armed"), state), "CORRUPT_JOURNAL")
          supplementalCheck(before == (file.length() to file.lastModified()), "CONCURRENT_JOURNAL_READ")
          facts.add(SupplementalJournalFact(ticket, owner, pet, version, v.getBoolean("confirmed"), v.getBoolean("nativeDone"), version == 2 && v.getBoolean("armed"), state, binding))
        } finally { plain.fill(0) }
      } catch (e: WalkFailure) {
        if (e.code == "WALK_LOCAL_KEY_INVALIDATED") keys++ else corrupt++
      } catch (_: Exception) { corrupt++ }
    }
    return SupplementalAudit(facts, partial, corrupt, keys, unknown)
  }
  fun pendingFor(b: SupplementalBinding): SupplementalJournalFact {
    val a = scan()
    supplementalCheck(a.healthy() && a.facts.size == 1, "JOURNAL_SCOPE_AMBIGUOUS")
    return a.facts.single().also {
      supplementalCheck(it.version == 2 && it.owner == b.owner && it.pet == b.pet && it.armed && !it.confirmed && !it.nativeDone
        && it.state == "PENDING" && it.binding != null, "EXPECTED_UNCONFIRMED_V2_REQUIRED")
    }
  }
  fun requireKnownRecovery(b: SupplementalBinding, saved: JSONObject) {
    val a = scan()
    supplementalCheck(a.healthy() && a.facts.size <= 1, "JOURNAL_SCOPE_AMBIGUOUS")
    if (a.facts.isEmpty()) {
      supplementalCheck(saved.optBoolean("nativeDoneObserved") && saved.optBoolean("serverAckObserved"), "JOURNAL_DISAPPEARED_WITHOUT_ACK_PROOF")
    } else a.facts.single().let {
      supplementalCheck(it.version == 2 && it.owner == b.owner && it.pet == b.pet && it.ticket == saved.getString("request")
        && it.binding == saved.getString("resourceBinding") && it.state in setOf("PENDING", "FINAL", "ACKNOWLEDGED"), "COLD_SCOPE_MISMATCH")
    }
  }

  private fun <T> database(work: (SQLiteDatabase?) -> T): T {
    val path = checked(File(root, "nuri-walk-v1.db"))
    if (!path.exists()) {
      supplementalCheck(!File(path.path + "-wal").exists(), "ORPHAN_DATABASE_WAL")
      return work(null)
    }
    for (suffix in listOf("-wal", "-shm")) checked(File(path.path + suffix))
    // READONLY does not create a DB, migrate Room, decrypt routes or run a DAO.
    return SQLiteDatabase.openDatabase(path.path, null, SQLiteDatabase.OPEN_READONLY).use { work(it) }
  }
  fun requireQuiescent() = database { db ->
    db?.rawQuery("SELECT activeSlot,runtimeState FROM walk_local_sessions", null)?.use { cursor ->
      while (cursor.moveToNext()) supplementalCheck(cursor.isNull(0) && cursor.getString(1) in setOf("IDLE", "FINISHED_LOCAL"), "EXISTING_RUNTIME_NOT_QUIESCENT")
    }
  }
  fun fingerprints(): Set<String> = database { db ->
    val result = mutableSetOf<String>()
    if (db != null) for (table in listOf("walk_local_sessions", "walk_point_chunks", "walk_command_receipts", "walk_qa_protocol")) {
      db.rawQuery("SELECT * FROM $table", null).use { cursor ->
        var count = 0
        while (cursor.moveToNext()) {
          supplementalCheck(++count <= 20000, "BASELINE_TOO_LARGE")
          val digest = MessageDigest.getInstance("SHA-256"); digest.update(table.toByteArray())
          for (i in 0 until cursor.columnCount) {
            digest.update(cursor.getType(i).toByte())
            val value = when (cursor.getType(i)) {
              Cursor.FIELD_TYPE_NULL -> byteArrayOf()
              Cursor.FIELD_TYPE_BLOB -> cursor.getBlob(i)
              else -> cursor.getString(i).toByteArray(Charsets.UTF_8)
            }
            digest.update(ByteBuffer.allocate(4).putInt(value.size).array()); digest.update(value); value.fill(0)
          }
          result.add(digest.digest().joinToString("") { "%02x".format(it.toInt() and 255) })
        }
      }
    }
    result
  }
}

// Only this test-owned encrypted file may be written. It contains no capability,
// Auth session or route. AAD is distinct from every production envelope.
internal class SupplementalManifest(context: Context) {
  private val root = File(context.noBackupFilesDir.canonicalFile, "walk-supplemental-product-v1")
  private val base = File(root, "run.enc")
  private fun paths() {
    supplementalCheck(root.absoluteFile == root.canonicalFile && base.absoluteFile == base.canonicalFile, "UNSAFE_TEST_PATH")
    for (suffix in listOf(".bak", ".new")) {
      val f = File(base.path + suffix)
      supplementalCheck(f.absoluteFile == f.canonicalFile, "UNSAFE_TEST_PATH")
    }
  }
  fun exists(): Boolean { paths(); return listOf(base, File(base.path + ".bak"), File(base.path + ".new")).any { it.exists() } }
  @Synchronized fun save(value: JSONObject) {
    paths(); supplementalCheck(root.isDirectory || root.mkdirs(), "TEST_MANIFEST_IO")
    val plain = value.toString().toByteArray(Charsets.UTF_8)
    supplementalCheck(plain.size <= 1999900, "TEST_MANIFEST_TOO_LARGE")
    val sealed = try { WalkCipher { WalkKeyStore.key(allowCreate = false) }.encrypt(plain, aad()) } finally { plain.fill(0) }
    val expected = sealed.nonce + sealed.ciphertext
    val target = AtomicFile(base); val stream = target.startWrite()
    try { stream.write(expected); stream.fd.sync(); target.finishWrite(stream) }
    catch (_: Exception) { target.failWrite(stream); throw SupplementalBlocked("TEST_MANIFEST_IO") }
    val actual = target.readFully()
    try { supplementalCheck(actual.contentEquals(expected), "TEST_MANIFEST_PROMOTION_FAILED") } finally { actual.fill(0); expected.fill(0) }
  }
  @Synchronized fun load(): JSONObject {
    paths(); supplementalCheck(base.isFile && !File(base.path + ".bak").exists() && !File(base.path + ".new").exists(), "TEST_MANIFEST_UNCOMMITTED")
    supplementalCheck(base.length() in 32..2000000, "TEST_MANIFEST_CORRUPT")
    val bytes = base.readBytes()
    val plain = try { WalkCipher { WalkKeyStore.key(allowCreate = false) }.decrypt(WalkSealedBytes(bytes.copyOfRange(0, 12), bytes.copyOfRange(12, bytes.size)), aad()) } finally { bytes.fill(0) }
    return try { JSONObject(String(plain, Charsets.UTF_8)).also { supplementalCheck(it.getInt("version") == 1, "TEST_MANIFEST_VERSION") } }
    finally { plain.fill(0) }
  }
  @Synchronized fun update(change: (JSONObject) -> Unit) { val v = load(); change(v); save(v) }
  fun binding(v: JSONObject): SupplementalBinding = SupplementalBinding(v.getString("marker"), v.getString("origin"), v.getString("owner"), v.getString("pet"))
  fun requireBaseline(audit: WalkReadOnlyJournalAudit) {
    val v = load(); val expected = v.getJSONArray("baseline"); val actual = audit.fingerprints()
    supplementalCheck((0 until expected.length()).all { expected.getString(it) in actual }, "PRIOR_WALK_DATA_CHANGED")
  }
  private fun aad() = "NURI_WALK_SUPPLEMENTAL:1:run".toByteArray(Charsets.UTF_8)
}
