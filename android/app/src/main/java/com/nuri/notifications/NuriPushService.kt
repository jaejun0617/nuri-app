package com.nuri.notifications

import android.app.ActivityOptions
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.window.SplashScreen
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.nuri.MainActivity
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

class NuriPushService : FirebaseMessagingService() {
  override fun onNewToken(token: String) {
    // JS requests the current token on every opted-in foreground resume as well.
    // Do not persist a raw token or bind it to a stale account here.
    NuriPushModule.emit("NuriPushTokenChanged", emptyMap())
  }
  override fun onMessageReceived(message: RemoteMessage) {
    val data = message.data
    val owner = getSharedPreferences(NuriPushModule.PREFS, Context.MODE_PRIVATE).getString("owner", null) ?: return
    if (data["recipientUserId"] != owner) return
    val id = data["notificationId"] ?: return
    try { UUID.fromString(id) } catch (_: IllegalArgumentException) { return }
    val source = data["notificationSource"] ?: return
    val category = data["category"] ?: return
    if (source !in listOf("user", "announcement") || category !in categories) return
    val expiry = try { SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC"); isLenient = false }.parse(data["expiresAt"] ?: return)?.time ?: return } catch (_: Exception) { return }
    if (expiry <= System.currentTimeMillis()) return
    NuriPushModule.emit("NuriPushReceived", mapOf("recipientUserId" to owner))
    if (NuriPushModule.foreground) return // No foreground system/banner double.
    if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return
    channels(this)
    val intent = Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      .putExtra("nuri_push_tap", true).putExtra("recipientUserId", owner).putExtra("notificationId", id).putExtra("notificationSource", source)
    // Notification launches may otherwise request a solid-color starting window.
    // This changes only the cold-start style, not warm routing or background privileges.
    val launchOptions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ActivityOptions.makeBasic().setSplashScreenStyle(SplashScreen.SPLASH_SCREEN_STYLE_ICON).toBundle()
    } else null
    val pending = PendingIntent.getActivity(this, (source + id).hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE, launchOptions)
    val notification = NotificationCompat.Builder(this, "nuri_$category")
      .setSmallIcon(com.nuri.R.mipmap.ic_launcher)
      .setContentTitle(data["title"]?.take(150) ?: "누리 알림")
      .setContentText(data["body"]?.take(180) ?: "새로운 알림이 도착했어요")
      .setContentIntent(pending).setAutoCancel(true).setOnlyAlertOnce(true)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build()
    val group = data["collapseGroup"]?.takeIf { it.matches(Regex("^[a-zA-Z0-9:_-]{1,100}$")) } ?: (source + id)
    try { NotificationManagerCompat.from(this).notify("nuri_push", group.hashCode(), notification) } catch (_: SecurityException) { }
  }
  companion object {
    val categories = listOf("news", "community", "activity", "record")
    fun channels(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val names = mapOf("news" to "누리 소식", "community" to "커뮤니티", "activity" to "칭호·레벨", "record" to "기록·회고")
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      categories.forEach { manager.createNotificationChannel(NotificationChannel("nuri_$it", names[it], NotificationManager.IMPORTANCE_DEFAULT)) }
    }
  }
}
