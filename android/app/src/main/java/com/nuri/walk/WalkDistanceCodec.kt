package com.nuri.walk

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream

internal object WalkDistanceCodec {
  private fun writeFix(out: DataOutputStream, fix: WalkDistanceFix?) {
    out.writeBoolean(fix != null); if(fix==null)return
    out.writeDouble(fix.latitude);out.writeDouble(fix.longitude);out.writeDouble(fix.accuracyM)
    out.writeLong(fix.elapsedNs);out.writeLong(fix.wallMs);out.writeUTF(fix.boot);out.writeLong(fix.epoch)
    out.writeBoolean(fix.speedMps!=null);fix.speedMps?.let(out::writeDouble);out.writeBoolean(fix.mock)
  }
  private fun readFix(input: DataInputStream): WalkDistanceFix? {
    if(!input.readBoolean())return null
    val lat=input.readDouble();val lon=input.readDouble();val accuracy=input.readDouble()
    val ns=input.readLong();val wall=input.readLong();val boot=input.readUTF();val epoch=input.readLong()
    val speed=if(input.readBoolean())input.readDouble() else null
    return WalkDistanceFix(lat,lon,accuracy,ns,wall,boot,epoch,speed,input.readBoolean())
  }
  fun encode(s: WalkDistanceState): ByteArray {
    s.validate()
    val stream=object:ByteArrayOutputStream(){fun wipe(){buf.fill(0);reset()}}
    return try{
      val out=DataOutputStream(stream)
      out.writeInt(1);out.writeUTF(s.boot)
      listOf(s.epoch,s.boundaryNs,s.lastSeenNs,s.lastOrderedNs,s.gapAccountedNs).forEach(out::writeLong)
      out.writeBoolean(s.gapPending);out.writeBoolean(s.firstInSegment)
      writeFix(out,s.structural);writeFix(out,s.accepted)
      out.writeInt(s.window.size);s.window.forEach{writeFix(out,it)}
      out.writeDouble(s.measuredM);out.writeDouble(s.acceptedM);s.counts.forEach(out::writeLong)
      listOf(s.segments,s.gapMs,s.maxGapMs,s.routeRevision).forEach(out::writeLong)
      out.writeBoolean(s.mockObserved);out.writeBoolean(s.legacySession);out.writeBoolean(s.reacquirePending);out.flush();stream.toByteArray()
    }finally{stream.wipe();stream.close()}
  }
  fun decode(bytes: ByteArray): WalkDistanceState = try{
    DataInputStream(ByteArrayInputStream(bytes)).use{input->
      if(input.readInt()!=1)throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
      val boot=input.readUTF();val epoch=input.readLong();val boundary=input.readLong();val seen=input.readLong();val ordered=input.readLong();val accounted=input.readLong()
      val pending=input.readBoolean();val first=input.readBoolean();val structural=readFix(input);val accepted=readFix(input)
      val size=input.readInt();if(size !in 0..WalkDistancePolicyV1.STATIONARY_WINDOW)throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
      val window=List(size){readFix(input)?:throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")}
      val measured=input.readDouble();val meters=input.readDouble();val counts=List(7){input.readLong()}
      val s=WalkDistanceState(boot,epoch,boundary,seen,ordered,accounted,pending,first,structural,accepted,window,
        measured,meters,counts,input.readLong(),input.readLong(),input.readLong(),input.readLong(),input.readBoolean(),input.readBoolean(),input.readBoolean())
      if(input.available()!=0)throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
      s.validate()
    }
  }catch(_:Exception){throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")}
}
