package com.nuri.walk

import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

// All callers run on the existing Native worker with an owner-epoch fence.
// Paging decrypts at most100 rows per call; owner/pet never become plaintext indexes.
internal class WalkProductStore(private val storage: WalkStorage, private val fence: () -> Unit = {}) {
  fun owned(owner: String, id: String): Pair<WalkLocalSession, WalkMetadata> {
    val row = storage.dao.session(productUuid(id)) ?: throw WalkFailure("WALK_SESSION_DELETED")
    val meta = storage.metadata(row)
    if (meta.owner != owner) throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
    if (meta.product == null) throw WalkFailure("WALK_PRODUCT_REQUIRED")
    return row to meta
  }
  fun checkpoint(row: WalkLocalSession, meta: WalkMetadata): String {
    val j = meta.product ?: throw WalkFailure("WALK_PRODUCT_REQUIRED")
    return JSONObject().apply {
      put("productVersion", 1); put("clientSessionId", row.sessionId); put("petId", meta.pet)
      put("runtimeState", row.runtimeState); put("revision", row.revision.toString()); put("phase", j.phase.name)
      put("startedAt", if (meta.startedWall > 0) productIso(meta.startedWall) else JSONObject.NULL)
      put("finishedAt", if (meta.finishedWall > 0) productIso(meta.finishedWall) else JSONObject.NULL)
      put("payloadJson", j.payloadJson ?: JSONObject.NULL); put("payloadDigest", j.payloadDigest ?: JSONObject.NULL)
      put("filteredDistanceM", j.filteredDistanceM ?: JSONObject.NULL)
      put("receipt", j.receiptJson?.let(::JSONObject) ?: JSONObject.NULL)
      put("routeErased", j.routeErased); put("routeDeletePending", j.routeDeletePending)
      put("sessionDeletePending", j.sessionDeletePending); put("lastErrorCode", j.lastErrorCode ?: JSONObject.NULL)
    }.toString()
  }
  fun update(row: WalkLocalSession, meta: WalkMetadata): String {
    fence()
    // Journal writes do not change the command/elapsed anchor revision. Every
    // envelope still receives a fresh random AEAD nonce at the current AAD.
    storage.writeMetadata(row, meta)
    storage.dao.updateSession(row)
    fence()
    return checkpoint(row, meta)
  }
  fun prepare(owner: String, pet: String, command: String, wall: Long, mono: Long): String {
    productUuid(owner); productUuid(pet); productUuid(command)
    val hash = productDigest("PRODUCT_PREPARE|$owner|$pet")
    storage.dao.receipt(command)?.let { receipt ->
      if (receipt.inputDigest != hash) throw WalkFailure("WALK_PAYLOAD_CONFLICT")
      val (row, meta) = owned(owner, receipt.sessionId)
      return checkpoint(row, meta)
    }
    storage.dao.active()?.let { row ->
      val meta = storage.metadata(row)
      if (meta.owner != owner) throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
      if (meta.product == null || meta.pet != pet) throw WalkFailure("WALK_ALREADY_ACTIVE")
      if (meta.product.phase == WalkProductPhase.CANCEL_PENDING) throw WalkFailure("WALK_PRODUCT_CANCELLATION_REQUIRED")
      return checkpoint(row, meta)
    }
    val row = WalkLocalSession().apply { sessionId = UUID.randomUUID().toString(); activeSlot = 1 }
    val meta = WalkMetadata(owner, pet, 0, 0, WalkTiming(mono, wall, 0, 0), segmentCount = 0,
      product = WalkProductJournal(createdWallMs = wall))
    val receipt = WalkCommandReceipt().apply { commandId = command; sessionId = row.sessionId; inputDigest = hash }
    storage.writeMetadata(row, meta)
    val result = checkpoint(row, meta)
    storage.transaction { fence(); storage.dao.insertSession(row); storage.dao.insertReceipt(receipt); storage.saveResult(receipt, result, row.revision); fence() }
    return result
  }
  fun page(owner: String, after: String): String {
    if (after.isNotEmpty()) productUuid(after)
    val rows = storage.dao.scan(after, PAGE_SIZE)
    val items = JSONArray()
    rows.forEach { row ->
      val meta = storage.metadata(row)
      if (meta.owner == owner && meta.product?.pending == true) items.put(JSONObject(checkpoint(row, meta)))
    }
    return JSONObject().put("entries", items)
      .put("nextCursor", if (rows.size == PAGE_SIZE) rows.last().sessionId else JSONObject.NULL).toString()
  }
  fun request(owner: String, id: String, operation: String): String {
    val (row, meta) = owned(owner, id)
    val j = meta.product!!
    val terminal = row.activeSlot == null || row.runtimeState == "IDLE" || row.runtimeState == "RECOVERY_REQUIRED"
    if (!terminal) throw WalkFailure("WALK_PRODUCT_FINISH_REQUIRED")
    val next = when (operation) {
      "CANCEL" -> if (j.phase == WalkProductPhase.RESOLVED) j else j.copy(phase = WalkProductPhase.CANCEL_PENDING)
      "DELETE_SESSION" -> {
        if (j.phase != WalkProductPhase.RESOLVED) throw WalkFailure("WALK_PRODUCT_CANCELLATION_REQUIRED")
        if (j.receiptJson?.let { WalkProductReceipt.decode(it).state } == "DELETED") return checkpoint(row, meta)
        j.copy(sessionDeletePending = true)
      }
      "DELETE_ROUTE" -> {
        val receipt = j.receiptJson?.let { WalkProductReceipt.decode(it) }
        if (receipt?.state != "ACCEPTED_SERVER") throw WalkFailure("WALK_PRODUCT_ACCEPTANCE_REQUIRED")
        if (receipt.routeDeleted && j.routeErased) return checkpoint(row, meta)
        j.copy(routeErased = true, routeDeletePending = !receipt.routeDeleted)
      }
      else -> throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
    }
    return storage.transaction {
      fence()
      if (operation == "DELETE_ROUTE") eraseRoute(row)
      update(row, meta.copy(product = next))
    }
  }
  fun validateReceipt(owner: String, id: String, raw: String): WalkProductReceipt {
    val (_, meta) = owned(owner, id)
    val j = meta.product!!
    val r = WalkProductReceipt.decode(raw)
    if (r.session != id || r.pet != meta.pet) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
    if (r.state in setOf("ACCEPTED_SERVER", "REJECTED_SERVER") && (j.payloadDigest == null || r.digest != j.payloadDigest))
      throw WalkFailure("WALK_PAYLOAD_CONFLICT")
    if (r.state == "DELETED" && r.digest != null && j.payloadDigest != null && r.digest != j.payloadDigest)
      throw WalkFailure("WALK_PAYLOAD_CONFLICT")
    return r
  }
  fun apply(owner: String, id: String, r: WalkProductReceipt): String {
    val (row, original) = owned(owner, id)
    var meta = original
    val j = meta.product!!
    val prior = j.receiptJson?.let { WalkProductReceipt.decode(it) }
    if (prior?.state == "DELETED" || (prior?.terminal == true && !r.terminal)) return checkpoint(row, meta)
    if (prior?.terminal == true && r.terminal && prior.state != r.state && r.state != "DELETED")
      throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
    if (prior?.routeRevision != null && r.routeRevision != null && prior.routeRevision > r.routeRevision)
      return checkpoint(row, meta)
    if (prior?.routeDeleted == true && !r.routeDeleted && r.state == "ACCEPTED_SERVER") return checkpoint(row, meta)
    if (prior != null && JSONObject(prior.json).getBoolean("recordClaimExists") && !JSONObject(r.json).getBoolean("recordClaimExists") && r.state != "DELETED")
      return checkpoint(row, meta)
    if (r.json == j.receiptJson) return checkpoint(row, meta)
    var next = j.copy(reservationConfirmed = j.reservationConfirmed || r.state == "ACTIVE",
      phase = if (r.terminal) WalkProductPhase.RESOLVED else if (j.phase == WalkProductPhase.PREPARED) WalkProductPhase.RESERVED else j.phase,
      receiptJson = r.json, lastErrorCode = null,
      routeDeletePending = j.routeDeletePending && r.state != "DELETED" && !r.routeDeleted,
      sessionDeletePending = j.sessionDeletePending && r.state != "DELETED")
    return storage.transaction {
      if (r.state in setOf("NOT_ACCEPTED_FINAL", "DELETED")) {
        // Runtime has already quiesced this exact session. Only frozen edges are used.
        var s = WalkState.valueOf(row.runtimeState)
        fun edge(target: WalkState) {
          s = WalkRuntimePolicy.transition(s, target)
          row.revision = Math.addExact(row.revision, 1)
        }
        if (s in setOf(WalkState.WALKING, WalkState.PAUSED)) edge(WalkState.RECOVERY_REQUIRED)
        if (s == WalkState.STARTING) edge(WalkState.IDLE)
        if (s == WalkState.RECOVERY_REQUIRED) edge(WalkState.CANCELLED_LOCAL)
        if (s == WalkState.FINISHING) throw WalkFailure("WALK_RECOVERY_REQUIRED")
        row.runtimeState = s.name; row.activeSlot = null
      }
      if (r.state == "DELETED") {
        eraseRoute(row); storage.dao.deleteSessionReceipts(id)
        next = next.copy(payloadJson = null, payloadDigest = null, filteredDistanceM = null, routeErased = true)
        meta = meta.copy(startedWall = 0, segmentStartedNs = 0, timing = WalkTiming(0, 0, 0, 0), fixCount = 0,
          segmentCount = 0, lastFixNs = 0, finishedWall = 0, pauseStartedMonoMs = 0, pauseStartedWallMs = 0, pauses = emptyList())
      }
      update(row, meta.copy(product = next))
    }
  }
  fun noteError(owner: String, id: String, code: String): String {
    if (!Regex("WALK_[A-Z0-9_]{1,72}").matches(code)) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
    val (row, meta) = owned(owner, id)
    return storage.transaction { update(row, meta.copy(product = meta.product!!.copy(lastErrorCode = code))) }
  }
  fun purgeResolved(owner: String, id: String): String {
    val (row, meta) = owned(owner, id)
    if (row.activeSlot != null || meta.product?.receiptJson?.let { WalkProductReceipt.decode(it).state } !in setOf("DELETED", "NOT_ACCEPTED_FINAL"))
      throw WalkFailure("WALK_PRODUCT_CANCELLATION_REQUIRED")
    storage.transaction { fence(); eraseRoute(row); storage.dao.deleteSessionReceipts(id); storage.dao.deleteSession(id); fence() }
    return "OK"
  }
  fun purgeFinalScope(owner: String, pet: String?, confirmation: String, after: String): String {
    if ((pet == null && confirmation != "ACCOUNT_FINAL") || (pet != null && confirmation != "PET_FINAL"))
      throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
    pet?.let(::productUuid)
    if (after.isNotEmpty()) productUuid(after)
    storage.dao.active()?.let { row ->
      val meta = storage.metadata(row)
      if (meta.owner == owner && meta.product != null && (pet == null || meta.pet == pet))
        throw WalkFailure("WALK_PRODUCT_FINISH_REQUIRED")
    }
    val rows = storage.dao.scan(after, PAGE_SIZE)
    var removed = 0
    storage.transaction {
      fence()
      rows.forEach { row ->
        val meta = storage.metadata(row)
        if (meta.owner == owner && meta.product != null && (pet == null || meta.pet == pet)) {
          if (row.activeSlot != null) throw WalkFailure("WALK_PRODUCT_FINISH_REQUIRED")
          eraseRoute(row); storage.dao.deleteSessionReceipts(row.sessionId); storage.dao.deleteSession(row.sessionId); removed++
        }
      }
      fence()
    }
    return JSONObject().put("removed", removed)
      .put("nextCursor", if (rows.size == PAGE_SIZE) rows.last().sessionId else JSONObject.NULL).toString()
  }
  private fun eraseRoute(row: WalkLocalSession) {
    storage.dao.deleteChunks(row.sessionId); row.chunkCount = 0
    row.distanceNonce = null; row.distanceCiphertext = null
  }
  companion object { const val PAGE_SIZE = 100 }
}
