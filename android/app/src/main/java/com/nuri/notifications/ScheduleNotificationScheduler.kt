package com.nuri.notifications

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.nuri.MainActivity
import com.nuri.R
import org.json.JSONObject
import java.util.Calendar
import java.util.UUID

object ScheduleNotificationScheduler {
  private const val PREFS_NAME = "nuri_schedule_notifications"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_SCHEDULED_IDS = "scheduled_ids"
  private const val KEY_ALARM_REGISTRY = "alarm_registry"
  private const val KEY_POSTED_REGISTRY = "posted_registry"

  const val CHANNEL_ID = "nuri_schedule_reminders"
  const val ACTION_FIRE = "com.nuri.notifications.SCHEDULE_REMINDER"
  const val EXTRA_ALARM_ID = "alarm_id"
  const val EXTRA_SCHEDULE_ID = "schedule_id"
  const val EXTRA_PET_ID = "pet_id"
  const val EXTRA_TITLE = "title"
  const val EXTRA_BODY = "body"
  const val EXTRA_REPEAT_RULE = "repeat_rule"
  const val EXTRA_FIRE_AT_MILLIS = "fire_at_millis"
  const val EXTRA_REGISTRATION_TOKEN = "registration_token"

  private val registryLock = Any()

  data class ScheduleResult(
    val status: String,
    val delivery: String,
    val errorCode: String? = null,
  )

  data class RuntimeCapabilities(
    val enabled: Boolean,
    val exactAlarm: String,
    val channel: String,
    val delivery: String,
    val canOpenExactAlarmSettings: Boolean,
  )

  private data class RegisteredAlarm(
    val scheduleId: String,
    val fireAtMillis: Long,
    val registrationToken: String,
  )

  fun isEnabled(context: Context): Boolean {
    synchronized(registryLock) {
      return prefs(context).getBoolean(KEY_ENABLED, true)
    }
  }

