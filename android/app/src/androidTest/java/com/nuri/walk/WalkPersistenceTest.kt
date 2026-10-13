package com.nuri.walk

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import android.location.Location
import android.os.SystemClock
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import javax.crypto.KeyGenerator
import java.nio.ByteBuffer

@RunWith(AndroidJUnit4::class)
class WalkPersistenceTest {
  private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
  private val actor = "11111111-1111-4111-8111-111111111111"
  private val pet = "22222222-2222-4222-8222-222222222222"
  private fun command() = UUID.randomUUID().toString()
  private fun waitResult(operation: ((String?, String?) -> Unit) -> Unit): Pair<String?, String?> {
    val latch = CountDownLatch(1); var result: Pair<String?, String?> = null to null
    operation { value, error -> result = value to error; latch.countDown() }
    assertTrue("Native operation timed out", latch.await(10, TimeUnit.SECONDS)); return result
  }
  private fun storage(): Pair<WalkStorage, String> {
    val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
    val name = "walk-test-${UUID.randomUUID()}.db"
    return WalkStorage(context, WalkCipher { key }, name) to name
  }
  private fun cleanup(store: WalkStorage, name: String) {
    store.db.close(); context.deleteDatabase(File(context.noBackupFilesDir, name).absolutePath)
  }
  @Test fun roomUniqueActiveSlotAndTransactionRollback() {
    val (store, name) = storage()
    try {
      val first = WalkLocalSession().apply { sessionId = command(); activeSlot = 1 }
      store.transaction { store.dao.insertSession(first) }
      try { store.transaction { store.dao.insertSession(WalkLocalSession().apply { sessionId = command(); activeSlot = 1 }) }; fail("Expected uniqueness denial") }
      catch (error: WalkFailure) { assertEquals("WALK_LOCAL_DATABASE_ERROR", error.code) }
      assertEquals(1, store.dao.sessionCount())
      try { store.transaction { store.dao.insertSession(WalkLocalSession().apply { sessionId = command() }); throw WalkFailure("ROLLBACK_FIXTURE") } }
      catch (_: WalkFailure) { /* Expected fixture rollback. */ }
      assertEquals(1, store.dao.sessionCount())
    } finally { cleanup(store, name) }
  }
  @Test fun androidKeystoreAeadIsNonExportableAndRejectsWrongAad() {
    val key = WalkKeyStore.key(); assertNull(key.encoded)
    val cipher = WalkCipher { key }; val aad = WalkCipher.aad("public-fixture", "point", 0)
    val plain = "PUBLIC_SYNTHETIC_COORDINATES".toByteArray()
    val sealed = cipher.encrypt(plain, aad)
    val read = cipher.decrypt(sealed, aad)
    try { assertTrue(read.contentEquals(plain)) } finally { read.fill(0); plain.fill(0) }
    try { cipher.decrypt(sealed, WalkCipher.aad("other-fixture", "point", 0)); fail("Expected AAD rejection") }
    catch (error: WalkFailure) { assertEquals("WALK_LOCAL_ENCRYPTION_ERROR", error.code) }
  }
  @Test fun encryptedMetadataPointsFinishAndReceiptsSurviveRoomReadback() {
    val (store, name) = storage()
    try {
      val row = WalkLocalSession().apply { sessionId = command(); activeSlot = 1; runtimeState = "WALKING"; revision = 1 }
      val meta = WalkMetadata(actor, pet, 10000, 1000000, WalkTiming(1000, 10000, 0, 0))
      store.writeMetadata(row, meta); store.transaction { store.dao.insertSession(row) }
      val plain = "PUBLIC_SYNTHETIC_COORDINATES".toByteArray()
      val expected = plain.clone()
      store.appendPoint(row, plain, meta.copy(fixCount = 1))
      assertTrue(plain.all { it == 0.toByte() })
      val chunk = store.dao.chunks(row.sessionId).single()
      val read = store.cipher.decrypt(WalkSealedBytes(chunk.nonce, chunk.ciphertext), WalkCipher.aad(row.sessionId, "point", chunk.chunkIndex))
      try { assertTrue(read.contentEquals(expected)) } finally { read.fill(0); expected.fill(0) }
      assertEquals(actor, store.metadata(store.dao.session(row.sessionId)).owner)
      row.runtimeState = "FINISHED_LOCAL"; row.activeSlot = null; row.revision++
      store.writeMetadata(row, meta.copy(finishedWall = 20000))
      store.transaction { store.dao.updateSession(row) }
      assertNotNull(store.dao.session(row.sessionId).finishCiphertext)
      val receipt = WalkCommandReceipt().apply { commandId = command(); sessionId = row.sessionId; inputDigest = "fixture" }
      store.transaction { store.dao.insertReceipt(receipt); store.saveResult(receipt, "SAFE_RESULT", row.revision) }
      assertEquals("SAFE_RESULT", store.replayResult(store.dao.receipt(receipt.commandId)))
      store.db.openHelper.writableDatabase.query("PRAGMA wal_checkpoint(FULL)").close()
      val bytes = File(context.noBackupFilesDir, name).readBytes()
      assertFalse(String(bytes, Charsets.ISO_8859_1).contains(actor))
      assertFalse(String(bytes, Charsets.ISO_8859_1).contains("PUBLIC_SYNTHETIC_COORDINATES"))
      bytes.fill(0)
    } finally { cleanup(store, name) }
  }

