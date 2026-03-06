package com.nuri.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import com.nuri.MainActivity
import com.nuri.R

class HomeWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    appWidgetIds.forEach { appWidgetId ->
      updateWidget(context, appWidgetManager, appWidgetId)
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, HomeWidgetProvider::class.java))
      onUpdate(context, manager, ids)
    }
  }

  companion object {
    fun updateWidget(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetId: Int,
    ) {
      val prefs = context.getSharedPreferences(HomeWidgetModule.PREFS_NAME, Context.MODE_PRIVATE)
      val themeColor = safeParseColor(
        prefs.getString(HomeWidgetModule.KEY_THEME_COLOR, "#6D6AF8"),
        "#6D6AF8",
      )

      val views = RemoteViews(context.packageName, R.layout.nuri_home_widget).apply {
        setTextViewText(R.id.widgetPetName, prefs.getString(HomeWidgetModule.KEY_PET_NAME, "우리 아이"))
        setTextViewText(R.id.widgetSubtitle, prefs.getString(HomeWidgetModule.KEY_SUBTITLE, "오늘을 바로 확인해요"))
        setTextViewText(R.id.widgetScheduleTitle, prefs.getString(HomeWidgetModule.KEY_SCHEDULE_TITLE, "오늘 일정이 없어요"))
        setTextViewText(R.id.widgetScheduleMeta, prefs.getString(HomeWidgetModule.KEY_SCHEDULE_META, "새 일정을 추가해 두면 위젯에서 바로 보여요"))
        setTextViewText(R.id.widgetRecordTitle, prefs.getString(HomeWidgetModule.KEY_RECORD_TITLE, "최근 기록이 아직 없어요"))
        setTextViewText(R.id.widgetRecordMeta, prefs.getString(HomeWidgetModule.KEY_RECORD_META, "첫 기록을 남기면 최근 추억이 표시돼요"))
        setInt(R.id.widgetAccentBar, "setBackgroundColor", themeColor)
        setTextColor(R.id.widgetPetName, themeColor)

        val launchIntent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
          context,
          2017,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        setOnClickPendingIntent(R.id.widgetRoot, pendingIntent)
      }

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun safeParseColor(raw: String?, fallback: String): Int {
      return try {
        Color.parseColor(raw ?: fallback)
      } catch (_: IllegalArgumentException) {
        Color.parseColor(fallback)
      }
    }
  }
}