  fun setEnabled(context: Context, enabled: Boolean) {
    synchronized(registryLock) {
      prefs(context).edit().putBoolean(KEY_ENABLED, enabled).commit()
      if (!enabled) cancelAllLocked(context)
    }
  }

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = context.getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "NURI 일정 알림",
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      description = "병원, 약, 산책 등 저장한 일정 알림"
      enableVibration(true)
      lockscreenVisibility = Notification.VISIBILITY_PRIVATE
    }
    manager.createNotificationChannel(channel)
  }

  fun runtimeCapabilities(context: Context): RuntimeCapabilities {
    ensureChannel(context)
    val exactAlarm = exactAlarmStatus(context)
    return RuntimeCapabilities(
      enabled = isEnabled(context),
      exactAlarm = exactAlarm,
      channel = channelStatus(context),
      delivery = when (exactAlarm) {
        "granted", "not-required" -> "exact"
        "not-granted" -> "inexact"
        else -> "unknown"
      },
      canOpenExactAlarmSettings = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S,
    )
  }

  fun schedule(
    context: Context,
    alarmId: String,
    scheduleId: String,
    petId: String,
    title: String,
    body: String,
    fireAtMillis: Long,
    repeatRule: String,
  ): ScheduleResult {
    synchronized(registryLock) {
      // The registry replacement and PendingIntent creation must share the
      // same lock. Creating the new PendingIntent before cancelling the old
      // identity would let removeAlarmLocked() cancel the very PendingIntent
      // that is about to be handed to AlarmManager.
      return scheduleLocked(
        context = context,
        alarmId = alarmId,
        scheduleId = scheduleId,
        petId = petId,
        title = title,
        body = body,
        fireAtMillis = fireAtMillis,
        repeatRule = repeatRule,
      )
    }
  }

  private fun scheduleLocked(
    context: Context,
    alarmId: String,
    scheduleId: String,
    petId: String,
    title: String,
    body: String,
    fireAtMillis: Long,
    repeatRule: String,
  ): ScheduleResult {
    if (alarmId.isBlank() || scheduleId.isBlank()) {
      return ScheduleResult("unsupported", "unknown", "invalid-alarm-payload")
    }
    if (!isEnabled(context)) {
      cancelLocked(context, scheduleId)
      return ScheduleResult("disabled", "not-applicable")
    }
    if (fireAtMillis <= System.currentTimeMillis()) {
      cancelLocked(context, scheduleId)
      return ScheduleResult("skipped-past", "not-applicable")
    }

    ensureChannel(context)
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
      cancelLocked(context, scheduleId)
      return ScheduleResult("channel-blocked", "unknown", "notifications-disabled")
    }
    if (channelStatus(context) == "blocked") {
      cancelLocked(context, scheduleId)
      return ScheduleResult("channel-blocked", "unknown", "channel-blocked")
    }

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
      ?: return ScheduleResult("failed", "unknown", "alarm-manager-unavailable")
    val exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
    val delivery = if (exact) "exact" else "inexact"

    // Cancel the old alarm before creating the replacement PendingIntent.
    removeAlarmLocked(context, alarmId, cancelPostedNotification = false)

    val registrationToken = UUID.randomUUID().toString()
    val intent = buildReminderIntent(
      context = context,
      alarmId = alarmId,
      scheduleId = scheduleId,
      petId = petId,
      title = title,
      body = body,
      fireAtMillis = fireAtMillis,
      repeatRule = repeatRule,
      registrationToken = registrationToken,
    )
    val pendingIntent = PendingIntent.getBroadcast(
      context,
      requestCode(alarmId),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val registry = alarmRegistry(context).toMutableMap()
    registry[alarmId] = RegisteredAlarm(scheduleId, fireAtMillis, registrationToken)
    val scheduled = scheduledIds(context).toMutableSet().apply { add(alarmId) }
    if (!persistStateLocked(context, scheduled, registry, postedRegistry(context))) {
      return ScheduleResult("failed", delivery, "alarm-registry-write-failed")
    }

    try {
      when {
        exact && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ->
          alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            fireAtMillis,
            pendingIntent,
          )
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ->
          alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            fireAtMillis,
            pendingIntent,
          )
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT ->
          alarmManager.setExact(
            AlarmManager.RTC_WAKEUP,
            fireAtMillis,
            pendingIntent,
          )
        else ->
          alarmManager.set(
            AlarmManager.RTC_WAKEUP,
            fireAtMillis,
            pendingIntent,
          )
      }
    } catch (error: SecurityException) {
      removeAlarmLocked(context, alarmId, cancelPostedNotification = false)
      return ScheduleResult("failed", delivery, error.javaClass.simpleName)
    } catch (error: RuntimeException) {
      removeAlarmLocked(context, alarmId, cancelPostedNotification = false)
      return ScheduleResult("failed", delivery, error.javaClass.simpleName)
    }

    return ScheduleResult("scheduled", delivery)
  }

  fun cancel(context: Context, scheduleIdOrPrefix: String) {
    synchronized(registryLock) {
      cancelLocked(context, scheduleIdOrPrefix)
    }
  }

  private fun cancelLocked(context: Context, scheduleIdOrPrefix: String) {
    val registry = alarmRegistry(context)
    val registeredIds = registry
      .filter { (alarmId, registration) ->
        alarmId == scheduleIdOrPrefix ||
          alarmId.startsWith("${scheduleIdOrPrefix}::") ||
          registration.scheduleId == scheduleIdOrPrefix
      }
      .keys
    val legacyIds = scheduledIds(context).filter { alarmId ->
      alarmId == scheduleIdOrPrefix || alarmId.startsWith("${scheduleIdOrPrefix}::")
    }
    (registeredIds + legacyIds).toSet().forEach { alarmId ->
      removeAlarmLocked(context, alarmId, cancelPostedNotification = true)
    }

    val posted = postedRegistry(context).toMutableMap()
    val notificationManager = context.getSystemService(NotificationManager::class.java)
    posted
      .filterValues { it == scheduleIdOrPrefix }
      .keys
      .forEach { notificationId ->
        notificationManager.cancel(notificationId.toInt())
        posted.remove(notificationId)
      }
    persistStateLocked(context, scheduledIds(context), alarmRegistry(context), posted)
  }

  fun cancelAll(context: Context): ScheduleResult {
    synchronized(registryLock) {
      return try {
        if (cancelAllLocked(context)) {
          ScheduleResult("cleared", "not-applicable")
        } else {
          ScheduleResult("failed", "not-applicable", "alarm-registry-write-failed")
        }
      } catch (error: RuntimeException) {
        ScheduleResult("failed", "not-applicable", error.javaClass.simpleName)
      }
    }
  }

  private fun cancelAllLocked(context: Context): Boolean {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
    val notificationManager = context.getSystemService(NotificationManager::class.java)
    val alarmIds = (scheduledIds(context) + alarmRegistry(context).keys).toSet()
    alarmIds.forEach { alarmId ->
      val intent = Intent(context, ScheduleNotificationReceiver::class.java).apply {
        action = ACTION_FIRE
      }
      val pendingIntent = PendingIntent.getBroadcast(
        context,
        requestCode(alarmId),
        intent,
        PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
      )
      if (pendingIntent != null) {
        alarmManager?.cancel(pendingIntent)
        pendingIntent.cancel()
      }
    }
    alarmRegistry(context).keys.forEach { alarmId ->
      // Remove any notification for registrations that predate the posted
      // registry, while the explicit posted registry below covers current data.
      notificationManager.cancel(notificationId(alarmId))
    }
    postedRegistry(context).keys.forEach { notificationId ->
      notificationManager.cancel(notificationId.toInt())
    }
    return persistStateLocked(context, emptySet(), emptyMap(), emptyMap())
  }

  /**
   * Delivers one alarm while holding the registry lock for the complete
   * verify -> post -> repeat/consume transaction. This prevents a stale
   * receiver from resurrecting an edited or disabled schedule.
   */
  fun handleAlarm(context: Context, intent: Intent) {
    if (intent.action != ACTION_FIRE) return

    synchronized(registryLock) {
      if (!isEnabled(context)) return
      if (!isRegisteredForIntentLocked(context, intent)) return

      val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return
      val scheduleId = intent.getStringExtra(EXTRA_SCHEDULE_ID) ?: return
      val petId = intent.getStringExtra(EXTRA_PET_ID) ?: ""
      val title = intent.getStringExtra(EXTRA_TITLE) ?: "일정 알림"
      val body = intent.getStringExtra(EXTRA_BODY)
        ?: "$title 일정 시간이 다가오고 있어요."
      val repeatRule = intent.getStringExtra(EXTRA_REPEAT_RULE) ?: "none"
      val fireAtMillis = intent.getLongExtra(EXTRA_FIRE_AT_MILLIS, 0L)

      val posted = postNotificationLocked(context, intent)
      if (!posted) {
        // Never reschedule after a failed or blocked delivery. The current
        // registration is consumed so a stale receiver cannot revive it.
        removeAlarmLocked(context, alarmId, cancelPostedNotification = false)
        return
      }

      val nextFireAt = nextRepeatFireAt(fireAtMillis, repeatRule)
      if (nextFireAt == null) {
        // Keep the posted notification tracked, but consume the future alarm.
        removeAlarmLocked(context, alarmId, cancelPostedNotification = false)
        return
      }

      // scheduleLocked replaces this registration under the same lock. If
      // the replacement cannot be registered, it leaves no live alarm.
      scheduleLocked(
        context = context,
        alarmId = alarmId,
        scheduleId = scheduleId,
        petId = petId,
        title = title,
        body = body,
        fireAtMillis = nextFireAt,
        repeatRule = repeatRule,
      )
    }
  }

  private fun isRegisteredForIntentLocked(context: Context, intent: Intent): Boolean {
    val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return false
    val scheduleId = intent.getStringExtra(EXTRA_SCHEDULE_ID) ?: return false
    val token = intent.getStringExtra(EXTRA_REGISTRATION_TOKEN) ?: return false
    val fireAtMillis = intent.getLongExtra(EXTRA_FIRE_AT_MILLIS, 0L)

    val registration = alarmRegistry(context)[alarmId] ?: return false
    return registration.scheduleId == scheduleId &&
      registration.registrationToken == token &&
      registration.fireAtMillis == fireAtMillis
  }

  private fun postNotificationLocked(context: Context, intent: Intent): Boolean {
    val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return false
    val scheduleId = intent.getStringExtra(EXTRA_SCHEDULE_ID) ?: return false
    val petId = intent.getStringExtra(EXTRA_PET_ID) ?: ""
    val title = intent.getStringExtra(EXTRA_TITLE) ?: "일정 알림"
    val body = intent.getStringExtra(EXTRA_BODY) ?: "$title 일정 시간이 다가오고 있어요."

    if (!isEnabled(context) ||
      !NotificationManagerCompat.from(context).areNotificationsEnabled()
    ) {
      return false
    }

    ensureChannel(context)
    if (channelStatus(context) == "blocked") return false

    val manager = context.getSystemService(NotificationManager::class.java)
    return try {
      manager.notify(
        notificationId(alarmId),
        buildNotification(context, alarmId, scheduleId, petId, title, body),
      )

      val posted = postedRegistry(context).toMutableMap()
      posted[notificationId(alarmId).toString()] = scheduleId
      if (persistStateLocked(context, scheduledIds(context), alarmRegistry(context), posted)) {
        true
      } else {
        manager.cancel(notificationId(alarmId))
        false
      }
    } catch (_: SecurityException) {
      false
    } catch (_: RuntimeException) {
      false
    }
  }

  fun nextRepeatFireAt(fireAtMillis: Long, repeatRule: String): Long? {
    val field = when (repeatRule) {
      "daily" -> Calendar.DAY_OF_YEAR
      "weekly" -> Calendar.WEEK_OF_YEAR
      "monthly" -> Calendar.MONTH
      "yearly" -> Calendar.YEAR
      else -> return null
    }

    val calendar = Calendar.getInstance().apply { timeInMillis = fireAtMillis }
    val now = System.currentTimeMillis()
    while (calendar.timeInMillis <= now) calendar.add(field, 1)
    return calendar.timeInMillis
  }

  fun buildReminderIntent(
    context: Context,
    alarmId: String,
    scheduleId: String,
    petId: String,
    title: String,
    body: String,
    fireAtMillis: Long,
    repeatRule: String,
    registrationToken: String = "",
  ): Intent {
    return Intent(context, ScheduleNotificationReceiver::class.java).apply {
      action = ACTION_FIRE
      putExtra(EXTRA_ALARM_ID, alarmId)
      putExtra(EXTRA_SCHEDULE_ID, scheduleId)
      putExtra(EXTRA_PET_ID, petId)
      putExtra(EXTRA_TITLE, title)
      putExtra(EXTRA_BODY, body)
      putExtra(EXTRA_FIRE_AT_MILLIS, fireAtMillis)
      putExtra(EXTRA_REPEAT_RULE, repeatRule)
      putExtra(EXTRA_REGISTRATION_TOKEN, registrationToken)
    }
  }

  fun requestCode(alarmId: String): Int = alarmId.hashCode()

  private fun buildNotification(
    context: Context,
    alarmId: String,
    scheduleId: String,
    petId: String,
    title: String,
    body: String,
  ): Notification {
    val openIntent = Intent(context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra("type", "schedule")
      putExtra("scheduleId", scheduleId)
      putExtra("petId", petId)
      putExtra("alarmId", alarmId)
    }
    val openPendingIntent = PendingIntent.getActivity(
      context,
      requestCode("${alarmId}:open"),
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val publicVersion = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("NURI 일정 알림")
      .setContentText("저장한 일정 시간이 다가오고 있어요.")
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .build()

    return NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .setPublicVersion(publicVersion)
      .setContentIntent(openPendingIntent)
      .setAutoCancel(true)
      .setOngoing(false)
      .setOnlyAlertOnce(false)
      .build()
  }

  private fun removeAlarmLocked(
    context: Context,
    alarmId: String,
    cancelPostedNotification: Boolean,
  ) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
    val notificationManager = context.getSystemService(NotificationManager::class.java)
    val intent = Intent(context, ScheduleNotificationReceiver::class.java).apply {
      action = ACTION_FIRE
    }
    val pendingIntent = PendingIntent.getBroadcast(
      context,
      requestCode(alarmId),
      intent,
      PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
    )
    if (pendingIntent != null) {
      alarmManager?.cancel(pendingIntent)
      pendingIntent.cancel()
    }

    val scheduled = scheduledIds(context).toMutableSet().apply { remove(alarmId) }
    val registry = alarmRegistry(context).toMutableMap().apply { remove(alarmId) }
    val posted = postedRegistry(context).toMutableMap()
    if (cancelPostedNotification) {
      val id = notificationId(alarmId).toString()
      notificationManager.cancel(notificationId(alarmId))
      posted.remove(id)
    }
    persistStateLocked(context, scheduled, registry, posted)
  }

  private fun channelStatus(context: Context): String {
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return "blocked"
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return "not-required"
    val channel = context.getSystemService(NotificationManager::class.java)
      .getNotificationChannel(CHANNEL_ID)
      ?: return "missing"
    return if (channel.importance == NotificationManager.IMPORTANCE_NONE) "blocked" else "ready"
  }

  private fun exactAlarmStatus(context: Context): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return "not-required"
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
      ?: return "unsupported"
    return if (alarmManager.canScheduleExactAlarms()) "granted" else "not-granted"
  }

  fun exactAlarmSettingsIntent(context: Context): Intent? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return null
    return Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
      data = Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
  }

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  private fun scheduledIds(context: Context): Set<String> =
    prefs(context).getStringSet(KEY_SCHEDULED_IDS, emptySet())?.toSet() ?: emptySet()

  private fun alarmRegistry(context: Context): Map<String, RegisteredAlarm> {
    val raw = prefs(context).getString(KEY_ALARM_REGISTRY, null) ?: return emptyMap()
    val json = runCatching { JSONObject(raw) }.getOrNull() ?: return emptyMap()
    return json.keys().asSequence().mapNotNull { alarmId ->
      val value = json.optJSONObject(alarmId) ?: return@mapNotNull null
      val scheduleId = value.optString("scheduleId")
      val token = value.optString("registrationToken")
      if (scheduleId.isBlank() || token.isBlank()) return@mapNotNull null
      alarmId to RegisteredAlarm(
        scheduleId = scheduleId,
        fireAtMillis = value.optLong("fireAtMillis", 0L),
        registrationToken = token,
      )
    }.toMap()
  }

  private fun postedRegistry(context: Context): Map<String, String> {
    val raw = prefs(context).getString(KEY_POSTED_REGISTRY, null) ?: return emptyMap()
    val json = runCatching { JSONObject(raw) }.getOrNull() ?: return emptyMap()
    return json.keys().asSequence().mapNotNull { notificationId ->
      val scheduleId = json.optString(notificationId)
      if (scheduleId.isBlank()) null else notificationId to scheduleId
    }.toMap()
  }

  private fun persistStateLocked(
    context: Context,
    scheduled: Set<String>,
    registry: Map<String, RegisteredAlarm>,
    posted: Map<String, String>,
  ): Boolean {
    val alarmJson = JSONObject()
    registry.forEach { (alarmId, value) ->
      alarmJson.put(
        alarmId,
        JSONObject()
          .put("scheduleId", value.scheduleId)
          .put("fireAtMillis", value.fireAtMillis)
          .put("registrationToken", value.registrationToken),
      )
    }
    val postedJson = JSONObject()
    posted.forEach { (notificationId, scheduleId) -> postedJson.put(notificationId, scheduleId) }

    return prefs(context).edit()
      .putStringSet(KEY_SCHEDULED_IDS, scheduled)
      .putString(KEY_ALARM_REGISTRY, alarmJson.toString())
      .putString(KEY_POSTED_REGISTRY, postedJson.toString())
      .commit()
  }

  private fun notificationId(alarmId: String): Int = requestCode(alarmId)
}