  private class FakeSource : WalkLocationSource {
    override var subscribed = false; private set
    var registrations = 0
    var fix: ((Location) -> Unit)? = null
    override fun start(onFix: (Location) -> Unit, onAvailability: (Boolean) -> Unit, done: (String?) -> Unit) {
      if (subscribed) { done("WALK_ALREADY_ACTIVE"); return }
      subscribed = true; registrations++; fix = onFix; onAvailability(true); done(null)
    }
    override fun stop() { subscribed = false; fix = null }
  }
  private class FakeService : WalkServiceHandle {
    var ended = false
    override fun end() { ended = true }
    override fun refresh(state: String, activeMs: Long, sessionId: String, revision: Long, fixCount: Long, chunkCount: Long) = Unit
  }
  private fun runtime(store: WalkStorage, source: FakeSource, service: FakeService) =
    WalkRuntime(context, store, source, testGate = { visible, foreground ->
      if (visible || foreground) null else "WALK_ACTIVITY_NOT_VISIBLE"
    }) { instance, session, id -> instance.attach(service, session, id) }
  private fun fix() = Location("public-synthetic-fixture").apply {
    latitude = 1.25; longitude = 2.5; accuracy = 3f
    elapsedRealtimeNanos = SystemClock.elapsedRealtimeNanos(); time = System.currentTimeMillis()
  }
  @Test fun injectedNativeLifecycleCommandReplayRevisionPauseFinishAndOwnerIsolation() {
    val (store, name) = storage(); val source = FakeSource(); val service = FakeService()
    val runtime = runtime(store, source, service)
    val oldVisibility = WalkVisibility.resumed; WalkVisibility.resumed = true
    try {
      assertNull(waitResult { runtime.bindOwner(actor, it) }.second)
      val startId = command()
      val started = waitResult { runtime.start(pet, startId, "0", true, it) }
      assertNull(started.second); val initial = JSONObject(started.first!!)
      val session = initial.getString("sessionId"); val revision = initial.getString("revision")
      val firstFix = fix(); source.fix?.invoke(firstFix)
      source.fix?.invoke(firstFix)
      assertEquals("1", JSONObject(waitResult { runtime.getSnapshot(it) }.first!!).getString("fixCount"))
      val lateCallback = source.fix
      assertEquals(started, waitResult { runtime.start(pet, startId, "0", true, it) })
      assertEquals("WALK_ALREADY_ACTIVE", waitResult { runtime.start(pet, command(), "0", true, it) }.second)
      assertEquals("WALK_COMMAND_REVISION_CONFLICT", waitResult { runtime.mutate("PAUSE", session, command(), "0", true, it) }.second)
      val paused = waitResult { runtime.mutate("PAUSE", session, command(), revision, true, it) }
      assertNull(paused.second); assertFalse(source.subscribed)
      lateCallback?.invoke(fix())
      assertEquals("1", JSONObject(waitResult { runtime.getSnapshot(it) }.first!!).getString("fixCount"))
      val pausedState = JSONObject(paused.first!!)
      val resumed = waitResult { runtime.mutate("RESUME", session, command(), pausedState.getString("revision"), true, it) }
      assertNull(resumed.second); assertTrue(source.subscribed); assertEquals(2, source.registrations)
      val resumedState = JSONObject(resumed.first!!)
      source.fix?.invoke(fix())
      assertEquals("2", JSONObject(waitResult { runtime.getSnapshot(it) }.first!!).getString("fixCount"))
      val chunks = store.dao.chunks(session)
      for ((index, chunk) in chunks.withIndex()) {
        val bytes = store.cipher.decrypt(WalkSealedBytes(chunk.nonce, chunk.ciphertext), WalkCipher.aad(session, "point", chunk.chunkIndex))
        try { val point = ByteBuffer.wrap(bytes); assertEquals(1, point.int); assertEquals(index.toLong(), point.long) }
        finally { bytes.fill(0) }
      }
      assertEquals(1, store.metadata(store.dao.session(session)).pauses.size)
      val finishId = command()
      val finished = waitResult { runtime.mutate("FINISH", session, finishId, resumedState.getString("revision"), true, it) }
      assertNull(finished.second); assertFalse(source.subscribed)
      assertEquals("FINISHED_LOCAL", JSONObject(finished.first!!).getString("runtimeState"))
      assertEquals(finished, waitResult { runtime.mutate("FINISH", session, finishId, resumedState.getString("revision"), true, it) })
      assertNotNull(store.dao.session(session).finishCiphertext)
      assertNull(waitResult { runtime.bindOwner("33333333-3333-4333-8333-333333333333", it) }.second)
      assertEquals("WALK_ACTIVE_SESSION_OWNER_MISMATCH", waitResult { runtime.mutate("FINISH", session, command(), "99", true, it) }.second)
      assertNull(waitResult { runtime.stopForLogout(command(), "0", it) }.second)
      assertEquals("WALK_ACTIVE_SESSION_OWNER_MISMATCH", waitResult { runtime.getSnapshot(it) }.second)
    } finally { runtime.closeForTest(); WalkVisibility.resumed = oldVisibility; cleanup(store, name) }
  }
  @Test fun processRestartPreservesSameSessionAndRequiresExplicitRecovery() {
    val (store, name) = storage(); val source = FakeSource()
    val first = runtime(store, source, FakeService())
    var recovered: WalkRuntime? = null
    try {
      waitResult { first.bindOwner(actor, it) }
      val initial = JSONObject(waitResult { first.start(pet, command(), "0", true, it) }.first!!)
      val session = initial.getString("sessionId")
      first.closeForTest()
      val afterLoss = runtime(store, source, FakeService()); recovered = afterLoss
      waitResult { afterLoss.bindOwner(actor, it) }
      val checkpoint = JSONObject(waitResult { afterLoss.getSnapshot(it) }.first!!)
      assertEquals(session, checkpoint.getString("sessionId"))
      assertEquals("RECOVERY_REQUIRED", checkpoint.getString("runtimeState"))
      assertFalse(source.subscribed); assertFalse(checkpoint.getBoolean("serviceRunning"))
      assertTrue(checkpoint.getLong("revision") > initial.getLong("revision"))
      val resumed = waitResult { afterLoss.mutate("RESUME_RECOVERED", session, command(), checkpoint.getString("revision"), true, it) }
      assertNull(resumed.second); assertTrue(source.subscribed)
      assertEquals("WALKING", JSONObject(resumed.first!!).getString("runtimeState"))
      assertEquals("2", JSONObject(resumed.first!!).getString("segmentCount"))
    } finally { recovered?.closeForTest(); first.closeForTest(); cleanup(store, name) }
  }
  @Test fun logoutSealsOwnerAndRecoveredFinishIsDurableWithoutRestartingGps() {
    val (store, name) = storage(); val source = FakeSource(); val service = FakeService()
    val runtime = runtime(store, source, service)
    try {
      waitResult { runtime.bindOwner(actor, it) }
      val initial = JSONObject(waitResult { runtime.start(pet, command(), "0", true, it) }.first!!)
      val session = initial.getString("sessionId")
      assertNull(waitResult { runtime.stopForLogout(command(), "0", it) }.second)
      assertFalse(source.subscribed)
      assertEquals("RECOVERY_REQUIRED", store.dao.session(session).runtimeState)
      waitResult { runtime.bindOwner("33333333-3333-4333-8333-333333333333", it) }
      assertEquals("WALK_ACTIVE_SESSION_OWNER_MISMATCH", waitResult { runtime.getSnapshot(it) }.second)
      waitResult { runtime.bindOwner(actor, it) }
      val snapshot = JSONObject(waitResult { runtime.getSnapshot(it) }.first!!)
      val result = waitResult { runtime.mutate("FINISH", session, command(), snapshot.getString("revision"), true, it) }
      assertNull(result.second)
      assertEquals("FINISHED_LOCAL", JSONObject(result.first!!).getString("runtimeState"))
      assertFalse(source.subscribed); assertNotNull(store.dao.session(session).finishCiphertext)
    } finally { runtime.closeForTest(); cleanup(store, name) }
  }
  @Test fun encryptionFailureStopsCollectionAndPreservesCiphertextForReview() {
    val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
    var invalidated = false
    val cipher = WalkCipher { if (invalidated) throw WalkFailure("WALK_LOCAL_KEY_INVALIDATED") else key }
    val name = "walk-test-${UUID.randomUUID()}.db"
    val store = WalkStorage(context, cipher, name); val source = FakeSource()
    val runtime = runtime(store, source, FakeService())
    try {
      waitResult { runtime.bindOwner(actor, it) }
      val initial = JSONObject(waitResult { runtime.start(pet, command(), "0", true, it) }.first!!)
      val session = initial.getString("sessionId")
      val before = store.dao.session(session).metadataCiphertext.clone()
      invalidated = true; runtime.checkpoint()
      assertEquals("WALK_LOCAL_KEY_INVALIDATED", waitResult { runtime.getSnapshot(it) }.second)
      assertFalse(source.subscribed)
      val row = store.dao.session(session)
      assertEquals("RECOVERY_REQUIRED", row.runtimeState)
      assertEquals("WALK_LOCAL_KEY_INVALIDATED", row.lastErrorCode)
      assertTrue(before.contentEquals(row.metadataCiphertext)); before.fill(0)
      invalidated = false
      assertEquals("RECOVERY_REQUIRED", JSONObject(waitResult { runtime.getSnapshot(it) }.first!!).getString("runtimeState"))
    } finally { runtime.closeForTest(); cleanup(store, name) }
  }
  @Test fun logoutDuringStartingCannotActivateALateLocationSubscription() {
    val (store, name) = storage(); val source = FakeSource()
    var activation: Pair<String, String>? = null
    val runtime = WalkRuntime(context, store, source, testGate = { _, _ -> null }) { _, session, id -> activation = session to id }
    val startReply = CountDownLatch(1)
    try {
      waitResult { runtime.bindOwner(actor, it) }
      runtime.start(pet, command(), "0", true) { _, _ -> startReply.countDown() }
      waitResult { runtime.getSnapshot(it) }
      assertNull(waitResult { runtime.stopForLogout(command(), "0", it) }.second)
      assertTrue(startReply.await(10, TimeUnit.SECONDS))
      val pending = activation ?: throw AssertionError("Expected pending activation")
      runtime.attach(FakeService(), pending.first, pending.second)
      waitResult { runtime.bindOwner(actor, it) }
      assertFalse(source.subscribed)
      assertEquals("RECOVERY_REQUIRED", store.dao.active().runtimeState)
    } finally { runtime.closeForTest(); cleanup(store, name) }
  }
  @Test fun staleActivationFailureCannotStopANewerWalk() {
    val (store, name) = storage(); val source = FakeSource()
    val runtime = runtime(store, source, FakeService())
    try {
      waitResult { runtime.bindOwner(actor, it) }
      val oldCommand = command()
      val initial = JSONObject(waitResult { runtime.start(pet, oldCommand, "0", true, it) }.first!!)
      waitResult { runtime.mutate("FINISH", initial.getString("sessionId"), command(), initial.getString("revision"), true, it) }
      val newer = JSONObject(waitResult { runtime.start(pet, command(), "0", true, it) }.first!!)
      runtime.activationDenied(oldCommand, "WALK_SERVICE_UNAVAILABLE")
      val snapshot = JSONObject(waitResult { runtime.getSnapshot(it) }.first!!)
      assertEquals(newer.getString("sessionId"), snapshot.getString("sessionId"))
      assertEquals("WALKING", snapshot.getString("runtimeState")); assertTrue(source.subscribed)
    } finally { runtime.closeForTest(); cleanup(store, name) }
  }
  @Test fun realPlatformGateRejectsBackgroundColdStartBeforeWritingSession() {
    val (store, name) = storage(); val source = FakeSource()
    val runtime = WalkRuntime(context, store, source)
    try {
      waitResult { runtime.bindOwner(actor, it) }
      assertEquals("WALK_ACTIVITY_NOT_VISIBLE", waitResult { runtime.start(pet, command(), "0", false, it) }.second)
      assertEquals(0, store.dao.sessionCount()); assertFalse(source.subscribed)
    } finally { runtime.closeForTest(); cleanup(store, name) }
  }
  @Test fun recoveredClockEpochCheckpointsFreshFixWithoutChangingIdentity() {
    val (store, name) = storage(); val firstSource = FakeSource()
    val first = runtime(store, firstSource, FakeService())
    var recovered: WalkRuntime? = null
    try {
      waitResult { first.bindOwner(actor, it) }
      val initial = JSONObject(waitResult { first.start(pet, command(), "0", true, it) }.first!!)
      val session = initial.getString("sessionId")
      // Simulate an encrypted prior-boot cursor using a public test fix only.
      firstSource.fix?.invoke(fix().apply {
        elapsedRealtimeNanos = Math.addExact(SystemClock.elapsedRealtimeNanos(), TimeUnit.DAYS.toNanos(1))
      })
      assertEquals("1", JSONObject(waitResult { first.getSnapshot(it) }.first!!).getString("fixCount"))
      first.closeForTest()
      val nextSource = FakeSource()
      val afterLoss = runtime(store, nextSource, FakeService()); recovered = afterLoss
      waitResult { afterLoss.bindOwner(actor, it) }
      val checkpoint = JSONObject(waitResult { afterLoss.getSnapshot(it) }.first!!)
      assertEquals("RECOVERY_REQUIRED", checkpoint.getString("runtimeState"))
      assertEquals(session, checkpoint.getString("sessionId")); assertEquals(pet, checkpoint.getString("petId"))
      val resumed = waitResult { afterLoss.mutate("RESUME_RECOVERED", session, command(), checkpoint.getString("revision"), true, it) }
      assertNull(resumed.second)
      val stale = fix().apply { elapsedRealtimeNanos = 1 }
      nextSource.fix?.invoke(stale)
      assertEquals("1", JSONObject(waitResult { afterLoss.getSnapshot(it) }.first!!).getString("fixCount"))
      nextSource.fix?.invoke(fix())
      val fresh = JSONObject(waitResult { afterLoss.getSnapshot(it) }.first!!)
      assertEquals("2", fresh.getString("fixCount")); assertEquals("2", fresh.getString("encryptedChunkCount"))
      assertEquals(session, fresh.getString("sessionId")); assertEquals(pet, fresh.getString("petId"))
      assertEquals("2", fresh.getString("segmentCount"))
      assertTrue(fresh.getLong("revision") > checkpoint.getLong("revision"))
    } finally { recovered?.closeForTest(); first.closeForTest(); cleanup(store, name) }
  }
}
