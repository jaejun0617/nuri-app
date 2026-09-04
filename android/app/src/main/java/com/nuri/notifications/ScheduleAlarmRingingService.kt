package com.nuri.notifications

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.nuri.MainActivity
import com.nuri.R

/** Owns user-stopped vibration, never future scheduling or authentication. */
class ScheduleAlarmRingingService : Service() {
  private val settingsReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      synchronized(lock) { refreshLocked(this@ScheduleAlarmRingingService) }
    }
  }

  override fun onCreate() {
    super.onCreate()
    ContextCompat.registerReceiver(
      this,
      settingsReceiver,
      IntentFilter().apply {
        addAction(AudioManager.RINGER_MODE_CHANGED_ACTION)
        addAction(NotificationManager.ACTION_INTERRUPTION_FILTER_CHANGED)
        addAction(NotificationManager.ACTION_NOTIFICATION_CHANNEL_BLOCK_STATE_CHANGED)
        addAction(NotificationManager.ACTION_APP_BLOCK_STATE_CHANGED)
      },
      ContextCompat.RECEIVER_NOT_EXPORTED,
    )
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    synchronized(lock) {
      if (intent?.action != ACTION_START || state.active.isEmpty()) {
        // A queued start can arrive after Stop/cancelAll. It must not revive ringing.
        if (state.active.isEmpty()) stopSelfResult(startId)
        return START_NOT_STICKY
      }
      runningService = this
      refreshLocked(this)
    }
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    unregisterReceiver(settingsReceiver)
    synchronized(lock) {
      if (runningService === this) {
        stopVibrationLocked()
        val removed = state.clear()
        cancelNotifications(this, removed)
        runningService = null
      }
    }
    super.onDestroy()
  }

  companion object {
    private const val TAG = "NuriScheduleAlarm"
    private const val ACTION_START = "com.nuri.notifications.START_RINGING"
    const val ACTION_STOP = "com.nuri.notifications.STOP_RINGING"

    private val lock = Any()
    private val state = ScheduleAlarmState()
    private val pendingNotificationRemovals = mutableSetOf<Int>()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var runningService: ScheduleAlarmRingingService? = null
    private var vibrator: Vibrator? = null
    private var vibrationRequested = false

    internal fun start(context: Context, occurrence: ScheduleAlarmOccurrence): Boolean {
      synchronized(lock) {
        val unavailable = unavailableReason(context)
        if (unavailable != null || occurrence.notificationId == 0) {
          Log.i(TAG, "Persistent vibration unavailable: ${unavailable ?: "invalid-notification-id"}")
          return false
        }
        if (!state.put(occurrence)) return true
        pendingNotificationRemovals.remove(occurrence.notificationId)
        return try {
          context.getSystemService(NotificationManager::class.java).notify(
            occurrence.notificationId,
            notification(context, occurrence),
          )
          ContextCompat.startForegroundService(
            context,
            Intent(context, ScheduleAlarmRingingService::class.java).setAction(ACTION_START),
          )
          true
        } catch (error: RuntimeException) {
          state.remove(occurrence.alarmId, occurrence.token)
          context.getSystemService(NotificationManager::class.java).cancel(occurrence.notificationId)
          refreshAfterRemovalLocked()
          Log.w(TAG, "Persistent vibration start failed: ${error.javaClass.simpleName}")
          false
        }
      }
    }

    fun stop(context: Context, intent: Intent) {
      val alarmId = intent.getStringExtra(ScheduleNotificationScheduler.EXTRA_ALARM_ID) ?: return
      val token = intent.getStringExtra(ScheduleNotificationScheduler.EXTRA_REGISTRATION_TOKEN) ?: return
      synchronized(lock) {
        val removed = state.remove(alarmId, token) ?: return
        cancelNotifications(context, listOf(removed))
        refreshAfterRemovalLocked()
        Log.i(TAG, "User stopped schedule alarm")
      }
    }

    fun cancel(context: Context, scheduleIdOrPrefix: String) {
      synchronized(lock) {
        cancelNotifications(context, state.removeMatching(scheduleIdOrPrefix))
        refreshAfterRemovalLocked()
      }
    }

    fun cancelAll(context: Context) {
      synchronized(lock) {
        cancelNotifications(context, state.clear())
        // Synchronous cancellation is part of the native logout/off acknowledgement.
        stopVibrationLocked()
        refreshAfterRemovalLocked()
      }
    }

    private fun refreshAfterRemovalLocked() {
      if (state.active.isEmpty()) {
        stopVibrationLocked()
        runningService?.let { service ->
          service.stopForeground(STOP_FOREGROUND_REMOVE)
          flushRemovedNotificationsLocked(service)
          service.stopSelf()
          runningService = null
        }
        return
      }
      val service = runningService ?: return
      mainHandler.post {
        synchronized(lock) {
          if (runningService === service) refreshLocked(service)
        }
      }
    }

    private fun refreshLocked(service: ScheduleAlarmRingingService) {
      val active = state.active
      if (active.isEmpty()) {
        stopVibrationLocked()
        service.stopForeground(STOP_FOREGROUND_REMOVE)
        flushRemovedNotificationsLocked(service)
        service.stopSelf()
        runningService = null
        return
      }

      val unavailable = unavailableReason(service)
      if (unavailable != null) {
        finishWithOrdinaryNotificationsLocked(service, "settings-$unavailable")
        return
      }
      try {
        val foreground = active.last()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
          service.startForeground(
            foreground.notificationId,
            notification(service, foreground),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED,
          )
        } else {
          service.startForeground(foreground.notificationId, notification(service, foreground))
        }
        flushRemovedNotificationsLocked(service)
        if (!vibrationRequested) {
          val hardware = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            service.getSystemService(VibratorManager::class.java).defaultVibrator
          } else {
            @Suppress("DEPRECATION")
            (service.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
          }
          if (!hardware.hasVibrator()) {
            finishWithOrdinaryNotificationsLocked(service, "vibrator-unavailable")
            return
          }
          vibrator = hardware
          val pattern = longArrayOf(0L, 700L, 500L)
          // Notification usage honours system notification vibration intensity;
          // channel/DND/ringer opt-outs are checked separately, never bypassed.
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hardware.vibrate(
              VibrationEffect.createWaveform(pattern, 0),
              VibrationAttributes.Builder().setUsage(VibrationAttributes.USAGE_NOTIFICATION).build(),
            )
          } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            @Suppress("DEPRECATION")
            hardware.vibrate(
              VibrationEffect.createWaveform(pattern, 0),
              AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
            )
          } else {
            @Suppress("DEPRECATION")
            hardware.vibrate(
              pattern, 0,
              AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
            )
          }
          vibrationRequested = true
          Log.i(TAG, "Repeating schedule vibration requested; active=${active.size}")
        }
      } catch (error: RuntimeException) {
        finishWithOrdinaryNotificationsLocked(service, error.javaClass.simpleName)
      }
    }

    private fun finishWithOrdinaryNotificationsLocked(
      service: ScheduleAlarmRingingService,
      reason: String,
    ) {
      stopVibrationLocked()
      val previous = state.clear()
      service.stopForeground(STOP_FOREGROUND_REMOVE)
      flushRemovedNotificationsLocked(service)
      service.stopSelf()
      runningService = null
      // Preserve the useful reminder when the OS cannot allow continuous vibration.
      // Never present a failed service start as successful ringing or retry it in a loop.
      previous.forEach {
        try {
          service.getSystemService(NotificationManager::class.java).notify(
            it.notificationId,
            ScheduleNotificationScheduler.buildNotification(
              service, it.alarmId, it.scheduleId, it.petId, it.title, it.body,
            ),
          )
        } catch (error: RuntimeException) {
          Log.w(TAG, "Reminder fallback unavailable: ${error.javaClass.simpleName}")
        }
      }
      Log.w(TAG, "Persistent vibration stopped/unavailable: $reason")
    }

    private fun stopVibrationLocked() {
      vibrator?.cancel()
      vibrator = null
      vibrationRequested = false
    }

    private fun cancelNotifications(context: Context, removed: List<ScheduleAlarmOccurrence>) {
      val manager = context.getSystemService(NotificationManager::class.java)
      removed.forEach {
        pendingNotificationRemovals.add(it.notificationId)
        manager.cancel(it.notificationId)
      }
      if (runningService == null) flushRemovedNotificationsLocked(context)
    }

    private fun flushRemovedNotificationsLocked(context: Context) {
      val manager = context.getSystemService(NotificationManager::class.java)
      val stillActive = state.active.map { it.notificationId }.toSet()
      // Android may reject cancelling the current foreground notification.
      // Retry only after foreground ownership is moved, never cancel a new occurrence.
      pendingNotificationRemovals.filterNot { it in stillActive }.forEach { manager.cancel(it) }
      pendingNotificationRemovals.clear()
    }

    private fun unavailableReason(context: Context): String? {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        !context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()
      ) return "exact-alarm-permission"
      if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return "notifications-disabled"
      val manager = context.getSystemService(NotificationManager::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = manager.getNotificationChannel(ScheduleNotificationScheduler.CHANNEL_ID)
          ?: return "channel-missing"
        if (channel.importance == NotificationManager.IMPORTANCE_NONE) return "channel-blocked"
        if (!channel.shouldVibrate()) return "channel-vibration-disabled"
      }
      if (manager.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL) return "do-not-disturb"
      if (context.getSystemService(AudioManager::class.java).ringerMode == AudioManager.RINGER_MODE_SILENT) {
        return "ringer-silent"
      }
      return null
    }

    private fun notification(context: Context, occurrence: ScheduleAlarmOccurrence): Notification {
      val stopIntent = Intent(context, ScheduleNotificationReceiver::class.java).apply {
        action = ACTION_STOP
        data = Uri.Builder().scheme("nuri-alarm").authority("stop")
          .appendPath(occurrence.alarmId).appendPath(occurrence.token).build()
        putExtra(ScheduleNotificationScheduler.EXTRA_ALARM_ID, occurrence.alarmId)
        putExtra(ScheduleNotificationScheduler.EXTRA_REGISTRATION_TOKEN, occurrence.token)
      }
      val stop = PendingIntent.getBroadcast(
        context, 0, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      val open = PendingIntent.getActivity(
        context,
        ScheduleNotificationScheduler.requestCode("${occurrence.alarmId}:open"),
        Intent(context, MainActivity::class.java).apply {
          flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
          putExtra("type", "schedule")
          putExtra("scheduleId", occurrence.scheduleId)
          putExtra("petId", occurrence.petId)
          putExtra("alarmId", occurrence.alarmId)
        },
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      val stopAction = NotificationCompat.Action.Builder(0, "중지", stop).build()
      val publicVersion = NotificationCompat.Builder(context, ScheduleNotificationScheduler.CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle("NURI 일정 알람")
        .setContentText("일정 알람 · 중지를 눌러 끄세요")
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .addAction(stopAction)
        .build()
      return NotificationCompat.Builder(context, ScheduleNotificationScheduler.CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(occurrence.title)
        .setContentText(occurrence.body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(occurrence.body))
        .setCategory(NotificationCompat.CATEGORY_ALARM)
        .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
        .setPublicVersion(publicVersion)
        .setContentIntent(open)
        .setDeleteIntent(stop)
        .addAction(stopAction)
        .setAutoCancel(false)
        .setOngoing(false)
        .setSilent(true)
        .setOnlyAlertOnce(true)
        .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        .build()
    }
  }
}
