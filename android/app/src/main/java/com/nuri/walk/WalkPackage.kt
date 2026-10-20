@file:Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
package com.nuri.walk

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager
import com.nuri.BuildConfig
import java.util.UUID

class WalkPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = listOf(WalkModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

class WalkModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val runtime get() = WalkRuntime.get(context)
  private var listeners = 0
  override fun getName() = "NuriWalk"
  override fun getConstants(): Map<String, Any> = mapOf("qaEnabled" to BuildConfig.NURI_SECURITY_QA, "runtimeVersion" to 1, "distanceApiVersion" to 1, "productApiVersion" to 1)
  private fun reply(promise: Promise): (String?, String?) -> Unit = { result, error ->
    if (error != null) promise.reject(error, error) else promise.resolve(result)
  }
  @ReactMethod fun setOwner(ownerId: String?, promise: Promise) { runtime.bindOwner(ownerId, reply(promise)) }
  @ReactMethod fun startWalk(petId: String, commandId: String, expectedRevision: String, promise: Promise) {
    runtime.start(petId, commandId, expectedRevision, context.currentActivity != null && WalkVisibility.resumed, reply(promise))
  }
  @ReactMethod fun pauseWalk(sessionId: String, commandId: String, revision: String, promise: Promise) = command("PAUSE", sessionId, commandId, revision, promise)
  @ReactMethod fun resumeWalk(sessionId: String, commandId: String, revision: String, promise: Promise) = command("RESUME", sessionId, commandId, revision, promise)
  @ReactMethod fun finishWalk(sessionId: String, commandId: String, revision: String, promise: Promise) = command("FINISH", sessionId, commandId, revision, promise)
  @ReactMethod fun recoverPause(sessionId: String, commandId: String, revision: String, promise: Promise) = command("RECOVER_PAUSE", sessionId, commandId, revision, promise)
  @ReactMethod fun resumeRecoveredWalk(sessionId: String, commandId: String, revision: String, promise: Promise) = command("RESUME_RECOVERED", sessionId, commandId, revision, promise)
  @ReactMethod fun discardRecoverableWalk(sessionId: String, commandId: String, revision: String, promise: Promise) = command("DISCARD", sessionId, commandId, revision, promise)
  private fun command(type: String, session: String, id: String, revision: String, promise: Promise) {
    runtime.mutate(type, session, id, revision, context.currentActivity != null && WalkVisibility.resumed, reply(promise))
  }
  @ReactMethod fun getSnapshot(promise: Promise) { runtime.getSnapshot(reply(promise)) }
  @ReactMethod fun getRecoverableSession(promise: Promise) { runtime.getSnapshot(reply(promise)) }
  @ReactMethod fun productGetBinding(ownerId: String, promise: Promise) { runtime.productBinding(ownerId, reply(promise)) }
  @ReactMethod fun productCommand(ownerId: String, binding: String, operation: String, input: String, promise: Promise) {
    runtime.productCommand(ownerId, binding, operation, input, context.currentActivity != null && WalkVisibility.resumed, reply(promise))
  }
  @ReactMethod fun createCommandId(promise: Promise) { promise.resolve(UUID.randomUUID().toString()) }
  @ReactMethod fun getRoutePage(direction:String,cursor:String,revision:String,promise:Promise){runtime.getRoutePage(direction,cursor,revision,reply(promise))}
  @ReactMethod fun qaCommand(operation:String,input:String,promise:Promise){runtime.qaCommand(operation,input,reply(promise))}
  @ReactMethod fun noteQaMapVisible(visible:Boolean){
    if(!BuildConfig.NURI_SECURITY_QA)return
    context.runOnUiQueueThread{
      @Suppress("DEPRECATION") val hz=context.currentActivity?.windowManager?.defaultDisplay?.refreshRate?:60f
      WalkQaFrames.visible(visible,hz)
    }
  }
  @ReactMethod fun stopForLogout(commandId: String, revision: String, promise: Promise) {
    runtime.stopForLogout(if (commandId.isEmpty()) UUID.randomUUID().toString() else commandId, revision, reply(promise))
  }
  @ReactMethod fun addListener(eventName: String) {
    if (eventName != "NuriWalkSnapshot") return
    listeners++
    runtime.observe { snapshot ->
      if (context.hasActiveReactInstance()) try {
        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("NuriWalkSnapshot", snapshot)
      } catch (_: RuntimeException) { /* JS projection may be gone; native checkpoint remains canonical. */ }
    }
  }
  @ReactMethod fun removeListeners(count: Double) {
    listeners = (listeners - count.toInt().coerceAtLeast(0)).coerceAtLeast(0)
    if (listeners == 0) runtime.observe(null)
  }
  override fun invalidate() { runtime.observe(null); super.invalidate() }
}
