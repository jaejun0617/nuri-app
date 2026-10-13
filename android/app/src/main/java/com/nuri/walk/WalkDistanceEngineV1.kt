package com.nuri.walk

import java.math.BigDecimal
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

// Candidate policy is frozen before physical QA. It is not a server verdict.
object WalkDistancePolicyV1 {
  const val ALGORITHM_VERSION = 1
  const val POLICY_VERSION = 1
  const val MAX_ACCURACY_M = 25.0
  const val MAX_FIX_AGE_NS = 15000000000L
  const val MAX_WALL_SKEW_MS = 120000L
  const val MAX_SPEED_MPS = 8.5
  const val MIN_JUMP_M = 60.0
  const val GAP_NS = 45000000000L
  const val MIN_MOVEMENT_M = 1.25
  const val UNCERTAINTY_FACTOR = 0.45
  const val MAX_STATIONARY_RADIUS_M = 10.0
  const val CONSISTENCY_RATIO = 0.75
  const val STATIONARY_WINDOW = 6
  const val MIN_OBSERVATION_NS = 6000000000L
  const val HIGH_CONFIDENCE_FACTOR = 1.6
  const val SIMPLIFICATION_M = 2.0
  const val MAX_LENGTH_DEVIATION = 0.015
  const val TURN_DEGREES = 35.0
  const val MAP_POINT_BOUND = 512
  const val EVENT_INTERVAL_MS = 1000L
  const val MAX_FIXES = 200000L
  const val MAX_DISTANCE_M = 10000000.0
  const val ELIGIBLE_MIN_FIXES = 10L
  const val ELIGIBLE_MIN_DISTANCE_M = 50.0
  const val ELIGIBLE_MIN_ACTIVE_MS = 60000L
  const val ELIGIBLE_MAX_REJECTION_RATIO = 0.5
  const val ELIGIBLE_MAX_GAP_RATIO = 0.3
  const val ELIGIBLE_MAX_GAP_MS = 120000L
}

internal data class WalkDistanceFix(
  val latitude: Double, val longitude: Double, val accuracyM: Double,
  val elapsedNs: Long, val wallMs: Long, val boot: String, val epoch: Long,
  val speedMps: Double? = null, val mock: Boolean = false,
) {
  override fun toString() = "WalkDistanceFix(redacted)"
}
internal fun interface WalkGeodesic { fun meters(a: WalkDistanceFix, b: WalkDistanceFix): Double }
internal enum class WalkFixDisposition {
  ACCEPTED, REJECTED_ACCURACY, REJECTED_TIMESTAMP, REJECTED_DUPLICATE,
  REJECTED_JUMP, REJECTED_SPEED, SUPPRESSED_STATIONARY,
}
internal data class WalkDistanceState(
  val boot: String = "", val epoch: Long = 0, val boundaryNs: Long = 0,
  val lastSeenNs: Long = 0, val lastOrderedNs: Long = 0, val gapAccountedNs: Long = 0,
  val gapPending: Boolean = false, val firstInSegment: Boolean = true,
  val structural: WalkDistanceFix? = null, val accepted: WalkDistanceFix? = null,
  val window: List<WalkDistanceFix> = emptyList(),
  val measuredM: Double = 0.0, val acceptedM: Double = 0.0,
  val counts: List<Long> = List(7) { 0L }, val segments: Long = 0,
  val gapMs: Long = 0, val maxGapMs: Long = 0, val routeRevision: Long = 0,
  val mockObserved: Boolean = false, val legacySession: Boolean = false,
  val reacquirePending: Boolean = false,
) {
  val total get() = counts.fold(0L, Math::addExact)
  fun validate(): WalkDistanceState {
    if (counts.size != 7 || counts.any { it < 0 } || total > WalkDistancePolicyV1.MAX_FIXES ||
      !measuredM.isFinite() || !acceptedM.isFinite() || measuredM < 0 || acceptedM < 0 ||
      measuredM > WalkDistancePolicyV1.MAX_DISTANCE_M || acceptedM > measuredM + 0.001 ||
      segments < 0 || segments > counts[0] || gapMs < 0 || maxGapMs !in 0..gapMs ||
      routeRevision < 0 || window.size > WalkDistancePolicyV1.STATIONARY_WINDOW)
      throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
    if(boot.length>64||epoch<0||boundaryNs<0||lastSeenNs<0||lastOrderedNs<0||gapAccountedNs<0||
      listOfNotNull(structural,accepted).plus(window).any{f->
        !f.latitude.isFinite()||f.latitude !in -90.0..90.0||!f.longitude.isFinite()||f.longitude !in -180.0..180.0||
          !f.accuracyM.isFinite()||f.accuracyM<=0||f.elapsedNs<boundaryNs||f.boot!=boot||f.epoch!=epoch||
          f.speedMps?.let{!it.isFinite()||it<0}==true
      })throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
    return this
  }
}
internal data class WalkFixResult(val state: WalkDistanceState, val disposition: WalkFixDisposition, val retainRaw: Boolean)

