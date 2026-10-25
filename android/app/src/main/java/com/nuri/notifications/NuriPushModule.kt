@file:Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
package com.nuri.notifications

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.firebase.messaging.FirebaseMessaging
import java.util.UUID

/** Native stores only the opt-in owner, never a server key or notification body. */
class NuriPushModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), LifecycleEventListener {
  init { instance = this; context.addLifecycleEventListener(this) }
  override fun getName() = "NuriPushNotifications"
  override fun onHostResume() { foreground = true }
  override fun onHostPause() { foreground = false }
  override fun onHostDestroy() { foreground = false }
  override fun invalidate() { context.removeLifecycleEventListener(this); if (instance === this) instance = null; super.invalidate() }
  @ReactMethod fun addListener(name: String) = Unit
  @ReactMethod fun removeListeners(count: Int) = Unit

  @ReactMethod fun getToken(promise: Promise) {
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) { promise.resolve(null); return }
    FirebaseMessaging.getInstance().token.addOnSuccessListener { promise.resolve(it) }
      .addOnFailureListener { promise.reject("NURI_PUSH_TOKEN_UNAVAILABLE", "Push token is unavailable") }
  }
  @ReactMethod fun bindOwner(owner: String, promise: Promise) {
    try { UUID.fromString(owner) } catch (_: IllegalArgumentException) { promise.reject("NURI_PUSH_OWNER_INVALID", "Invalid owner"); return }
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("owner", owner).apply()
    FirebaseMessaging.getInstance().isAutoInitEnabled = true
    NuriPushService.channels(context)
    promise.resolve(true)
  }
  @ReactMethod fun clearOwner(expectedOwner: String?, promise: Promise) {
    val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (expectedOwner != null && preferences.getString("owner", null) != expectedOwner) { promise.resolve(false); return }
    preferences.edit().clear().apply()
    pendingTap = null
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.activeNotifications.filter { it.tag == "nuri_push" }.forEach { manager.cancel("nuri_push", it.id) }
    FirebaseMessaging.getInstance().isAutoInitEnabled = false
    promise.resolve(true)
  }
  @ReactMethod fun consumeInitialTap(promise: Promise) {
    val tap = pendingTap; pendingTap = null
    promise.resolve(tap?.let { Arguments.createMap().apply { it.forEach { (key, value) -> putString(key, value) } } })
  }
  @ReactMethod fun getChannelStates(promise: Promise) {
    NuriPushService.channels(context)
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    promise.resolve(Arguments.createMap().apply {
      NuriPushService.categories.forEach { putBoolean(it, Build.VERSION.SDK_INT < Build.VERSION_CODES.O || manager.getNotificationChannel("nuri_$it")?.importance != NotificationManager.IMPORTANCE_NONE) }
    })
  }
  companion object {
    const val PREFS = "nuri.push.v3"
    @Volatile var foreground = false
    @Volatile private var instance: NuriPushModule? = null
    @Volatile private var pendingTap: Map<String, String>? = null
    fun emit(name: String, data: Map<String, String>) {
      val current = instance ?: return
      if (!current.context.hasActiveReactInstance()) return
      current.context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name,
        Arguments.createMap().apply { data.forEach { (key, value) -> putString(key, value) } })
    }
    fun capture(context: Context, intent: Intent?) {
      if (intent?.getBooleanExtra("nuri_push_tap", false) != true) return
      val owner = intent.getStringExtra("recipientUserId") ?: return
      val id = intent.getStringExtra("notificationId") ?: return
      val source = intent.getStringExtra("notificationSource") ?: return
      intent.removeExtra("nuri_push_tap")
      if (context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("owner", null) != owner) return
      try { UUID.fromString(owner); UUID.fromString(id) } catch (_: IllegalArgumentException) { return }
      if (source !in listOf("user", "announcement")) return
      val tap = mapOf("recipientUserId" to owner, "id" to id, "source" to source)
      pendingTap = tap
      emit("NuriPushTap", tap)
    }
  }
}
