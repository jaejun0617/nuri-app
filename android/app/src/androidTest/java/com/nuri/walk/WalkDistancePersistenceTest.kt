package com.nuri.walk

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.location.Location
import android.os.SystemClock
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import javax.crypto.KeyGenerator
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WalkDistancePersistenceTest {
  private val context get()=InstrumentationRegistry.getInstrumentation().targetContext
  private val actor="11111111-1111-4111-8111-111111111111"
  private val pet="22222222-2222-4222-8222-222222222222"
  private fun id()=UUID.randomUUID().toString()
  private fun cipher():WalkCipher {val key=KeyGenerator.getInstance("AES").apply{init(256)}.generateKey();return WalkCipher{key}}
  private fun storage()=WalkStorage(context,cipher(),"walk-phase3-test-${id()}.db")
  private fun cleanup(store:WalkStorage){val file=File(requireNotNull(store.db.openHelper.writableDatabase.path));store.db.close();context.deleteDatabase(file.absolutePath)}
  private fun fixtureState(boot:String=walkBootIdentity(context)):WalkDistanceState {
    val engine=WalkDistanceEngineV1(androidWalkGeodesic)
    var s=engine.beginSegment(WalkDistanceState(),boot,1000000000L)
    for(i in 1..4){val f=WalkDistanceFix(0.0,i*0.0001,1.0,i*5000000000L,System.currentTimeMillis(),boot,1)
      s=engine.evaluate(s,f,f.elapsedNs+1000000,f.wallMs).state}
    return s
  }
  private fun row(store:WalkStorage,state:String="FINISHED_LOCAL"):WalkLocalSession {
    val r=WalkLocalSession().apply{sessionId=id();runtimeState=state;revision=1;activeSlot=if(state=="FINISHED_LOCAL")null else 1}
    store.writeMetadata(r,WalkMetadata(actor,pet,System.currentTimeMillis(),1,WalkTiming(SystemClock.elapsedRealtime(),System.currentTimeMillis(),60000,0)))
    store.transaction{store.dao.insertSession(r)};return r
  }
  private fun seedRoute(store:WalkStorage,row:WalkLocalSession){
    var meta=store.metadata(row)
    for(i in 1..4){val location=Location("public-synthetic").apply{latitude=0.0;longitude=i*0.0001;accuracy=1f;elapsedRealtimeNanos=i*5000000000L;time=System.currentTimeMillis()}
      meta=meta.copy(fixCount=meta.fixCount+1);store.appendPoint(row,encodeWalkFix(location,0),meta,true,1)}
  }
  private fun waitFor(operation:((String?,String?)->Unit)->Unit):String {
    val latch=CountDownLatch(1);var value:String?=null;var error:String?=null
    operation{v,e->value=v;error=e;latch.countDown()}
    assertTrue(latch.await(10,TimeUnit.SECONDS));assertNull(error);return value?:throw AssertionError("No native receipt")
  }
  @Test fun v1MigrationPreservesAllLifecycleStatesMetadataAndReceipts(){
    val schema=JSONObject(InstrumentationRegistry.getInstrumentation().context.assets.open("com.nuri.walk.WalkDatabase/1.json").bufferedReader().use{it.readText()}).getJSONObject("database")
    for(state in listOf("WALKING","PAUSED","FINISHED_LOCAL","RECOVERY_REQUIRED")){
      val name="walk-phase3-migration-${id()}.db";val file=File(context.noBackupFilesDir,name);val crypto=cipher();val session=id()
      val metadata=WalkCodec.encode(WalkMetadata(actor,pet,10000,1,WalkTiming(1,10000,12345,0)))
      val sealed=crypto.encrypt(metadata,WalkCipher.aad(session,"metadata",1));metadata.fill(0)
      val old=SQLiteDatabase.openOrCreateDatabase(file,null)
      val entities=schema.getJSONArray("entities")
      for(i in 0 until entities.length()){
        val entity=entities.getJSONObject(i);old.execSQL(entity.getString("createSql").replace("\${TABLE_NAME}",entity.getString("tableName")))
        val indexes=entity.getJSONArray("indices");for(j in 0 until indexes.length())old.execSQL(indexes.getJSONObject(j).getString("createSql").replace("\${TABLE_NAME}",entity.getString("tableName")))
      }
      old.execSQL("CREATE TABLE room_master_table (id INTEGER PRIMARY KEY, identity_hash TEXT)")
      old.execSQL("INSERT INTO room_master_table VALUES(42,?)",arrayOf(schema.getString("identityHash")))
      old.insertOrThrow("walk_local_sessions",null,ContentValues().apply{
        put("sessionId",session);if(state=="FINISHED_LOCAL")putNull("activeSlot")else put("activeSlot",1)
        put("runtimeState",state);put("revision",1);put("metadataRevision",1);put("metadataNonce",sealed.nonce);put("metadataCiphertext",sealed.ciphertext)
        put("chunkCount",0);put("updatedAt",10000)
      })
      old.execSQL("INSERT INTO walk_command_receipts(commandId,sessionId,inputDigest,outcome,resultingRevision) VALUES(?,?,?,?,?)",arrayOf<Any>(id(),session,"public-fixture","PENDING",0))
      old.version=1;old.close()
      val store=WalkStorage(context,crypto,name)
      try{
        val migrated=store.dao.session(session)
        assertEquals(state,migrated.runtimeState);assertArrayEquals(sealed.ciphertext,migrated.metadataCiphertext)
        assertEquals(12345,store.metadata(migrated).timing.activeMs);assertNull(store.distance(migrated))
        assertEquals(1,store.dao.receiptCount(session));assertEquals(2,store.db.openHelper.writableDatabase.version)
      }finally{cleanup(store)}
    }
  }
  @Test fun encryptedDistanceReadbackAndCorruptionNeverResetExistingData(){
    val store=storage()
    try{
      val r=row(store);val state=fixtureState();store.writeDistance(r,state);store.transaction{store.dao.updateSession(r)}
      val restored=store.distance(store.dao.session(r.sessionId))!!
      assertEquals(state.acceptedM,restored.acceptedM,0.0);assertEquals(state.counts,restored.counts)
      val original=r.metadataCiphertext.clone()
      r.distanceCiphertext!![0]=(r.distanceCiphertext!![0].toInt() xor 1).toByte();store.transaction{store.dao.updateSession(r)}
      try{store.distance(store.dao.session(r.sessionId));fail("Expected corruption denial")}catch(e:WalkFailure){assertEquals("WALK_LOCAL_ENCRYPTION_ERROR",e.code)}
      assertArrayEquals(original,store.dao.session(r.sessionId).metadataCiphertext);assertEquals(1,store.dao.sessionCount())
    }finally{cleanup(store)}
  }
  @Test fun boundedProjectionPreservesSegmentsAndNeverReturnsRawHistory(){
    val store=storage()
    try{
      val r=row(store);var meta=store.metadata(r);val state=fixtureState();store.writeDistance(r,state)
      for(i in 0..700){val location=Location("public-synthetic").apply{latitude=0.0;longitude=i*0.00001;accuracy=1f;elapsedRealtimeNanos=i*5000000000L;time=System.currentTimeMillis()}
        meta=meta.copy(fixCount=meta.fixCount+1)
        store.appendPoint(r,encodeWalkFix(location,if(i<400)0 else 1),meta,true,if(i<400)1 else 2)
      }
      val projector=WalkRouteProjection(store);val first=projector.page(r,state,"FIRST",-1)
      assertTrue(first.getBoolean("hasLater"));assertEquals("701",first.getString("filteredPointCount"))
      val last=projector.page(r,state,"AFTER",first.getString("endCursor").toLong())
      assertFalse(last.getBoolean("hasLater"));assertTrue(last.getBoolean("hasEarlier"))
      assertFalse(first.has("rawRoute"));val summary=projector.summary(r)
      assertEquals(701,summary.getInt("filteredPointCount"));assertEquals(0,summary.getInt("endpointLoss"));assertEquals(0,summary.getInt("segmentMerge"))
      assertTrue(summary.getDouble("lengthDeviation")<=0.015)
    }finally{cleanup(store)}
  }
  @Test fun wizardPersistsSafeReceiptsAndDeletesOnlyItsOwnQaSession(){
    val store=storage();var exported:File?=null
    try{
      val untouched=row(store);val qa=WalkQaWorkflow(context,store){actor}
      val config=JSONObject().put("mode","READINESS").put("petId",pet).put("openLabel","OPEN_A").put("openMeters",0).put("urbanLabel","URBAN_A").put("urbanMeters",0).put("scenario","ALL")
      val configured=JSONObject(qa.configure(config));val protocolId=configured.getString("protocolId")
      exported=File(context.getExternalFilesDir(null),"walk-qa-receipts/$protocolId.json")
      qa.reserve();val r=row(store);store.writeDistance(r,fixtureState());store.transaction{store.dao.updateSession(r)}
      seedRoute(store,r)
      qa.link(JSONObject().put("sessionId",r.sessionId).toString(),null)
      val final=JSONObject(qa.complete());assertEquals(1,final.getInt("stepIndex"))
      val restored=WalkQaWorkflow(context,store){actor};assertEquals(1,JSONObject(restored.state()).getInt("stepIndex"))
      val safe=JSONObject(exported.readText());val digest=safe.getString("sha256");safe.remove("sha256")
      assertEquals(digest,WalkQaContract.digest(safe));WalkQaContract.rejectPrivate(safe)
      assertFalse(exported.readText().contains(actor));assertFalse(exported.readText().contains(pet));assertFalse(exported.readText().contains("latitude"))
      try{WalkQaWorkflow(context,store){"33333333-3333-4333-8333-333333333333"}.state();fail("Expected owner denial")}
      catch(e:WalkFailure){assertEquals("WALK_ACTIVE_SESSION_OWNER_MISMATCH",e.code)}
      assertTrue(JSONObject(restored.cleanup(false)).getBoolean("cleaned"))
      assertNull(store.dao.session(r.sessionId));assertNotNull(store.dao.session(untouched.sessionId))
    }finally{exported?.delete();cleanup(store)}
  }
  @Test fun receiptAllowlistRejectsNestedPrivateAndUnknownFields(){
    for(key in listOf("latitude","longitude","userId","token","privateOpaquePayload")){
      try{WalkQaContract.rejectPrivate(JSONObject().put("performance",JSONObject().put(key,"public-fixture")));fail("Expected private-field denial")}
      catch(e:WalkFailure){assertEquals("WALK_QA_RECEIPT_PRIVATE_FIELD",e.code)}
    }
  }
  @Test fun physicalCleanupRequiresReviewAndEveryStepHasItsOwnReceipt(){
    val store=storage();var exported:File?=null
    try{
      val qa=WalkQaWorkflow(context,store){actor}
      val config=JSONObject().put("mode","PHYSICAL").put("petId",pet).put("openLabel","OPEN_A").put("openMeters",1000)
        .put("urbanLabel","URBAN_A").put("urbanMeters",1000).put("scenario","STATIONARY")
      val value=JSONObject(qa.configure(config))
      exported=File(context.getExternalFilesDir(null),"walk-qa-receipts/${value.getString("protocolId")}.json")
      qa.skip(JSONObject().put("reason","RESCHEDULE"))
      try{qa.cleanup(false);fail("Expected review gate")}catch(e:WalkFailure){assertEquals("WALK_QA_REVIEW_REQUIRED",e.code)}
      val cleaned=JSONObject(qa.cleanup(true));assertTrue(cleaned.getBoolean("cleaned"))
      val receipt=cleaned.getJSONArray("steps").getJSONObject(1).getJSONObject("receipt")
      assertTrue(receipt.has("receiptId"));val digest=receipt.getString("sha256");receipt.remove("sha256")
      assertEquals(digest,WalkQaContract.digest(receipt));assertEquals(0,receipt.getInt("temporaryRouteRemaining"))
    }finally{exported?.delete();cleanup(store)}
  }
  @Test fun reservedStartRecoversAndPerformanceCountersCannotGoNegativeAfterProcessLoss(){
    val store=storage();var exported:File?=null
    try{
      val first=WalkQaWorkflow(context,store){actor}
      val value=JSONObject(first.configure(JSONObject().put("mode","READINESS").put("petId",pet).put("openLabel","OPEN_A").put("openMeters",0)
        .put("urbanLabel","URBAN_A").put("urbanMeters",0).put("scenario","ALL")))
      exported=File(context.getExternalFilesDir(null),"walk-qa-receipts/${value.getString("protocolId")}.json")
      val command=first.reserve().second
      val recovered=WalkQaWorkflow(context,store){actor}
      assertEquals("NOT_STARTED",JSONObject(recovered.state()).getJSONArray("steps").getJSONObject(0).getString("status"))
      assertEquals(command,recovered.reserve().second)
      val metrics=JSONObject().put("_frameProcess","public-previous-process").put("_lastFrames",99999).put("_lastLateFrames",99999)
        .put("appVsyncFrames",10).put("appVsyncLateFrames",2)
      val safe=WalkQaPerformance(context).summary(WalkQaPerformance(context).observe(metrics,true))
      assertEquals(10,safe.getLong("appVsyncFrames"));assertEquals(2,safe.getLong("appVsyncLateFrames"))
      WalkQaContract.rejectPrivate(safe)
    }finally{exported?.delete();cleanup(store)}
  }
  private class FakeSource:WalkLocationSource{
    override var subscribed=false;var emit:((Location)->Unit)?=null
    override fun start(onFix:(Location)->Unit,onAvailability:(Boolean)->Unit,done:(String?)->Unit){subscribed=true;emit=onFix;done(null)}
    override fun stop(){subscribed=false;emit=null}
  }
  private class FakeService:WalkServiceHandle{
    override fun end()=Unit
    override fun refresh(state:String,activeMs:Long,sessionId:String,revision:Long,fixCount:Long,chunkCount:Long)=Unit
  }
  @Test fun recoveredDistanceAndPauseBoundariesKeepCreditAndDoNotBridgeOldBoot(){
    val store=storage();val source=FakeSource();var runtime:WalkRuntime?=null
    fun create():WalkRuntime=WalkRuntime(context,store,source,testGate={_,_->null}){r,s,c->r.attach(FakeService(),s,c)}
    try{
      val first=create();runtime=first;waitFor{first.bindOwner(actor,it)}
      val started=JSONObject(waitFor{first.start(pet,id(),"0",true,it)});val session=started.getString("sessionId")
      val row=store.dao.session(session);val old=fixtureState("public-previous-boot")
      store.writeDistance(row,old);store.transaction{store.dao.updateSession(row)}
      seedRoute(store,row)
      first.closeForTest();val recovered=create();runtime=recovered;waitFor{recovered.bindOwner(actor,it)}
      val checkpoint=JSONObject(waitFor{recovered.getSnapshot(it)})
      assertEquals("RECOVERY_REQUIRED",checkpoint.getString("runtimeState"));assertFalse(source.subscribed)
      assertEquals(old.acceptedM,checkpoint.getJSONObject("distanceSummary").getString("acceptedDistanceM").toDouble(),0.0)
      val resumed=JSONObject(waitFor{recovered.mutate("RESUME_RECOVERED",session,id(),checkpoint.getString("revision"),true,it)})
      val fresh=Location("public-synthetic").apply{latitude=1.0;longitude=1.0;accuracy=1f;time=System.currentTimeMillis();elapsedRealtimeNanos=SystemClock.elapsedRealtimeNanos()}
      source.emit?.invoke(fresh)
      val after=JSONObject(waitFor{recovered.getSnapshot(it)})
      assertEquals(old.acceptedM,after.getJSONObject("distanceSummary").getString("acceptedDistanceM").toDouble(),0.0)
      assertEquals(old.segments+1,after.getJSONObject("distanceSummary").getJSONObject("quality").getLong("segmentCount"))
      val paused=JSONObject(waitFor{recovered.mutate("PAUSE",session,id(),resumed.getString("revision"),true,it)})
      assertFalse(source.subscribed)
      val finished=JSONObject(waitFor{recovered.mutate("FINISH",session,id(),paused.getString("revision"),true,it)})
      assertEquals("FINISHED_LOCAL",finished.getString("runtimeState"));assertEquals(old.acceptedM,finished.getJSONObject("distanceSummary").getString("acceptedDistanceM").toDouble(),0.0)
    }finally{runtime?.closeForTest();cleanup(store)}
  }
}
