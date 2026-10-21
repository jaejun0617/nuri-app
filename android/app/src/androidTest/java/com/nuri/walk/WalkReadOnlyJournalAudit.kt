package com.nuri.walk

import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.util.AtomicFile
import java.io.File
import java.nio.ByteBuffer
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.NoSuchFileException
import java.nio.file.attribute.BasicFileAttributes
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
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
    .put("pending", facts.count { it.state == "PENDING" }).put("final", facts.count { it.state == "FINAL" })
    .put("acknowledged", facts.count { it.state == "ACKNOWLEDGED" }).put("withoutProof", facts.count { it.state == null })
    .put("partial", partial).put("corrupt", corrupt).put("keyError", keyError).put("unknown", unknown).toString()
  fun requireEmpty() = supplementalCheck(healthy() && facts.isEmpty(), "EXISTING_JOURNAL_BLOCKS_UI")
}

internal class SupplementalLiveObservation(val journal: SupplementalAudit, val runtime: SupplementalRuntimeCounts?,
  val databasePresent: Boolean?, val unchanged: Boolean) {
  fun publicCounts(): String = JSONObject().put("complete", runtime != null && journal.healthy())
    .put("journal", JSONObject(journal.publicCounts())).put("runtime", runtime?.let { JSONObject(it.publicCounts()) } ?: JSONObject.NULL)
    .put("databasePresent", databasePresent ?: JSONObject.NULL).put("databaseReadError", if (runtime == null) 1 else 0)
    .put("observationChanged", !unchanged).toString()
  fun requireSafe() = SupplementalLiveAuditPolicy.requireSafe(runtime, journal.healthy(), journal.facts.size, unchanged)
}

