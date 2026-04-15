package com.nuri.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ScheduleNotificationReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (!ScheduleNotificationScheduler.isEnabled(context)) return

    val alarmId = intent.getStringExtra(ScheduleNotificationScheduler.EXTRA_ALARM_ID)
      ?: return
    val scheduleId = intent.getStringExtra(ScheduleNotificationScheduler.EXTRA_SCHEDULE_ID)
      ?: return
    val petId = intent.getStringExtra(ScheduleNotificationScheduler.EXTRA_PET_ID) ?: ""
    val title = intent.getStringExtra(ScheduleNotificationScheduler.EXTRA_TITLE)
      ?: "일정 알림"
    val body = intent.getStringExtra(ScheduleNotificationScheduler.EXTRA_BODY)
      ?: "$title 일정 시간이 다가오고 있어요."
    val repeatRule = intent.getStringExtra(ScheduleNotificationScheduler.EXTRA_REPEAT_RULE)
      ?: "none"
    val fireAtMillis = intent.getLongExtra(
      ScheduleNotificationScheduler.EXTRA_FIRE_AT_MILLIS,
      0L,
    )

    ScheduleNotificationScheduler.ensureChannel(context)
    ScheduleAlarmRingingService.start(
      context = context,
      scheduleId = scheduleId,
      petId = petId,
      title = title,
      body = body,
    )

    val nextFireAt = ScheduleNotificationScheduler.nextRepeatFireAt(
      fireAtMillis = fireAtMillis,
      repeatRule = repeatRule,
    )
    if (nextFireAt != null) {
      ScheduleNotificationScheduler.schedule(
        context = context,
        alarmId = alarmId,
        scheduleId = scheduleId,
        petId = petId,
        title = title,
        body = body,
        fireAtMillis = nextFireAt,
        repeatRule = repeatRule,
      )
    } else {
      ScheduleNotificationScheduler.cancel(context, alarmId)
    }
  }
}
