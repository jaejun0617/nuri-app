@file:Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")

package com.nuri.ui

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.nuri.MainActivity

class LaunchPresentationPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(LaunchPresentationModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

private class LaunchPresentationModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "NuriLaunchPresentation"

  @ReactMethod
  fun finish(promise: Promise) {
    val activity = reactApplicationContext.currentActivity as? MainActivity
    if (activity == null) { promise.resolve(false); return }
    activity.runOnUiThread {
      if (activity.isDestroyed) { promise.resolve(false); return@runOnUiThread }
      activity.finishLaunchPresentation()
      promise.resolve(true)
    }
  }
}
