package com.nuri

import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactApplication
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import com.nuri.notifications.ScheduleNotificationTapStore
import com.nuri.notifications.NuriPushModule
import com.nuri.walk.WalkVisibility

class MainActivity : ReactActivity() {
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

    WindowCompat.setDecorFitsSystemWindows(window, true)
    applySystemBarStyle()
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
