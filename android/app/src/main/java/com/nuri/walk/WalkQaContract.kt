package com.nuri.walk

import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

internal object WalkQaContract {
  val physicalSteps=listOf("STATIONARY","OPEN_1","OPEN_2","URBAN_1","URBAN_2","REBOOT","CLEANUP")
  val readinessSteps=listOf("READINESS","CLEANUP")
  val statuses=setOf("NOT_STARTED","IN_PROGRESS","COMPLETED","FAILED","SKIPPED_WITH_REASON")
  val safeKeys=setOf("schemaVersion","protocolId","revision","mode","stepIndex","cleaned","steps","stepType","status","error","receipt","sha256",
    "receiptId","routeLabel","referenceDistanceM","measuredDistanceM","acceptedDistanceM","errorPercentage","activeDurationMs","pausedDurationMs",
    "quality","routeSummary","performance","pauseDistanceDeltaM","pauseObserved","rebootContract","algorithmVersion","policyVersion","result","stableErrorCode",
    "totalFixCount","acceptedFixCount","rejectedAccuracyCount","rejectedTimestampCount","rejectedDuplicateCount","rejectedJumpCount","rejectedSpeedCount","stationarySuppressedCount",
    "segmentCount","gpsGapDurationMs","maxGapDurationMs","mockLocationObserved","filteredPointCount","simplifiedPointCount","filteredRouteDistanceM","simplifiedRouteDistanceM",
    "lengthDeviation","endpointLoss","segmentMerge","gapBridgeM","turnLoss","filteredTurnCount","preservedTurnCount","batteryStart","batteryEnd","batteryTemperatureMaxC","thermalMax","cpuPeakPercent","cpuObservedMs",
    "pssStartKb","pssEndKb","pssPeakKb","rssPeakKb","nativeHeapStartBytes","nativeHeapEndBytes","nativeHeapPeakBytes","observedMs","screenOnMs","screenOffMs","backgroundMs",
    "sampleCount","appVsyncFrames","appVsyncLateFrames","frameScope","jsMemoryStatus","removedQaSessions","temporaryRouteRemaining")
  fun exact(input:JSONObject,keys:Set<String>){
    if(input.keys().asSequence().toSet()!=keys)throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
  }
  fun label(value:String):String {
    if(!value.matches(Regex("[A-Z][A-Z0-9_-]{0,31}")))throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    return value
  }
  fun reference(value:Double):Double {
    if(!value.isFinite()||value !in 500.0..2000.0)throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    return value
  }
  fun canonical(value:Any?):String=when(value){
    null,JSONObject.NULL->"null"
    is JSONObject->value.keys().asSequence().toList().sorted().joinToString(",","{","}"){JSONObject.quote(it)+":"+canonical(value.get(it))}
    is JSONArray->(0 until value.length()).joinToString(",","[","]"){canonical(value.get(it))}
    is String->JSONObject.quote(value)
    is Boolean->value.toString()
    is Number->{val n=value.toLong();if(value.toDouble()!=n.toDouble())throw WalkFailure("WALK_QA_PROTOCOL_INVALID");n.toString()}
    else->throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
  }
  fun digest(value:JSONObject)=MessageDigest.getInstance("SHA-256").digest(canonical(value).toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
  fun rejectPrivate(value:Any?){
    if(value is JSONObject){
      val forbidden=setOf("latitude","longitude","route","rawRoute","coordinates","owner","pet","session","sessionId","userId","petId","token","credential","email","url","path","baseline","command")
      value.keys().forEach{key->if(key in forbidden||key.startsWith("_")||key !in safeKeys)throw WalkFailure("WALK_QA_RECEIPT_PRIVATE_FIELD");rejectPrivate(value.get(key))}
    }else if(value is JSONArray)for(i in 0 until value.length())rejectPrivate(value.get(i))
  }
}
