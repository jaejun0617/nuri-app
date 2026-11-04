package com.nuri.auth

import android.net.Uri
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.nuri.MainActivity

class OAuthBrowserPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(OAuthBrowserModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}

private class OAuthBrowserModule(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {
  override fun getName() = "NuriOAuthBrowser"

  @ReactMethod
  fun open(url: String, redirect: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity as? MainActivity
    if (activity == null) {
      promise.reject("OAUTH_BROWSER_ACTIVITY_MISSING", "Authentication screen is unavailable.")
      return
    }
    activity.runOnUiThread { activity.openOAuthTab(Uri.parse(url), Uri.parse(redirect), promise) }
  }
}
