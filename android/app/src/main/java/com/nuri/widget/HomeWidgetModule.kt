package com.nuri.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class HomeWidgetModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "NuriHomeWidget"

  @ReactMethod
  fun updateSnapshot(payload: ReadableMap) {
    val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit()
      .putString(KEY_PET_NAME, payload.getSafeString("petName"))
      .putString(KEY_SUBTITLE, payload.getSafeString("subtitle"))
      .putString(KEY_SCHEDULE_TITLE, payload.getSafeString("todayScheduleTitle"))
      .putString(KEY_SCHEDULE_META, payload.getSafeString("todayScheduleMeta"))
      .putString(KEY_RECORD_TITLE, payload.getSafeString("recentRecordTitle"))
      .putString(KEY_RECORD_META, payload.getSafeString("recentRecordMeta"))
      .putString(KEY_THEME_COLOR, payload.getSafeString("themeColor"))
      .apply()

    val appWidgetManager = AppWidgetManager.getInstance(reactContext)
    val widgetComponent = ComponentName(reactContext, HomeWidgetProvider::class.java)
    val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)

    if (widgetIds.isNotEmpty()) {
      val intent = Intent(reactContext, HomeWidgetProvider::class.java).apply {
        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
      }
      reactContext.sendBroadcast(intent)
    }
  }

  @ReactMethod
  fun getSnapshot(promise: com.facebook.react.bridge.Promise) {
    val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val result = Arguments.createMap().apply {
      putString("petName", prefs.getString(KEY_PET_NAME, "우리 아이"))
      putString("subtitle", prefs.getString(KEY_SUBTITLE, "오늘을 바로 확인해요"))
      putString("todayScheduleTitle", prefs.getString(KEY_SCHEDULE_TITLE, "오늘 일정이 없어요"))
      putString("todayScheduleMeta", prefs.getString(KEY_SCHEDULE_META, "새 일정을 추가해 두면 위젯에서 바로 보여요"))
      putString("recentRecordTitle", prefs.getString(KEY_RECORD_TITLE, "최근 기록이 아직 없어요"))
      putString("recentRecordMeta", prefs.getString(KEY_RECORD_META, "첫 기록을 남기면 최근 추억이 표시돼요"))
      putString("themeColor", prefs.getString(KEY_THEME_COLOR, "#6D6AF8"))
    }
    promise.resolve(result)
  }

  private fun ReadableMap.getSafeString(key: String): String {
    return if (hasKey(key) && !isNull(key)) getString(key) ?: "" else ""
  }

  companion object {
    const val PREFS_NAME = "nuri_home_widget"
    const val KEY_PET_NAME = "pet_name"
    const val KEY_SUBTITLE = "subtitle"
    const val KEY_SCHEDULE_TITLE = "schedule_title"
    const val KEY_SCHEDULE_META = "schedule_meta"
    const val KEY_RECORD_TITLE = "record_title"
    const val KEY_RECORD_META = "record_meta"
    const val KEY_THEME_COLOR = "theme_color"
  }
}
