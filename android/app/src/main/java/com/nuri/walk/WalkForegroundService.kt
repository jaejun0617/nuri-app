package com.nuri.walk

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.nuri.MainActivity
import com.nuri.R
import com.nuri.BuildConfig
import java.util.UUID
import java.io.FileDescriptor
import java.io.PrintWriter
import java.security.MessageDigest
import org.json.JSONObject

class WalkForegroundService : Service(), WalkServiceHandle {
  private val handler = Handler(Looper.getMainLooper())
  private var ending = false
  private var startupError: String? = null
  private var qaReceipt = "{}"
  private val tick = object : Runnable {
    override fun run() { if (!ending) { WalkRuntime.get(this@WalkForegroundService).checkpoint(); handler.postDelayed(this, 5000) } }
  }
  override fun onCreate() {
    super.onCreate()
    try {
      if (Build.VERSION.SDK_INT >= 26) {
        getSystemService(NotificationManager::class.java).createNotificationChannel(
          NotificationChannel(CHANNEL, "산책 기록", NotificationManager.IMPORTANCE_LOW).apply { setShowBadge(false) })
      }
      // No Room/key/JS work before the platform's foreground deadline.
      ServiceCompat.startForeground(this, NOTIFICATION_ID, notification("STARTING", 0, null, 0),
        if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0)
      handler.post(tick)
    } catch (_: Exception) { startupError = "WALK_NOTIFICATION_SETUP_FAILED"; end() }
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (ending || intent == null) {
      intent?.getStringExtra("command")?.let { WalkRuntime.get(this).activationDenied(it, startupError ?: "WALK_FGS_START_NOT_ALLOWED") }
      end(); return START_NOT_STICKY
    }
    val session = intent.getStringExtra("session") ?: run { end(); return START_NOT_STICKY }
    val command = intent.getStringExtra("command") ?: run { end(); return START_NOT_STICKY }
    if (intent.action == START) WalkRuntime.get(this).attach(this, session, command)
    else if (intent.action == PAUSE || intent.action == RESUME) {
      val revision = intent.getStringExtra("revision") ?: return START_NOT_STICKY
      WalkRuntime.get(this).notificationCommand(if (intent.action == PAUSE) "PAUSE" else "RESUME", session, command, revision
      ) { _, _ -> /* Stable stale action denial; never log payloads. */ }
    }
    return START_NOT_STICKY
  }
  private fun notification(state: String, activeMs: Long, session: String?, revision: Long): Notification {
    val open = PendingIntent.getActivity(this, 401,
      Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val builder = NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(R.mipmap.ic_launcher).setContentTitle(if (state == "PAUSED") "산책 일시정지" else "산책 기록 중")
      .setContentText("${activeMs / 60000}분").setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE).setSilent(true)
    if (session != null && (state == "WALKING" || state == "PAUSED")) {
      val action = if (state == "WALKING") PAUSE else RESUME
      val pending = PendingIntent.getService(this, 402, Intent(this, WalkForegroundService::class.java).apply {
        this.action = action
        data = Uri.parse("nuri-walk-action://$session/$revision/$action")
        putExtra("session", session); putExtra("command", UUID.randomUUID().toString()); putExtra("revision", revision.toString())
      }, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      builder.addAction(0, if (state == "WALKING") "일시정지" else "재개", pending)
    }
    return builder.build()
  }
  override fun refresh(state: String, activeMs: Long, sessionId: String, revision: Long, fixCount: Long, chunkCount: Long) {
    if (BuildConfig.NURI_SECURITY_QA) {
      qaReceipt = JSONObject().apply {
        put("sessionReceipt", MessageDigest.getInstance("SHA-256").digest(sessionId.toByteArray()).joinToString("") { "%02x".format(it) })
        put("state", state); put("revision", revision.toString()); put("activeMs", activeMs.toString())
        put("fixCount", fixCount.toString()); put("chunks", chunkCount.toString())
      }.toString()
    }
    if (!ending) try { getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification(state, activeMs, sessionId, revision)) }
      catch (_: RuntimeException) { end() }
  }
  // Read-only, build-gated device receipt. No location, owner, pet or private path.
  override fun dump(fd: FileDescriptor, writer: PrintWriter, args: Array<out String>) {
    writer.println(if (BuildConfig.NURI_SECURITY_QA) "NURI_WALK_QA:$qaReceipt" else "NURI_WALK_QA_DISABLED")
  }
  override fun end() {
    if (ending) return
    ending = true; handler.removeCallbacks(tick)
    stopForeground(STOP_FOREGROUND_REMOVE); stopSelf()
  }
  override fun onDestroy() {
    handler.removeCallbacks(tick)
    WalkRuntime.get(this).serviceLost(this)
    super.onDestroy()
  }
  override fun onBind(intent: Intent?): IBinder? = null
  companion object {
    const val START = "com.nuri.walk.START"
    const val PAUSE = "com.nuri.walk.PAUSE"
    const val RESUME = "com.nuri.walk.RESUME"
    private const val CHANNEL = "nuri_walk_location_v1"
    private const val NOTIFICATION_ID = 14021
  }
}
