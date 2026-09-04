package com.nuri.notifications

/** Standalone JVM checks of production state logic; no added test dependency. */
object ScheduleAlarmStateVerification {
  @JvmStatic
  fun main(args: Array<String>) {
    var checks = 0
    fun verify(value: Boolean) {
      check(value) { "Schedule alarm state check ${checks + 1} failed" }
      checks++
    }
    fun occurrence(id: String, schedule: String, token: String) = ScheduleAlarmOccurrence(
      id, schedule, "pet", token, id.hashCode(), "QA", "QA",
    )

    val state = ScheduleAlarmState()
    val first = occurrence("schedule-a::five", "schedule-a", "token-1")
    val replaced = first.copy(token = "token-2")
    val other = occurrence("schedule-b::five", "schedule-b", "token-b")
    val anotherOffset = occurrence("schedule-a::ten", "schedule-a", "token-ten")
    verify(state.active.isEmpty())
    verify(state.put(first))
    verify(!state.put(first))
    verify(state.active.size == 1)
    verify(state.remove(first.alarmId, "stale-token") == null)
    verify(state.active.single() == first)
    verify(state.put(replaced))
    verify(state.remove(first.alarmId, first.token) == null)
    verify(state.active.single() == replaced)
    verify(state.put(other))
    verify(state.active.last() == other)
    verify(state.remove(replaced.alarmId, replaced.token) == replaced)
    verify(state.active.single() == other)
    verify(state.put(replaced))
    verify(state.put(anotherOffset))
    verify(state.removeMatching("schedule").isEmpty())
    verify(state.removeMatching("schedule-a").toSet() == setOf(replaced, anotherOffset))
    verify(state.active.single() == other)
    verify(state.removeMatching(other.alarmId) == listOf(other))
    verify(state.active.isEmpty())
    verify(state.put(first))
    verify(state.put(other))
    verify(state.clear() == listOf(first, other))
    verify(state.active.isEmpty())
    verify(state.remove(first.alarmId, first.token) == null)
    verify(state.put(replaced))
    verify(state.remove(first.alarmId, first.token) == null)
    verify(state.remove(replaced.alarmId, replaced.token) == replaced)
    verify(state.active.isEmpty())
    println("ScheduleAlarmStateVerification: $checks checks PASS")
  }
}
