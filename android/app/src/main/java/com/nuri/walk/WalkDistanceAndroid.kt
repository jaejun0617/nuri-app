package com.nuri.walk

import android.content.Context
import android.location.Location
import android.os.Build
import android.provider.Settings
import org.json.JSONObject
import java.nio.ByteBuffer

internal val androidWalkGeodesic=WalkGeodesic{a,b->
  val result=FloatArray(1)
  Location.distanceBetween(a.latitude,a.longitude,b.latitude,b.longitude,result)
  result[0].toDouble()
}
internal fun walkBootIdentity(context:Context):String = try{
  "boot:${Settings.Global.getInt(context.contentResolver,Settings.Global.BOOT_COUNT)}"
}catch(_:Exception){throw WalkFailure("WALK_CLOCK_DISCONTINUITY")}
internal fun distanceFix(location:Location,boot:String,epoch:Long)=WalkDistanceFix(
  location.latitude,location.longitude,location.accuracy.toDouble(),location.elapsedRealtimeNanos,location.time,boot,epoch,
  if(location.hasSpeed())location.speed.toDouble() else null,
  if(Build.VERSION.SDK_INT>=31)location.isMock else @Suppress("DEPRECATION") location.isFromMockProvider,
)
internal fun distanceSummary(s:WalkDistanceState,activeMs:Long):JSONObject = JSONObject().apply{
  s.validate()
  put("algorithmVersion",1);put("policyVersion",1)
  put("measuredDistanceM",WalkDistanceEngineV1.decimal(s.measuredM));put("acceptedDistanceM",WalkDistanceEngineV1.decimal(s.acceptedM))
  put("routeRevision",s.routeRevision.toString())
  put("recommendation",WalkDistanceEngineV1(androidWalkGeodesic).recommendation(s,activeMs))
  put("gpsSignal",if(s.gapPending)"GPS_LOST" else if(s.reacquirePending||s.structural==null||s.structural.accuracyM>WalkDistancePolicyV1.MAX_ACCURACY_M)"GPS_WEAK" else "GPS_READY")
  put("quality",JSONObject().apply{
    put("schemaVersion",1);put("totalFixCount",s.total);put("acceptedFixCount",s.counts[0])
    put("rejectedAccuracyCount",s.counts[1]);put("rejectedTimestampCount",s.counts[2]);put("rejectedDuplicateCount",s.counts[3])
    put("rejectedJumpCount",s.counts[4]);put("rejectedSpeedCount",s.counts[5]);put("stationarySuppressedCount",s.counts[6])
    put("segmentCount",s.segments);put("gpsGapDurationMs",s.gapMs.toString());put("maxGapDurationMs",s.maxGapMs.toString());put("mockLocationObserved",s.mockObserved)
  })
}
internal fun decodedRouteFix(bytes:ByteArray,segment:Long):WalkDistanceFix {
  if(bytes.size!=59)throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
  val b=ByteBuffer.wrap(bytes)
  if(b.int!=1)throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
  b.long
  return WalkDistanceFix(b.double,b.double,b.float.toDouble(),b.long,b.long,"route",segment)
}
