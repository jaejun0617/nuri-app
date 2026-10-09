package com.nuri.ui

import android.graphics.Canvas
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.views.view.ReactViewGroup
import com.qmdeve.blurview.util.Utils

/** Keep foreground controls out of backdrop sampling, not out of normal rendering. */
internal class BlurCaptureExclusionView(context: ThemedReactContext) : ReactViewGroup(context) {
  override fun draw(canvas: Canvas) {
    if (Utils.sIsGlobalCapturing) return
    super.draw(canvas)
  }

  override fun dispatchDraw(canvas: Canvas) {
    if (Utils.sIsGlobalCapturing) return
    super.dispatchDraw(canvas)
  }
}

internal class BlurCaptureExclusionManager : ViewGroupManager<BlurCaptureExclusionView>() {
  override fun getName() = "NuriBlurCaptureExclusion"

  override fun createViewInstance(context: ThemedReactContext) = BlurCaptureExclusionView(context)
}

class BlurCaptureExclusionPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = emptyList()

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
    listOf(BlurCaptureExclusionManager())
}