internal class WalkDistanceEngineV1(private val geodesic: WalkGeodesic) {
  fun beginSegment(old: WalkDistanceState, boot: String, boundaryNs: Long): WalkDistanceState {
    if (boot.isEmpty() || boundaryNs < 0) throw WalkFailure("WALK_CLOCK_DISCONTINUITY")
    return old.copy(boot = boot, epoch = Math.addExact(old.epoch, 1), boundaryNs = boundaryNs,
      lastSeenNs = 0, lastOrderedNs = 0, gapAccountedNs = 0, gapPending = false,
      structural = null, accepted = null, window = emptyList(), firstInSegment = true,reacquirePending=false).validate()
  }
  fun tick(old: WalkDistanceState, nowNs: Long): WalkDistanceState {
    if (old.lastSeenNs == 0L || nowNs < old.lastSeenNs || nowNs - old.lastSeenNs <= WalkDistancePolicyV1.GAP_NS) return old
    val accounted = max(old.lastSeenNs, old.gapAccountedNs)
    val duration = (nowNs - old.lastSeenNs) / 1000000
    return old.copy(gapPending = true, gapAccountedNs = nowNs,
      gapMs = Math.addExact(old.gapMs, (nowNs - accounted) / 1000000), maxGapMs = max(old.maxGapMs, duration)).validate()
  }
  private fun terminal(s: WalkDistanceState, d: WalkFixDisposition, raw: Boolean = false): WalkFixResult {
    if (s.total >= WalkDistancePolicyV1.MAX_FIXES) throw WalkFailure("WALK_DISTANCE_CAPACITY_EXCEEDED")
    val counts = s.counts.toMutableList(); counts[d.ordinal] = Math.addExact(counts[d.ordinal], 1)
    return WalkFixResult(s.copy(counts = counts).validate(), d, raw)
  }
  private fun distance(a: WalkDistanceFix, b: WalkDistanceFix): Double = geodesic.meters(a, b).also {
    if (!it.isFinite() || it < 0) throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
  }
  fun evaluate(old: WalkDistanceState, incoming: WalkDistanceFix, nowNs: Long, nowWall: Long): WalkFixResult {
    var fix=incoming
    var s = old.copy(mockObserved=old.mockObserved||fix.mock).validate()
    if (!fix.latitude.isFinite() || !fix.longitude.isFinite() || fix.latitude !in -90.0..90.0 || fix.longitude !in -180.0..180.0)
      return terminal(s, WalkFixDisposition.REJECTED_JUMP)
    if (!fix.accuracyM.isFinite() || fix.accuracyM <= 0)
      return terminal(s, WalkFixDisposition.REJECTED_ACCURACY)
    if (fix.boot != s.boot || fix.epoch != s.epoch || fix.elapsedNs < s.boundaryNs ||
      fix.elapsedNs < s.lastOrderedNs || fix.elapsedNs <= 0 || nowNs < fix.elapsedNs ||
      fix.wallMs < 946684800000L || fix.wallMs > 4102444800000L ||
      abs(fix.wallMs - nowWall) > WalkDistancePolicyV1.MAX_WALL_SKEW_MS ||
      nowNs - fix.elapsedNs > WalkDistancePolicyV1.MAX_FIX_AGE_NS)
      return terminal(s, WalkFixDisposition.REJECTED_TIMESTAMP)
    if (fix.elapsedNs == s.lastOrderedNs) return terminal(s,
      if (s.structural?.latitude == fix.latitude && s.structural.longitude == fix.longitude)
        WalkFixDisposition.REJECTED_DUPLICATE else WalkFixDisposition.REJECTED_TIMESTAMP)

    // Gap credit is accounted once, then both anchors are discarded. Never bridge it.
    s = tick(s, fix.elapsedNs)
    if (s.gapPending||s.reacquirePending){s=beginSegment(s,s.boot,fix.elapsedNs);fix=fix.copy(epoch=s.epoch)}
    val previous = s.structural
    val diagnostic = if (previous != null) distance(previous, fix) else 0.0
    val validSpeed=fix.speedMps?.takeIf{it.isFinite()&&it>=0}
    s = s.copy(lastSeenNs = fix.elapsedNs, lastOrderedNs = fix.elapsedNs, structural = fix.copy(speedMps=validSpeed),
      measuredM = s.measuredM + diagnostic, mockObserved = s.mockObserved || fix.mock)
    if (fix.accuracyM > WalkDistancePolicyV1.MAX_ACCURACY_M)
      return terminal(s, WalkFixDisposition.REJECTED_ACCURACY, true)
    if(fix.speedMps!=null&&(!fix.speedMps.isFinite()||fix.speedMps<0||fix.speedMps>WalkDistancePolicyV1.MAX_SPEED_MPS))
      return terminal(s,WalkFixDisposition.REJECTED_SPEED,validSpeed!=null)
    val anchor = s.accepted
    if (anchor == null) {
      s = s.copy(accepted = fix, window = listOf(fix), firstInSegment = false,
        segments = Math.addExact(s.segments, 1), routeRevision = Math.addExact(s.routeRevision, 1))
      return terminal(s, WalkFixDisposition.ACCEPTED, true)
    }
    val displacement = distance(anchor, fix)
    val seconds = (fix.elapsedNs - anchor.elapsedNs) / 1000000000.0
    val uncertainty = (anchor.accuracyM + fix.accuracyM) * WalkDistancePolicyV1.UNCERTAINTY_FACTOR
    val jumpLimit = max(WalkDistancePolicyV1.MIN_JUMP_M, seconds * WalkDistancePolicyV1.MAX_SPEED_MPS + uncertainty)
    if (fix.speedMps != null && (!fix.speedMps.isFinite() || fix.speedMps < 0 || fix.speedMps > WalkDistancePolicyV1.MAX_SPEED_MPS) ||
      seconds <= 0 || displacement <= jumpLimit && max(0.0, displacement - uncertainty) / seconds > WalkDistancePolicyV1.MAX_SPEED_MPS)
      return terminal(s, WalkFixDisposition.REJECTED_SPEED, true)
    if (displacement > jumpLimit) return terminal(s.copy(reacquirePending=true), WalkFixDisposition.REJECTED_JUMP, true)

    val window = (s.window + fix).takeLast(WalkDistancePolicyV1.STATIONARY_WINDOW)
    val observationNs = fix.elapsedNs - window.first().elapsedNs
    val windowLength = window.zipWithNext().sumOf { (a, b) -> distance(a, b) }
    val windowNet = distance(window.first(), fix)
    val consistent = windowLength > 0 && windowNet / windowLength >= WalkDistancePolicyV1.CONSISTENCY_RATIO
    val radius = max(WalkDistancePolicyV1.MIN_MOVEMENT_M, min(WalkDistancePolicyV1.MAX_STATIONARY_RADIUS_M, uncertainty))
    val confident = displacement >= radius * WalkDistancePolicyV1.HIGH_CONFIDENCE_FACTOR && window.size >= 2
    if (displacement < radius || !consistent || (!confident && observationNs < WalkDistancePolicyV1.MIN_OBSERVATION_NS))
      return terminal(s.copy(window = window), WalkFixDisposition.SUPPRESSED_STATIONARY, true)
    s = s.copy(accepted = fix, window = listOf(fix), acceptedM = s.acceptedM + displacement,
      routeRevision = Math.addExact(s.routeRevision, 1))
    return terminal(s, WalkFixDisposition.ACCEPTED, true)
  }
  fun recommendation(s: WalkDistanceState, activeMs: Long): String {
    s.validate()
    val rejects = s.counts.slice(1..5).sum()
    return if (!s.legacySession && !s.mockObserved && s.counts[0] >= WalkDistancePolicyV1.ELIGIBLE_MIN_FIXES &&
      s.acceptedM >= WalkDistancePolicyV1.ELIGIBLE_MIN_DISTANCE_M && activeMs >= WalkDistancePolicyV1.ELIGIBLE_MIN_ACTIVE_MS &&
      (if (s.total == 0L) 1.0 else rejects.toDouble() / s.total) <= WalkDistancePolicyV1.ELIGIBLE_MAX_REJECTION_RATIO &&
      s.gapMs.toDouble() / max(1, activeMs) <= WalkDistancePolicyV1.ELIGIBLE_MAX_GAP_RATIO &&
      s.maxGapMs <= WalkDistancePolicyV1.ELIGIBLE_MAX_GAP_MS) "ELIGIBLE_CANDIDATE" else "INELIGIBLE_CANDIDATE"
  }
  companion object {
    fun decimal(value: Double): String {
      if (!value.isFinite() || value < 0 || value > WalkDistancePolicyV1.MAX_DISTANCE_M) throw WalkFailure("WALK_DISTANCE_CHECKPOINT_INVALID")
      return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString()
    }
  }
}

