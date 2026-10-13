package com.nuri.walk

import org.junit.Assert.*
import org.junit.Test

class WalkSegmentBoundaryTest {
  private fun checkpoint() = WalkMetadata(
    "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222",
    10000, 800000000000, WalkTiming(900000, 10000, 32000, 5000),
    fixCount = 13, segmentCount = 1, lastFixNs = 900000000000,
  )

  @Test fun recoveredSegmentResetsPriorBootCursorAndAcceptsFreshFix() {
    val next = checkpoint().beginSegment(1000000000, WalkTiming(1000, 50000, 32000, 5000), true)
    assertEquals(0, next.lastFixNs)
    val freshFixNs = 1100000000L
    assertTrue(freshFixNs >= next.segmentStartedNs && freshFixNs > next.lastFixNs)
  }

  @Test fun segmentKeepsIdentityHistoryAndDurationWithoutCreditingDowntime() {
    val old = checkpoint()
    val timing = old.timing.copy(lastMonoMs = 1000, lastWallMs = 50000)
    val next = old.beginSegment(1000000000, timing, true)
    assertEquals(old.owner, next.owner); assertEquals(old.pet, next.pet)
    assertEquals(old.startedWall, next.startedWall); assertEquals(old.fixCount, next.fixCount)
    assertEquals(old.timing.activeMs, next.timing.activeMs); assertEquals(old.timing.pausedMs, next.timing.pausedMs)
    assertEquals(2, next.segmentCount)
  }

  @Test fun newStartStillUsesItsFirstSegment() {
    val next = checkpoint().copy(fixCount = 0, segmentCount = 1, lastFixNs = 0)
      .beginSegment(1000000000, WalkTiming(1000, 50000, 0, 0), false)
    assertEquals(1, next.segmentCount); assertEquals(0, next.lastFixNs)
  }
}
