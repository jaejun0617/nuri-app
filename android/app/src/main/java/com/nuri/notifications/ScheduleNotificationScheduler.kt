package com.nuri.notifications

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

object ScheduleNotificationScheduler {
  private const val PREFS_NAME = "nuri_schedule_notifications"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_SCHEDULED_IDS = "scheduled_ids"

  const val CHANNEL_ID = "nuri_schedule_reminders"
  const val ACTION_FIRE = "com.nuri.notifications.SCHEDULE_REMINDER"
  const val EXTRA_ALARM_ID = "alarm_id"
  const val EXTRA_SCHEDULE_ID = "schedule_id"
  const val EXTRA_PET_ID = "pet_id"
  const val EXTRA_TITLE = "title"
  const val EXTRA_BODY = "body"
  const val EXTRA_REPEAT_RULE = "repeat_rule"
  const val EXTRA_FIRE_AT_MILLIS = "fire_at_millis"

  fun isEnabled(context: Context): Boolean {
    return prefs(context).getBoolean(KEY_ENABLED, true)
  }

  fun setEnabled(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
    if (!enabled) {
      cancelAll(context)
      ScheduleAlarmRingingService.stop(context)
    }
  }

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = context.getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      CHANNEL_ID,
      "NURI 일정 알림",
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      description = "병원, 약, 산책 등 저장한 일정 알림"
    }
    manager.createNotificationChannel(channel)
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
  ): String {
    if (!isEnabled(context)) {
      cancel(context, scheduleId)
      return "disabled"
    }

    if (fireAtMillis <= System.currentTimeMillis()) {
      cancel(context, scheduleId)
      return "skipped-past"
    }

    ensureChannel(context)
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val intent = buildReminderIntent(
      context = context,
      alarmId = alarmId,
      scheduleId = scheduleId,
      petId = petId,
      title = title,
      body = body,
      fireAtMillis = fireAtMillis,
      repeatRule = repeatRule,
    )
    val pendingIntent = PendingIntent.getBroadcast(
      context,
      requestCode(alarmId),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      if (alarmManager.canScheduleExactAlarms()) {
        alarmManager.setExactAndAllowWhileIdle(
          AlarmManager.RTC_WAKEUP,
          fireAtMillis,
          pendingIntent,
        )
      } else {
        alarmManager.setAndAllowWhileIdle(
          AlarmManager.RTC_WAKEUP,
          fireAtMillis,
          pendingIntent,
        )
      }
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setExactAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP,
        fireAtMillis,
        pendingIntent,
      )
    } else {
      alarmManager.set(
        AlarmManager.RTC_WAKEUP,
        fireAtMillis,
        pendingIntent,
      )
    }

    rememberScheduledId(context, alarmId)
    return "scheduled"
  }

  fun cancel(context: Context, scheduleIdOrPrefix: String) {
    ScheduleAlarmRingingService.stop(context, scheduleIdOrPrefix)

    val targetAlarmIds =
      scheduledIds(context).filter { alarmId ->
        alarmId == scheduleIdOrPrefix || alarmId.startsWith("${scheduleIdOrPrefix}::")
      }

    if (targetAlarmIds.isEmpty()) {
      cancelExact(context, scheduleIdOrPrefix)
      return
    }

    targetAlarmIds.forEach { alarmId ->
      cancelExact(context, alarmId)
    }
  }

  private fun cancelExact(context: Context, alarmId: String) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
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
      alarmManager.cancel(pendingIntent)
      pendingIntent.cancel()
    }
    forgetScheduledId(context, alarmId)
  }

  fun cancelAll(context: Context) {
    ScheduleAlarmRingingService.stop(context)
    scheduledIds(context).forEach { alarmId ->
      cancelExact(context, alarmId)
    }
    prefs(context).edit().putStringSet(KEY_SCHEDULED_IDS, emptySet()).apply()
  }

  fun nextRepeatFireAt(fireAtMillis: Long, repeatRule: String): Long? {
    val field = when (repeatRule) {
      "daily" -> Calendar.DAY_OF_YEAR
      "weekly" -> Calendar.WEEK_OF_YEAR
      "monthly" -> Calendar.MONTH
      "yearly" -> Calendar.YEAR
      else -> return null
    }

    val calendar = Calendar.getInstance().apply {
      timeInMillis = fireAtMillis
    }
    val now = System.currentTimeMillis()
    while (calendar.timeInMillis <= now) {
      calendar.add(field, 1)
    }
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
    }
  }

  fun requestCode(alarmId: String): Int {
    return alarmId.hashCode()
  }

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  private fun scheduledIds(context: Context): Set<String> {
    return prefs(context).getStringSet(KEY_SCHEDULED_IDS, emptySet()) ?: emptySet()
  }

  private fun rememberScheduledId(context: Context, alarmId: String) {
    val next = scheduledIds(context).toMutableSet().apply {
      add(alarmId)
    }
    prefs(context).edit().putStringSet(KEY_SCHEDULED_IDS, next).apply()
  }

  private fun forgetScheduledId(context: Context, alarmId: String) {
    val next = scheduledIds(context).toMutableSet().apply {
      remove(alarmId)
    }
    prefs(context).edit().putStringSet(KEY_SCHEDULED_IDS, next).apply()
  }
}
