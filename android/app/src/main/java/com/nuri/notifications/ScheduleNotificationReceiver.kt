package com.nuri.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ScheduleNotificationReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // Verification, notification posting, and repeat/one-shot consumption
    // are serialized inside the scheduler so edits, cancellation, and
    // notification-off cannot race a queued BroadcastReceiver.
    ScheduleNotificationScheduler.handleAlarm(context, intent)
  }
}
