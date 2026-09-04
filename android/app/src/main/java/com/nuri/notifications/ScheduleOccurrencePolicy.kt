package com.nuri.notifications

import java.util.Calendar

internal data class ScheduleAlarmRegistration(
  val scheduleId: String,
  val fireAtMillis: Long,
  val registrationToken: String,
  val exactDelivery: Boolean,
  val occurrenceAtMillis: Long,
  val repeatRule: String,
  val petId: String,
  val title: String,
  val body: String,
) {
  fun matchesStop(alarmToken: String): Boolean = registrationToken == alarmToken

  fun sameOccurrence(other: ScheduleAlarmRegistration): Boolean =
    scheduleId == other.scheduleId && occurrenceAtMillis == other.occurrenceAtMillis
}

/** Calendar recurrence belongs to the event, not its earlier reminder offset. */
internal object ScheduleOccurrencePolicy {
  fun legacyOccurrenceAt(alarmId: String, scheduleId: String, fireAtMillis: Long): Long? {
    if (!alarmId.startsWith("$scheduleId::")) return null
    val parts = alarmId.removePrefix("$scheduleId::").split("::")
    if (parts.size != 2 || parts[1].toIntOrNull()?.let { it >= 0 } != true) return null
    val offset = parts[0].toLongOrNull() ?: return null
    if (offset !in 0L..172800L || fireAtMillis <= 0) return null
    return runCatching { Math.addExact(fireAtMillis, Math.multiplyExact(offset, 60000L)) }.getOrNull()
  }

  fun isSuppressed(registration: ScheduleAlarmRegistration, stoppedThrough: Long): Boolean =
    registration.occurrenceAtMillis <= stoppedThrough

  fun nextOccurrence(
    occurrenceAtMillis: Long,
    offsetMillis: Long,
    repeatRule: String,
    now: Long,
  ): Long? {
    val field = when (repeatRule) {
      "daily" -> Calendar.DAY_OF_YEAR
      "weekly" -> Calendar.WEEK_OF_YEAR
      "monthly" -> Calendar.MONTH
      "yearly" -> Calendar.YEAR
      else -> return null
    }
    val calendar = Calendar.getInstance().apply { timeInMillis = occurrenceAtMillis }
    // Always advance a stopped/fired event at least once, even before its start time.
    do {
      calendar.add(field, 1)
    } while (calendar.timeInMillis - offsetMillis <= now)
    return calendar.timeInMillis
  }
}
