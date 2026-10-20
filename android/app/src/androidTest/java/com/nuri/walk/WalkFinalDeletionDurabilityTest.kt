package com.nuri.walk

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import java.util.UUID
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

// Auxiliary test APK only. No RPC/Auth/permissions/location/service call, no
// production database/journal, and no key deletion/rotation or shipping hook.
@RunWith(AndroidJUnit4::class)
class WalkFinalDeletionDurabilityTest {
  private val owner = "11111111-1111-4111-8111-111111111111"
  private val foreign = "22222222-2222-4222-8222-222222222222"
  private val pet = "33333333-3333-4333-8333-333333333333"
  private fun id() = UUID.randomUUID().toString()
  private fun proof(ticket: String, state: String) = JSONObject()
    .put("version", 1).put("requestId", ticket).put("purpose", "PET_FINAL")
    .put("resourceBinding", "b".repeat(64)).put("state", state)
    .put("registeredAt", "2026-10-21T01:00:00.000Z")
    .put("confirmedAt", if (state == "PENDING") JSONObject.NULL else "2026-10-21T00:50:00.000Z")
    .put("acknowledgedAt", if (state == "ACKNOWLEDGED") "2026-10-21T00:40:00.000Z" else JSONObject.NULL).toString()
  private fun denied(code: String, operation: () -> Unit) {
    try { operation(); fail("Expected scoped denial") } catch (error: WalkFailure) { assertEquals(code, error.code) }
  }

  @Test fun realKeystoreRoomAtomicFileV2ReadbackRestartAckAndForeignScope() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val name = "walk-v2-isolated-${id()}.db"
    val directory = File(context.noBackupFilesDir, "walk-v2-isolated-${id()}")
    val key = WalkKeyStore.key(); assertNull(key.encoded)
    var store = WalkStorage(context, WalkCipher { key }, name)
    try {
      fun insert(actor: String): String {
        val row = WalkLocalSession().apply { sessionId = id(); runtimeState = "FINISHED_LOCAL"; revision = 1 }
        store.writeMetadata(row, WalkMetadata(actor, pet, 1, 1, WalkTiming(1, 1, 0, 0), finishedWall = 2))
        store.transaction { store.dao.insertSession(row) }; return row.sessionId
      }
      val ownedSession = insert(owner); val foreignSession = insert(foreign)
      var journal = WalkFinalCleanup(store, directory)
      val ticket = journal.captureV2(owner, pet)
      val capability = journal.scope(ticket).getString("capability")
      assertTrue(Regex("[0-9a-f]{64}").matches(capability))
      val ciphertext = File(directory, ticket).readBytes()
      assertFalse(String(ciphertext, Charsets.ISO_8859_1).contains(capability)); ciphertext.fill(0)
      journal.recordProof(ticket, proof(ticket, "PENDING")); journal.armBlock(ticket); journal.persistArm(ticket)
      denied("WALK_INVALID_STATE_TRANSITION") { journal.step(ticket) }
      assertNotNull(store.dao.session(ownedSession))

      // Reopen the real Room file and AtomicFile envelope with the same Android
      // Keystore key. This simulates object/process reconstruction, NOT a kill.
      store.db.close(); store = WalkStorage(context, WalkCipher { WalkKeyStore.key() }, name)
      journal = WalkFinalCleanup(store, directory)
      assertTrue(capability == journal.scope(ticket).getString("capability"))
      assertEquals(ticket, journal.captureV2(owner, pet))
      denied("WALK_FINAL_CLEANUP_PENDING") { journal.assertAllowed(owner, pet) }
      journal.assertAllowed(foreign, pet)
      File(directory, "${id()}.new").writeBytes(byteArrayOf(1, 2))
      File(directory, "$ticket.new").writeBytes(byteArrayOf(3, 4))
      assertEquals(1, journal.pending().length())
      val failedPromotion = WalkFinalCleanup(store, directory, promote = { _, stream -> stream.close() })
      denied("WALK_FINAL_CLEANUP_PENDING") { failedPromotion.recordProof(ticket, proof(ticket, "FINAL"), true) }
      assertFalse(journal.scope(ticket).getBoolean("confirmed")); assertNotNull(store.dao.session(ownedSession))

      journal.recordProof(ticket, proof(ticket, "FINAL"), true)
      assertTrue(journal.step(ticket)); assertNull(store.dao.session(ownedSession)); assertNotNull(store.dao.session(foreignSession))
      denied("WALK_FINAL_CLEANUP_PENDING") { journal.acknowledge(ticket) }
      journal.recordProof(ticket, proof(ticket, "ACKNOWLEDGED"))
      val failedRemoval = WalkFinalCleanup(store, directory, erase = { _ -> Unit })
      denied("WALK_FINAL_CLEANUP_PENDING") { failedRemoval.acknowledge(ticket) }
      journal = WalkFinalCleanup(store, directory)
      assertEquals("ACKNOWLEDGED", journal.view(ticket).getString("proofState"))
      journal.acknowledge(ticket)
      assertFalse(listOf(ticket, "$ticket.bak", "$ticket.new").any { File(directory, it).exists() })
      assertNotNull(store.dao.session(foreignSession))
    } finally {
      store.db.close()
      context.deleteDatabase(File(context.noBackupFilesDir, name).absolutePath)
      directory.deleteRecursively()
    }
  }
}
