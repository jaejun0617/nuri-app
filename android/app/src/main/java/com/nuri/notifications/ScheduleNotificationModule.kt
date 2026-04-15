package com.nuri.notifications

import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class ScheduleNotificationModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "NuriScheduleNotifications"

  @ReactMethod
  fun schedule(payload: ReadableMap, promise: Promise) {
    val alarmId = payload.getSafeString("alarmId")
    val scheduleId = payload.getSafeString("scheduleId")
    if (alarmId.isBlank() || scheduleId.isBlank()) {
      promise.resolve("unsupported")
      return
    }

    val status = ScheduleNotificationScheduler.schedule(
      context = reactContext,
      alarmId = alarmId,
      scheduleId = scheduleId,
      petId = payload.getSafeString("petId"),
      title = payload.getSafeString("title").ifBlank { "일정 알림" },
      body = payload.getSafeString("body").ifBlank {
        "${payload.getSafeString("title")} 일정 시간이 다가오고 있어요."
      },
      fireAtMillis = payload.getSafeDouble("fireAtMillis").toLong(),
      repeatRule = payload.getSafeString("repeatRule").ifBlank { "none" },
    )
    promise.resolve(status)
  }

  @ReactMethod
  fun cancel(scheduleId: String) {
    ScheduleNotificationScheduler.cancel(reactContext, scheduleId)
  }

  @ReactMethod
  fun cancelAll() {
    ScheduleNotificationScheduler.cancelAll(reactContext)
  }

  @ReactMethod
  fun getSettings(promise: Promise) {
    promise.resolve(
      Arguments.createMap().apply {
        putBoolean("enabled", ScheduleNotificationScheduler.isEnabled(reactContext))
      },
    )
  }

  @ReactMethod
  fun setEnabled(enabled: Boolean, promise: Promise) {
    ScheduleNotificationScheduler.setEnabled(reactContext, enabled)
    getSettings(promise)
  }

  @ReactMethod
  fun openAppNotificationSettings() {
    val intent =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
          putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
        }
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = android.net.Uri.parse("package:${reactContext.packageName}")
        }
      }

    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  private fun ReadableMap.getSafeString(key: String): String {
    return if (hasKey(key) && !isNull(key)) getString(key) ?: "" else ""
  }

  private fun ReadableMap.getSafeDouble(key: String): Double {
    return if (hasKey(key) && !isNull(key)) getDouble(key) else 0.0
  }
}
