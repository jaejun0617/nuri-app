package com.nuri.notifications

import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class ScheduleNotificationModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "NuriScheduleNotifications"
  private var stopObservingAlarmState: (() -> Unit)? = null

  override fun initialize() {
    super.initialize()
    stopObservingAlarmState = ScheduleAlarmRingingService.observeState {
      if (reactContext.hasActiveReactInstance()) {
        try {
          reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("NuriScheduleAlarmStateChanged", null)
        } catch (_: RuntimeException) {
          // React teardown can race this callback; next mount queries current state.
        }
      }
    }
  }

  override fun invalidate() {
    stopObservingAlarmState?.invoke()
    stopObservingAlarmState = null
    ScheduleNotificationTapStore.markConsumerNotReady()
    super.invalidate()
  }

  @ReactMethod
  fun getActiveAlarms(promise: Promise) {
    promise.resolve(Arguments.createArray().apply {
      ScheduleAlarmRingingService.activeOccurrences().forEach { occurrence ->
        pushMap(Arguments.createMap().apply {
          putString("alarmId", occurrence.alarmId)
          putString("scheduleId", occurrence.scheduleId)
          putString("petId", occurrence.petId)
          putString("token", occurrence.token)
          putString("title", occurrence.title)
          putString("body", occurrence.body)
          putDouble("occurrenceAtMillis", occurrence.occurrenceAtMillis.toDouble())
        })
      }
    })
  }

  @ReactMethod
  fun stopActiveAlarm(alarmId: String, token: String, promise: Promise) {
    promise.resolve(ScheduleNotificationScheduler.stopOccurrence(
      reactContext,
      Intent().apply {
        putExtra(ScheduleNotificationScheduler.EXTRA_ALARM_ID, alarmId)
        putExtra(ScheduleNotificationScheduler.EXTRA_REGISTRATION_TOKEN, token)
      },
    ))
  }

  @ReactMethod
  fun schedule(payload: ReadableMap, promise: Promise) {
    val alarmId = payload.getSafeString("alarmId")
    val scheduleId = payload.getSafeString("scheduleId")
    if (alarmId.isBlank() || scheduleId.isBlank()) {
      promise.resolve("unsupported")
      return
    }

    val result = ScheduleNotificationScheduler.schedule(
      context = reactContext,
      alarmId = alarmId,
      scheduleId = scheduleId,
      petId = payload.getSafeString("petId"),
      title = payload.getSafeString("title").ifBlank { "일정 알림" },
      body = payload.getSafeString("body").ifBlank {
        "${payload.getSafeString("title")} 일정 시간이 다가오고 있어요."
      },
      fireAtMillis = payload.getSafeDouble("fireAtMillis").toLong(),
      occurrenceAtMillis = payload.getSafeDouble("occurrenceAtMillis").toLong(),
      repeatRule = payload.getSafeString("repeatRule").ifBlank { "none" },
    )
    promise.resolve(
      Arguments.createMap().apply {
        putString("status", result.status)
        putString("delivery", result.delivery)
        result.errorCode?.let { putString("errorCode", it) }
      },
    )
  }

  @ReactMethod
  fun cancel(scheduleId: String) {
    ScheduleNotificationScheduler.cancel(reactContext, scheduleId)
  }

  @ReactMethod
  fun cancelAll(promise: Promise) {
    val result = ScheduleNotificationScheduler.cancelAll(reactContext)
    promise.resolve(
      Arguments.createMap().apply {
        putString("status", result.status)
        putString("delivery", result.delivery)
        result.errorCode?.let { putString("errorCode", it) }
      },
    )
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
  fun getRuntimeCapabilities(promise: Promise) {
    val capabilities = ScheduleNotificationScheduler.runtimeCapabilities(reactContext)
    promise.resolve(
      Arguments.createMap().apply {
        putBoolean("enabled", capabilities.enabled)
        putString("exactAlarm", capabilities.exactAlarm)
        putString("channel", capabilities.channel)
        putString("delivery", capabilities.delivery)
        putBoolean(
          "canOpenExactAlarmSettings",
          capabilities.canOpenExactAlarmSettings,
        )
      },
    )
  }

  @ReactMethod
  fun openExactAlarmSettings(promise: Promise) {
    val intent = ScheduleNotificationScheduler.exactAlarmSettingsIntent(reactContext)
    if (intent == null) {
      promise.resolve(false)
      return
    }

    try {
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (_: RuntimeException) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun getInitialScheduleNotificationTap(promise: Promise) {
    val tap = ScheduleNotificationTapStore.consumeInitial()
    promise.resolve(tap?.toWritableMap())
  }

  @ReactMethod
  fun markScheduleNotificationTapConsumerReady() {
    // The JS listener is registered before this method is called. Native can
    // now release one pending cold-start tap without losing it to startup
    // timing; warm taps still use the same one-shot event path.
    ScheduleNotificationTapStore.markConsumerReady(reactContext)
  }

  @ReactMethod
  fun markScheduleNotificationTapConsumerNotReady() {
    ScheduleNotificationTapStore.markConsumerNotReady()
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
          data = Uri.parse("package:${reactContext.packageName}")
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