// No WalkRuntime/WalkStorage/Room/AtomicFile reader is used for product data.
// Ordinary reads deliberately do not recover .bak or remove .new files.
internal class WalkReadOnlyJournalAudit(context: Context) {
  private val root = context.noBackupFilesDir.canonicalFile
  private fun checked(file: File): File {
    supplementalCheck(file.absoluteFile == file.canonicalFile && file.canonicalFile.toPath().startsWith(root.toPath()), "UNSAFE_PRODUCT_READ_PATH")
    return file
  }
  private fun attributes(file: File): BasicFileAttributes? = try {
    Files.readAttributes(checked(file).toPath(), BasicFileAttributes::class.java, LinkOption.NOFOLLOW_LINKS)
  } catch (_: NoSuchFileException) { null }
  private fun boundedBytes(file: File): ByteArray = file.inputStream().use { input ->
    val buffer = ByteArray(4097)
    try {
      var count = 0
      while (count < buffer.size) {
        val read = input.read(buffer, count, buffer.size - count)
        if (read < 0) break
        supplementalCheck(read > 0, "JOURNAL_READ_INCOMPLETE")
        count += read
      }
      supplementalCheck(count <= 4096, "JOURNAL_READ_LIMIT")
      buffer.copyOf(count)
    } finally { buffer.fill(0) }
  }
  // Private comparison token only: names and ciphertext never enter status output.
  private fun journalStamp(): ByteArray {
    val digest = MessageDigest.getInstance("SHA-256")
    val dir = checked(File(root, "walk-final-cleanup-v1"))
    val attr = attributes(dir) ?: return digest.digest(byteArrayOf(0))
    supplementalCheck(attr.isDirectory, "JOURNAL_DIRECTORY_UNREADABLE")
    val files = dir.listFiles() ?: throw SupplementalBlocked("JOURNAL_DIRECTORY_UNREADABLE")
    supplementalCheck(files.size <= 768, "JOURNAL_READ_LIMIT")
    digest.update(attr.lastModifiedTime().toString().toByteArray())
    for (file in files.sortedBy { it.name }) {
      val a = attributes(file) ?: throw SupplementalBlocked("LIVE_AUDIT_OBSERVATION_CHANGED")
      supplementalCheck(a.isRegularFile && a.size() <= 4096, "JOURNAL_METADATA_UNREADABLE")
      digest.update(file.name.toByteArray()); digest.update(a.lastModifiedTime().toString().toByteArray())
      val bytes = boundedBytes(file)
      try { digest.update(bytes) } finally { bytes.fill(0) }
    }
    return digest.digest()
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
        val raw = boundedBytes(file)
        supplementalCheck(raw.size in 32..4096, "CORRUPT_JOURNAL")
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

  fun liveObservation(): SupplementalLiveObservation {
    val before = journalStamp()
    val journal = scan()
    var counts: SupplementalRuntimeCounts? = null
    var present: Boolean? = null
    var unchanged = false
    try {
      val path = checked(File(root, "nuri-walk-v1.db"))
      val initial = attributes(path)
      for (suffix in listOf("-wal", "-shm", "-journal")) {
        val sidecar = attributes(File(path.path + suffix))
        supplementalCheck(sidecar == null || initial != null && sidecar.isRegularFile, "ORPHAN_DATABASE_SIDECAR")
      }
      present = initial != null
      if (initial == null) {
        counts = SupplementalRuntimeCounts()
        unchanged = attributes(path) == null
          && listOf("-wal", "-shm", "-journal").all { attributes(File(path.path + it)) == null }
      } else {
        supplementalCheck(initial.isRegularFile, "DATABASE_METADATA_UNREADABLE")
        SQLiteDatabase.openDatabase(path.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
          supplementalCheck(db.isReadOnly, "DATABASE_NOT_READONLY")
          fun version(): Long = db.rawQuery("PRAGMA data_version", null).use {
            supplementalCheck(it.moveToFirst() && it.getType(0) == Cursor.FIELD_TYPE_INTEGER, "DATABASE_VERSION_UNREADABLE")
            it.getLong(0)
          }
          fun rows(): Pair<SupplementalRuntimeCounts, ByteArray> {
            val result = SupplementalRuntimeCounts()
            val digest = MessageDigest.getInstance("SHA-256")
            db.rawQuery("SELECT activeSlot,runtimeState,revision FROM walk_local_sessions LIMIT 20001", null).use { cursor ->
              while (cursor.moveToNext()) {
                val active = !cursor.isNull(0)
                result.row(if (cursor.getType(1) == Cursor.FIELD_TYPE_STRING) cursor.getString(1) else null,
                  active, !active || cursor.getType(0) == Cursor.FIELD_TYPE_INTEGER && cursor.getLong(0) == 1L)
                supplementalCheck(cursor.getType(2) == Cursor.FIELD_TYPE_INTEGER && cursor.getLong(2) >= 0, "RUNTIME_REVISION_UNREADABLE")
                for (i in 0..2) {
                  digest.update(cursor.getType(i).toByte())
                  val value = if (cursor.isNull(i)) byteArrayOf() else cursor.getString(i).toByteArray()
                  try { digest.update(ByteBuffer.allocate(4).putInt(value.size).array()); digest.update(value) } finally { value.fill(0) }
                }
              }
            }
            return result to digest.digest()
          }
          val startVersion = version()
          val first = rows(); val second = rows()
          val final = attributes(path)
          unchanged = startVersion == version() && first.second.contentEquals(second.second)
            && final != null && initial.fileKey() != null && initial.fileKey() == final.fileKey()
          counts = second.first
        }
      }
    } catch (_: Exception) {
      // A failed read is explicitly unavailable, never an empty/zero database.
      counts = null; unchanged = false
    }
    return SupplementalLiveObservation(journal, counts, present, unchanged && before.contentEquals(journalStamp()))
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
    val counts = SupplementalRuntimeCounts()
    db?.rawQuery("SELECT activeSlot,runtimeState FROM walk_local_sessions", null)?.use { cursor ->
      while (cursor.moveToNext()) counts.row(if (cursor.getType(1) == Cursor.FIELD_TYPE_STRING) cursor.getString(1) else null,
        !cursor.isNull(0), cursor.isNull(0) || cursor.getType(0) == Cursor.FIELD_TYPE_INTEGER && cursor.getLong(0) == 1L)
    }
    supplementalCheck(counts.quiescent(), "EXISTING_RUNTIME_NOT_QUIESCENT")
  }
  fun ownedProduct(b: SupplementalBinding, id: String): JSONObject = database { db ->
    supplementalUuid(id)
    val database = db ?: throw SupplementalBlocked("OWNED_PRODUCT_DATABASE_MISSING")
    database.rawQuery("SELECT runtimeState,metadataRevision,metadataNonce,metadataCiphertext,finishCiphertext FROM walk_local_sessions WHERE sessionId=?", arrayOf(id)).use { c ->
      supplementalCheck(c.moveToFirst(), "OWNED_PRODUCT_ROW_MISSING")
      val plain = WalkCipher { WalkKeyStore.key(allowCreate = false) }.decrypt(
        WalkSealedBytes(c.getBlob(2), c.getBlob(3)), WalkCipher.aad(id, "metadata", c.getLong(1)))
      val meta = try { WalkCodec.decode(plain) } finally { plain.fill(0) }
      supplementalCheck(meta.owner == b.owner && meta.pet == b.pet, "OWNED_PRODUCT_SCOPE_MISMATCH")
      val j = meta.product ?: throw SupplementalBlocked("OWNED_PRODUCT_JOURNAL_MISSING")
      JSONObject().put("runtimeState", c.getString(0)).put("phase", j.phase.name)
        .put("activeMs", meta.timing.activeMs).put("finishEnvelopePresent", !c.isNull(4) && c.getBlob(4).isNotEmpty())
        .put("payloadPresent", j.payloadJson != null).put("receiptPresent", j.receiptJson != null)
        .put("payloadDigest", j.payloadDigest ?: JSONObject.NULL)
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
  fun publicReview(label: String): JSONObject {
    if (!exists()) return JSONObject().put("exists", false)
    val v = load()
    supplementalCheck(v.getString("stage") in setOf("READY", "PET_CREATED", "REMOTE_SUCCESS_HELD", "BACKOUT_REAL_RESPONSE_RETURNED", "PRODUCT_RECOVERY_OBSERVED")
      && v.has("owner") == v.has("pet"), "TEST_MANIFEST_SHAPE_INVALID")
    return JSONObject().put("exists", true).put("stage", v.getString("stage"))
      .put("hasPet", v.has("pet")).put("hasSession", v.has("session")).put("hasRequest", v.has("request"))
      .also { out ->
        for ((field, domain) in listOf("owner" to "owner", "pet" to "pet", "session" to "client_session", "request" to "request"))
          if (v.has(field)) out.put(field + "Key", publicHash(label, domain, v.getString(field)))
        if (v.has("resourceBinding")) out.put("resourceBinding", v.getString("resourceBinding"))
      }
  }
  @Synchronized fun removeReviewed(marker: String, label: String, ownerKey: String?, petKey: String?,
    serverAbsent: Boolean, serverAck: Boolean, audit: WalkReadOnlyJournalAudit) {
    if (!exists()) return
    val v = load()
    supplementalCheck(Regex("NQ[0-9a-f]{12}").matches(marker) && v.getString("marker") == marker, "TEST_CLEANUP_NOT_REVIEWABLE")
    requireBaseline(audit)
    val journal = audit.scan(); audit.requireQuiescent()
    val identity = v.has("owner") && v.has("pet") && ownerKey == publicHash(label, "owner", v.getString("owner"))
      && petKey == publicHash(label, "pet", v.getString("pet"))
    val decision = SupplementalCleanupPolicy.decide(v.getString("stage"), v.has("pet"), v.has("session"), v.has("request"),
      identity, serverAbsent, serverAck, journal.healthy() && journal.facts.isEmpty(), true)
    supplementalCheck(decision == "REMOVE", decision)
    // Exact test-owned file only. No folder recursion, AtomicFile recovery,
    // key/alias removal, product DB/journal or Runtime cleanup call.
    supplementalCheck(base.delete() && !exists(), "TEST_MANIFEST_REMOVAL_NOT_VERIFIED")
  }
  companion object {
    fun publicHash(label: String, domain: String, value: String): String {
      supplementalCheck(Regex("[0-9a-f]{40,64}").matches(label), "PUBLIC_HASH_LABEL_INVALID")
      return Mac.getInstance("HmacSHA256").run {
        init(SecretKeySpec(label.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        doFinal("$domain|$value".toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it.toInt() and 255) }
      }
    }
  }
  private fun aad() = "NURI_WALK_SUPPLEMENTAL:1:run".toByteArray(Charsets.UTF_8)
}
