package com.nuri.walk

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.core.content.ContextCompat
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong
import org.json.JSONObject

object WalkVisibility { @Volatile var resumed = false }

internal interface WalkServiceHandle {
  fun end()
  fun refresh(state: String, activeMs: Long, sessionId: String, revision: Long, fixCount: Long, chunkCount: Long)
}

class WalkRuntime internal constructor(private val context: Context,
  private val injectedStorage: WalkStorage? = null,
  injectedSource: WalkLocationSource? = null,
  private val testGate: ((Boolean, Boolean) -> String?)? = null,
  private val testLauncher: ((WalkRuntime, String, String) -> Unit)? = null,
) {
  private val worker = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())
  private val storage by lazy { injectedStorage ?: WalkStorage(context) }
  private val source: WalkLocationSource = injectedSource ?: FusedWalkLocationSource(context)
  private val generation = AtomicLong(0)
  private val ownerEpoch = AtomicLong(0)
  @Volatile private var owner: String? = null
  @Volatile private var service: WalkServiceHandle? = null
  @Volatile private var availability = false
  @Volatile private var serviceSession: String? = null
  private var initialized = false
  private var lastEventMs = 0L
  private var sink: ((String) -> Unit)? = null
  private val waiters = mutableMapOf<String, MutableList<(String?, String?) -> Unit>>()
  private var pendingActivation: Pair<String, String>? = null

  fun observe(listener: ((String) -> Unit)?) { worker.execute { sink = listener } }
  private fun uuid(value: String): String = try { UUID.fromString(value).toString().also {
    if (!it.equals(value, true)) throw WalkFailure("WALK_INVALID_IDENTIFIER")
  } } catch (_: Exception) { throw WalkFailure("WALK_INVALID_IDENTIFIER") }
  private fun state(row: WalkLocalSession) = WalkState.valueOf(row.runtimeState)
  private fun requireOwner(): String = owner ?: throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
  private fun owned(row: WalkLocalSession): WalkMetadata = storage.metadata(row).also {
    if (it.owner != requireOwner()) throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
  }
  private fun initialize() {
    if (initialized) return
    storage.dao.active()?.let { row ->
      val recovered = WalkRuntimePolicy.afterProcessLoss(state(row))
      if (recovered != state(row)) {
        row.runtimeState = recovered.name; row.revision = Math.addExact(row.revision, 1)
        row.lastErrorCode = "WALK_RECOVERY_REQUIRED"
        // Keep the existing envelope/AAD intact: recovery must remain durable
        // even when the key is unavailable. Owner data is decrypted only later.
        storage.transaction { storage.dao.updateSession(row); storage.dao.failPending(row.sessionId, "WALK_RECOVERY_REQUIRED") }
      }
    }
    initialized = true
  }
  private fun failure(error: Exception): String = (error as? WalkFailure)?.code ?: "WALK_LOCAL_DATABASE_ERROR"
  private fun run(done: (String?, String?) -> Unit, block: () -> String) {
    worker.execute {
      try { initialize(); done(block(), null) }
      catch (error: Exception) { failClosed(failure(error)); done(null, failure(error)) }
    }
  }
  fun bindOwner(next: String?, done: (String?, String?) -> Unit) {
    val previous = owner
    val epoch = ownerEpoch.incrementAndGet()
    if (previous != null && previous != next) haltCollection()
    worker.execute {
      try {
        initialize()
        if (previous != null && previous != next) sealActive()
        if (epoch != ownerEpoch.get()) throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
        owner = next?.let(::uuid)
        done("OK", null)
      } catch (error: Exception) { owner = null; haltCollection(); failClosed(failure(error)); done(null, failure(error)) }
    }
  }
  private fun permissionState(): String {
    val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    return if (fine) "PRECISE_GRANTED" else if (coarse) "APPROXIMATE_ONLY" else "LOCATION_DENIED"
  }
  private fun startGate(visible: Boolean, existingForeground: Boolean = false) {
    testGate?.let { gate -> gate(visible, existingForeground)?.let { throw WalkFailure(it) }; return }
    val permission = permissionState()
    val enabled = androidx.core.location.LocationManagerCompat.isLocationEnabled(context.getSystemService(Context.LOCATION_SERVICE) as LocationManager)
    WalkRuntimePolicy.startGate(existingForeground || (visible && WalkVisibility.resumed), permission != "LOCATION_DENIED", permission == "PRECISE_GRANTED", enabled)
      ?.let { throw WalkFailure(it) }
  }
  private fun snapshot(row: WalkLocalSession, meta: WalkMetadata): String {
    val now = SystemClock.elapsedRealtimeNanos()
    return JSONObject().apply {
      put("sessionId", row.sessionId); put("petId", meta.pet); put("runtimeState", row.runtimeState)
      put("revision", row.revision.toString()); put("startedAt", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        .apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date(meta.startedWall)))
      put("elapsedActiveMs", meta.timing.activeMs.toString()); put("elapsedPausedMs", meta.timing.pausedMs.toString())
      put("fixCount", meta.fixCount.toString()); put("encryptedChunkCount", row.chunkCount.toString())
      put("segmentCount", meta.segmentCount.toString())
      put("lastFixAgeMs", if (meta.lastFixNs > 0 && now >= meta.lastFixNs) ((now - meta.lastFixNs) / 1000000).toString() else JSONObject.NULL)
      put("serviceRunning", service != null && serviceSession == row.sessionId)
      put("subscriptionActive", source.subscribed && serviceSession == row.sessionId)
      put("recoverable", state(row) == WalkState.RECOVERY_REQUIRED)
      put("locationAvailable", availability); put("permissionState", permissionState())
      put("notificationPermissionState", if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
        "NOTIFICATION_PERMISSION_DENIED_LIMITED_VISIBILITY" else "GRANTED")
      put("distanceStatus", "NOT_AVAILABLE_PHASE_2")
      put("syncState", if (state(row) == WalkState.FINISHED_LOCAL) "SYNC_PENDING" else JSONObject.NULL)
      put("lastErrorCode", row.lastErrorCode ?: JSONObject.NULL)
    }.toString()
  }
  private fun newestOwned(): WalkLocalSession? {
    storage.dao.active()?.let { owned(it); return it }
    return storage.dao.recent().firstOrNull { storage.metadata(it).owner == requireOwner() }
  }
  fun getSnapshot(done: (String?, String?) -> Unit) = run(done) {
    requireOwner()
    newestOwned()?.let { snapshot(it, owned(it)) } ?: "null"
  }
  private fun digest(type: String, actor: String, pet: String, session: String, expected: Long): String =
    MessageDigest.getInstance("SHA-256").digest("1|$type|$actor|$pet|$session|$expected".toByteArray())
      .joinToString("") { "%02x".format(it) }
  private fun revision(value: String): Long = value.toLongOrNull()?.takeIf { it >= 0 }
    ?: throw WalkFailure("WALK_COMMAND_REVISION_CONFLICT")
  private fun replay(id: String, hash: String): String? {
    val receipt = storage.dao.receipt(id) ?: return null
    if (receipt.inputDigest != hash) throw WalkFailure("WALK_PAYLOAD_CONFLICT")
    return storage.replayResult(receipt)
  }
  private fun newReceipt(id: String, hash: String, row: WalkLocalSession): WalkCommandReceipt {
    if (storage.dao.receiptCount(row.sessionId) >= MAX_COMMANDS_PER_SESSION) throw WalkFailure("WALK_COMMAND_LIMIT_REACHED")
    return WalkCommandReceipt().apply { commandId = id; sessionId = row.sessionId; inputDigest = hash }
  }
  private fun saveTransition(row: WalkLocalSession, meta: WalkMetadata, target: WalkState) {
    row.runtimeState = WalkRuntimePolicy.transition(state(row), target).name
    row.revision = WalkRuntimePolicy.nextRevision(row.revision, row.revision)
    row.activeSlot = if (target in setOf(WalkState.IDLE, WalkState.FINISHED_LOCAL, WalkState.CANCELLED_LOCAL)) null else 1
    row.lastErrorCode = null
    storage.writeMetadata(row, meta)
    storage.dao.updateSession(row)
  }
  fun start(pet: String, command: String, expected: String, visible: Boolean, done: (String?, String?) -> Unit) {
    worker.execute {
      try {
        initialize(); val actor = requireOwner(); val petId = uuid(pet); val id = uuid(command); val rev = revision(expected)
        val hash = digest("START", actor, petId, "", rev)
        if (storage.dao.receipt(id)?.outcome == "PENDING" && waiters.containsKey(id)) {
          if (storage.dao.receipt(id)?.inputDigest != hash) throw WalkFailure("WALK_PAYLOAD_CONFLICT")
          waiters[id]?.add(done); return@execute
        }
        replay(id, hash)?.let { done(it, null); return@execute }
        if (rev != 0L) throw WalkFailure("WALK_COMMAND_REVISION_CONFLICT")
        startGate(visible)
        if (storage.dao.active() != null) throw WalkFailure("WALK_ALREADY_ACTIVE")
        val wall = System.currentTimeMillis(); val mono = SystemClock.elapsedRealtime()
        val row = WalkLocalSession().apply { sessionId = UUID.randomUUID().toString(); activeSlot = 1; runtimeState = "STARTING"; revision = 1 }
        val meta = WalkMetadata(actor, petId, wall, SystemClock.elapsedRealtimeNanos(), WalkTiming(mono, wall, 0, 0))
        storage.writeMetadata(row, meta)
        val receipt = newReceipt(id, hash, row)
        storage.transaction { storage.dao.insertSession(row); storage.dao.insertReceipt(receipt) }
        waiters[id] = mutableListOf(done); pendingActivation = row.sessionId to id
        launchService(row.sessionId, id)
      } catch (error: Exception) { failClosed(failure(error)); done(null, failure(error)) }
    }
  }
  private fun launchService(sessionId: String, command: String) {
    testLauncher?.let { it(this, sessionId, command); return }
    main.post {
      try {
        startGate(true)
        ContextCompat.startForegroundService(context, Intent(context, WalkForegroundService::class.java).apply {
          action = WalkForegroundService.START; putExtra("session", sessionId); putExtra("command", command)
        })
      } catch (_: Exception) { activationFailed(command, "WALK_FGS_START_NOT_ALLOWED") }
    }
  }
  internal fun attach(serviceInstance: WalkServiceHandle, sessionId: String, command: String) {
    worker.execute {
      try {
        val pending = pendingActivation
        if (pending != sessionId to command) {
          if (service !== serviceInstance) serviceInstance.end()
          return@execute
        }
        val row = storage.dao.session(sessionId) ?: throw WalkFailure("WALK_SERVICE_UNAVAILABLE")
        owned(row); startGate(true, service === serviceInstance && serviceSession == sessionId)
        service = serviceInstance; serviceSession = sessionId
        val epoch = generation.incrementAndGet()
        source.start({ fix -> onFix(epoch, sessionId, fix) }, { availability = it }) { error ->
          if (error != null) activationFailed(command, error)
          else worker.execute {
            try {
              if (epoch != generation.get()) throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
              val current = storage.dao.session(sessionId) ?: throw WalkFailure("WALK_SERVICE_UNAVAILABLE")
              val old = owned(current)
              val mono = SystemClock.elapsedRealtime(); val wall = System.currentTimeMillis()
              val resuming = state(current) == WalkState.PAUSED
              val timing = if (resuming) old.timing.advance(WalkState.PAUSED, mono, wall)
                else old.timing.copy(lastMonoMs = mono, lastWallMs = wall)
              val meta = closePause(old, mono, wall).beginSegment(SystemClock.elapsedRealtimeNanos(), timing, resuming)
              val receipt = storage.dao.receipt(command) ?: throw WalkFailure("WALK_LOCAL_DATABASE_ERROR")
              storage.transaction {
                saveTransition(current, meta, WalkState.WALKING)
                storage.saveResult(receipt, snapshot(current, meta), current.revision)
              }
              pendingActivation = null; complete(command, snapshot(current, meta), null); publish(current, meta)
            } catch (error: Exception) { activationFailed(command, failure(error)) }
          }
        }
      } catch (error: Exception) { activationFailed(command, failure(error)) }
    }
  }
  private fun complete(command: String, result: String?, error: String?) {
    waiters.remove(command)?.forEach { it(result, error) }
  }
  internal fun activationDenied(command: String, code: String) { activationFailed(command, code) }
  private fun activationFailed(command: String, code: String) {
    worker.execute {
      // A late Fused/platform response for an old start cannot stop a newer walk.
      if (pendingActivation?.second != command) return@execute
      haltCollection()
      try {
        storage.transaction {
          val receipt = storage.dao.receipt(command)
          receipt?.let { item ->
            val row = storage.dao.session(item.sessionId)
            if (row != null) {
              val meta = storage.metadata(row)
              if (state(row) == WalkState.STARTING) saveTransition(row, meta, WalkState.IDLE)
              else { row.runtimeState = "RECOVERY_REQUIRED"; row.revision = Math.addExact(row.revision, 1); row.lastErrorCode = code; storage.dao.updateSession(row) }
            }
            item.outcome = code; storage.dao.updateReceipt(item)
          }
        }
      } catch (error: Exception) { failClosed(failure(error)) }
      pendingActivation = null; complete(command, null, code)
    }
  }
  fun mutate(type: String, session: String, command: String, expected: String, visible: Boolean, done: (String?, String?) -> Unit) {
    worker.execute {
      try {
        initialize(); val id = uuid(command); val sessionId = uuid(session); val actor = requireOwner(); val rev = revision(expected)
        val hash = digest(type, actor, "", sessionId, rev)
        if (storage.dao.receipt(id)?.outcome == "PENDING" && waiters.containsKey(id)) {
          if (storage.dao.receipt(id)?.inputDigest != hash) throw WalkFailure("WALK_PAYLOAD_CONFLICT")
          waiters[id]?.add(done); return@execute
        }
        replay(id, hash)?.let { done(it, null); return@execute }
        val row = storage.dao.session(sessionId) ?: throw WalkFailure("WALK_SESSION_DELETED")
        var meta = owned(row)
        WalkRuntimePolicy.nextRevision(row.revision, rev)
        val receipt = newReceipt(id, hash, row)
        if (type == "RESUME" || type == "RESUME_RECOVERED") {
          startGate(visible, type == "RESUME" && service != null && serviceSession == sessionId)
          if (type == "RESUME_RECOVERED") {
            val mono = SystemClock.elapsedRealtime(); val wall = System.currentTimeMillis()
            meta = meta.copy(timing = meta.timing.copy(lastMonoMs = mono, lastWallMs = wall),
              pauseStartedMonoMs = mono, pauseStartedWallMs = wall)
            storage.transaction { saveTransition(row, meta, WalkState.PAUSED) }
          }
          if (state(row) != WalkState.PAUSED) throw WalkFailure("WALK_INVALID_STATE_TRANSITION")
          storage.transaction { storage.dao.insertReceipt(receipt) }
          waiters[id] = mutableListOf(done); pendingActivation = sessionId to id
          // Reuse the existing FGS without launching from background; otherwise
          // only a resumed visible Activity can create a new location service.
          val running = service
          if (running != null && serviceSession == sessionId) attach(running, sessionId, id)
          else launchService(sessionId, id)
          return@execute
        }
        if (type == "PAUSE") {
          if (state(row) != WalkState.WALKING) throw WalkFailure("WALK_INVALID_STATE_TRANSITION")
          generation.incrementAndGet(); source.stop(); availability = false
          val mono = SystemClock.elapsedRealtime(); val wall = System.currentTimeMillis()
          meta = meta.copy(timing = meta.timing.advance(state(row), mono, wall),
            pauseStartedMonoMs = mono, pauseStartedWallMs = wall)
          storage.transaction {
            saveTransition(row, meta, WalkState.PAUSED); storage.dao.insertReceipt(receipt)
            storage.saveResult(receipt, snapshot(row, meta), row.revision)
          }
        } else if (type == "RECOVER_PAUSE") {
          val mono = SystemClock.elapsedRealtime(); val wall = System.currentTimeMillis()
          meta = meta.copy(timing = meta.timing.copy(lastMonoMs = mono, lastWallMs = wall),
            pauseStartedMonoMs = mono, pauseStartedWallMs = wall)
          storage.transaction { saveTransition(row, meta, WalkState.PAUSED); storage.dao.insertReceipt(receipt)
            storage.saveResult(receipt, snapshot(row, meta), row.revision) }
        } else if (type == "FINISH") {
          if (state(row) in setOf(WalkState.WALKING, WalkState.PAUSED)) {
            val mono = SystemClock.elapsedRealtime(); val wall = System.currentTimeMillis()
            meta = closePause(meta, mono, wall).copy(timing = meta.timing.advance(state(row), mono, wall))
          } else if (state(row) == WalkState.RECOVERY_REQUIRED) {
            meta = meta.copy(pauseStartedMonoMs = 0, pauseStartedWallMs = 0)
          }
          storage.transaction {
            saveTransition(row, meta, WalkState.FINISHING)
            storage.dao.insertReceipt(receipt)
          }
          generation.incrementAndGet(); source.stop(); stopServiceAndAwait()
          meta = meta.copy(finishedWall = System.currentTimeMillis())
          storage.transaction {
            saveTransition(row, meta, WalkState.FINISHED_LOCAL)
            storage.saveResult(receipt, snapshot(row, meta), row.revision)
          }
          stopService()
        } else if (type == "DISCARD") {
          if (state(row) != WalkState.RECOVERY_REQUIRED) throw WalkFailure("WALK_INVALID_STATE_TRANSITION")
          storage.transaction {
            saveTransition(row, meta, WalkState.CANCELLED_LOCAL); storage.dao.deleteChunks(row.sessionId)
            row.chunkCount = 0; storage.dao.updateSession(row); storage.dao.insertReceipt(receipt)
            storage.saveResult(receipt, snapshot(row, meta), row.revision)
          }
        } else throw WalkFailure("WALK_INVALID_STATE_TRANSITION")
        val result = storage.replayResult(receipt)
        done(result, null); publish(row, meta)
      } catch (error: Exception) {
        failClosed(failure(error))
        done(null, failure(error))
      }
    }
  }
  private fun onFix(epoch: Long, sessionId: String, fix: Location) {
    worker.execute {
      if (epoch != generation.get()) return@execute
      try {
        val row = storage.dao.session(sessionId) ?: return@execute
        if (state(row) != WalkState.WALKING) return@execute
        var meta = owned(row)
        // Start-boundary and duplicate callback hygiene only, not a distance filter.
        if (fix.elapsedRealtimeNanos < meta.segmentStartedNs || fix.elapsedRealtimeNanos <= meta.lastFixNs) return@execute
        meta = meta.copy(fixCount = Math.addExact(meta.fixCount, 1), lastFixNs = fix.elapsedRealtimeNanos,
          timing = meta.timing.advance(state(row), SystemClock.elapsedRealtime(), System.currentTimeMillis()))
        storage.appendPoint(row, encodeWalkFix(fix, meta.segmentCount - 1), meta); availability = true; publish(row, meta)
      } catch (error: Exception) { failClosed(failure(error)) }
    }
  }
  fun checkpoint() {
    worker.execute {
      try {
        val row = storage.dao.active() ?: return@execute
        if (state(row) !in setOf(WalkState.WALKING, WalkState.PAUSED)) return@execute
        val meta = owned(row).let { it.copy(timing = it.timing.advance(state(row), SystemClock.elapsedRealtime(), System.currentTimeMillis())) }
        storage.writeMetadata(row, meta); storage.transaction { storage.dao.updateSession(row) }
        publish(row, meta)
      } catch (error: Exception) { failClosed(failure(error)) }
    }
  }
  private fun publish(row: WalkLocalSession, meta: WalkMetadata) {
    val now = SystemClock.elapsedRealtime()
    if (meta.owner != owner || now - lastEventMs < 1000) return
    lastEventMs = now; sink?.invoke(snapshot(row, meta))
    main.post { service?.refresh(row.runtimeState, meta.timing.activeMs, row.sessionId, row.revision, meta.fixCount, row.chunkCount) }
  }
  private fun sealActive() {
    val row = storage.dao.active() ?: return
    if (state(row) == WalkState.RECOVERY_REQUIRED) return
    val meta = storage.metadata(row)
    val sealedMeta = meta.copy(timing = meta.timing.advance(state(row), SystemClock.elapsedRealtime(), System.currentTimeMillis()))
    row.runtimeState = "RECOVERY_REQUIRED"; row.revision = Math.addExact(row.revision, 1)
    row.lastErrorCode = "WALK_RECOVERY_REQUIRED"
    storage.writeMetadata(row, sealedMeta); storage.transaction { storage.dao.updateSession(row) }
  }
  private fun closePause(meta: WalkMetadata, mono: Long, wall: Long): WalkMetadata {
    if (meta.pauseStartedMonoMs == 0L) return meta
    if (mono < meta.pauseStartedMonoMs) throw WalkFailure("WALK_CLOCK_DISCONTINUITY")
    return meta.copy(pauseStartedMonoMs = 0, pauseStartedWallMs = 0,
      pauses = meta.pauses + WalkPauseInterval(meta.pauseStartedMonoMs, mono, meta.pauseStartedWallMs, wall))
  }
  private fun failClosed(code: String) {
    if (code !in setOf("WALK_CLOCK_DISCONTINUITY", "WALK_LOCAL_ENCRYPTION_ERROR", "WALK_LOCAL_KEY_INVALIDATED", "WALK_LOCAL_DATABASE_ERROR", "WALK_SERVICE_UNAVAILABLE", "WALK_NOTIFICATION_SETUP_FAILED")) return
    haltCollection()
    try {
      storage.transaction {
        storage.dao.active()?.let { row ->
          if (state(row) != WalkState.RECOVERY_REQUIRED) row.revision = Math.addExact(row.revision, 1)
          row.runtimeState = "RECOVERY_REQUIRED"; row.lastErrorCode = code
          storage.dao.updateSession(row); storage.dao.failPending(row.sessionId, code)
        }
      }
    } catch (_: Exception) { /* Preserve all ciphertext even if Room itself is unavailable. */ }
    pendingActivation?.second?.let { complete(it, null, code) }; pendingActivation = null
  }
  private fun stopService() { val running = service; service = null; serviceSession = null; main.post { running?.end() } }
  private fun stopServiceAndAwait() {
    val running = service ?: return
    service = null; serviceSession = null
    val stopped = java.util.concurrent.CountDownLatch(1)
    main.post { try { running.end() } finally { stopped.countDown() } }
    if (!stopped.await(1500, java.util.concurrent.TimeUnit.MILLISECONDS)) throw WalkFailure("WALK_SERVICE_UNAVAILABLE")
  }
  private fun haltCollection() { generation.incrementAndGet(); source.stop(); availability = false; stopService() }
  fun stopForLogout(command: String, expected: String, done: (String?, String?) -> Unit) {
    // Safety stop precedes disk work and can never be defeated by stale revision.
    // State sealing is an explicit auth-boundary event, not arbitrary UI navigation.
    ownerEpoch.incrementAndGet(); haltCollection(); owner = null
    worker.execute {
      try {
        initialize(); val id = uuid(command); val rev = revision(expected)
        val hash = digest("LOGOUT", "", "", "", rev)
        replay(id, hash)?.let { done(it, null); return@execute }
        val row = storage.dao.active()
        sealActive(); owner = null
        if (row != null) {
          val receipt = newReceipt(id, hash, row)
          storage.transaction { storage.dao.insertReceipt(receipt); storage.saveResult(receipt, "OK", storage.dao.session(row.sessionId)?.revision ?: row.revision) }
        }
        pendingActivation?.second?.let { complete(it, null, "WALK_ACTIVE_SESSION_OWNER_MISMATCH") }
        pendingActivation = null; done("OK", null)
      } catch (error: Exception) { failClosed(failure(error)); done(null, failure(error)) }
    }
  }
  internal fun serviceLost(instance: WalkServiceHandle) {
    if (service !== instance) return
    haltCollection(); worker.execute { try { sealActive() } catch (error: Exception) { failClosed(failure(error)) } }
  }
  internal fun closeForTest() { haltCollection(); worker.shutdown(); worker.awaitTermination(10, java.util.concurrent.TimeUnit.SECONDS) }
  companion object {
    private const val MAX_COMMANDS_PER_SESSION = 4096
    @Volatile private var instance: WalkRuntime? = null
    fun get(context: Context): WalkRuntime = instance ?: synchronized(this) {
      instance ?: WalkRuntime(context.applicationContext).also { instance = it }
    }
  }
}
