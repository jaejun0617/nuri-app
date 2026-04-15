package com.nuri.notifications

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import com.nuri.MainActivity
import com.nuri.R

class ScheduleAlarmRingingService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopForSchedule(intent.getStringExtra(EXTRA_SCHEDULE_ID))
        return START_NOT_STICKY
      }

      ACTION_RING -> {
        val scheduleId = intent.getStringExtra(EXTRA_SCHEDULE_ID) ?: return START_NOT_STICKY
        val petId = intent.getStringExtra(EXTRA_PET_ID) ?: ""
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "일정 알림"
        val body = intent.getStringExtra(EXTRA_BODY) ?: "$title 일정 시간이 다가오고 있어요."
        startRinging(
          scheduleId = scheduleId,
          petId = petId,
          title = title,
          body = body,
        )
      }
    }

    return START_STICKY
  }

  override fun onDestroy() {
    vibrator()?.cancel()
    activeScheduleId = null
    super.onDestroy()
  }

  private fun startRinging(
    scheduleId: String,
    petId: String,
    title: String,
    body: String,
  ) {
    ScheduleNotificationScheduler.ensureChannel(this)
    activeScheduleId = scheduleId
    startForeground(
      notificationId(scheduleId),
      buildNotification(
        scheduleId = scheduleId,
        petId = petId,
        title = title,
        body = body,
      ),
    )
    startVibration()
  }

  private fun stopForSchedule(scheduleId: String?) {
    if (scheduleId.isNullOrBlank() || activeScheduleId == null || activeScheduleId == scheduleId) {
      vibrator()?.cancel()
      activeScheduleId?.let { currentScheduleId ->
        val manager = getSystemService(NotificationManager::class.java)
        manager.cancel(notificationId(currentScheduleId))
      }
      activeScheduleId = null
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        stopForeground(STOP_FOREGROUND_REMOVE)
      } else {
        @Suppress("DEPRECATION")
        stopForeground(true)
      }
      stopSelf()
    }
  }

  private fun buildNotification(
    scheduleId: String,
    petId: String,
    title: String,
    body: String,
  ): Notification {
    val openIntent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra("type", "schedule")
      putExtra("scheduleId", scheduleId)
      putExtra("petId", petId)
    }
    val openPendingIntent = PendingIntent.getActivity(
      this,
      ScheduleNotificationScheduler.requestCode(alarmId = "${scheduleId}:open"),
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val stopIntent = Intent(this, ScheduleAlarmRingingService::class.java).apply {
      action = ACTION_STOP
      putExtra(EXTRA_SCHEDULE_ID, scheduleId)
    }
    val stopPendingIntent = PendingIntent.getService(
      this,
      ScheduleNotificationScheduler.requestCode(alarmId = "${scheduleId}:stop"),
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    return NotificationCompat.Builder(this, ScheduleNotificationScheduler.CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setContentIntent(openPendingIntent)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setAutoCancel(false)
      .addAction(0, "진동 끄기", stopPendingIntent)
      .build()
  }

  private fun startVibration() {
    val pattern = longArrayOf(0, 900, 650)
    val vibrator = vibrator() ?: return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(pattern, 0)
    }
  }

  private fun vibrator(): Vibrator? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val manager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
      manager?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
  }

  companion object {
    private const val ACTION_RING = "com.nuri.notifications.SCHEDULE_RING"
    private const val ACTION_STOP = "com.nuri.notifications.SCHEDULE_RING_STOP"
    private const val EXTRA_SCHEDULE_ID = "schedule_id"
    private const val EXTRA_PET_ID = "pet_id"
    private const val EXTRA_TITLE = "title"
    private const val EXTRA_BODY = "body"

    private var activeScheduleId: String? = null

    fun start(
      context: Context,
      scheduleId: String,
      petId: String,
      title: String,
      body: String,
    ) {
      val intent = Intent(context, ScheduleAlarmRingingService::class.java).apply {
        action = ACTION_RING
        putExtra(EXTRA_SCHEDULE_ID, scheduleId)
        putExtra(EXTRA_PET_ID, petId)
        putExtra(EXTRA_TITLE, title)
        putExtra(EXTRA_BODY, body)
      }
      androidx.core.content.ContextCompat.startForegroundService(context, intent)
    }

    fun stop(context: Context, scheduleId: String? = null) {
      val intent = Intent(context, ScheduleAlarmRingingService::class.java).apply {
        action = ACTION_STOP
        scheduleId?.let {
          putExtra(EXTRA_SCHEDULE_ID, it)
        }
      }
      context.startService(intent)
    }

    private fun notificationId(@Suppress("UNUSED_PARAMETER") scheduleId: String): Int {
      return 90521
    }
  }
}
