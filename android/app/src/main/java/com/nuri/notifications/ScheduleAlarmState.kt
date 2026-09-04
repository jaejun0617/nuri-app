package com.nuri.notifications

internal data class ScheduleAlarmOccurrence(
  val alarmId: String,
  val scheduleId: String,
  val petId: String,
  val token: String,
  val notificationId: Int,
  val title: String,
  val body: String,
  val occurrenceAtMillis: Long = 0L,
)

/** Process-local ringing state. Persisted future alarms remain owned by the scheduler. */
internal class ScheduleAlarmState {
  private val occurrences = linkedMapOf<String, ScheduleAlarmOccurrence>()

  val active: List<ScheduleAlarmOccurrence>
    get() = occurrences.values.toList()

  fun put(occurrence: ScheduleAlarmOccurrence): Boolean {
    if (occurrences[occurrence.alarmId]?.token == occurrence.token) return false
    occurrences.remove(occurrence.alarmId)
    occurrences[occurrence.alarmId] = occurrence
    return true
  }

  fun remove(alarmId: String, token: String): ScheduleAlarmOccurrence? {
    val current = occurrences[alarmId] ?: return null
    if (current.token != token) return null
    return occurrences.remove(alarmId)
  }

  fun removeMatching(scheduleIdOrPrefix: String): List<ScheduleAlarmOccurrence> {
    val removed = active.filter {
      it.scheduleId == scheduleIdOrPrefix || it.alarmId == scheduleIdOrPrefix ||
        it.alarmId.startsWith("$scheduleIdOrPrefix::")
    }
    removed.forEach { occurrences.remove(it.alarmId) }
    return removed
  }

  fun clear(): List<ScheduleAlarmOccurrence> = active.also { occurrences.clear() }

  fun removeOccurrence(scheduleId: String, occurrenceAtMillis: Long): List<ScheduleAlarmOccurrence> {
    val removed = active.filter {
      it.scheduleId == scheduleId && it.occurrenceAtMillis == occurrenceAtMillis
    }
    removed.forEach { occurrences.remove(it.alarmId) }
    return removed
  }
}
