package com.nuri.notifications

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

internal object ScheduleAlarmPresentation {
  fun body(occurrenceAtMillis: Long, fireAtMillis: Long): String {
    val time = SimpleDateFormat("M월 d일 · a h:mm", Locale.KOREAN).format(Date(occurrenceAtMillis))
    val minutes = ((occurrenceAtMillis - fireAtMillis) / 60000L).coerceAtLeast(0L)
    val offset = if (minutes == 0L) "정시 알림" else "${minutes}분 전 알림"
    return "$time · $offset"
  }
}
