package com.nuri.walk

import org.junit.Assert.*
import org.junit.Test

class WalkRuntimePolicyTest {
  @Test fun transitionsMatchPhaseOneWithoutSyncOrGpsSignals() {
    val allowed = setOf(
      "IDLE:STARTING", "STARTING:WALKING", "STARTING:IDLE",
      "WALKING:PAUSED", "WALKING:FINISHING", "WALKING:RECOVERY_REQUIRED",
      "PAUSED:WALKING", "PAUSED:FINISHING", "PAUSED:RECOVERY_REQUIRED",
      "FINISHING:FINISHED_LOCAL", "RECOVERY_REQUIRED:PAUSED",
      "RECOVERY_REQUIRED:FINISHING", "RECOVERY_REQUIRED:CANCELLED_LOCAL",
    )
    for (from in WalkState.entries) for (to in WalkState.entries) {
      assertEquals(allowed.contains("$from:$to"), WalkRuntimePolicy.canTransition(from, to))
    }
    assertEquals(8, WalkState.entries.size)
  }
  @Test fun processLossRequiresUserRecoveryAndNeverAutostarts() {
    for (state in listOf(WalkState.STARTING, WalkState.WALKING, WalkState.PAUSED, WalkState.FINISHING)) {
      assertEquals(WalkState.RECOVERY_REQUIRED, WalkRuntimePolicy.afterProcessLoss(state))
    }
    assertEquals(WalkState.FINISHED_LOCAL, WalkRuntimePolicy.afterProcessLoss(WalkState.FINISHED_LOCAL))
  }
  @Test fun monotonicTimeDoesNotDoubleCountPauseResume() {
    val initial = WalkTiming(1000, 10000, 0, 0)
    val walking = initial.advance(WalkState.WALKING, 6000, 15000)
    val paused = walking.advance(WalkState.PAUSED, 9000, 18000)
    val resumed = paused.advance(WalkState.WALKING, 12000, 21000)
    assertEquals(8000, resumed.activeMs)
    assertEquals(3000, resumed.pausedMs)
    assertEquals(resumed, resumed.advance(WalkState.WALKING, 12000, 21000))
  }
  @Test fun clockDiscontinuityAndRebootDoNotSilentlyAccumulate() {
    val timing = WalkTiming(1000, 10000, 2000, 1000)
    for ((mono, wall) in listOf(500L to 10000L, 2000L to 999999L)) {
      try { timing.advance(WalkState.WALKING, mono, wall); fail("Expected stable clock rejection") }
      catch (error: WalkFailure) { assertEquals("WALK_CLOCK_DISCONTINUITY", error.code) }
    }
  }
  @Test fun permissionAndVisibilityAreDistinctFromNotificationPermission() {
    assertEquals("WALK_ACTIVITY_NOT_VISIBLE", WalkRuntimePolicy.startGate(false, true, true, true))
    assertEquals("WALK_LOCATION_PERMISSION_REQUIRED", WalkRuntimePolicy.startGate(true, false, false, true))
    assertEquals("WALK_PRECISE_LOCATION_REQUIRED", WalkRuntimePolicy.startGate(true, true, false, true))
    assertEquals("WALK_LOCATION_SERVICES_DISABLED", WalkRuntimePolicy.startGate(true, true, true, false))
    assertNull(WalkRuntimePolicy.startGate(true, true, true, true))
  }
  @Test fun revisionsRejectStaleAndOverflowWithoutMutation() {
    assertEquals(2, WalkRuntimePolicy.nextRevision(1, 1))
    for ((current, expected) in listOf(1L to 0L, Long.MAX_VALUE to Long.MAX_VALUE)) {
      try { WalkRuntimePolicy.nextRevision(current, expected); fail("Expected revision rejection") }
      catch (error: WalkFailure) { assertEquals("WALK_COMMAND_REVISION_CONFLICT", error.code) }
    }
  }
  @Test fun overflowInClockArithmeticIsRejectedRatherThanWrapping() {
    val timing = WalkTiming(0, Long.MAX_VALUE, 0, 0)
    try { timing.advance(WalkState.WALKING, 0, Long.MIN_VALUE); fail("Expected clock rejection") }
    catch (error: WalkFailure) { assertEquals("WALK_CLOCK_DISCONTINUITY", error.code) }
  }
}
