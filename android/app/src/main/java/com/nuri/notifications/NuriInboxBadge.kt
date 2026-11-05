package com.nuri.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.nuri.MainActivity

/** A real, silent inbox summary. Never uses launcher-private providers or
 * changes the user's permission/channel settings to force a number. */
internal object NuriInboxBadge {
  private const val REQUEST_KEY = "nuri_inbox"
  private const val TAG = "nuri_inbox_summary"
  private const val ID = 1
  private const val CHANNEL = "nuri_inbox_badge"

  @Synchronized fun sync(context: Context, owner: String, count: Int, observedAt: Long, validUntil: Long? = null): String {
    val prefs = context.getSharedPreferences(NuriPushModule.PREFS, Context.MODE_PRIVATE)
    if (prefs.getString("owner", null) != owner) return "owner-mismatch"
    if (observedAt < prefs.getLong("badge_observed_at", 0)) return "stale"
    if (validUntil != null && validUntil <= System.currentTimeMillis()) return "expired-snapshot"
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val sameCount = prefs.contains("badge_count") && prefs.getInt("badge_count", -1) == count
    if (count == 0) {
      prefs.edit().putInt("badge_count", count).putLong("badge_observed_at", observedAt).putBoolean("badge_summary_expected", false).apply()
      clearNotifications(context); return "cleared"
    }
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
      prefs.edit().remove("badge_count").apply(); return "permission-blocked"
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(NotificationChannel(CHANNEL, "알림함 미읽음 수", NotificationManager.IMPORTANCE_LOW).apply {
        description = "읽지 않은 알림 수를 앱 아이콘에 표시해요"
        setShowBadge(true)
      })
      if (manager.getNotificationChannel(CHANNEL)?.importance == NotificationManager.IMPORTANCE_NONE) {
        prefs.edit().remove("badge_count").apply(); return "channel-blocked"
      }
    }
    val existing = manager.activeNotifications.any { it.tag == TAG && it.id == ID }
    var represented = manager.activeNotifications.count { it.tag == "nuri_push" }
    // A normal OS push already contributes one item. Only the unread items not
    // represented by those pushes belong in this aggregate badge count.
    // If the inbox has fewer items, consolidate stale tray entries into the
    // canonical summary rather than retaining a larger, misleading badge.
    if (represented > count) {
      manager.activeNotifications.filter { it.tag == "nuri_push" }.forEach { manager.cancel(it.tag, it.id) }
      represented = 0
    }
    val remaining = count - represented
    if (remaining == 0) {
      manager.cancel(TAG, ID)
      prefs.edit().putInt("badge_count", count).putLong("badge_observed_at", observedAt).putBoolean("badge_summary_expected", false).apply()
      return "represented-by-notifications"
    }
    // A swipe dismisses this summary. Do not recreate it on every unchanged fetch.
    if (sameCount && !existing && prefs.getBoolean("badge_summary_expected", false)) return "dismissed"
    prefs.edit().putInt("badge_count", count).putLong("badge_observed_at", observedAt).apply()
    val intent = Intent(context, MainActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      .putExtra("nuri_push_tap", true).putExtra("recipientUserId", owner)
      .putExtra("notificationId", "inbox").putExtra("notificationSource", "inbox")
    val pending = PendingIntent.getActivity(context, REQUEST_KEY.hashCode(), intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val summary = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(com.nuri.R.mipmap.ic_launcher)
      .setContentTitle("읽지 않은 알림 ${count}개")
      .setContentText("알림함에서 확인해 주세요")
      .setContentIntent(pending).setNumber(remaining)
      .setSilent(true).setOnlyAlertOnce(true).setAutoCancel(false)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .apply { if (validUntil != null) setTimeoutAfter((validUntil - System.currentTimeMillis()).coerceAtLeast(1L)) }
      .build()
    return try {
      manager.notify(TAG, ID, summary)
      prefs.edit().putBoolean("badge_summary_expected", true).apply()
      "updated"
    }
      catch (_: SecurityException) { "permission-blocked" }
  }

  @Synchronized fun clearNotifications(context: Context) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.activeNotifications.filter { it.tag == TAG || it.tag == "nuri_push" }
      .forEach { manager.cancel(it.tag, it.id) }
  }
}
