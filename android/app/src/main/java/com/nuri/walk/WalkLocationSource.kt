@file:Suppress("DEPRECATION")
package com.nuri.walk

import android.content.Context
import android.location.Location
import android.os.Build
import android.os.Looper
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationAvailability
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import java.nio.ByteBuffer

interface WalkLocationSource {
  fun start(onFix: (Location) -> Unit, onAvailability: (Boolean) -> Unit, done: (String?) -> Unit)
  fun stop()
  val subscribed: Boolean
}

// Sampling is an experimental capture policy, NOT Phase 3 distance filtering.
object WalkCapturePolicy { const val INTERVAL_MS = 5000L; const val MIN_INTERVAL_MS = 2000L }

class FusedWalkLocationSource(context: Context) : WalkLocationSource {
  private val client = LocationServices.getFusedLocationProviderClient(context.applicationContext)
  @Volatile private var callback: LocationCallback? = null
  override val subscribed get() = callback != null
  @Synchronized override fun start(onFix: (Location) -> Unit, onAvailability: (Boolean) -> Unit, done: (String?) -> Unit) {
    if (callback != null) { done("WALK_ALREADY_ACTIVE"); return }
    val listener = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) { if (callback === this) result.locations.forEach(onFix) }
      override fun onLocationAvailability(value: LocationAvailability) { if (callback === this) onAvailability(value.isLocationAvailable) }
    }
    callback = listener
    try {
      client.requestLocationUpdates(LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, WalkCapturePolicy.INTERVAL_MS)
        .setMinUpdateIntervalMillis(WalkCapturePolicy.MIN_INTERVAL_MS).setMaxUpdateDelayMillis(0).build(), listener, Looper.getMainLooper())
        .addOnSuccessListener { done(null) }
        .addOnFailureListener { if (callback === listener) stop(); done("WALK_SERVICE_UNAVAILABLE") }
    } catch (_: SecurityException) { stop(); done("WALK_LOCATION_PERMISSION_REQUIRED") }
    catch (_: RuntimeException) { stop(); done("WALK_SERVICE_UNAVAILABLE") }
  }
  @Synchronized override fun stop() {
    val listener = callback ?: return
    callback = null
    try { client.removeLocationUpdates(listener) } catch (_: RuntimeException) { /* Local callback is already revoked. */ }
  }
}

internal fun encodeWalkFix(location: Location, segmentIndex: Long): ByteArray = ByteBuffer.allocate(59).apply {
  putInt(1); putLong(segmentIndex); putDouble(location.latitude); putDouble(location.longitude)
  putFloat(location.accuracy); putLong(location.elapsedRealtimeNanos); putLong(location.time)
  put(if (location.hasSpeed()) 1.toByte() else 0.toByte()); putFloat(if (location.hasSpeed()) location.speed else 0f)
  put(if (location.hasBearing()) 1.toByte() else 0.toByte()); putFloat(if (location.hasBearing()) location.bearing else 0f)
  put(if (if (Build.VERSION.SDK_INT >= 31) location.isMock else location.isFromMockProvider) 1.toByte() else 0.toByte())
}.array()
