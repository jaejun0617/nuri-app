package com.nuri

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactApplication
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import androidx.core.view.WindowCompat
import androidx.browser.auth.AuthTabIntent
import androidx.browser.customtabs.CustomTabsClient
import androidx.core.view.WindowInsetsControllerCompat
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import com.nuri.notifications.ScheduleNotificationTapStore
import com.nuri.notifications.NuriPushModule
import com.nuri.walk.WalkVisibility
import com.facebook.react.bridge.Promise

class MainActivity : ReactActivity() {
  private var authTabRequest: Pair<Uri, Promise>? = null
  private val authTabLauncher = AuthTabIntent.registerActivityResultLauncher(this) { result ->
    val request = authTabRequest
    authTabRequest = null
    val callback = result.resultUri
    if (result.resultCode == AuthTabIntent.RESULT_OK && callback != null &&
      isOAuthReturn(callback) && (request == null ||
        (callback.scheme == request.first.scheme && callback.encodedAuthority == request.first.encodedAuthority))
    ) {
      // Keep cold and warm delivery on the same existing React Native link path.
      onNewIntent(Intent(Intent.ACTION_VIEW, callback))
      request?.second?.resolve("returned")
    } else if (result.resultCode == AuthTabIntent.RESULT_CANCELED) {
      request?.second?.resolve("cancelled")
    } else {
      request?.second?.reject("OAUTH_BROWSER_RETURN_FAILED", "Authentication return could not be verified.")
    }
  }

  private fun isOAuthReturn(uri: Uri): Boolean =
    (uri.encodedPath == "/auth/callback" && uri.scheme == "https" &&
      uri.encodedAuthority == "nuri-web-beryl.vercel.app") ||
      (uri.encodedPath == "/callback" && uri.scheme == "nuri" && uri.encodedAuthority == "auth")

  fun openOAuthTab(url: Uri, redirect: Uri, promise: Promise) {
    if (authTabRequest != null || url.scheme != "https" ||
      url.encodedPath != "/auth/v1/authorize" || !isOAuthReturn(redirect)
    ) {
      promise.reject("OAUTH_BROWSER_INVALID", "Authentication request could not be opened.")
      return
    }
    val browser = CustomTabsClient.getPackageName(this, null)
    if (browser == null || !CustomTabsClient.isAuthTabSupported(this, browser)) {
      promise.resolve("unsupported")
      return
    }
    authTabRequest = Pair(redirect, promise)
    try {
      val tab = AuthTabIntent.Builder().build()
      tab.intent.setPackage(browser)
      if (redirect.scheme == "https") {
        tab.launch(authTabLauncher, url, "nuri-web-beryl.vercel.app", "/auth/callback")
      } else {
        tab.launch(authTabLauncher, url, "nuri")
      }
    } catch (_: RuntimeException) {
      authTabRequest = null
      promise.reject("OAUTH_BROWSER_OPEN_FAILED", "Authentication browser could not be opened.")
    }
  }

  private var launchContentReady = false
  private var removeLaunchView: (() -> Unit)? = null

  fun finishLaunchPresentation() {
    launchContentReady = true
    val remove = removeLaunchView ?: return
    removeLaunchView = null
    // Wait for the submitted React frame, not an estimated startup duration.
    window.decorView.postOnAnimation { if (!isDestroyed) remove() }
  }

  private fun applySystemBarStyle() {
    // Match the white seasonal splash canvas before React Native's first frame.
    // Normal screens remain responsible for their own surfaces and insets.
    window.setBackgroundDrawableResource(R.color.nuri_splash_background)
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.WHITE

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
    }

    WindowInsetsControllerCompat(window, window.decorView).apply {
      isAppearanceLightNavigationBars = true
      isAppearanceLightStatusBars = true
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    val retainedReact = (application as? ReactApplication)?.reactHost?.currentReactContext?.hasActiveReactInstance() == true
    NuriPushModule.capture(this, intent)
    // Capture a notification tap before React Native is ready. JS consumes it
    // once after navigation, auth, and pet bootstrap have completed.
    val tap = ScheduleNotificationTapStore.captureIntent(intent)
    // Do not leave notification extras on the Activity intent after a
    // successful capture: an Activity recreation must not capture and replay
    // the same tap a second time. Non-schedule intents are left untouched.
    if (tap != null) ScheduleNotificationTapStore.clearIntentTapExtras(intent)
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    super.onCreate(savedInstanceState)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !retainedReact) {
      splashScreen.setOnExitAnimationListener { view ->
        if (launchContentReady || isDestroyed) view.remove()
        else removeLaunchView = { view.remove() }
      }
    }

    WindowCompat.setDecorFitsSystemWindows(window, true)
    applySystemBarStyle()
  }

  override fun onDestroy() {
    removeLaunchView?.invoke()
    removeLaunchView = null
    super.onDestroy()
  }

  override fun onNewIntent(intent: Intent) {
    NuriPushModule.capture(this, intent)
    val tap = ScheduleNotificationTapStore.captureIntent(intent)
    if (tap != null) ScheduleNotificationTapStore.clearIntentTapExtras(intent)
    super.onNewIntent(intent)
    setIntent(intent)

    tap ?: return
    val reactContext = (application as? ReactApplication)?.reactHost?.currentReactContext
      ?: return
    ScheduleNotificationTapStore.emitWarmTap(reactContext, tap)
  }

  override fun onResume() {
    super.onResume()
    NuriPushModule.foreground = true
    WalkVisibility.resumed = true
    applySystemBarStyle()
  }

  override fun onPause() {
    NuriPushModule.foreground = false
    WalkVisibility.resumed = false
    super.onPause()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)

    if (hasFocus) {
      applySystemBarStyle()
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "nuri"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
