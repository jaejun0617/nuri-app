package com.nuri.walk

import android.app.Application
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Process
import android.os.SystemClock
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry
import androidx.test.runner.lifecycle.Stage
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import java.security.MessageDigest
import java.security.SecureRandom
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Test
import org.junit.runner.RunWith

// Explicit selectors only. No automatic UI interaction, request, process kill,
// production cleanup, Auth read, permission change, screenshot or route export.
// Host (NURI-12) owns ordinary UI actions and the explicitly verified PID kill.
@RunWith(AndroidJUnit4::class)
class WalkProductResponseLossTest {
  // Public URL only, copied from the unchanged deployed config.ts. No key/JWT.
  private val approvedOrigin = "https://grmekesqoydylqmyvfke.supabase.co"
  private val instrumentation get() = InstrumentationRegistry.getInstrumentation()
  private val context get() = instrumentation.targetContext
  private fun status(name: String, counts: String? = null, marker: String? = null) {
    instrumentation.sendStatus(2, Bundle().apply {
      putString("supplemental", name); putInt("instrumentationPid", Process.myPid())
      if (counts != null) putString("counts", counts)
      if (marker != null) putString("publicRunMarker", marker)
    })
  }
  private fun safe(work: () -> Unit) {
    try { identity(); work() }
    catch (e: Exception) {
      status(if (e is SupplementalBlocked) e.code else "SUPPLEMENTAL_ABORTED_REQUIRES_REVIEW")
      // Never attach a JSON/SQL/network/Keystore cause or a value-bearing
      // assertEquals message to instrumentation/JUnit output.
      throw AssertionError("SUPPLEMENTAL_GATE_NOT_PASSED")
    }
  }
  private fun identity() {
    supplementalCheck(context.packageName == "com.nuri.app" && instrumentation.context.packageName == "com.nuri.app.test"
      && Process.myUid() == context.applicationInfo.uid && instrumentation.context.applicationInfo.uid != Process.myUid(), "PACKAGE_UID_MISMATCH")
    supplementalCheck(Build.VERSION.SDK_INT >= 28 && Application.getProcessName() == "com.nuri.app", "PROCESS_IDENTITY_MISMATCH")
    val manager = context.packageManager
    for (name in listOf("com.nuri.app", "com.nuri.app.test")) {
      val info = manager.getPackageInfo(name, PackageManager.GET_SIGNING_CERTIFICATES)
      val signers = info.signingInfo?.apkContentsSigners ?: throw SupplementalBlocked("SIGNER_MISSING")
      supplementalCheck(signers.size == 1, "SIGNER_MISMATCH")
      val hash = MessageDigest.getInstance("SHA-256").digest(signers.single().toByteArray()).joinToString("") { "%02x".format(it.toInt() and 255) }
      supplementalCheck(hash == "08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3", "SIGNER_MISMATCH")
    }
  }
  private fun hostGate() {
    val args = InstrumentationRegistry.getArguments()
    for (key in listOf("hostQuiescentVerified", "exclusiveUi", "hostBaselineVerified", "hostOriginalSelectionHeld", "hostExistingPetCountAtLeastOne"))
      supplementalCheck(args.getString(key) == "TRUE", "HOST_PREFLIGHT_REQUIRED")
  }
  private fun activityPresent(): Boolean {
    var present = true
    instrumentation.runOnMainSync {
      val monitor = ActivityLifecycleMonitorRegistry.getInstance()
      present = Stage.values().any { it != Stage.DESTROYED && monitor.getActivitiesInStage(it).isNotEmpty() }
    }
    return present
  }
  private fun install(guard: SupplementalGuard, filter: WalkPetDeleteResponseFilter) {
    guard.install(activityPresent())
    // Current MainApplication loads libraries only and has a lazy ReactHost.
    // The fresh default runner starts no Activity; this is before the sole
    // startActivitySync below, not a late replacement of a live RN singleton.
    OkHttpClientProvider.setOkHttpClientFactory(OkHttpClientFactory {
      guard.networkModuleCreated()
      OkHttpClientProvider.createClientBuilder(context).addInterceptor(filter).build()
    })
  }
  private fun launch() {
    supplementalCheck(!activityPresent(), "ACTIVITY_ALREADY_CREATED")
    instrumentation.startActivitySync(Intent().setClassName("com.nuri.app", "com.nuri.MainActivity").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }

  @Test fun auditMetadataOnly() = safe {
    supplementalCheck(!activityPresent(), "AUDIT_MUST_PRECEDE_ACTIVITY")
    val a = WalkReadOnlyJournalAudit(context).scan()
    status("METADATA_ONLY_AUDIT", a.publicCounts())
    a.requireEmpty()
    status("AUDIT_EMPTY_NO_UI_STARTED")
  }

  @Test fun phaseAHoldExactProductDeleteForHostKill() = safe {
    hostGate()
    supplementalCheck(!activityPresent(), "FACTORY_LATE_OR_DUPLICATE")
    val audit = WalkReadOnlyJournalAudit(context)
    val initial = audit.scan(); status("PHASE_A_INITIAL_AUDIT", initial.publicCounts()); initial.requireEmpty()
    audit.requireQuiescent()
    val manifest = SupplementalManifest(context)
    supplementalCheck(!manifest.exists(), "PRIOR_TEST_RUN_REQUIRES_REVIEW")
    val marker = "NQ" + ByteArray(6).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it.toInt() and 255) }
    manifest.save(JSONObject().put("version", 1).put("marker", marker).put("stage", "READY")
      .put("pidA", Process.myPid()).put("baseline", JSONArray(audit.fingerprints().toList())))
    val guard = SupplementalGuard(marker, approvedOrigin)
    val filter = WalkPetDeleteResponseFilter(guard, audit, manifest, recovery = false)
    install(guard, filter)
    try {
      status("PHASE_A_READY_NORMAL_UI_ONE_NEW_PET_ONLY", marker = marker)
      launch()
      val deadline = SystemClock.elapsedRealtime() + 900000
      var reportedHold = false
      var reportedFactory = false; var reportedPet = false; var reportedSession = false; var reportedResult = false
      while (SystemClock.elapsedRealtime() < deadline) {
        supplementalCheck(filter.fault == null, filter.fault ?: "PROBE_FAILED")
        if (guard.factoryObserved && !reportedFactory) { reportedFactory = true; status("NETWORK_PROBE_ATTACHED") }
        val saved = manifest.load()
        if (saved.has("pet") && !reportedPet) { reportedPet = true; status("PET_CREATED_BOUND_NO_CREDENTIAL_EXPORT") }
        if (saved.has("session") && !reportedSession) { reportedSession = true; status("ONE_SESSION_ID_BOUND") }
        if (saved.optBoolean("acceptedZero") && !reportedResult) { reportedResult = true; status("OWNED_SESSION_ACCEPTED_CANONICAL_ZERO_NO_MEMORY") }
        if (filter.held && !reportedHold) {
          audit.requireQuiescent(); manifest.requireBaseline(audit)
          audit.pendingFor(guard.binding ?: throw SupplementalBlocked("NO_BINDING"))
          supplementalCheck(manifest.load().getString("stage") == "REMOTE_SUCCESS_HELD", "HOLD_NOT_DURABLE")
          reportedHold = true
          status("REMOTE_SUCCESS_HELD_KILL_WINDOW_90_SECONDS", audit.scan().publicCounts())
        }
        SystemClock.sleep(200)
      }
      throw SupplementalBlocked("PHASE_A_HOST_KILL_NOT_OBSERVED")
    } finally {
      // This path is NOT reached on the intended physical kill. Any timeout
      // or instrumentation failure releases only the genuine held response.
      filter.close(); OkHttpClientProvider.setOkHttpClientFactory(null)
    }
  }

  @Test fun phaseBColdProductRecoveryObserveOnly() = safe {
    hostGate()
    supplementalCheck(!activityPresent(), "FACTORY_LATE_OR_DUPLICATE")
    val audit = WalkReadOnlyJournalAudit(context); audit.requireQuiescent()
    val manifest = SupplementalManifest(context); val prior = manifest.load()
    supplementalCheck(prior.getString("stage") == "REMOTE_SUCCESS_HELD" && prior.getInt("pidA") == prior.getInt("heldPid")
      && prior.getInt("heldPid") != Process.myPid() && prior.getBoolean("acceptedZero"), "REAL_KILL_HANDOFF_REQUIRED")
    val b = manifest.binding(prior)
    audit.requireKnownRecovery(b, prior)
    manifest.requireBaseline(audit)
    val guard = SupplementalGuard(b.marker, approvedOrigin)
    val filter = WalkPetDeleteResponseFilter(guard, audit, manifest, recovery = true)
    install(guard, filter); guard.restore(b); guard.session(prior.getString("session"), b.pet)
    try {
      status("PHASE_B_READY_SAME_NATIVE_JOURNAL_NO_DIRECT_RPC")
      launch()
      val deadline = SystemClock.elapsedRealtime() + 180000
      while (SystemClock.elapsedRealtime() < deadline) {
        supplementalCheck(filter.fault == null, filter.fault ?: "PROBE_FAILED")
        if (filter.recoveredFinal && filter.acknowledged) {
          val current = audit.scan()
          if (current.healthy() && current.facts.isEmpty()) {
            audit.requireQuiescent(); manifest.requireBaseline(audit)
            val result = manifest.load()
            supplementalCheck(result.getBoolean("nativeDoneObserved") && result.getBoolean("serverAckObserved"), "ACK_EVIDENCE_MISSING")
            manifest.update { it.put("stage", "PRODUCT_RECOVERY_OBSERVED").put("pidB", Process.myPid()) }
            status("PRODUCT_FINAL_NATIVE_DONE_SERVER_ACK_LOCAL_JOURNAL_REMOVED", current.publicCounts())
            // Retain the encrypted test-owned manifest for Master/09/12 review.
            // No product or test cleanup is automatically invoked here.
            return@safe
          }
        }
        SystemClock.sleep(250)
      }
      throw SupplementalBlocked("RECOVERY_PENDING_NO_PASS")
    } finally { filter.close(); OkHttpClientProvider.setOkHttpClientFactory(null) }
  }
}
