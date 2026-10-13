@file:Suppress("DEPRECATION")
package com.nuri.walk

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Debug
import android.os.PowerManager
import android.os.Process
import android.os.SystemClock
import android.system.Os
import android.system.OsConstants
import android.view.Choreographer
import java.io.File
import java.math.BigDecimal
import java.util.UUID
import java.util.concurrent.atomic.AtomicLong
import org.json.JSONObject

// App-vsync estimate, not a claim about Google Maps GPU/Surface rendering.
internal object WalkQaFrames {
  val processIdentity=UUID.randomUUID().toString()
  private var visible=false
  private var lastNs=0L
  private var budgetNs=16666667L
  val frames=AtomicLong(0)
  val lateFrames=AtomicLong(0)
  private val callback=object:Choreographer.FrameCallback{
    override fun doFrame(now:Long){
      if(!visible)return
      if(WalkVisibility.resumed){
        if(lastNs>0&&now-lastNs>budgetNs*2)lateFrames.incrementAndGet()
        frames.incrementAndGet();lastNs=now
      }else lastNs=0
      Choreographer.getInstance().postFrameCallback(this)
    }
  }
  fun visible(value:Boolean,refreshHz:Float){
    if(visible==value)return
    visible=value;lastNs=0
    if(refreshHz.isFinite()&&refreshHz>0)budgetNs=(1000000000.0/refreshHz).toLong()
    if(value)Choreographer.getInstance().postFrameCallback(callback)
    else Choreographer.getInstance().removeFrameCallback(callback)
  }
}

internal class WalkQaPerformance(private val context:Context) {
  private fun number(value:Double)=BigDecimal.valueOf(value).stripTrailingZeros().toPlainString()
  fun observe(state:JSONObject,force:Boolean=false):JSONObject {
    val now=SystemClock.elapsedRealtime();val boot=walkBootIdentity(context)
    val last=state.optLong("_lastMono",0)
    if(!force&&last>0&&state.optString("_boot")==boot&&now>=last&&now-last<30000)return state
    val memory=Debug.MemoryInfo();Debug.getMemoryInfo(memory)
    val battery=context.registerReceiver(null,IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    val level=battery?.getIntExtra(BatteryManager.EXTRA_LEVEL,-1)?:-1
    val scale=battery?.getIntExtra(BatteryManager.EXTRA_SCALE,-1)?:-1
    val percent=if(level>=0&&scale>0)(level*100/scale)else null
    val temperature=battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE,Int.MIN_VALUE)?.takeIf{it!=Int.MIN_VALUE}?.let{it/10.0}
    val power=context.getSystemService(Context.POWER_SERVICE)as PowerManager
    val cpu=Process.getElapsedCpuTime()
    val valid=state.optString("_boot")==boot&&last>0&&now>last&&cpu>=state.optLong("_lastCpu",0)
    val delta=if(valid)now-last else 0L
    val cpuPercent=if(valid)(cpu-state.optLong("_lastCpu"))*100.0/delta else 0.0
    val rss=try{File("/proc/self/statm").readText().trim().split(Regex("\\s+"))[1].toLong()*Os.sysconf(OsConstants._SC_PAGESIZE)/1024}catch(_:Exception){null}
    if(!state.has("batteryStart"))state.put("batteryStart",percent?:JSONObject.NULL)
    state.put("batteryEnd",percent?:JSONObject.NULL)
    state.put("batteryTemperatureMaxC",temperature?.let{number(maxOf(it,state.optString("batteryTemperatureMaxC",it.toString()).toDouble()))}?:JSONObject.NULL)
    state.put("thermalMax",maxOf(state.optInt("thermalMax",0),if(android.os.Build.VERSION.SDK_INT>=29)power.currentThermalStatus else 0))
    state.put("cpuPeakPercent",number(maxOf(cpuPercent,state.optString("cpuPeakPercent","0").toDouble())))
    state.put("cpuObservedMs",(state.optString("cpuObservedMs","0").toLong()+(if(valid)cpu-state.optLong("_lastCpu")else 0)).toString())
    state.put("pssPeakKb",maxOf(memory.totalPss.toLong(),state.optLong("pssPeakKb",0)))
    if(!state.has("pssStartKb"))state.put("pssStartKb",memory.totalPss)
    state.put("pssEndKb",memory.totalPss)
    state.put("rssPeakKb",rss?.let{maxOf(it,state.optLong("rssPeakKb",0))}?:JSONObject.NULL)
    state.put("nativeHeapPeakBytes",maxOf(Debug.getNativeHeapAllocatedSize(),state.optString("nativeHeapPeakBytes","0").toLong()).toString())
    if(!state.has("nativeHeapStartBytes"))state.put("nativeHeapStartBytes",Debug.getNativeHeapAllocatedSize().toString())
    state.put("nativeHeapEndBytes",Debug.getNativeHeapAllocatedSize().toString())
    state.put("observedMs",(state.optString("observedMs","0").toLong()+delta).toString())
    val key=if(power.isInteractive)"screenOnMs" else "screenOffMs"
    state.put(key,(state.optString(key,"0").toLong()+delta).toString())
    if(!WalkVisibility.resumed)state.put("backgroundMs",(state.optString("backgroundMs","0").toLong()+delta).toString())
    state.put("sampleCount",state.optLong("sampleCount",0)+1)
    // Process-local frame counters reset after process loss. Preserve the rollup,
    // but never subtract a previous process's counter from the new process.
    val sameProcess=state.optString("_frameProcess")==WalkQaFrames.processIdentity
    val frames=WalkQaFrames.frames.get();val late=WalkQaFrames.lateFrames.get()
    state.put("appVsyncFrames",state.optLong("appVsyncFrames",0)+(if(sameProcess)maxOf(0,frames-state.optLong("_lastFrames",frames))else 0))
    state.put("appVsyncLateFrames",state.optLong("appVsyncLateFrames",0)+(if(sameProcess)maxOf(0,late-state.optLong("_lastLateFrames",late))else 0))
    state.put("_frameProcess",WalkQaFrames.processIdentity);state.put("_lastFrames",frames);state.put("_lastLateFrames",late)
    state.put("_boot",boot);state.put("_lastMono",now);state.put("_lastCpu",cpu)
    return state
  }
  fun summary(state:JSONObject):JSONObject=JSONObject().apply{
    for(key in listOf("batteryStart","batteryEnd","batteryTemperatureMaxC","thermalMax","cpuPeakPercent","cpuObservedMs","pssStartKb","pssEndKb","pssPeakKb","rssPeakKb","nativeHeapStartBytes","nativeHeapEndBytes","nativeHeapPeakBytes","observedMs","screenOnMs","screenOffMs","backgroundMs","sampleCount","appVsyncFrames","appVsyncLateFrames"))
      put(key,if(state.has(key))state.get(key)else JSONObject.NULL)
    put("frameScope","APP_VSYNC_ESTIMATE_NOT_MAP_GPU")
    put("jsMemoryStatus","PUBLIC_HERMES_RELEASE_API_UNAVAILABLE")
  }
}
