package com.nuri.walk

import android.content.Context
import androidx.room.Room
import java.io.File
import java.util.concurrent.Callable

class WalkStorage internal constructor(context: Context, injectedCipher: WalkCipher? = null, databaseName: String = "nuri-walk-v1.db") {
  val db: WalkDatabase = Room.databaseBuilder(context.applicationContext, WalkDatabase::class.java,
    File(context.noBackupFilesDir, databaseName).absolutePath).addMigrations(WalkRoomMigrations.V1_TO_V2).build()
  val dao: WalkDao get() = db.walkDao()
  val cipher = injectedCipher ?: WalkCipher { WalkKeyStore.key(allowCreate = dao.sessionCount() == 0 && dao.qaProtocol() == null) }
  fun <T> transaction(block: () -> T): T = try { db.runInTransaction(Callable { block() }) }
    catch (error: WalkFailure) { throw error }
    catch (_: Exception) { throw WalkFailure("WALK_LOCAL_DATABASE_ERROR") }

  fun metadata(row: WalkLocalSession): WalkMetadata {
    val bytes = cipher.decrypt(WalkSealedBytes(row.metadataNonce, row.metadataCiphertext),
      WalkCipher.aad(row.sessionId, "metadata", row.metadataRevision))
    return try { WalkCodec.decode(bytes) } finally { bytes.fill(0) }
  }
  fun writeMetadata(row: WalkLocalSession, metadata: WalkMetadata) {
    val bytes = WalkCodec.encode(metadata)
    val sealed = try { cipher.encrypt(bytes, WalkCipher.aad(row.sessionId, "metadata", row.revision)) }
      finally { bytes.fill(0) }
    row.metadataNonce = sealed.nonce; row.metadataCiphertext = sealed.ciphertext
    row.metadataRevision = row.revision
    row.updatedAt = metadata.timing.lastWallMs
    if (row.runtimeState == WalkState.FINISHED_LOCAL.name) {
      val finish = WalkCodec.encode(metadata)
      val envelope = try { cipher.encrypt(finish, WalkCipher.aad(row.sessionId, "finish", row.revision)) }
        finally { finish.fill(0) }
      row.finishNonce = envelope.nonce; row.finishCiphertext = envelope.ciphertext
    }
  }
  fun appendPoint(row: WalkLocalSession, plaintext: ByteArray, metadata: WalkMetadata, accepted: Boolean = false, segment: Long = 0) {
    val index = row.chunkCount
    val sealed = try { cipher.encrypt(plaintext, WalkCipher.aad(row.sessionId, "point", index)) }
      finally { plaintext.fill(0) }
    val chunk = WalkPointChunk().apply {
      sessionId = row.sessionId; chunkIndex = index; nonce = sealed.nonce
      ciphertext = sealed.ciphertext; sampleCount = 1; this.accepted = accepted; routeSegment = segment
    }
    row.chunkCount = Math.addExact(index, 1)
    writeMetadata(row, metadata)
    transaction { dao.insertChunk(chunk); dao.updateSession(row) }
  }
  fun saveResult(receipt: WalkCommandReceipt, result: String, revision: Long) {
    val bytes = result.toByteArray(Charsets.UTF_8)
    val sealed = try { cipher.encrypt(bytes, WalkCipher.aad(receipt.commandId, "receipt", revision)) }
      finally { bytes.fill(0) }
    receipt.resultNonce = sealed.nonce; receipt.resultCiphertext = sealed.ciphertext
    receipt.resultingRevision = revision; receipt.outcome = "SUCCESS"
    dao.updateReceipt(receipt)
  }
  fun replayResult(receipt: WalkCommandReceipt): String {
    if (receipt.outcome != "SUCCESS") throw WalkFailure(if (receipt.outcome == "PENDING") "WALK_COMMAND_PENDING" else receipt.outcome)
    val bytes = cipher.decrypt(WalkSealedBytes(receipt.resultNonce ?: throw WalkFailure("WALK_LOCAL_DATABASE_ERROR"),
      receipt.resultCiphertext ?: throw WalkFailure("WALK_LOCAL_DATABASE_ERROR")),
      WalkCipher.aad(receipt.commandId, "receipt", receipt.resultingRevision))
    return try { String(bytes, Charsets.UTF_8) } finally { bytes.fill(0) }
  }
  internal fun distance(row: WalkLocalSession): WalkDistanceState? {
    if(row.distanceNonce==null&&row.distanceCiphertext==null)return null
    val bytes=cipher.decrypt(WalkSealedBytes(row.distanceNonce?:throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID"),
      row.distanceCiphertext?:throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")),WalkCipher.aad(row.sessionId,"distance-v1",row.distanceRevision))
    return try{WalkDistanceCodec.decode(bytes)}finally{bytes.fill(0)}
  }
  internal fun writeDistance(row:WalkLocalSession,s:WalkDistanceState){
    val revision=Math.addExact(row.distanceRevision,1)
    val bytes=WalkDistanceCodec.encode(s)
    val envelope=try{cipher.encrypt(bytes,WalkCipher.aad(row.sessionId,"distance-v1",revision))}finally{bytes.fill(0)}
    row.distanceNonce=envelope.nonce;row.distanceCiphertext=envelope.ciphertext;row.distanceRevision=revision
  }
  internal fun routeFix(chunk:WalkPointChunk):WalkDistanceFix {
    val bytes=cipher.decrypt(WalkSealedBytes(chunk.nonce,chunk.ciphertext),WalkCipher.aad(chunk.sessionId,"point",chunk.chunkIndex))
    return try{decodedRouteFix(bytes,chunk.routeSegment)}finally{bytes.fill(0)}
  }
}
