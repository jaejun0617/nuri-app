package com.nuri.notifications

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

internal object ScheduleAlarmPresentation {
  // Bound the notification copy only; the saved schedule note is never truncated.
  fun notificationNote(note: String): String {
    val text = note.trim()
    return if (text.codePointCount(0, text.length) > 2000) {
      text.substring(0, text.offsetByCodePoints(0, 2000)) + "…"
    } else text
  }

  fun privateBody(summary: String, note: String): String {
    val preview = notificationNote(note)
    return if (preview.isEmpty()) summary else "$summary\n$preview"
  }

  fun body(occurrenceAtMillis: Long, fireAtMillis: Long): String {
    val time = SimpleDateFormat("M월 d일 · a h:mm", Locale.KOREAN).format(Date(occurrenceAtMillis))
    val minutes = ((occurrenceAtMillis - fireAtMillis) / 60000L).coerceAtLeast(0L)
    val offset = if (minutes == 0L) "정시 알림" else "${minutes}분 전 알림"
    return "$time · $offset"
  }
}
