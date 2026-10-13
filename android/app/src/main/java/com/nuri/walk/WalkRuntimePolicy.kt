package com.nuri.walk

enum class WalkState { IDLE, STARTING, WALKING, PAUSED, FINISHING, FINISHED_LOCAL, RECOVERY_REQUIRED, CANCELLED_LOCAL }
class WalkFailure(val code: String) : RuntimeException(code)

object WalkRuntimePolicy {
  private val edges = mapOf(
    WalkState.IDLE to setOf(WalkState.STARTING),
    WalkState.STARTING to setOf(WalkState.WALKING, WalkState.IDLE),
    WalkState.WALKING to setOf(WalkState.PAUSED, WalkState.FINISHING, WalkState.RECOVERY_REQUIRED),
    WalkState.PAUSED to setOf(WalkState.WALKING, WalkState.FINISHING, WalkState.RECOVERY_REQUIRED),
    WalkState.FINISHING to setOf(WalkState.FINISHED_LOCAL),
    WalkState.RECOVERY_REQUIRED to setOf(WalkState.PAUSED, WalkState.FINISHING, WalkState.CANCELLED_LOCAL),
  )
  fun canTransition(from: WalkState, to: WalkState) = edges[from]?.contains(to) == true
  fun transition(from: WalkState, to: WalkState): WalkState {
    if (!canTransition(from, to)) throw WalkFailure("WALK_INVALID_STATE_TRANSITION")
    return to
  }
  // Explicit Phase 2 hydration event, not a new normal command edge. A dead
  // service can never resume collection as a side effect of reading storage.
  fun afterProcessLoss(state: WalkState): WalkState = when (state) {
    WalkState.STARTING, WalkState.WALKING, WalkState.PAUSED, WalkState.FINISHING -> WalkState.RECOVERY_REQUIRED
    else -> state
  }
  fun nextRevision(current: Long, expected: Long): Long {
    if (current < 0 || current != expected || current == Long.MAX_VALUE) throw WalkFailure("WALK_COMMAND_REVISION_CONFLICT")
    return current + 1
  }
  fun startGate(visible: Boolean, coarse: Boolean, precise: Boolean, locationEnabled: Boolean): String? = when {
    !visible -> "WALK_ACTIVITY_NOT_VISIBLE"
    !coarse && !precise -> "WALK_LOCATION_PERMISSION_REQUIRED"
    !precise -> "WALK_PRECISE_LOCATION_REQUIRED"
    !locationEnabled -> "WALK_LOCATION_SERVICES_DISABLED"
    else -> null
  }
}

data class WalkTiming(val lastMonoMs: Long, val lastWallMs: Long, val activeMs: Long, val pausedMs: Long) {
  fun advance(state: WalkState, monoMs: Long, wallMs: Long): WalkTiming {
    return try {
      val delta = Math.subtractExact(monoMs, lastMonoMs)
      val drift = Math.subtractExact(Math.subtractExact(wallMs, lastWallMs), delta)
      if (delta < 0 || drift !in -CLOCK_TOLERANCE_MS..CLOCK_TOLERANCE_MS) {
        throw WalkFailure("WALK_CLOCK_DISCONTINUITY")
      }
      copy(lastMonoMs = monoMs, lastWallMs = wallMs,
        activeMs = Math.addExact(activeMs, if (state == WalkState.WALKING) delta else 0),
        pausedMs = Math.addExact(pausedMs, if (state == WalkState.PAUSED) delta else 0))
    } catch (_: ArithmeticException) { throw WalkFailure("WALK_CLOCK_DISCONTINUITY") }
  }
  companion object { const val CLOCK_TOLERANCE_MS = 2000L }
}
