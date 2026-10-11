@file:Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")

package com.nuri.qa

import android.graphics.Bitmap
import android.graphics.Color
import android.util.Base64
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.nuri.BuildConfig
import java.io.ByteArrayOutputStream

class SecurityQaPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    if (BuildConfig.NURI_SECURITY_QA) listOf(SecurityQaModule(context)) else emptyList()
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

private class SecurityQaModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "NuriSecurityQa"
  override fun getConstants(): Map<String, Any> = mapOf("enabled" to BuildConfig.NURI_SECURITY_QA)

  // Public synthetic pixels only. No file access, credential access or arbitrary input.
  @ReactMethod
  fun image(mime: String, promise: Promise) {
    if (!BuildConfig.NURI_SECURITY_QA || (mime != "image/jpeg" && mime != "image/png")) {
      promise.reject("QA_IMAGE_UNAVAILABLE", "QA_IMAGE_UNAVAILABLE")
      return
    }
    val bitmap = Bitmap.createBitmap(16, 16, Bitmap.Config.ARGB_8888)
    try {
      bitmap.eraseColor(Color.rgb(36, 114, 100))
      val output = ByteArrayOutputStream()
      val format = if (mime == "image/jpeg") Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG
      if (!bitmap.compress(format, 90, output)) throw IllegalStateException()
      promise.resolve(Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP))
    } catch (_: Exception) {
      promise.reject("QA_IMAGE_FAILED", "QA_IMAGE_FAILED")
    } finally {
      bitmap.recycle()
    }
  }
}
