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
  private val qaEnabled: Boolean = com.nuri.BuildConfig.NURI_SECURITY_QA,
  private val injectedFinalCleanup: WalkFinalCleanup? = null,
  private val testLauncher: ((WalkRuntime, String, String) -> Unit)? = null,
) {
  private val worker = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())
  private val storage by lazy { injectedStorage ?: WalkStorage(context) }
  private val source: WalkLocationSource = injectedSource ?: FusedWalkLocationSource(context)
  private val distanceEngine = WalkDistanceEngineV1(androidWalkGeodesic)
  private val qa by lazy { WalkQaWorkflow(context,storage,::requireOwner) }
  private val finalCleanup by lazy { injectedFinalCleanup ?: WalkFinalCleanup(storage, java.io.File(context.noBackupFilesDir, "walk-final-cleanup-v1")) }
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
  private fun productFence(actor: String, binding: String) {
    if (productUuid(actor) != requireOwner() || binding != ownerEpoch.get().toString())
      throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
  }
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
        // A dormant product intent/recovery belongs to its encrypted owner,
        // not to the next login. Release only its slot, never its checkpoint.
        storage.dao.active()?.let { row ->
          val meta = storage.metadata(row)
          if (meta.product != null && meta.owner != next) sealActive(releaseProductSlot = true)
        }
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
      val distance = storage.distance(row)
      put("distanceStatus", if(distance==null) "NOT_AVAILABLE_PHASE_2" else "LOCAL_CANDIDATE")
      put("distanceSummary", distance?.let{distanceSummary(it,meta.timing.activeMs)} ?: JSONObject.NULL)
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
  fun productBinding(actor: String, done: (String?, String?) -> Unit) = run(done) {
    if (productUuid(actor) != requireOwner()) throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
    ownerEpoch.get().toString()
  }
  fun productCommand(actor: String, binding: String, operation: String, input: String,
    visible: Boolean, done: (String?, String?) -> Unit) {
    worker.execute {
      try {
        initialize(); productFence(actor, binding)
        if (input.length > 32768) throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
        val body = try { JSONObject(input) } catch (_: Exception) { throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT") }
        val products = WalkProductStore(storage) { productFence(actor, binding) }
        fun exact(vararg keys: String) = productExact(body, keys.toSet())
        fun id() = productUuid(productString(body, "sessionId"))
        val result = when (operation) {
          "PREPARE" -> { exact("petId", "commandId"); startGate(visible)
            finalCleanup.assertAllowed(actor, productUuid(productString(body, "petId")))
            products.prepare(actor, productUuid(productString(body, "petId")), productUuid(productString(body, "commandId")),
              System.currentTimeMillis(), SystemClock.elapsedRealtime()) }
          "GET" -> { exact("sessionId"); val (row, meta) = products.owned(actor, id()); products.checkpoint(row, meta) }
          "SCAN" -> { exact("after"); products.page(actor, productString(body, "after")) }
          "START" -> { exact("sessionId", "commandId")
            startProduct(actor, binding, id(), productUuid(productString(body, "commandId")), visible, done)
            return@execute }
          "MUTATE" -> { exact("sessionId", "commandId", "revision", "action")
            val session = id()
            val action = productString(body, "action")
            if (action !in setOf("PAUSE", "RESUME", "FINISH", "RECOVER_PAUSE", "RESUME_RECOVERED"))
              throw WalkFailure("WALK_INVALID_STATE_TRANSITION")
            mutateInternal(action, session, productUuid(productString(body, "commandId")), productString(body, "revision"), visible,
              { _, error ->
                if (error != null) done(null, error)
                else try { productFence(actor, binding); val (row, meta) = products.owned(actor, session); done(products.checkpoint(row, meta), null) }
                catch (e: Exception) { done(null, failure(e)) }
              }, actor to binding)
            return@execute }
          "APPLY_RECEIPT" -> { exact("sessionId", "receipt"); val session = id()
            val r = products.validateReceipt(actor, session, productString(body, "receipt"))
            productFence(actor, binding)
            if (r.state in setOf("NOT_ACCEPTED_FINAL", "DELETED") && serviceSession == session) {
              haltCollection()
              pendingActivation?.takeIf { it.first == session }?.second?.let { complete(it, null, "WALK_SESSION_DELETED"); pendingActivation = null }
            }
            products.apply(actor, session, r) }
          "REQUEST" -> { exact("sessionId", "operation"); products.request(actor, id(), productString(body, "operation")) }
          "NOTE_ERROR" -> { exact("sessionId", "code"); products.noteError(actor, id(), productString(body, "code")) }
          "PURGE_RESOLVED" -> { exact("sessionId"); products.purgeResolved(actor, id()) }
          "PURGE_FINAL_SCOPE" -> { exact("petId", "confirmation", "after"); products.purgeFinalScope(actor,
            productNullable(body, "petId"), productString(body, "confirmation"), productString(body, "after")) }
          "CAPTURE_FINAL_CLEANUP" -> { exact("petId"); finalCleanup.capture(actor, productNullable(body, "petId")) }
          "SNAPSHOT" -> { exact("sessionId"); val (row, meta) = products.owned(actor, id()); snapshot(row, meta) }
          "ROUTE_PAGE" -> { exact("sessionId", "direction", "cursor", "routeRevision")
            val (row, _) = products.owned(actor, id())
            val s = storage.distance(row) ?: throw WalkFailure("WALK_DISTANCE_NOT_AVAILABLE")
            if (productString(body, "routeRevision") != s.routeRevision.toString()) throw WalkFailure("WALK_ROUTE_REVISION_CONFLICT")
            val cursor = productString(body, "cursor").toLongOrNull()?.takeIf { it >= -1 } ?: throw WalkFailure("WALK_ROUTE_PAGE_INVALID")
            WalkRouteProjection(storage).page(row, s, productString(body, "direction"), cursor).toString() }
          else -> throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
        }
        productFence(actor, binding); done(result, null)
      } catch (error: Exception) { failClosed(failure(error)); done(null, failure(error)) }
    }
  }
  // Confirmed scope uses an opaque captured capability, not current owner
  // rebinding. Thus an old owner's final receipt cannot stop a new owner's FGS.
  fun finalCleanupCommand(operation: String, ticket: String, done: (String?, String?) -> Unit) = run(done) {
    when (operation) {
      "PENDING" -> finalCleanup.pending().toString()
      "CONFIRM" -> {
        val scope = finalCleanup.block(productUuid(ticket))
        if (owner == scope.getString("owner")) ownerEpoch.incrementAndGet()
        quiesceFinalScope(scope)
        // Collection is fenced/stopped first, even if disk promotion fails.
        // Erasure still requires a verified durable confirmation in STEP.
        finalCleanup.confirm(ticket)
        "OK"
      }
      "STEP" -> {
        val id = productUuid(ticket); val scope = finalCleanup.scope(id)
        if (!scope.getBoolean("confirmed")) throw WalkFailure("WALK_INVALID_STATE_TRANSITION")
        quiesceFinalScope(scope)
        if (finalCleanup.step(id)) "DONE" else "MORE"
      }
      "ACK" -> { finalCleanup.acknowledge(productUuid(ticket)); "OK" }
      else -> throw WalkFailure("WALK_INVALID_PRODUCT_CHECKPOINT")
    }
  }
  private fun quiesceFinalScope(scope: JSONObject) {
    storage.dao.active()?.let { row ->
      val meta = storage.metadata(row)
      if (finalCleanup.matches(scope, meta.owner, meta.pet)) {
        generation.incrementAndGet(); source.stop(); availability = false; stopServiceAndAwait()
        pendingActivation?.takeIf { it.first == row.sessionId }?.second?.let { complete(it, null, "WALK_SESSION_DELETED"); pendingActivation = null }
      }
    }
  }
  private fun startProduct(actor: String, binding: String, session: String, command: String,
    visible: Boolean, done: (String?, String?) -> Unit) {
    productFence(actor, binding)
    val products = WalkProductStore(storage) { productFence(actor, binding) }
    val (row, old) = products.owned(actor, session)
    finalCleanup.assertAllowed(actor, old.pet)
    val journal = old.product!!
    if (journal.phase == WalkProductPhase.RUNNING && state(row) in setOf(WalkState.WALKING, WalkState.PAUSED)) {
      done(products.checkpoint(row, old), null); return
    }
    if (!journal.reservationConfirmed || journal.phase !in setOf(WalkProductPhase.RESERVED, WalkProductPhase.START_FAILED)
      || state(row) != WalkState.IDLE || old.finishedWall != 0L)
      throw WalkFailure("WALK_PRODUCT_RESERVATION_REQUIRED")
    startGate(visible)
    claimProductSlot(row)
    val hash = digest("PRODUCT_START", actor, old.pet, session, 0)
    replay(command, hash)?.let { done(products.checkpoint(row, old), null); return }
    val wall = System.currentTimeMillis(); val mono = SystemClock.elapsedRealtime()
    val meta = old.copy(startedWall = wall, segmentStartedNs = SystemClock.elapsedRealtimeNanos(), segmentCount = 1,
      timing = WalkTiming(mono, wall, 0, 0), product = journal.copy(phase = WalkProductPhase.START_REQUESTED, lastErrorCode = null))
    val receipt = newReceipt(command, hash, row)
    storage.transaction {
      productFence(actor, binding)
      storage.writeDistance(row, WalkDistanceState())
      saveTransition(row, meta, WalkState.STARTING); storage.dao.insertReceipt(receipt)
      productFence(actor, binding)
    }
    waiters[command] = mutableListOf({ _, error ->
      if (error != null) done(null, error)
      else try { productFence(actor, binding); val (current, data) = products.owned(actor, session); done(products.checkpoint(current, data), null) }
      catch (e: Exception) { done(null, failure(e)) }
    })
    pendingActivation = session to command
    launchService(session, command)
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
    row.activeSlot = if (target == WalkState.IDLE && meta.product?.reservationConfirmed == true
      && meta.product.phase != WalkProductPhase.RESOLVED) 1
      else if (target in setOf(WalkState.IDLE, WalkState.FINISHED_LOCAL, WalkState.CANCELLED_LOCAL)) null else 1
    row.lastErrorCode = null
    storage.writeMetadata(row, meta)
    storage.dao.updateSession(row)
  }
  fun start(pet: String, command: String, expected: String, visible: Boolean, done: (String?, String?) -> Unit) {
    worker.execute {
      try {
        initialize(); val actor = requireOwner(); val petId = uuid(pet); val id = uuid(command); val rev = revision(expected)
        finalCleanup.assertAllowed(actor, petId)
        if (!qaEnabled) throw WalkFailure("WALK_QA_DISABLED")
        storage.dao.receipt(id)?.let { existing ->
          storage.dao.session(existing.sessionId)?.let { if (owned(it).product != null) throw WalkFailure("WALK_PRODUCT_SESSION_PROTECTED") }
        }
        storage.dao.active()?.let { if (owned(it).product != null) throw WalkFailure("WALK_PRODUCT_SESSION_PROTECTED") }
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
        storage.writeDistance(row, WalkDistanceState())
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
        val attaching = owned(row); finalCleanup.assertAllowed(attaching.owner, attaching.pet)
        startGate(true, service === serviceInstance && serviceSession == sessionId)
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
                .let { it.copy(product = it.product?.copy(phase = WalkProductPhase.RUNNING, lastErrorCode = null)) }
              val engine = storage.distance(current) ?: WalkDistanceState(epoch=old.segmentCount,legacySession=true)
              storage.writeDistance(current,distanceEngine.beginSegment(engine,walkBootIdentity(context),meta.segmentStartedNs))
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
              if (state(row) == WalkState.STARTING) saveTransition(row,
                meta.copy(product = meta.product?.copy(phase = WalkProductPhase.START_FAILED, lastErrorCode = code)), WalkState.IDLE)
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
    mutateInternal(type, session, command, expected, visible, done, null)
  }
  internal fun notificationCommand(type: String, session: String, command: String, expected: String, done: (String?, String?) -> Unit) {
    worker.execute {
      try {
        if (serviceSession != session || type !in setOf("PAUSE", "RESUME")) throw WalkFailure("WALK_SERVICE_UNAVAILABLE")
        val row = storage.dao.session(session) ?: throw WalkFailure("WALK_SESSION_DELETED")
        val meta = owned(row)
        val binding = if (meta.product != null) meta.owner to ownerEpoch.get().toString() else null
        mutateInternal(type, session, command, expected, false, done, binding)
      } catch (error: Exception) { done(null, failure(error)) }
    }
  }
  private fun claimProductSlot(row: WalkLocalSession) {
    val active = storage.dao.active()
    if (active != null && active.sessionId != row.sessionId) throw WalkFailure("WALK_ALREADY_ACTIVE")
    row.activeSlot = 1
  }
  private fun mutateInternal(type: String, session: String, command: String, expected: String, visible: Boolean,
    done: (String?, String?) -> Unit, productOwner: Pair<String, String>?) {
    worker.execute {
      try {
        initialize(); val id = uuid(command); val sessionId = uuid(session); val actor = requireOwner(); val rev = revision(expected)
        if (productOwner != null) productFence(productOwner.first, productOwner.second)
        else if (!qaEnabled) throw WalkFailure("WALK_QA_DISABLED")
        val protected = storage.dao.session(sessionId) ?: throw WalkFailure("WALK_SESSION_DELETED")
        val protectedMeta = owned(protected)
        finalCleanup.assertAllowed(protectedMeta.owner, protectedMeta.pet)
        if ((protectedMeta.product != null) != (productOwner != null)) throw WalkFailure("WALK_PRODUCT_SESSION_PROTECTED")
        if (protectedMeta.product != null && (protectedMeta.product.phase in setOf(WalkProductPhase.RESOLVED, WalkProductPhase.CANCEL_PENDING)
          || (protectedMeta.finishedWall > 0 && type != "FINISH"))) throw WalkFailure("WALK_PRODUCT_FINISH_REQUIRED")
        val hash = digest(type, actor, "", sessionId, rev)
        if (storage.dao.receipt(id)?.outcome == "PENDING" && waiters.containsKey(id)) {
          if (storage.dao.receipt(id)?.inputDigest != hash) throw WalkFailure("WALK_PAYLOAD_CONFLICT")
          waiters[id]?.add(done); return@execute
        }
        replay(id, hash)?.let { done(it, null); return@execute }
        val row = storage.dao.session(sessionId) ?: throw WalkFailure("WALK_SESSION_DELETED")
        var meta = owned(row)
        fun <T> write(block: () -> T): T = storage.transaction {
          productOwner?.let { productFence(it.first, it.second) }
          val value = block()
          productOwner?.let { productFence(it.first, it.second) }
          value
        }
        WalkRuntimePolicy.nextRevision(row.revision, rev)
        if (productOwner != null && state(row) != WalkState.FINISHED_LOCAL) claimProductSlot(row)
        val receipt = newReceipt(id, hash, row)
        if (type == "RESUME" || type == "RESUME_RECOVERED") {
          startGate(visible, type == "RESUME" && service != null && serviceSession == sessionId)
          if (type == "RESUME_RECOVERED") {
            val mono = SystemClock.elapsedRealtime(); val wall = System.currentTimeMillis()
            meta = meta.copy(timing = meta.timing.copy(lastMonoMs = mono, lastWallMs = wall),
              pauseStartedMonoMs = mono, pauseStartedWallMs = wall)
            write { saveTransition(row, meta, WalkState.PAUSED) }
          }
          if (state(row) != WalkState.PAUSED) throw WalkFailure("WALK_INVALID_STATE_TRANSITION")
          write { storage.dao.insertReceipt(receipt) }
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
          write {
            saveTransition(row, meta, WalkState.PAUSED); storage.dao.insertReceipt(receipt)
            storage.saveResult(receipt, snapshot(row, meta), row.revision)
          }
        } else if (type == "RECOVER_PAUSE") {
          val mono = SystemClock.elapsedRealtime(); val wall = System.currentTimeMillis()
          meta = meta.copy(timing = meta.timing.copy(lastMonoMs = mono, lastWallMs = wall),
            pauseStartedMonoMs = mono, pauseStartedWallMs = wall)
          write { saveTransition(row, meta, WalkState.PAUSED); storage.dao.insertReceipt(receipt)
            storage.saveResult(receipt, snapshot(row, meta), row.revision) }
        } else if (type == "FINISH") {
          storage.distance(row)?.validate()?.let{
            if(storage.dao.routeCount(row.sessionId)!=it.counts[0])throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
          }
          if (state(row) in setOf(WalkState.WALKING, WalkState.PAUSED)) {
            val mono = SystemClock.elapsedRealtime(); val wall = System.currentTimeMillis()
            meta = closePause(meta, mono, wall).copy(timing = meta.timing.advance(state(row), mono, wall))
          } else if (state(row) == WalkState.RECOVERY_REQUIRED) {
            meta = meta.copy(pauseStartedMonoMs = 0, pauseStartedWallMs = 0)
          }
          write {
            saveTransition(row, meta, WalkState.FINISHING)
            storage.dao.insertReceipt(receipt)
          }
          generation.incrementAndGet(); source.stop(); stopServiceAndAwait()
          meta = meta.copy(finishedWall = if (meta.product != null && meta.finishedWall > 0) meta.finishedWall else System.currentTimeMillis())
          if (meta.product != null) {
            // Preserve the true stop checkpoint even if canonical validation fails.
            write { storage.writeMetadata(row, meta); storage.dao.updateSession(row) }
            try {
              meta = meta.copy(product = WalkProductFinish.seal(row.sessionId, meta,
                storage.distance(row) ?: throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")))
            } catch (error: Exception) {
              meta = meta.copy(product = meta.product!!.copy(phase = WalkProductPhase.FINISH_INVALID, lastErrorCode = failure(error)))
              write { storage.writeMetadata(row, meta); storage.dao.updateSession(row) }
              throw error
            }
          }
          write {
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
        val engine = storage.distance(row) ?: throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
        val next = distanceEngine.evaluate(engine,distanceFix(fix,walkBootIdentity(context),engine.epoch),
          SystemClock.elapsedRealtimeNanos(),System.currentTimeMillis())
        storage.writeDistance(row,next.state)
        meta = meta.copy(fixCount = if(next.retainRaw)Math.addExact(meta.fixCount, 1)else meta.fixCount,
          lastFixNs = maxOf(meta.lastFixNs,next.state.lastOrderedNs),segmentCount=maxOf(meta.segmentCount,next.state.epoch),
          timing = meta.timing.advance(state(row), SystemClock.elapsedRealtime(), System.currentTimeMillis()))
        if(next.retainRaw)storage.appendPoint(row,encodeWalkFix(fix,meta.segmentCount-1),meta,next.disposition==WalkFixDisposition.ACCEPTED,next.state.epoch)
        else{storage.writeMetadata(row,meta);storage.transaction{storage.dao.updateSession(row)}}
        availability = true; publish(row, meta)
      } catch (error: Exception) { failClosed(failure(error)) }
    }
  }
  fun checkpoint() {
    worker.execute {
      try {
        val row = storage.dao.active() ?: return@execute
        if (state(row) !in setOf(WalkState.WALKING, WalkState.PAUSED)) return@execute
        val meta = owned(row).let { it.copy(timing = it.timing.advance(state(row), SystemClock.elapsedRealtime(), System.currentTimeMillis())) }
        if(state(row)==WalkState.WALKING)storage.distance(row)?.let{
          storage.writeDistance(row,distanceEngine.tick(it,SystemClock.elapsedRealtimeNanos()))
        }
        storage.writeMetadata(row, meta); storage.transaction { storage.dao.updateSession(row) }
        publish(row, meta)
        if(qaEnabled && meta.product == null)qa.observe(row)
      } catch (error: Exception) { failClosed(failure(error)) }
    }
  }
  private fun publish(row: WalkLocalSession, meta: WalkMetadata) {
    val now = SystemClock.elapsedRealtime()
    if (meta.owner != owner || now - lastEventMs < WalkDistancePolicyV1.EVENT_INTERVAL_MS) return
    lastEventMs = now; sink?.invoke(snapshot(row, meta))
    main.post { service?.refresh(row.runtimeState, meta.timing.activeMs, row.sessionId, row.revision, meta.fixCount, row.chunkCount) }
  }
  private fun sealActive(releaseProductSlot: Boolean = false) {
    val row = storage.dao.active() ?: return
    val meta = storage.metadata(row)
    if (meta.product != null && (state(row) == WalkState.IDLE || state(row) == WalkState.RECOVERY_REQUIRED)) {
      if (releaseProductSlot) storage.transaction { row.activeSlot = null; storage.dao.updateSession(row) }
      return
    }
    if (state(row) == WalkState.RECOVERY_REQUIRED) return
    val sealedMeta = meta.copy(timing = meta.timing.advance(state(row), SystemClock.elapsedRealtime(), System.currentTimeMillis()))
    row.runtimeState = "RECOVERY_REQUIRED"; row.revision = Math.addExact(row.revision, 1)
    row.lastErrorCode = "WALK_RECOVERY_REQUIRED"
    if (releaseProductSlot && meta.product != null) row.activeSlot = null
    storage.writeMetadata(row, sealedMeta); storage.transaction { storage.dao.updateSession(row) }
  }
  private fun closePause(meta: WalkMetadata, mono: Long, wall: Long): WalkMetadata {
    if (meta.pauseStartedMonoMs == 0L) return meta
    if (mono < meta.pauseStartedMonoMs) throw WalkFailure("WALK_CLOCK_DISCONTINUITY")
    return meta.copy(pauseStartedMonoMs = 0, pauseStartedWallMs = 0,
      pauses = meta.pauses + WalkPauseInterval(meta.pauseStartedMonoMs, mono, meta.pauseStartedWallMs, wall))
  }
  private fun failClosed(code: String) {
    if (code !in setOf("WALK_CLOCK_DISCONTINUITY", "WALK_LOCAL_ENCRYPTION_ERROR", "WALK_LOCAL_KEY_INVALIDATED", "WALK_LOCAL_DATABASE_ERROR", "WALK_SERVICE_UNAVAILABLE", "WALK_NOTIFICATION_SETUP_FAILED", "WALK_DISTANCE_CHECKPOINT_INVALID", "WALK_DISTANCE_CAPACITY_EXCEEDED")) return
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
        sealActive(releaseProductSlot = true); owner = null
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
  fun getRoutePage(direction:String,cursor:String,routeRevision:String,done:(String?,String?)->Unit)=run(done){
    if(!com.nuri.BuildConfig.NURI_SECURITY_QA)throw WalkFailure("WALK_QA_DISABLED")
    val row=newestOwned()?:throw WalkFailure("WALK_SESSION_DELETED");owned(row)
    val state=storage.distance(row)?:throw WalkFailure("WALK_DISTANCE_NOT_AVAILABLE")
    if(routeRevision!=state.routeRevision.toString())throw WalkFailure("WALK_ROUTE_REVISION_CONFLICT")
    val position=cursor.toLongOrNull()?.takeIf{it>=-1}?:throw WalkFailure("WALK_ROUTE_PAGE_INVALID")
    WalkRouteProjection(storage).page(row,state,direction,position).toString()
  }
  fun qaCommand(operation:String,input:String,done:(String?,String?)->Unit){
    worker.execute{
      try{
        initialize();requireOwner()
        if(!qaEnabled)throw WalkFailure("WALK_QA_DISABLED")
        storage.dao.active()?.let { if (owned(it).product != null) throw WalkFailure("WALK_PRODUCT_SESSION_PROTECTED") }
        val body=JSONObject(input)
        if(operation=="CLEANUP")WalkQaContract.exact(body,setOf("postReturnReviewComplete"))
        else if(operation!="CONFIGURE"&&operation!="SKIP")WalkQaContract.exact(body,emptySet())
        when(operation){
          "GET"->{newestOwned()?.let{qa.observeRecovery(it,service!=null)};done(qa.state(),null)}
          "CONFIGURE"->done(qa.configure(body),null)
          "START_STEP"->{
            val(pet,command,repeated)=qa.reserve()
            if(repeated){done(qa.state(),null);return@execute}
            start(pet,command,"0",WalkVisibility.resumed){result,error->
              try{done(qa.link(result,error),null)}catch(e:Exception){done(null,failure(e))}
            }
          }
          "FINISH_STEP"->{
            val(session,command,expected)=qa.finishIdentity();val row=storage.dao.session(session)?:throw WalkFailure("WALK_SESSION_DELETED")
            owned(row)
            if(row.runtimeState=="FINISHED_LOCAL"){done(qa.complete(),null);return@execute}
            mutate("FINISH",session,command,expected,WalkVisibility.resumed){_,error->
              if(error!=null)done(null,error)else try{done(qa.complete(),null)}catch(e:Exception){done(null,failure(e))}
            }
          }
          "MARK_REBOOT"->done(qa.markReboot(),null)
          "SKIP"->done(qa.skip(body),null)
          "CLEANUP"->done(qa.cleanup(body.getBoolean("postReturnReviewComplete")),null)
          else->throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
        }
      }catch(e:Exception){failClosed(failure(e));done(null,failure(e))}
    }
  }
  companion object {
    private const val MAX_COMMANDS_PER_SESSION = 4096
    @Volatile private var instance: WalkRuntime? = null
    fun get(context: Context): WalkRuntime = instance ?: synchronized(this) {
      instance ?: WalkRuntime(context.applicationContext).also { instance = it }
    }
  }
}
