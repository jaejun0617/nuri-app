package com.nuri.notifications

import java.util.Calendar
import java.util.TimeZone

/** Executes the policy used by the real scheduler, without Android test stubs. */
object ScheduleOccurrencePolicyVerification {
  @JvmStatic
  fun main(args: Array<String>) {
    var checks = 0
    fun verify(value: Boolean) { check(value) { "Occurrence check ${checks + 1} failed" }; checks++ }
    val originalZone = TimeZone.getDefault()
    TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"))
    try {
      val event = 1788517800000L
      verify(ScheduleAlarmPresentation.body(event, event - 300000L) == "9월 4일 · 오후 7:30 · 5분 전 알림")
      verify(ScheduleAlarmPresentation.body(event, event) == "9월 4일 · 오후 7:30 · 정시 알림")
      verify(ScheduleAlarmPresentation.body(event + 86400000L, event + 86100000L).startsWith("9월 5일"))
      val summary = ScheduleAlarmPresentation.body(event, event - 300000L)
      verify(ScheduleAlarmPresentation.privateBody(summary, "") == summary)
      verify(ScheduleAlarmPresentation.privateBody(summary, " \n ") == summary)
      verify(ScheduleAlarmPresentation.privateBody(summary, "  QA 메모\n준비물  ") == "$summary\nQA 메모\n준비물")
      val longNote = "🐾".repeat(2001)
      val preview = ScheduleAlarmPresentation.notificationNote(longNote)
      verify(preview == "🐾".repeat(2000) + "…")
      verify(ScheduleAlarmPresentation.notificationNote(preview) == preview)
      verify(longNote.codePointCount(0, longNote.length) == 2001)
      val five = ScheduleAlarmRegistration("a", event - 300000L, "five", true, event, "daily", "pet", "QA", "QA")
      val ten = five.copy(fireAtMillis = event - 600000L, registrationToken = "ten")
      val other = five.copy(scheduleId = "b")
      val tomorrow = five.copy(occurrenceAtMillis = event + 86400000L, fireAtMillis = event + 86100000L, registrationToken = "tomorrow")
      verify(five.note.isEmpty())
      verify(five.copy(note = "QA 메모").copy(occurrenceAtMillis = tomorrow.occurrenceAtMillis).note == "QA 메모")
      verify(ScheduleOccurrencePolicy.legacyOccurrenceAt("a::5::0", "a", five.fireAtMillis) == event)
      verify(ScheduleOccurrencePolicy.legacyOccurrenceAt("a::10::1", "a", ten.fireAtMillis) == event)
      verify(ScheduleOccurrencePolicy.legacyOccurrenceAt("a::0::0", "a", event) == event)
      verify(ScheduleOccurrencePolicy.legacyOccurrenceAt("aa::5::0", "a", five.fireAtMillis) == null)
      verify(ScheduleOccurrencePolicy.legacyOccurrenceAt("a::-5::0", "a", five.fireAtMillis) == null)
      verify(ScheduleOccurrencePolicy.legacyOccurrenceAt("a::x::0", "a", five.fireAtMillis) == null)
      verify(ScheduleOccurrencePolicy.legacyOccurrenceAt("a::5", "a", five.fireAtMillis) == null)
      verify(five.matchesStop("five"))
      verify(!five.matchesStop("old"))
      verify(!tomorrow.matchesStop("five"))
      verify(five.sameOccurrence(ten))
      verify(!five.sameOccurrence(other))
      verify(!five.sameOccurrence(tomorrow))
      verify(listOf(five, ten, other, tomorrow).filter { it.sameOccurrence(five) } == listOf(five, ten))
      verify(ScheduleOccurrencePolicy.isSuppressed(five, event))
      verify(ScheduleOccurrencePolicy.isSuppressed(ten, event))
      verify(!ScheduleOccurrencePolicy.isSuppressed(tomorrow, event))
      verify(!ScheduleOccurrencePolicy.isSuppressed(five, 0))
      verify(ScheduleOccurrencePolicy.nextOccurrence(event, 300000L, "daily", event - 290000L) == event + 86400000L)
      verify(ScheduleOccurrencePolicy.nextOccurrence(event, 600000L, "daily", event - 290000L) == event + 86400000L)
      verify(ScheduleOccurrencePolicy.nextOccurrence(event, 0, "weekly", event) == event + 7 * 86400000L)
      verify(ScheduleOccurrencePolicy.nextOccurrence(event, 300000L, "daily", event + 2 * 86400000L) == event + 3 * 86400000L)
      verify(ScheduleOccurrencePolicy.nextOccurrence(event, 0, "none", event) == null)

      val state = ScheduleAlarmState()
      val active = ScheduleAlarmOccurrence("a::5::0", "a", "pet", "five", 1, "QA", "QA", event)
      val sibling = active.copy(alarmId = "a::10::1", token = "ten", notificationId = 2)
      val future = active.copy(alarmId = "a::0::2", occurrenceAtMillis = event + 86400000L, notificationId = 3)
      val separate = active.copy(alarmId = "b::5::0", scheduleId = "b", notificationId = 4)
      listOf(active, sibling, future, separate).forEach { state.put(it) }
      verify(state.removeOccurrence("a", event).toSet() == setOf(active, sibling))
      verify(state.active == listOf(future, separate))
      verify(state.removeOccurrence("a", event).isEmpty())

      TimeZone.setDefault(TimeZone.getTimeZone("America/New_York"))
      val beforeDst = Calendar.getInstance().apply { clear(); set(2026, Calendar.MARCH, 7, 10, 0) }.timeInMillis
      val next = ScheduleOccurrencePolicy.nextOccurrence(beforeDst, 300000L, "daily", beforeDst)!!
      verify(next - beforeDst == 23 * 3600000L)
      verify(Calendar.getInstance().apply { timeInMillis = next }.get(Calendar.HOUR_OF_DAY) == 10)
      println("ScheduleOccurrencePolicyVerification: $checks checks PASS")
    } finally {
      TimeZone.setDefault(originalZone)
    }
  }
}
