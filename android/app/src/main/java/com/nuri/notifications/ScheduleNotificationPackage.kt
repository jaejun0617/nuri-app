@file:Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")

package com.nuri.notifications

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ScheduleNotificationPackage : ReactPackage {
  override fun createNativeModules(
    reactContext: ReactApplicationContext,
  ): List<NativeModule> {
    return listOf(ScheduleNotificationModule(reactContext))
  }

  @Suppress("DEPRECATION")
  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
