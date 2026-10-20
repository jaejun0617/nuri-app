package com.nuri.walk

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream

data class WalkMetadata(
  val owner: String, val pet: String, val startedWall: Long, val segmentStartedNs: Long,
  val timing: WalkTiming, val fixCount: Long = 0, val segmentCount: Long = 1,
  val lastFixNs: Long = 0, val finishedWall: Long = 0,
  val pauseStartedMonoMs: Long = 0, val pauseStartedWallMs: Long = 0,
  val pauses: List<WalkPauseInterval> = emptyList(),
  internal val product: WalkProductJournal? = null,
) {
  fun beginSegment(startedNs: Long, nextTiming: WalkTiming, resuming: Boolean): WalkMetadata = copy(
    segmentStartedNs = startedNs, timing = nextTiming,
    segmentCount = if (resuming) Math.addExact(segmentCount, 1) else segmentCount,
    // Ordering is segment-local. A recovered segment may use a new boot clock.
    lastFixNs = 0,
  )
}
data class WalkPauseInterval(val startMonoMs: Long, val endMonoMs: Long, val startWallMs: Long, val endWallMs: Long)

private class SensitiveWalkOutput : ByteArrayOutputStream() {
  fun wipe() { buf.fill(0); reset() }
}

object WalkCodec {
  fun encode(value: WalkMetadata): ByteArray {
    val stream = SensitiveWalkOutput()
    try {
      val out = DataOutputStream(stream)
      out.writeInt(if (value.product == null) 1 else 2); out.writeUTF(value.owner); out.writeUTF(value.pet)
      for (number in listOf(value.startedWall, value.segmentStartedNs, value.timing.lastMonoMs,
        value.timing.lastWallMs, value.timing.activeMs, value.timing.pausedMs,
        value.fixCount, value.segmentCount, value.lastFixNs, value.finishedWall,
        value.pauseStartedMonoMs, value.pauseStartedWallMs)) out.writeLong(number)
      out.writeInt(value.pauses.size)
      value.pauses.forEach { pause ->
        out.writeLong(pause.startMonoMs); out.writeLong(pause.endMonoMs)
        out.writeLong(pause.startWallMs); out.writeLong(pause.endWallMs)
      }
      value.product?.let { out.writeUTF(it.encode()) }
      out.flush()
      return stream.toByteArray()
    } finally {
      stream.wipe(); stream.close()
    }
  }
  fun decode(bytes: ByteArray): WalkMetadata = try {
    DataInputStream(ByteArrayInputStream(bytes)).use { input ->
      val version = input.readInt()
      if (version !in 1..2) throw WalkFailure("WALK_LOCAL_DATABASE_ERROR")
      val owner = input.readUTF(); val pet = input.readUTF()
      val result = WalkMetadata(owner, pet, input.readLong(), input.readLong(),
        WalkTiming(input.readLong(), input.readLong(), input.readLong(), input.readLong()),
        input.readLong(), input.readLong(), input.readLong(), input.readLong(),
        input.readLong(), input.readLong())
      val count = input.readInt()
      if (count !in 0..4096) throw WalkFailure("WALK_LOCAL_DATABASE_ERROR")
      val pauses = List(count) { WalkPauseInterval(input.readLong(), input.readLong(), input.readLong(), input.readLong()) }
      val product = if (version == 2) WalkProductJournal.decode(input.readUTF()) else null
      if (input.available() != 0) throw WalkFailure("WALK_LOCAL_DATABASE_ERROR")
      result.copy(pauses = pauses, product = product)
    }
  } catch (_: Exception) { throw WalkFailure("WALK_LOCAL_DATABASE_ERROR") }
}