internal data class WalkSimplifiedRoute(val points: List<WalkDistanceFix>, val originalM: Double, val simplifiedM: Double, val turnCount:Int=0, val preservedTurnCount:Int=0) {
  val deviation get() = if (originalM == 0.0) 0.0 else abs(originalM - simplifiedM) / originalM
}
internal class WalkRouteSimplifier(private val geodesic: WalkGeodesic) {
  private fun length(points: List<WalkDistanceFix>) = points.zipWithNext().sumOf { (a,b) -> geodesic.meters(a,b) }
  private fun offLine(p: WalkDistanceFix, a: WalkDistanceFix, b: WalkDistanceFix): Double {
    val ab=geodesic.meters(a,b); if(ab==0.0)return geodesic.meters(a,p)
    val ap=geodesic.meters(a,p); val bp=geodesic.meters(b,p)
    val projection=(ap*ap+ab*ab-bp*bp)/(2*ab)
    return when { projection<0 -> ap; projection>ab -> bp; else -> sqrt(max(0.0,ap*ap-projection*projection)) }
  }
  fun simplify(points: List<WalkDistanceFix>): WalkSimplifiedRoute {
    if(points.size>WalkDistancePolicyV1.MAP_POINT_BOUND)throw WalkFailure("WALK_ROUTE_PAGE_BOUND_EXCEEDED")
    if(points.isEmpty())return WalkSimplifiedRoute(emptyList(),0.0,0.0)
    if(points.any{it.epoch!=points.first().epoch||it.boot!=points.first().boot})throw WalkFailure("WALK_ROUTE_SEGMENT_CONFLICT")
    val keep=BooleanArray(points.size);keep[0]=true;keep[points.lastIndex]=true
    var turnCount=0
    for(i in 1 until points.lastIndex){
      val a=geodesic.meters(points[i-1],points[i]);val b=geodesic.meters(points[i],points[i+1]);val c=geodesic.meters(points[i-1],points[i+1])
      if(a>0&&b>0){val cos=((a*a+b*b-c*c)/(2*a*b)).coerceIn(-1.0,1.0)
        val turn=180-Math.toDegrees(kotlin.math.acos(cos));if(turn>=WalkDistancePolicyV1.TURN_DEGREES){keep[i]=true;turnCount++}}
    }
    val anchors=keep.indices.filter{keep[it]};val pending=java.util.ArrayDeque<Pair<Int,Int>>()
    anchors.zipWithNext().forEach{pending.add(it)}
    while(pending.isNotEmpty()){
      val(start,end)=pending.removeLast();var best=-1;var deviation=WalkDistancePolicyV1.SIMPLIFICATION_M
      for(i in start+1 until end){val d=offLine(points[i],points[start],points[end]);if(d>deviation){best=i;deviation=d}}
      if(best>=0){keep[best]=true;pending.add(start to best);pending.add(best to end)}
    }
    val original=length(points);var simplified=points.filterIndexed{i,_->keep[i]};var meters=length(simplified)
    // A bound never overrides geometry: fallback remains one bounded raw chunk.
    if(original>0&&abs(original-meters)/original>WalkDistancePolicyV1.MAX_LENGTH_DEVIATION){simplified=points;meters=original}
    return WalkSimplifiedRoute(simplified,original,meters,turnCount,turnCount)
  }
}
