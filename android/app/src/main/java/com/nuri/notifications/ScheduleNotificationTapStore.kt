package com.nuri.notifications

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

object ScheduleNotificationTapStore {
  const val EVENT_NAME = "NuriScheduleNotificationTap"

  private const val EXTRA_TYPE = "type"
  private const val EXTRA_SCHEDULE_ID = "scheduleId"
  private const val EXTRA_PET_ID = "petId"

  data class Tap(
    val scheduleId: String,
    val petId: String,
  ) {
    fun toWritableMap(): WritableMap = Arguments.createMap().apply {
      putString("type", "schedule")
      putString("scheduleId", scheduleId)
      putString("petId", petId)
    }
  }

  private var pendingTap: Tap? = null
  private var consumerReady = false

  @Synchronized
  fun captureIntent(intent: Intent?): Tap? {
    if (intent == null) return null

    val type = intent.getStringExtra(EXTRA_TYPE)
    if (!type.isNullOrBlank() && type != "schedule") return null

    val scheduleId = intent.getStringExtra(EXTRA_SCHEDULE_ID)?.trim().orEmpty()
    val petId = intent.getStringExtra(EXTRA_PET_ID)?.trim().orEmpty()
    if (scheduleId.isBlank() || petId.isBlank()) return null

    return Tap(scheduleId, petId).also { pendingTap = it }
  }

  /**
   * JS calls this only after registering its DeviceEventEmitter listener.
   * A cold-start tap is therefore emitted exactly once without racing the
   * listener registration; the initial getter remains a compatibility
   * fallback for older/partially booted React Native paths.
   */
  fun markConsumerReady(reactContext: ReactContext) {
    val tap = synchronized(this) {
      consumerReady = true
      pendingTap?.also { pendingTap = null }
    }
    tap?.let { emit(reactContext, it) }
  }

  @Synchronized
  fun markConsumerNotReady() {
    consumerReady = false
  }

  @Synchronized
  fun consumeInitial(): Tap? {
    val tap = pendingTap
    pendingTap = null
    return tap
  }

  fun emitWarmTap(reactContext: ReactContext, tap: Tap) {
    val tapToEmit = synchronized(this) {
      if (!consumerReady || pendingTap != tap) null else {
        pendingTap = null
        tap
      }
    }
    tapToEmit?.let { emit(reactContext, it) }
  }

  private fun emit(reactContext: ReactContext, tap: Tap) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_NAME, tap.toWritableMap())
  }

  fun clearIntentTapExtras(intent: Intent?) {
    intent?.removeExtra(EXTRA_TYPE)
    intent?.removeExtra(EXTRA_SCHEDULE_ID)
    intent?.removeExtra(EXTRA_PET_ID)
    intent?.removeExtra("alarmId")
  }
}
