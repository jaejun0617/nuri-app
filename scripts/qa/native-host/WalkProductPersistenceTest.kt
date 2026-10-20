package com.nuri.walk

import android.content.Context
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import javax.crypto.KeyGenerator

// Actual Native runtime/store/cipher/codec + committed DAO SQL on isolated
// SQLite. Platform ports are host-only; this is not Android device evidence.
class WalkProductPersistenceTest {
  private val a = "11111111-1111-4111-8111-111111111111"
  private val b = "33333333-3333-4333-8333-333333333333"
  private val pet = "22222222-2222-4222-8222-222222222222"
  private fun id() = UUID.randomUUID().toString()
  private fun await(block: ((String?, String?) -> Unit) -> Unit): Pair<String?, String?> {
    val latch = CountDownLatch(1); var result: Pair<String?, String?> = null to null
    block { value, error -> result = value to error; latch.countDown() }
    assertTrue(latch.await(5, TimeUnit.SECONDS)); return result
  }
  private class Source : WalkLocationSource {
    override var subscribed = false
    var starts = 0
    override fun start(onFix: (android.location.Location) -> Unit, onAvailability: (Boolean) -> Unit, done: (String?) -> Unit) {
      subscribed = true; starts++; done(null)
    }
    override fun stop() { subscribed = false }
  }
  private class Service : WalkServiceHandle {
    override fun end() = Unit
    override fun refresh(state: String, activeMs: Long, sessionId: String, revision: Long, fixCount: Long, chunkCount: Long) = Unit
  }
  private class Fixture : AutoCloseable {
    var failCleanupPromotion = false
    val root = Files.createTempDirectory(java.io.File(System.getProperty("walk.host.data")).toPath(), "nuri-host-native-").toFile()
    val context = Context(root)
    val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
    val storage = WalkStorage(context, WalkCipher { key }, "fixture.db")
    val products = WalkProductStore(storage)
    val source = Source()
    var denied: String? = null
    val cleanup = WalkFinalCleanup(storage, java.io.File(context.noBackupFilesDir, "walk-final-cleanup-v1"), promote = { target, stream -> if (failCleanupPromotion) stream.close() else target.finishWrite(stream) })
    val runtime = WalkRuntime(context, storage, source, testGate = { _, _ -> denied }, qaEnabled = false, injectedFinalCleanup = cleanup) { r, s, c -> r.attach(Service(), s, c) }
    override fun close() { runtime.closeForTest(); storage.db.close(); root.deleteRecursively() }
  }
  private fun prepare(f: Fixture, owner: String = a): JSONObject = JSONObject(f.products.prepare(owner, pet, id(), 1791849600000, 1000))
  private fun receipt(session: String, state: String = "ACTIVE", digest: String? = null): JSONObject = JSONObject()
    .put("clientSessionId", session).put("petId", pet).put("state", state)
    .put("payloadDigest", digest ?: JSONObject.NULL).put("recordClaimExists", false)
    .put("deletedAt", if (state in setOf("NOT_ACCEPTED_FINAL", "DELETED")) "2026-10-13T01:00:00.000Z" else JSONObject.NULL)
    .put("summary", JSONObject.NULL).put("rejectionCode", JSONObject.NULL)
  private fun accepted(session: String, digest: String): JSONObject = receipt(session, "ACCEPTED_SERVER", digest).put("summary", JSONObject()
    .put("sessionId", id()).put("startedAt", "2026-10-13T00:00:00.000Z").put("endedAt", "2026-10-13T00:32:00.000Z")
    .put("measuredDurationMs", "1920000").put("activeDurationMs", "1800000").put("measuredDistanceM", "2430").put("acceptedDistanceM", "2430")
    .put("eligibility", "PROGRESSION_ELIGIBLE").put("acceptedAt", "2026-10-13T01:00:00.000Z")
    .put("routeBackupChoice", "LOCAL_ONLY").put("routeRevision", "1").put("routeDeletedAt", JSONObject.NULL))
  private fun apply(f: Fixture, session: String, value: JSONObject) = f.products.apply(a, session, f.products.validateReceipt(a, session, value.toString()))
  private fun binding(f: Fixture, owner: String = a): String {
    assertNull(await { f.runtime.bindOwner(owner, it) }.second)
    return await { f.runtime.productBinding(owner, it) }.first!!
  }
  private fun op(f: Fixture, epoch: String, operation: String, body: JSONObject, owner: String = a): Pair<String?, String?> =
    await { f.runtime.productCommand(owner, epoch, operation, body.toString(), true, it) }
  private fun expect(code: String, block: () -> Unit) {
    try { block(); fail("Expected $code") } catch (e: WalkFailure) { assertEquals(code, e.code) }
  }
  private fun deletionProof(f: Fixture, ticket: String, state: String): String = JSONObject()
    .put("version", 1).put("requestId", ticket)
    .put("purpose", if (f.cleanup.scope(ticket).isNull("pet")) "ACCOUNT_FINAL" else "PET_FINAL")
    .put("resourceBinding", "b".repeat(64)).put("state", state).put("registeredAt", "2026-10-21T01:00:00.000Z")
    // Transaction start order is not commit order; inverted times are valid.
    .put("confirmedAt", if (state == "PENDING") JSONObject.NULL else "2026-10-21T00:50:00.000Z")
    .put("acknowledgedAt", if (state == "ACKNOWLEDGED") "2026-10-21T00:40:00.000Z" else JSONObject.NULL).toString()
  private fun registeredTicket(f: Fixture, epoch: String, targetPet: String? = pet): String {
    val ticket = op(f, epoch, "CAPTURE_FINAL_CLEANUP", JSONObject().put("petId", targetPet ?: JSONObject.NULL)).first!!
    assertNull(await { f.runtime.finalCleanupProof("REGISTER", ticket, deletionProof(f, ticket, "PENDING"), it) }.second)
    return ticket
  }
  private fun confirmTicket(f: Fixture, ticket: String, done: (String?, String?) -> Unit) =
    f.runtime.finalCleanupProof("CONFIRM", ticket, deletionProof(f, ticket, "FINAL"), done)
  private fun acknowledgeTicket(f: Fixture, ticket: String, done: (String?, String?) -> Unit) {
    assertNull(await { f.runtime.finalCleanupProof("REGISTER", ticket, deletionProof(f, ticket, "ACKNOWLEDGED"), it) }.second)
    f.runtime.finalCleanupCommand("ACK", ticket, done)
  }
  @Test fun deletionCapturePersistsV2RandomCapabilityBeforeNetworking() = Fixture().use { f ->
    val epoch = binding(f)
    val ticket = op(f, epoch, "CAPTURE_FINAL_CLEANUP", JSONObject().put("petId", pet)).first!!
    val saved = f.cleanup.scope(ticket)
    assertEquals(2, saved.optInt("version", 1))
    assertTrue(Regex("[0-9a-f]{64}").matches(saved.optString("capability")))
    val reopened = WalkFinalCleanup(f.storage, java.io.File(f.context.noBackupFilesDir, "walk-final-cleanup-v1"))
    assertTrue(saved.getString("capability") == reopened.scope(ticket).getString("capability"))
    val another = reopened.captureV2(b, pet)
    assertTrue(saved.getString("capability") != reopened.scope(another).getString("capability"))
    val encrypted = java.io.File(f.context.noBackupFilesDir, "walk-final-cleanup-v1/$ticket").readBytes()
    assertFalse(String(encrypted, Charsets.ISO_8859_1).contains(saved.getString("capability")))
    assertFalse(f.source.subscribed)
  }
  @Test fun restartEnumeratesUnconfirmedV2IntentRatherThanLosingItsRecoveryIdentity() = Fixture().use { f ->
    val epoch = binding(f)
    op(f, epoch, "CAPTURE_FINAL_CLEANUP", JSONObject().put("petId", pet))
    val reopened = WalkFinalCleanup(f.storage, java.io.File(f.context.noBackupFilesDir, "walk-final-cleanup-v1"))
    assertEquals(1, reopened.pending().length())
    assertEquals(0, f.storage.dao.sessionCount())
  }
  @Test fun prepareIsConstantWorkWithResolvedForeignAndLegacyHistory() = Fixture().use { f ->
    repeat(205) { index ->
      val row = WalkLocalSession().apply { sessionId = id() }
      val m = WalkMetadata(if (index % 2 == 0) a else b, pet, 0, 0, WalkTiming(0, 0, 0, 0),
        product = if (index % 3 == 0) WalkProductJournal(createdWallMs = 1, phase = WalkProductPhase.RESOLVED,
          receiptJson = receipt(row.sessionId, "NOT_ACCEPTED_FINAL").toString()) else null)
      f.storage.writeMetadata(row, m); f.storage.transaction { f.storage.dao.insertSession(row) }
    }
    val prepared = prepare(f)
    assertEquals(0, f.storage.db.scans)
    assertEquals("PREPARED", prepared.getString("phase")); assertFalse(f.source.subscribed)
    assertEquals(206, f.storage.dao.sessionCount())
  }
  @Test fun completePagedQueueExcludesLegacyAndForeignAcrossRestart() = Fixture().use { f ->
    val expected = mutableSetOf<String>()
    repeat(225) { index ->
      val row = WalkLocalSession().apply { sessionId = id() }
      val m = WalkMetadata(if (index % 7 == 0) b else a, pet, 0, 0, WalkTiming(0, 0, 0, 0),
        product = if (index % 11 == 0) null else WalkProductJournal(createdWallMs = 1000))
      if (m.owner == a && m.product != null) expected.add(row.sessionId)
      f.storage.writeMetadata(row, m); f.storage.transaction { f.storage.dao.insertSession(row) }
    }
    val reopened = WalkStorage(f.context, WalkCipher { f.key }, "fixture.db")
    try {
      var cursor = ""; val got = mutableSetOf<String>(); var pages = 0
      do {
        val page = JSONObject(WalkProductStore(reopened).page(a, cursor)); pages++
        val entries = page.getJSONArray("entries")
        for (i in 0 until entries.length()) assertTrue(got.add(entries.getJSONObject(i).getString("clientSessionId")))
        cursor = if (page.isNull("nextCursor")) "" else page.getString("nextCursor")
      } while (cursor.isNotEmpty())
      assertEquals(expected, got); assertEquals(3, pages); assertEquals(100, reopened.db.maxScan)
    } finally { reopened.db.close() }
  }
  @Test fun journalWritesKeepRuntimeAnchorRevisionAndFreshNonces() = Fixture().use { f ->
    val session = prepare(f).getString("clientSessionId")
    val row = f.storage.dao.session(session)
    val m = f.storage.metadata(row).copy(startedWall = 1000, timing = WalkTiming(100, 1000, 4000, 200))
    row.runtimeState = "WALKING"; row.revision = 7
    f.storage.transaction { f.storage.writeMetadata(row, m); f.storage.dao.updateSession(row) }
    val before = f.storage.dao.session(session)
    apply(f, session, receipt(session))
    f.products.noteError(a, session, "WALK_SYNC_UNKNOWN_RETRYABLE")
    val after = f.storage.dao.session(session); val meta = f.storage.metadata(after)
    assertEquals(7, after.revision); assertEquals(m.timing, meta.timing)
    assertFalse(before.metadataNonce.contentEquals(after.metadataNonce)); assertEquals(7, after.metadataRevision)
    // Same expected revision is still valid; no synthetic state edge occurred.
    assertEquals(8, WalkRuntimePolicy.nextRevision(after.revision, 7))
  }
  @Test fun reservationBeforeStartStoreBuildAndStartRechecksGate() = Fixture().use { f ->
    val epoch = binding(f); val prepared = prepare(f); val session = prepared.getString("clientSessionId")
    val start = JSONObject().put("sessionId", session).put("commandId", id())
    assertEquals("WALK_PRODUCT_RESERVATION_REQUIRED", op(f, epoch, "START", start).second)
    apply(f, session, receipt(session)); assertEquals(0, f.source.starts)
    f.denied = "WALK_LOCATION_PERMISSION_REQUIRED"
    assertEquals(f.denied, op(f, epoch, "START", start).second); assertEquals(0, f.source.starts)
    f.denied = null
    val result = op(f, epoch, "START", start)
    assertNull(result.second); assertEquals("WALKING", JSONObject(result.first!!).getString("runtimeState")); assertEquals(1, f.source.starts)
    assertNull(op(f, epoch, "START", start).second); assertEquals(1, f.source.starts)
    assertEquals("WALK_QA_DISABLED", await { f.runtime.mutate("PAUSE", session, id(), "2", true, it) }.second)
    val active = JSONObject(result.first!!)
    f.products.noteError(a, session, "WALK_SYNC_UNKNOWN_RETRYABLE")
    apply(f, session, receipt(session))
    val paused = op(f, epoch, "MUTATE", JSONObject().put("sessionId", session).put("commandId", id())
      .put("revision", active.getString("revision")).put("action", "PAUSE"))
    assertNull(paused.second); assertFalse(f.source.subscribed)
    val frozen = f.storage.metadata(f.storage.dao.session(session)).timing.activeMs
    Thread.sleep(10); f.runtime.checkpoint(); await { f.runtime.productBinding(a, it) }
    assertEquals(frozen, f.storage.metadata(f.storage.dao.session(session)).timing.activeMs)
  }
  @Test fun preparedLogoutAndColdForeignBindingReleaseOnlySlot() = Fixture().use { f ->
    val epoch = binding(f); val prepared = prepare(f); val session = prepared.getString("clientSessionId")
    apply(f, session, receipt(session))
    assertNull(await { f.runtime.stopForLogout(id(), "0", it) }.second)
    assertNull(f.storage.dao.active()); assertEquals("IDLE", f.storage.dao.session(session).runtimeState)
    val other = binding(f, b)
    assertEquals("WALK_ACTIVE_SESSION_OWNER_MISMATCH", op(f, epoch, "GET", JSONObject().put("sessionId", session)).second)
    assertEquals("WALK_ACTIVE_SESSION_OWNER_MISMATCH", op(f, other, "GET", JSONObject().put("sessionId", session), b).second)
    val next = op(f, other, "PREPARE", JSONObject().put("petId", pet).put("commandId", id()), b)
    assertNull(next.second); assertNotEquals(session, JSONObject(next.first!!).getString("clientSessionId"))
    val bSession = JSONObject(next.first!!).getString("clientSessionId")
    val bReceipt = receipt(bSession)
    assertNull(op(f, other, "APPLY_RECEIPT", JSONObject().put("sessionId", bSession).put("receipt", bReceipt.toString()), b).second)
    assertNull(op(f, other, "START", JSONObject().put("sessionId", bSession).put("commandId", id()), b).second)
    assertTrue(f.source.subscribed)
    assertTrue(f.storage.metadata(f.storage.dao.session(session)).product!!.reservationConfirmed)
    f.runtime.closeForTest()
    // Cold B login with a persisted A PREPARED active slot, previous=null.
    f.storage.transaction {
      val otherRow = f.storage.dao.active(); otherRow.activeSlot = null; f.storage.dao.updateSession(otherRow)
      val aRow = f.storage.dao.session(session); aRow.activeSlot = 1; f.storage.dao.updateSession(aRow)
    }
    val cold = WalkRuntime(f.context, f.storage, f.source, testGate = { _, _ -> null }, qaEnabled = false)
    try {
      assertNull(await { cold.bindOwner(b, it) }.second); assertNull(f.storage.dao.active())
      assertEquals(a, f.storage.metadata(f.storage.dao.session(session)).owner); assertEquals(1, f.source.starts); assertFalse(f.source.subscribed)
    } finally { cold.closeForTest() }
  }
  @Test fun activeLogoutFreezesAndFencesSameOwnerRelogin() = Fixture().use { f ->
    val epoch = binding(f); val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    assertNull(op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id())).second)
    assertTrue(f.source.subscribed)
    assertNull(await { f.runtime.stopForLogout(id(), "0", it) }.second)
    assertFalse(f.source.subscribed); assertNull(f.storage.dao.active())
    assertEquals("RECOVERY_REQUIRED", f.storage.dao.session(session).runtimeState)
    val next = binding(f)
    assertNotEquals(epoch, next)
    assertEquals("WALK_ACTIVE_SESSION_OWNER_MISMATCH", op(f, epoch, "APPLY_RECEIPT", JSONObject().put("sessionId", session).put("receipt", receipt(session).toString())).second)
    assertEquals(1, f.source.starts)
  }
  @Test fun finishSealsDurableWallPayloadAndEnvelopeWithSameReplayAfterRestart() = Fixture().use { f ->
    val epoch = binding(f); val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    val started = op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id()))
    assertNull(started.second); Thread.sleep(20)
    val finishBody = JSONObject().put("sessionId", session).put("commandId", id())
      .put("revision", JSONObject(started.first!!).getString("revision")).put("action", "FINISH")
    val finished = op(f, epoch, "MUTATE", finishBody)
    assertNull(finished.second); assertFalse(f.source.subscribed)
    val cp = JSONObject(finished.first!!); assertEquals("FINISH_PENDING", cp.getString("phase"))
    assertEquals("FINISHED_LOCAL", cp.getString("runtimeState"))
    val row = f.storage.dao.session(session); val meta = f.storage.metadata(row)
    assertTrue(meta.finishedWall >= meta.startedWall)
    val clear = f.storage.cipher.decrypt(WalkSealedBytes(row.finishNonce, row.finishCiphertext), WalkCipher.aad(session, "finish", row.revision))
    assertEquals(meta, WalkCodec.decode(clear)); clear.fill(0)
    assertEquals(finished, op(f, epoch, "MUTATE", finishBody))
    val disk = WalkStorage(f.context, WalkCipher { f.key }, "fixture.db")
    try {
      val fromDisk = disk.metadata(disk.dao.session(session))
      assertEquals(meta.finishedWall, fromDisk.finishedWall)
      assertEquals(meta.product!!.payloadJson, fromDisk.product!!.payloadJson)
      assertEquals(meta.product.payloadDigest, fromDisk.product.payloadDigest)
    } finally { disk.db.close() }
  }
  @Test fun processDeathBeforeReserveAndAfterStartNeverAutomaticallyCollects() = Fixture().use { f ->
    val session = prepare(f).getString("clientSessionId")
    val cold = WalkRuntime(f.context, f.storage, f.source, testGate = { _, _ -> null }, qaEnabled = false)
    try {
      assertNull(await { cold.bindOwner(a, it) }.second)
      assertEquals("PREPARED", f.storage.metadata(f.storage.dao.session(session)).product!!.phase.name)
      assertEquals(0, f.source.starts)
    } finally { cold.closeForTest() }
    val epoch = binding(f); apply(f, session, receipt(session))
    assertNull(op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id())).second)
    f.runtime.closeForTest()
    val restarted = WalkRuntime(f.context, f.storage, f.source, testGate = { _, _ -> null }, qaEnabled = false)
    try {
      assertNull(await { restarted.bindOwner(a, it) }.second)
      assertEquals("RECOVERY_REQUIRED", f.storage.dao.session(session).runtimeState)
      assertEquals(1, f.source.starts); assertFalse(f.source.subscribed)
    } finally { restarted.closeForTest() }
  }
  @Test fun startFailureRetainsSameReservedIdentityAndCanExplicitlyRetry() = Fixture().use { f ->
    val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    var denied = true
    val runtime = WalkRuntime(f.context, f.storage, f.source, testGate = { _, _ -> null }, qaEnabled = false) { r, s, c ->
      if (denied) r.activationDenied(c, "WALK_FGS_START_NOT_ALLOWED") else r.attach(Service(), s, c)
    }
    try {
      await { runtime.bindOwner(a, it) }; val epoch = await { runtime.productBinding(a, it) }.first!!
      fun start() = await { runtime.productCommand(a, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id()).toString(), true, it) }
      assertEquals("WALK_FGS_START_NOT_ALLOWED", start().second)
      val row = f.storage.dao.session(session)
      assertEquals("IDLE", row.runtimeState); assertEquals(1, row.activeSlot)
      assertEquals(WalkProductPhase.START_FAILED, f.storage.metadata(row).product!!.phase)
      denied = false; assertNull(start().second); assertEquals(1, f.source.starts)
    } finally { runtime.closeForTest() }
  }
  @Test fun qaReleaseMutationAndCleanupCannotOperateOnProduct() = Fixture().use { f ->
    val session = prepare(f).getString("clientSessionId")
    val qa = WalkRuntime(f.context, f.storage, f.source, testGate = { _, _ -> null }, qaEnabled = true)
    try {
      await { qa.bindOwner(a, it) }
      assertEquals("WALK_PRODUCT_SESSION_PROTECTED", await { qa.start(pet, id(), "0", true, it) }.second)
      assertEquals("WALK_PRODUCT_SESSION_PROTECTED", await { qa.mutate("DISCARD", session, id(), "0", true, it) }.second)
      assertEquals("WALK_PRODUCT_SESSION_PROTECTED", await { qa.qaCommand("CLEANUP", "{\"postReturnReviewComplete\":true}", it) }.second)
      assertNotNull(f.storage.dao.session(session)); assertEquals(0, f.source.starts)
    } finally { qa.closeForTest() }
  }
  @Test fun routeDeletionIsAtomicAndRollbackKeepsEncryptedDistanceChunksJournal() = Fixture().use { f ->
    val session = prepare(f).getString("clientSessionId"); val row = f.storage.dao.session(session)
    val digest = "a".repeat(64)
    row.activeSlot = null; row.runtimeState = "FINISHED_LOCAL"
    val j = f.storage.metadata(row).product!!.copy(phase = WalkProductPhase.RESOLVED, receiptJson = accepted(session, digest).toString())
    f.storage.writeMetadata(row, f.storage.metadata(row).copy(product = j))
    f.storage.writeDistance(row, WalkDistanceState())
    f.storage.transaction { f.storage.dao.updateSession(row) }
    f.storage.appendPoint(row, byteArrayOf(1, 2, 3), f.storage.metadata(row))
    val before = f.storage.dao.session(session)
    f.storage.db.failUpdate = true
    expect("WALK_LOCAL_DATABASE_ERROR") { f.products.request(a, session, "DELETE_ROUTE") }
    val after = f.storage.dao.session(session)
    assertEquals(1, f.storage.dao.chunks(session).size)
    assertTrue(before.distanceCiphertext.contentEquals(after.distanceCiphertext))
    assertFalse(f.storage.metadata(after).product!!.routeDeletePending)
    f.products.request(a, session, "DELETE_ROUTE")
    val erased = f.storage.dao.session(session)
    assertTrue(f.storage.dao.chunks(session).isEmpty()); assertNull(erased.distanceCiphertext)
    assertTrue(f.storage.metadata(erased).product!!.routeDeletePending)
  }
  @Test fun cancelTerminalBlocksLateStartAndNotFoundCannotResolve() = Fixture().use { f ->
    val epoch = binding(f); val session = prepare(f).getString("clientSessionId")
    f.products.request(a, session, "CANCEL")
    expect("WALK_INVALID_PRODUCT_CHECKPOINT") { WalkProductReceipt.decode(JSONObject().put("state", "NOT_FOUND").toString()) }
    assertTrue(f.storage.metadata(f.storage.dao.session(session)).product!!.pending)
    apply(f, session, receipt(session, "NOT_ACCEPTED_FINAL"))
    assertNull(f.storage.dao.active())
    assertEquals("WALK_PRODUCT_RESERVATION_REQUIRED", op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id())).second)
    assertEquals(0, f.source.starts)
  }
  @Test fun malformedNativeReceiptsFailClosedNotOnlyJsDecoder() = Fixture().use { _ ->
    val base = accepted(id(), "b".repeat(64))
    val changes = listOf<Pair<String, Any>>("measuredDurationMs" to "0", "activeDurationMs" to "1920001",
      "measuredDurationMs" to "1920001", "acceptedDistanceM" to "2431", "startedAt" to "2026-02-30T00:00:00.000Z",
      "endedAt" to "2026-10-12T00:00:00.000Z", "acceptedAt" to "not-a-date", "routeDeletedAt" to "bad", "routeRevision" to "01")
    changes.forEach { (key, value) -> val v = JSONObject(base.toString()); v.getJSONObject("summary").put(key, value)
      expect("WALK_INVALID_PRODUCT_CHECKPOINT") { WalkProductReceipt.decode(v.toString()) } }
    val ineligible = JSONObject(base.toString()); ineligible.getJSONObject("summary").put("eligibility", "PROGRESSION_INELIGIBLE_QUALITY")
    expect("WALK_INVALID_PRODUCT_CHECKPOINT") { WalkProductReceipt.decode(ineligible.toString()) }
    expect("WALK_INVALID_PRODUCT_CHECKPOINT") { WalkProductReceipt.decode("{broken") }
    expect("WALK_INVALID_PRODUCT_CHECKPOINT") { WalkProductReceipt.decode(base.put("deletedAt", "bad").toString()) }
  }
  @Test fun finalOwnedPurgeIsPagedAndNeverDeletesForeignOrLegacy() = Fixture().use { f ->
    val keep = mutableSetOf<String>()
    repeat(210) { index ->
      val row = WalkLocalSession().apply { sessionId = id() }
      val meta = WalkMetadata(if (index % 2 == 0) a else b, pet, 0, 0, WalkTiming(0, 0, 0, 0),
        product = if (index % 3 == 0) null else WalkProductJournal(createdWallMs = 1))
      if (meta.owner != a || meta.product == null) keep.add(row.sessionId)
      f.storage.writeMetadata(row, meta); f.storage.transaction { f.storage.dao.insertSession(row) }
    }
    var after = ""; var removed = 0
    do {
      val page = JSONObject(f.products.purgeFinalScope(a, null, "ACCOUNT_FINAL", after))
      removed += page.getInt("removed"); after = if (page.isNull("nextCursor")) "" else page.getString("nextCursor")
    } while (after.isNotEmpty())
    assertEquals(210 - keep.size, removed); assertEquals(keep.size, f.storage.dao.sessionCount())
    keep.forEach { assertNotNull(f.storage.dao.session(it)) }; assertEquals(100, f.storage.db.maxScan)
  }
  @Test fun cancellationLosingToFinishKeepsAcceptedPayloadAndDoesNotDeleteResult() = Fixture().use { f ->
    val session = prepare(f).getString("clientSessionId"); val row = f.storage.dao.session(session)
    val payload = "{}"; val digest = productDigest(payload)
    row.activeSlot = null; row.runtimeState = "FINISHED_LOCAL"
    val meta = f.storage.metadata(row)
    f.storage.transaction { f.products.update(row, meta.copy(product = meta.product!!.copy(
      phase = WalkProductPhase.FINISH_PENDING, payloadJson = payload, payloadDigest = digest, filteredDistanceM = "2430"))) }
    f.products.request(a, session, "CANCEL")
    apply(f, session, accepted(session, digest))
    val result = f.storage.metadata(f.storage.dao.session(session)).product!!
    assertEquals(WalkProductPhase.RESOLVED, result.phase); assertEquals(payload, result.payloadJson)
    assertFalse(result.sessionDeletePending)
    expect("WALK_PRODUCT_CANCELLATION_REQUIRED") { f.products.purgeResolved(a, session) }
  }
  @Test fun alreadyDeletedServerRouteCanEraseLocalRouteWithoutStuckPendingFlag() = Fixture().use { f ->
    val session = prepare(f).getString("clientSessionId"); val row = f.storage.dao.session(session)
    row.activeSlot = null; row.runtimeState = "FINISHED_LOCAL"
    val server = accepted(session, "c".repeat(64)); server.getJSONObject("summary").put("routeDeletedAt", "2026-10-13T01:00:00.000Z")
    val meta = f.storage.metadata(row)
    f.storage.transaction { f.products.update(row, meta.copy(product = meta.product!!.copy(
      phase = WalkProductPhase.RESOLVED, receiptJson = server.toString()))) }
    f.products.request(a, session, "DELETE_ROUTE")
    val j = f.storage.metadata(f.storage.dao.session(session)).product!!
    assertTrue(j.routeErased); assertFalse(j.routeDeletePending); assertFalse(j.pending)
  }
  @Test fun authFenceDuringJournalCommitRollsBackFreshEnvelope() = Fixture().use { f ->
    val session = prepare(f).getString("clientSessionId"); val before = f.storage.dao.session(session)
    var checks = 0
    val fenced = WalkProductStore(f.storage) { if (++checks == 2) throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH") }
    expect("WALK_ACTIVE_SESSION_OWNER_MISMATCH") { fenced.noteError(a, session, "WALK_SYNC_UNKNOWN_RETRYABLE") }
    val after = f.storage.dao.session(session)
    assertTrue(before.metadataCiphertext.contentEquals(after.metadataCiphertext))
    assertNull(f.storage.metadata(after).product!!.lastErrorCode)
  }
  @Test fun logoutDuringProductStartFencesLateNativeActivation() = Fixture().use { f ->
    val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    var activation: Pair<String, String>? = null
    val runtime = WalkRuntime(f.context, f.storage, f.source, testGate = { _, _ -> null }, qaEnabled = false) { _, s, c -> activation = s to c }
    try {
      await { runtime.bindOwner(a, it) }; val epoch = await { runtime.productBinding(a, it) }.first!!
      val latch = CountDownLatch(1)
      runtime.productCommand(a, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id()).toString(), true) { _, _ -> latch.countDown() }
      await { runtime.productBinding(a, it) }
      assertNull(await { runtime.stopForLogout(id(), "0", it) }.second); assertTrue(latch.await(5, TimeUnit.SECONDS))
      val old = activation!!; runtime.attach(Service(), old.first, old.second)
      await { runtime.bindOwner(b, it) }
      assertEquals(0, f.source.starts); assertFalse(f.source.subscribed); assertNull(f.storage.dao.active())
      assertEquals("RECOVERY_REQUIRED", f.storage.dao.session(session).runtimeState)
    } finally { runtime.closeForTest() }
  }
  @Test fun nativeNotificationControlsUseProductPurposeNotQaMutation() = Fixture().use { f ->
    val epoch = binding(f); val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    val start = JSONObject(op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id())).first!!)
    val paused = await { f.runtime.notificationCommand("PAUSE", session, id(), start.getString("revision"), it) }
    assertNull(paused.second); assertFalse(f.source.subscribed)
    val resumed = await { f.runtime.notificationCommand("RESUME", session, id(), JSONObject(paused.first!!).getString("revision"), it) }
    assertNull(resumed.second); assertTrue(f.source.subscribed); assertEquals(2, f.source.starts)
    assertEquals("WALK_SERVICE_UNAVAILABLE", await { f.runtime.notificationCommand("PAUSE", id(), id(), "0", it) }.second)
  }
  @Test fun finalConfirmedScopeFencesFreshBindingResumeAndStartBeforePurgeAndAcrossReload() = Fixture().use { f ->
    val epoch = binding(f); val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    val start = JSONObject(op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id())).first!!)
    val paused = JSONObject(op(f, epoch, "MUTATE", JSONObject().put("sessionId", session).put("commandId", id()).put("revision", start.getString("revision")).put("action", "PAUSE")).first!!)
    val ticket = registeredTicket(f, epoch)
    assertNull(await { confirmTicket(f, ticket, it) }.second)
    val fresh = await { f.runtime.productBinding(a, it) }.first!!
    assertEquals("WALK_SESSION_DELETED", op(f, fresh, "MUTATE", JSONObject().put("sessionId", session).put("commandId", id()).put("revision", paused.getString("revision")).put("action", "RESUME")).second)
    assertEquals("WALK_SESSION_DELETED", op(f, fresh, "START", JSONObject().put("sessionId", session).put("commandId", id())).second)
    assertEquals("WALK_SESSION_DELETED", op(f, fresh, "PREPARE", JSONObject().put("petId", pet).put("commandId", id())).second)
    assertEquals("WALK_SESSION_DELETED", await { f.runtime.start(pet, id(), "0", true, it) }.second)
    val reloaded = WalkRuntime(f.context, f.storage, f.source, testGate = { _, _ -> null }, qaEnabled = false)
    try {
      await { reloaded.bindOwner(a, it) }; val next = await { reloaded.productBinding(a, it) }.first!!
      assertEquals("WALK_SESSION_DELETED", await { reloaded.productCommand(a, next, "MUTATE", JSONObject().put("sessionId", session).put("commandId", id()).put("revision", paused.getString("revision")).put("action", "RESUME_RECOVERED").toString(), true, it) }.second)
      assertEquals("WALK_SESSION_DELETED", await { reloaded.productCommand(a, next, "PREPARE", JSONObject().put("petId", pet).put("commandId", id()).toString(), true, it) }.second)
      assertFalse(f.source.subscribed)
    } finally { reloaded.closeForTest() }
  }
  @Test fun finalCleanupIsPagedIncludesV1ExcludesForeignAndWaitsForAcknowledgement() = Fixture().use { f ->
    repeat(225) { index ->
      val row = WalkLocalSession().apply { sessionId = id() }
      f.storage.writeMetadata(row, WalkMetadata(if (index % 3 == 0) b else a, pet, 0, 0, WalkTiming(0, 0, 0, 0), product = if (index % 2 == 0) null else WalkProductJournal(createdWallMs = 1)))
      f.storage.transaction { f.storage.dao.insertSession(row) }
    }
    val cleanup = WalkFinalCleanup(f.storage, java.io.File(f.root, "cleanup-test")); val ticket = cleanup.capture(a, pet)
    expect("WALK_INVALID_STATE_TRANSITION") { cleanup.step(ticket) }; assertEquals(225, f.storage.dao.sessionCount())
    cleanup.confirm(ticket); var pages = 0
    val reopened = WalkFinalCleanup(f.storage, java.io.File(f.root, "cleanup-test"))
    expect("WALK_SESSION_DELETED") { reopened.assertAllowed(a, pet) }; reopened.assertAllowed(b, pet)
    do { pages++ } while (!reopened.step(ticket))
    assertEquals(3, pages); assertEquals(75, f.storage.dao.sessionCount()); assertEquals(100, f.storage.db.maxScan)
    assertEquals(1, reopened.pending().length()); reopened.acknowledge(ticket); assertEquals(0, reopened.pending().length())
    expect("WALK_FINAL_CLEANUP_NOT_FOUND") { reopened.acknowledge(ticket) }
  }
  @Test fun oldOwnerFinalCleanupAndUnknownOrReplayedCapabilitiesNeverStopNewOwnerCollection() = Fixture().use { f ->
    val aEpoch = binding(f); val aSession = prepare(f).getString("clientSessionId")
    val ticket = registeredTicket(f, aEpoch, null)
    val bEpoch = binding(f, b)
    val bSession = JSONObject(op(f, bEpoch, "PREPARE", JSONObject().put("petId", pet).put("commandId", id()), b).first!!).getString("clientSessionId")
    f.products.apply(b, bSession, f.products.validateReceipt(b, bSession, receipt(bSession).toString()))
    assertNull(op(f, bEpoch, "START", JSONObject().put("sessionId", bSession).put("commandId", id()), b).second)
    val revision = f.storage.dao.session(bSession).revision
    assertTrue(f.source.subscribed)
    assertNull(await { f.runtime.finalCleanupCommand("ARM", ticket, it) }.second)
    assertTrue(f.source.subscribed); assertEquals(revision, f.storage.dao.session(bSession).revision)
    assertEquals("WALK_FINAL_CLEANUP_NOT_FOUND", await { f.runtime.finalCleanupCommand("CONFIRM", id(), it) }.second)
    assertTrue(f.source.subscribed)
    f.failCleanupPromotion = true
    assertEquals("WALK_FINAL_CLEANUP_PENDING", await { confirmTicket(f, ticket, it) }.second)
    assertTrue(f.source.subscribed); assertEquals(revision, f.storage.dao.session(bSession).revision)
    f.failCleanupPromotion = false
    assertNull(await { confirmTicket(f, ticket, it) }.second)
    assertEquals("DONE", await { f.runtime.finalCleanupCommand("STEP", ticket, it) }.first)
    assertNull(f.storage.dao.session(aSession)); assertEquals(revision, f.storage.dao.session(bSession).revision); assertTrue(f.source.subscribed)
    assertNull(await { acknowledgeTicket(f, ticket, it) }.second)
    for (action in listOf("CONFIRM", "STEP", "ACK")) {
      assertEquals("WALK_FINAL_CLEANUP_NOT_FOUND", await { f.runtime.finalCleanupCommand(action, ticket, it) }.second)
      assertTrue(f.source.subscribed); assertEquals(revision, f.storage.dao.session(bSession).revision)
    }
  }
  @Test fun orphanInitialNewFileCannotBlockAnotherCommittedConfirmedScope() = Fixture().use { f ->
    val dir = java.io.File(f.root, "cleanup-orphan"); dir.mkdirs()
    java.io.File(dir, id() + ".new").writeBytes(byteArrayOf(1, 2))
    val cleanup = WalkFinalCleanup(f.storage, dir); val ticket = cleanup.capture(a, pet); cleanup.confirm(ticket)
    java.io.File(dir, ticket + ".new").writeBytes(byteArrayOf(3, 4))
    // Existing committed base is authoritative even with an unfinished update.
    assertEquals(1, cleanup.pending().length()); cleanup.assertAllowed(b, pet)
    assertTrue(cleanup.step(ticket)); cleanup.acknowledge(ticket); assertEquals(0, cleanup.pending().length())
  }
  @Test fun promotionOrPhysicalDeleteFailureNeverAcknowledgesDurabilityOrRemoval() = Fixture().use { f ->
    val dir = java.io.File(f.root, "cleanup-promotion")
    val neverPromote = WalkFinalCleanup(f.storage, dir, promote = { _, stream -> stream.close() })
    expect("WALK_FINAL_CLEANUP_PENDING") { neverPromote.capture(a, pet) }
    val good = WalkFinalCleanup(f.storage, dir); val ticket = good.capture(a, pet)
    expect("WALK_FINAL_CLEANUP_PENDING") { neverPromote.confirm(ticket) }
    assertEquals(1, good.pending().length()); assertFalse(good.pending().getJSONObject(0).getBoolean("confirmed")); good.assertAllowed(b, pet)
    good.confirm(ticket); assertTrue(good.step(ticket))
    val neverDelete = WalkFinalCleanup(f.storage, dir, erase = { _ -> Unit })
    expect("WALK_FINAL_CLEANUP_PENDING") { neverDelete.acknowledge(ticket) }
    assertEquals(1, good.pending().length()); good.acknowledge(ticket); assertEquals(0, good.pending().length())
  }
  @Test fun failedDurableConfirmationStopsOnlyDeletedOwnerAndCannotResumeBeforeSuccessfulRetry() = Fixture().use { f ->
    val epoch = binding(f); val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    assertNull(op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id())).second)
    val ticket = registeredTicket(f, epoch)
    f.failCleanupPromotion = true
    assertEquals("WALK_FINAL_CLEANUP_PENDING", await { confirmTicket(f, ticket, it) }.second)
    assertFalse(f.source.subscribed); assertNotNull(f.storage.dao.session(session)); assertFalse(f.cleanup.pending().getJSONObject(0).getBoolean("confirmed"))
    val fresh = await { f.runtime.productBinding(a, it) }.first!!
    assertEquals("WALK_SESSION_DELETED", op(f, fresh, "START", JSONObject().put("sessionId", session).put("commandId", id())).second)
    assertEquals("WALK_SESSION_DELETED", op(f, fresh, "PREPARE", JSONObject().put("petId", pet).put("commandId", id())).second)
    f.failCleanupPromotion = false
    assertNull(await { confirmTicket(f, ticket, it) }.second)
    assertEquals("DONE", await { f.runtime.finalCleanupCommand("STEP", ticket, it) }.first)
    assertNull(f.storage.dao.session(session))
  }
  @Test fun v2RejectsWrongScopeReverseStateAndTimestampRebindingButAcceptsTransactionStartOrderInversion() = Fixture().use { f ->
    val ticket = registeredTicket(f, binding(f))
    assertEquals("WALK_FINAL_CLEANUP_INVALID", await { f.runtime.finalCleanupCommand("CONFIRM", ticket, it) }.second)
    val wrong = JSONObject(deletionProof(f, ticket, "FINAL")).put("purpose", "ACCOUNT_FINAL").toString()
    assertEquals("WALK_FINAL_CLEANUP_INVALID", await { f.runtime.finalCleanupProof("CONFIRM", ticket, wrong, it) }.second)
    val wrongBinding = JSONObject(deletionProof(f, ticket, "FINAL")).put("resourceBinding", "c".repeat(64)).toString()
    assertEquals("WALK_FINAL_CLEANUP_INVALID", await { f.runtime.finalCleanupProof("CONFIRM", ticket, wrongBinding, it) }.second)
    for (bad in listOf(JSONObject(deletionProof(f, ticket, "FINAL")).put("version", "1"),
      JSONObject(deletionProof(f, ticket, "FINAL")).put("registeredAt", "2026-02-30T00:00:00.000Z"),
      JSONObject(deletionProof(f, ticket, "FINAL")).put("requestId", id()))) {
      assertEquals("WALK_FINAL_CLEANUP_INVALID", await { f.runtime.finalCleanupProof("CONFIRM", ticket, bad.toString(), it) }.second)
    }
    assertNull(await { confirmTicket(f, ticket, it) }.second)
    val persisted = JSONObject(f.cleanup.scope(ticket).getString("proof"))
    assertEquals("2026-10-21T01:00:00.000Z", persisted.getString("registeredAt"))
    assertEquals("2026-10-21T00:50:00.000Z", persisted.getString("confirmedAt"))
    assertEquals("WALK_FINAL_CLEANUP_INVALID", await { f.runtime.finalCleanupProof("REGISTER", ticket, deletionProof(f, ticket, "PENDING"), it) }.second)
    assertEquals("DONE", await { f.runtime.finalCleanupCommand("STEP", ticket, it) }.first)
    assertEquals("WALK_FINAL_CLEANUP_PENDING", await { f.runtime.finalCleanupCommand("ACK", ticket, it) }.second)
    val changedTime = JSONObject(deletionProof(f, ticket, "ACKNOWLEDGED")).put("confirmedAt", "2026-10-21T00:49:00.000Z").toString()
    assertEquals("WALK_FINAL_CLEANUP_INVALID", await { f.runtime.finalCleanupProof("REGISTER", ticket, changedTime, it) }.second)
    assertNull(await { acknowledgeTicket(f, ticket, it) }.second)
    assertEquals(0, f.cleanup.pending().length())
  }
  @Test fun armedUnknownSurvivesRestartAndOnlyAuthoritativeRollbackReleasesItWithoutDeletingOrAutoResuming() = Fixture().use { f ->
    val epoch = binding(f); val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    assertNull(op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id())).second)
    val ticket = registeredTicket(f, epoch)
    val beforeSecret = f.cleanup.scope(ticket).getString("capability")
    assertNull(await { f.runtime.finalCleanupCommand("ARM", ticket, it) }.second)
    assertFalse(f.source.subscribed); assertEquals("RECOVERY_REQUIRED", f.storage.dao.session(session).runtimeState)
    val reopened = WalkFinalCleanup(f.storage, java.io.File(f.context.noBackupFilesDir, "walk-final-cleanup-v1"))
    assertTrue(beforeSecret == reopened.scope(ticket).getString("capability"))
    assertTrue(ticket == reopened.captureV2(a, pet)); assertEquals(1, reopened.pending().length())
    expect("WALK_FINAL_CLEANUP_PENDING") { reopened.assertAllowed(a, pet) }; reopened.assertAllowed(b, pet)
    expect("WALK_INVALID_STATE_TRANSITION") { reopened.step(ticket) }; assertNotNull(f.storage.dao.session(session))
    assertNull(await { f.runtime.finalCleanupProof("RELEASE", ticket, JSONObject().put("outcome", "ROLLED_BACK").put("code", "23503").put("attempt", "1").toString(), it) }.second)
    f.cleanup.assertAllowed(a, pet); assertFalse(f.source.subscribed)
    val fresh = await { f.runtime.productBinding(a, it) }.first!!
    assertNull(op(f, fresh, "MUTATE", JSONObject().put("sessionId", session).put("commandId", id()).put("revision", f.storage.dao.session(session).revision.toString()).put("action", "RESUME_RECOVERED")).second)
    assertTrue(f.source.subscribed); assertFalse(f.cleanup.scope(ticket).getBoolean("confirmed"))
  }
  @Test fun graceWatchIsNotFinalOrPermanentCollectionFenceAfterExplicitRestore() = Fixture().use { f ->
    val epoch = binding(f); val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    assertNull(op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id())).second)
    val ticket = registeredTicket(f, epoch, null)
    assertNull(await { f.runtime.finalCleanupCommand("ARM", ticket, it) }.second)
    val grace = JSONObject().put("outcome", "RESTORABLE").put("status", "completed").put("actualStatus", "pending_grace_period").put("canRestore", true).put("attempt", "1")
    assertNull(await { f.runtime.finalCleanupProof("RELEASE", ticket, grace.toString(), it) }.second)
    assertEquals("PENDING", f.cleanup.view(ticket).getString("proofState")); assertEquals("RESTORABLE", f.cleanup.view(ticket).getString("outcome"))
    assertNotNull(f.storage.dao.session(session)); assertFalse(f.source.subscribed)
    val fresh = await { f.runtime.productBinding(a, it) }.first!!
    assertNull(op(f, fresh, "MUTATE", JSONObject().put("sessionId", session).put("commandId", id()).put("revision", f.storage.dao.session(session).revision.toString()).put("action", "RESUME_RECOVERED")).second)
    assertTrue(f.source.subscribed); assertFalse(f.cleanup.scope(ticket).getBoolean("confirmed"))
  }
  @Test fun restartBeforeGraceCallbackAllowsOnlyExplicitExactAttemptRestoreAndKeepsWatch() = Fixture().use { f ->
    val epoch = binding(f); val ticket = registeredTicket(f, epoch, null)
    assertNull(await { f.runtime.finalCleanupCommand("ARM", ticket, it) }.second)
    val reopened = WalkFinalCleanup(f.storage, java.io.File(f.context.noBackupFilesDir, "walk-final-cleanup-v1"))
    expect("WALK_FINAL_CLEANUP_PENDING") { reopened.assertAllowed(a, pet) }
    val request = id()
    reopened.restoreIntent(ticket, JSONObject().put("requestId", request).put("attempt", "1").toString())
    val restored = JSONObject().put("outcome", "RESTORED").put("status", "cancelled").put("actualStatus", "cancelled").put("attempt", "1").put("requestId", request)
    reopened.release(ticket, restored.toString()); reopened.assertAllowed(a, pet)
    assertFalse(reopened.scope(ticket).getBoolean("confirmed")); assertFalse(f.source.subscribed)
    reopened.armBlock(ticket); reopened.persistArm(ticket)
    expect("WALK_FINAL_CLEANUP_INVALID") { reopened.release(ticket, restored.toString()) }
    expect("WALK_FINAL_CLEANUP_PENDING") { reopened.assertAllowed(a, pet) }; reopened.assertAllowed(b, pet)
  }
  @Test fun cancelResponseLostAfterUiGateClearsRetainsDurableExactRestoreRequestAndRejectsOtherReceipt() = Fixture().use { f ->
    val ticket = registeredTicket(f, binding(f), null)
    assertNull(await { f.runtime.finalCleanupCommand("ARM", ticket, it) }.second)
    val request = id(); val input = JSONObject().put("requestId", request).put("attempt", "1").toString()
    assertNull(await { f.runtime.finalCleanupProof("ACCOUNT_REQUEST", ticket, input, it) }.second)
    val wrongRequest = JSONObject(input).put("requestId", id()).toString()
    assertEquals("WALK_FINAL_CLEANUP_INVALID", await { f.runtime.finalCleanupProof("RESTORE_INTENT", ticket, wrongRequest, it) }.second)
    assertNull(await { f.runtime.finalCleanupProof("RESTORE_INTENT", ticket, input, it) }.second)
    val reopened = WalkFinalCleanup(f.storage, java.io.File(f.context.noBackupFilesDir, "walk-final-cleanup-v1"))
    val saved = reopened.view(ticket).getJSONObject("restoreIntent")
    assertEquals(request, saved.getString("requestId")); assertEquals("1", saved.getString("attempt"))
    val restored = JSONObject().put("outcome", "RESTORED").put("status", "cancelled").put("actualStatus", "cancelled").put("attempt", "1").put("requestId", id())
    expect("WALK_FINAL_CLEANUP_INVALID") { reopened.release(ticket, restored.toString()) }
    expect("WALK_FINAL_CLEANUP_PENDING") { reopened.assertAllowed(a, pet) }
    reopened.release(ticket, restored.put("requestId", request).toString())
    assertFalse(reopened.scope(ticket).getBoolean("confirmed")); assertFalse(reopened.view(ticket).has("restoreIntent")); reopened.assertAllowed(a, pet)
  }
  @Test fun failedArmPromotionStopsOwnedGpsButCannotStartDestructionOrAffectForeignSource() = Fixture().use { f ->
    val epoch = binding(f); val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    assertNull(op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id())).second)
    val ticket = registeredTicket(f, epoch); f.failCleanupPromotion = true
    assertEquals("WALK_FINAL_CLEANUP_PENDING", await { f.runtime.finalCleanupCommand("ARM", ticket, it) }.second)
    assertFalse(f.source.subscribed); assertNotNull(f.storage.dao.session(session))
    expect("WALK_FINAL_CLEANUP_PENDING") { f.cleanup.assertAllowed(a, pet) }; f.cleanup.assertAllowed(b, pet)
    f.failCleanupPromotion = false
    // No destructive request could begin without ARM readback. Its NOT_STARTED
    // release uses the unchanged committed attempt, not an invented rollback.
    f.cleanup.release(ticket, JSONObject().put("outcome", "NOT_STARTED").put("code", "NOT_INVOKED").put("attempt", "0").toString())
    f.cleanup.assertAllowed(a, pet); assertFalse(f.source.subscribed)
  }
  @Test fun acknowledgedV2ReopensAfterRemoteAckAndPhysicalRemovalFailureWithoutLosingProof() = Fixture().use { f ->
    val ticket = registeredTicket(f, binding(f)); assertNull(await { confirmTicket(f, ticket, it) }.second)
    assertEquals("DONE", await { f.runtime.finalCleanupCommand("STEP", ticket, it) }.first)
    val ack = deletionProof(f, ticket, "ACKNOWLEDGED")
    assertNull(await { f.runtime.finalCleanupProof("REGISTER", ticket, ack, it) }.second)
    val dir = java.io.File(f.context.noBackupFilesDir, "walk-final-cleanup-v1")
    val noErase = WalkFinalCleanup(f.storage, dir, erase = { _ -> Unit })
    expect("WALK_FINAL_CLEANUP_PENDING") { noErase.acknowledge(ticket) }
    val reopened = WalkFinalCleanup(f.storage, dir)
    assertTrue(reopened.view(ticket).getBoolean("nativeDone")); assertEquals("ACKNOWLEDGED", reopened.view(ticket).getString("proofState"))
    val changed = JSONObject(ack).put("acknowledgedAt", "2026-10-21T00:39:00.000Z")
    expect("WALK_FINAL_CLEANUP_INVALID") { reopened.recordProof(ticket, changed.toString()) }
    reopened.acknowledge(ticket); assertEquals(0, reopened.pending().length())
  }
  @Test fun legacyUnregisteredUnknownCannotBePromotedByCompatibilityConfirmOrEmptyLookup() = Fixture().use { f ->
    binding(f); val ticket = f.cleanup.capture(a, pet)
    assertEquals("WALK_FINAL_CLEANUP_INVALID", await { f.runtime.finalCleanupCommand("CONFIRM", ticket, it) }.second)
    assertEquals(1, f.cleanup.pending().length()); assertFalse(f.cleanup.scope(ticket).getBoolean("confirmed"))
    val fresh = f.cleanup.captureV2(a, pet)
    assertTrue(ticket != fresh); assertEquals(2, f.cleanup.pending().length()); f.cleanup.assertAllowed(a, pet)
  }
  @Test fun explicitAccountCreationSqlRollbackIsNotPetRollbackOrTransportProof() = Fixture().use { f ->
    val epoch = binding(f); val account = registeredTicket(f, epoch, null); val petTicket = registeredTicket(f, epoch)
    for (ticket in listOf(account, petTicket)) assertNull(await { f.runtime.finalCleanupCommand("ARM", ticket, it) }.second)
    val sql = JSONObject().put("outcome", "ROLLED_BACK").put("code", "P0001").put("attempt", "1").toString()
    assertEquals("WALK_FINAL_CLEANUP_INVALID", await { f.runtime.finalCleanupProof("RELEASE", petTicket, sql, it) }.second)
    assertNull(await { f.runtime.finalCleanupProof("RELEASE", account, sql, it) }.second)
    assertFalse(f.cleanup.scope(account).getBoolean("armed")); assertTrue(f.cleanup.scope(petTicket).getBoolean("armed"))
    assertFalse(f.cleanup.scope(account).getBoolean("confirmed")); assertFalse(f.source.subscribed)
    expect("WALK_FINAL_CLEANUP_PENDING") { f.cleanup.assertAllowed(a, pet) }; f.cleanup.assertAllowed(b, pet)
  }
  @Test fun receivedFinalRegistrationStopsOwnedCollectionBeforeDiskWriteButDoesNotEraseUntilConfirmed() = Fixture().use { f ->
    val epoch = binding(f); val session = prepare(f).getString("clientSessionId"); apply(f, session, receipt(session))
    assertNull(op(f, epoch, "START", JSONObject().put("sessionId", session).put("commandId", id())).second)
    val ticket = registeredTicket(f, epoch); val proof = deletionProof(f, ticket, "FINAL")
    f.failCleanupPromotion = true
    assertEquals("WALK_FINAL_CLEANUP_PENDING", await { f.runtime.finalCleanupProof("REGISTER", ticket, proof, it) }.second)
    assertFalse(f.source.subscribed); assertNotNull(f.storage.dao.session(session))
    expect("WALK_SESSION_DELETED") { f.cleanup.assertAllowed(a, pet) }; f.cleanup.assertAllowed(b, pet)
    f.failCleanupPromotion = false
    assertNull(await { f.runtime.finalCleanupProof("REGISTER", ticket, proof, it) }.second)
    val reopened = WalkFinalCleanup(f.storage, java.io.File(f.context.noBackupFilesDir, "walk-final-cleanup-v1"))
    expect("WALK_SESSION_DELETED") { reopened.assertAllowed(a, pet) }; reopened.assertAllowed(b, pet)
    expect("WALK_INVALID_STATE_TRANSITION") { reopened.step(ticket) }
    reopened.recordProof(ticket, proof, true); assertTrue(reopened.step(ticket)); assertNull(f.storage.dao.session(session))
  }
}
