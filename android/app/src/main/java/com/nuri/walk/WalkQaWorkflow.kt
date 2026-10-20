package com.nuri.walk

import android.content.Context
import android.util.AtomicFile
import java.io.File
import java.math.BigDecimal
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

// Owned, encrypted protocol state. Export reconstructs an explicit safe shape.
internal class WalkQaWorkflow(private val context:Context,private val storage:WalkStorage,private val actor:()->String) {
  private val performance=WalkQaPerformance(context)
  private val processIdentity=UUID.randomUUID().toString()
  private fun load(observationOnly:Boolean=false):JSONObject? {
    val row=storage.dao.qaProtocol()?:return null
    val bytes=storage.cipher.decrypt(WalkSealedBytes(row.nonce,row.ciphertext),WalkCipher.aad("qa-protocol","protocol-v1",row.revision))
    val value=try{JSONObject(String(bytes,Charsets.UTF_8))}catch(_:Exception){throw WalkFailure("WALK_QA_PROTOCOL_INVALID")}finally{bytes.fill(0)}
    if(value.getInt("schemaVersion")!=1)throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    if(value.getString("owner")!=actor()){
      if(observationOnly)return null
      throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
    }
    return value
  }
  private fun save(value:JSONObject,exportNow:Boolean=true){
    val row=storage.dao.qaProtocol()?:WalkQaProtocol()
    row.revision=Math.addExact(row.revision,1);value.put("revision",row.revision.toString())
    val bytes=value.toString().toByteArray(Charsets.UTF_8)
    val sealed=try{storage.cipher.encrypt(bytes,WalkCipher.aad("qa-protocol","protocol-v1",row.revision))}finally{bytes.fill(0)}
    row.nonce=sealed.nonce;row.ciphertext=sealed.ciphertext
    storage.transaction{storage.dao.saveQaProtocol(row)}
    if(exportNow)export(value)
  }
  private fun current(value:JSONObject):JSONObject? {
    val i=value.getInt("stepIndex");val steps=value.getJSONArray("steps")
    return if(i<steps.length())steps.getJSONObject(i)else null
  }
  private fun ownedSession(id:String):Pair<WalkLocalSession,WalkMetadata>{
    val row=storage.dao.session(id)?:throw WalkFailure("WALK_SESSION_DELETED");val meta=storage.metadata(row)
    if(meta.owner!=actor())throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
    if(meta.product!=null)throw WalkFailure("WALK_PRODUCT_SESSION_PROTECTED")
    return row to meta
  }
  private fun relink(value:JSONObject){
    val step=current(value)?:return
    if(step.optString("status")!="IN_PROGRESS"||step.has("sessionId")||!step.has("command"))return
    val receipt=storage.dao.receipt(step.getString("command"))
    if(receipt==null){if(step.optString("reservationProcess")!=processIdentity&&storage.dao.active()==null){step.put("status","NOT_STARTED");save(value)};return}
    if(receipt.outcome=="SUCCESS"||storage.dao.session(receipt.sessionId)?.runtimeState=="RECOVERY_REQUIRED"){
      val id=receipt.sessionId;val(_,meta)=ownedSession(id)
      if(meta.pet!=value.getString("pet"))throw WalkFailure("WALK_ACTIVE_SESSION_OWNER_MISMATCH")
      step.put("sessionId",id);save(value)
    }
  }
  fun state():String {
    val value=load()?:return "null";relink(value)
    export(value)
    return projection(value).toString()
  }
  fun configure(input:JSONObject):String {
    WalkQaContract.exact(input,setOf("mode","petId","openLabel","openMeters","urbanLabel","urbanMeters","scenario"))
    if(storage.dao.active()!=null)throw WalkFailure("WALK_ALREADY_ACTIVE")
    val old=load()
    if(old!=null&&!old.optBoolean("cleaned"))throw WalkFailure("WALK_QA_CLEANUP_REQUIRED")
    val mode=input.getString("mode");if(mode !in setOf("READINESS","PHYSICAL"))throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    val pet=UUID.fromString(input.getString("petId")).toString()
    val open=WalkQaContract.label(input.getString("openLabel"));val urban=WalkQaContract.label(input.getString("urbanLabel"))
    val openMeters=if(mode=="READINESS")0.0 else WalkQaContract.reference(input.getDouble("openMeters"))
    val urbanMeters=if(mode=="READINESS")0.0 else WalkQaContract.reference(input.getDouble("urbanMeters"))
    val scenario=input.getString("scenario")
    if(scenario!="ALL"&&scenario !in WalkQaContract.physicalSteps.dropLast(1))throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    val types=if(mode=="READINESS")WalkQaContract.readinessSteps else if(scenario=="ALL")WalkQaContract.physicalSteps else listOf(scenario,"CLEANUP")
    val value=JSONObject().put("schemaVersion",1).put("protocolId",UUID.randomUUID().toString()).put("owner",actor()).put("pet",pet)
      .put("mode",mode).put("stepIndex",0).put("openLabel",open).put("urbanLabel",urban)
      .put("openMeters",openMeters.toString()).put("urbanMeters",urbanMeters.toString()).put("cleaned",false)
      .put("steps",JSONArray().apply{types.forEach{put(JSONObject().put("stepType",it).put("status","NOT_STARTED"))}})
    save(value);return projection(value).toString()
  }
  fun reserve():Triple<String,String,Boolean>{
    val value=load()?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID");relink(value)
    val step=current(value)?:throw WalkFailure("WALK_QA_PROTOCOL_COMPLETE")
    if(step.getString("stepType")=="CLEANUP")throw WalkFailure("WALK_QA_CLEANUP_REQUIRED")
    if(step.getString("status")=="IN_PROGRESS")return Triple(value.getString("pet"),step.getString("command"),storage.dao.receipt(step.getString("command"))!=null)
    if(step.getString("status")!="NOT_STARTED"||storage.dao.active()!=null)throw WalkFailure("WALK_ALREADY_ACTIVE")
    val command=step.optString("command").takeIf{it.isNotEmpty()}?:UUID.randomUUID().toString()
    step.put("status","IN_PROGRESS").put("command",command).put("reservationProcess",processIdentity).put("performance",JSONObject())
    save(value);return Triple(value.getString("pet"),command,false)
  }
  fun link(result:String?,error:String?):String {
    val value=load()?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID");val step=current(value)?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    if(error!=null){step.put("status","FAILED").put("error",if(error.matches(Regex("WALK_[A-Z_]+")))error else "WALK_QA_FAILED")
      storage.dao.receipt(step.getString("command"))?.let{item->if(storage.dao.session(item.sessionId)!=null){ownedSession(item.sessionId);step.put("sessionId",item.sessionId)}}
    }
    else {val id=JSONObject(result?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID")).getString("sessionId");ownedSession(id);step.put("sessionId",id)}
    save(value);return projection(value).toString()
  }
  fun activeSession():String {
    val value=load()?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID");relink(value)
    return current(value)?.optString("sessionId")?.takeIf{it.isNotEmpty()}?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
  }
  fun finishIdentity():Triple<String,String,String>{
    val value=load()?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID");relink(value)
    val step=current(value)?:throw WalkFailure("WALK_QA_PROTOCOL_COMPLETE")
    val id=activeSession();val(row,_)=ownedSession(id)
    if(!step.has("finishCommand")){step.put("finishCommand",UUID.randomUUID().toString()).put("finishRevision",row.revision.toString());save(value)}
    return Triple(id,step.getString("finishCommand"),step.getString("finishRevision"))
  }
  fun observe(row:WalkLocalSession){
    val value=load(true)?:return;val step=current(value)?:return
    if(step.optString("sessionId")!=row.sessionId||step.optString("status")!="IN_PROGRESS")return
    val previous=step.getJSONObject("performance");val last=previous.optLong("sampleCount",0)
    performance.observe(previous)
    if(last!=previous.optLong("sampleCount",0))save(value)
  }
  fun markReboot():String {
    val value=load()?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID");val step=current(value)?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    if(step.getString("stepType")!="REBOOT")throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    val(row,_)=ownedSession(activeSession());val s=storage.distance(row)?:throw WalkFailure("WALK_DISTANCE_NOT_AVAILABLE")
    step.put("baseline",JSONObject().put("boot",s.boot).put("epoch",s.epoch).put("acceptedM",WalkDistanceEngineV1.decimal(s.acceptedM)).put("fixes",s.total))
    save(value);return projection(value).toString()
  }
  fun observeRecovery(row:WalkLocalSession,serviceRunning:Boolean){
    val value=load(true)?:return;val step=current(value)?:return
    if(step.optString("sessionId")!=row.sessionId||!step.has("baseline"))return
    val s=storage.distance(row)?:return
    if(s.boot!=walkBootIdentity(context)&&row.runtimeState=="RECOVERY_REQUIRED"&&!serviceRunning&&!step.optBoolean("noAutoRecoveryObserved")){
      step.put("noAutoRecoveryObserved",true);save(value)
    }
  }
  fun complete():String {
    val value=load()?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID");relink(value)
    val step=current(value)?:return projection(value).toString()
    if(step.optString("status")!="IN_PROGRESS")return projection(value).toString()
    val(row,meta)=ownedSession(activeSession())
    if(row.runtimeState!="FINISHED_LOCAL")throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    val s=storage.distance(row)?:throw WalkFailure("WALK_DISTANCE_NOT_AVAILABLE");s.validate()
    if(storage.dao.routeCount(row.sessionId)!=s.counts[0])throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
    val type=step.getString("stepType")
    val reference=if(type.startsWith("OPEN"))value.getString("openMeters").toDouble() else if(type.startsWith("URBAN"))value.getString("urbanMeters").toDouble() else 0.0
    val error=if(reference==0.0)0.0 else kotlin.math.abs(s.acceptedM-reference)*100/reference
    val routeSummary=WalkRouteProjection(storage).summary(row)
    val baseline=step.optJSONObject("baseline")
    val reboot=type!="REBOOT"||(baseline!=null&&s.boot!=baseline.getString("boot")&&s.epoch>baseline.getLong("epoch")&&s.acceptedM>baseline.getString("acceptedM").toDouble()&&step.optBoolean("noAutoRecoveryObserved"))
    val pass=when(type){
      "STATIONARY"->meta.timing.activeMs>=600000&&s.acceptedM<=20
      "OPEN_1"->error<=5
      "OPEN_2"->error<=5&&meta.pauses.isNotEmpty()
      "URBAN_1"->error<=10&&routeSummary.getInt("filteredTurnCount")>=3
      "URBAN_2"->error<=10&&s.gapMs>=45000&&s.segments>=2
      "REBOOT"->reboot
      "READINESS"->s.total>0
      else->false
    }
    val receipt=JSONObject().put("schemaVersion",1).put("receiptId",UUID.randomUUID().toString()).put("stepType",type)
      .put("routeLabel",if(type.startsWith("OPEN"))value.getString("openLabel")else if(type.startsWith("URBAN"))value.getString("urbanLabel")else type)
      .put("referenceDistanceM",WalkDistanceEngineV1.decimal(reference)).put("measuredDistanceM",WalkDistanceEngineV1.decimal(s.measuredM))
      .put("acceptedDistanceM",WalkDistanceEngineV1.decimal(s.acceptedM)).put("errorPercentage",BigDecimal.valueOf(error).stripTrailingZeros().toPlainString())
      .put("activeDurationMs",meta.timing.activeMs.toString()).put("pausedDurationMs",meta.timing.pausedMs.toString())
      .put("quality",distanceSummary(s,meta.timing.activeMs).getJSONObject("quality"))
      .put("routeSummary",routeSummary).put("performance",performance.summary(performance.observe(step.getJSONObject("performance"),true)))
      .put("pauseDistanceDeltaM","0").put("pauseObserved",meta.pauses.isNotEmpty()).put("rebootContract",if(type=="REBOOT")reboot else JSONObject.NULL)
      .put("algorithmVersion",1).put("policyVersion",1).put("result",if(pass)"PASS"else "FAIL").put("stableErrorCode",if(pass)JSONObject.NULL else "WALK_QA_ACCEPTANCE_FAILED")
    // Fractional diagnostics are strings, so canonical evidence hashing is portable.
    val route=receipt.getJSONObject("routeSummary");route.put("lengthDeviation",BigDecimal.valueOf(route.getDouble("lengthDeviation")).stripTrailingZeros().toPlainString())
    WalkQaContract.rejectPrivate(receipt);receipt.put("sha256",WalkQaContract.digest(receipt))
    step.put("receipt",receipt).put("status",if(pass)"COMPLETED"else "FAILED")
    value.put("stepIndex",value.getInt("stepIndex")+1);save(value)
    return projection(value).toString()
  }
  fun skip(input:JSONObject):String {
    WalkQaContract.exact(input,setOf("reason"));val reason=input.getString("reason")
    if(reason !in setOf("SAFETY","RESCHEDULE","GPS_UNAVAILABLE"))throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    val value=load()?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID");val step=current(value)?:throw WalkFailure("WALK_QA_PROTOCOL_COMPLETE")
    if(step.getString("status")=="IN_PROGRESS"||step.getString("stepType")=="CLEANUP")throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    step.put("status","SKIPPED_WITH_REASON").put("error",reason);value.put("stepIndex",value.getInt("stepIndex")+1);save(value)
    return projection(value).toString()
  }
  fun cleanup(postReturnReviewComplete:Boolean):String {
    val value=load()?:throw WalkFailure("WALK_QA_PROTOCOL_INVALID");val step=current(value)?:return projection(value).toString()
    if(step.getString("stepType")!="CLEANUP")throw WalkFailure("WALK_QA_PROTOCOL_INVALID")
    if(value.getString("mode")=="PHYSICAL"&&!postReturnReviewComplete)throw WalkFailure("WALK_QA_REVIEW_REQUIRED")
    val steps=value.getJSONArray("steps");var removed=0
    storage.transaction{
      for(i in 0 until steps.length()){
        val item=steps.getJSONObject(i);val id=item.optString("sessionId")
        if(id.isNotEmpty()){
          val(row,_)=ownedSession(id)
          if(row.activeSlot!=null)throw WalkFailure("WALK_QA_CLEANUP_REQUIRED")
          storage.dao.deleteChunks(id);storage.dao.deleteSessionReceipts(id);storage.dao.deleteSession(id);removed++
        }
      }
      for(i in 0 until steps.length()){val item=steps.getJSONObject(i)
        for(key in listOf("sessionId","command","finishCommand","finishRevision","reservationProcess","baseline","performance","noAutoRecoveryObserved"))item.remove(key)}
      val receipt=JSONObject().put("schemaVersion",1).put("receiptId",UUID.randomUUID().toString()).put("stepType","CLEANUP")
        .put("removedQaSessions",removed).put("temporaryRouteRemaining",0).put("result","PASS")
      WalkQaContract.rejectPrivate(receipt);receipt.put("sha256",WalkQaContract.digest(receipt))
      step.put("status","COMPLETED").put("receipt",receipt)
      value.put("cleaned",true).put("stepIndex",steps.length());save(value,false)
    }
    export(value)
    return projection(value).toString()
  }
  private fun projection(value:JSONObject):JSONObject=JSONObject().apply{
    put("schemaVersion",1);put("protocolId",value.getString("protocolId"));put("revision",value.getString("revision"))
    put("mode",value.getString("mode"));put("stepIndex",value.getInt("stepIndex"));put("cleaned",value.getBoolean("cleaned"))
    put("steps",JSONArray().apply{val steps=value.getJSONArray("steps");for(i in 0 until steps.length()){
      val item=steps.getJSONObject(i)
      put(JSONObject().put("stepType",item.getString("stepType")).put("status",item.getString("status"))
        .put("error",item.optString("error").takeIf{it.isNotEmpty()}?:JSONObject.NULL).put("receipt",item.optJSONObject("receipt")?:JSONObject.NULL))
    }})
  }.also(WalkQaContract::rejectPrivate)
  private fun export(value:JSONObject){
    val safe=projection(value);WalkQaContract.rejectPrivate(safe)
    safe.put("sha256",WalkQaContract.digest(safe))
    val parent=File(context.getExternalFilesDir(null)?:throw WalkFailure("WALK_QA_RECEIPT_EXPORT_FAILED"),"walk-qa-receipts")
    if(!parent.exists()&&!parent.mkdirs())throw WalkFailure("WALK_QA_RECEIPT_EXPORT_FAILED")
    val file=AtomicFile(File(parent,value.getString("protocolId")+".json"))
    val bytes=WalkQaContract.canonical(safe).toByteArray(Charsets.UTF_8)
    val stream=file.startWrite()
    try{stream.write(bytes);file.finishWrite(stream)}catch(_:Exception){file.failWrite(stream);throw WalkFailure("WALK_QA_RECEIPT_EXPORT_FAILED")}finally{bytes.fill(0)}
  }
}
