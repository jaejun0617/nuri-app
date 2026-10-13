package com.nuri.walk

import org.junit.Assert.*
import org.junit.Test
import kotlin.math.hypot

class WalkDistanceEngineTest {
  // Public synthetic equatorial plane; Android geodesic is checked on device.
  private val geo=WalkGeodesic{a,b->hypot((a.latitude-b.latitude)*111195.0,(a.longitude-b.longitude)*111195.0)}
  private val engine=WalkDistanceEngineV1(geo)
  private val wall=1791936000000L
  private fun initial()=engine.beginSegment(WalkDistanceState(),"public-boot",1000000000L)
  private fun fix(x:Double=0.0,y:Double=0.0,second:Long=1,accuracy:Double=3.0,epoch:Long=1,speed:Double?=null)=
    WalkDistanceFix(y/111195.0,x/111195.0,accuracy,second*1000000000,wall+second*1000,"public-boot",epoch,speed)
  private fun apply(s:WalkDistanceState,f:WalkDistanceFix)=engine.evaluate(s,f,f.elapsedNs+1000000,f.wallMs).state

  @Test fun slowWalkKeepsFractionalMetersWithoutPerEdgeRounding(){
    var s=initial();for(i in 1L..120)s=apply(s,fix((i-1)*1.25,second=i*5))
    assertTrue(s.acceptedM>140);assertTrue(s.acceptedM<=148.75+0.001);assertEquals(s.total,s.counts.sum())
  }
  @Test fun stationaryTenMinutesDoesNotAccumulateNoise(){
    var s=initial();for(i in 1L..121){val angle=i*Math.PI/6;s=apply(s,fix(5*kotlin.math.sin(angle),5*kotlin.math.cos(angle),i*5,12.0))}
    assertTrue(s.measuredM>100);assertTrue(s.acceptedM<=20);assertTrue(s.counts[6]>100)
  }
  @Test fun normalWalkAndSquareTurnsRetainTheCornerDistance(){
    var s=initial();val points=mutableListOf(fix())
    for(i in 1L..10)points.add(fix(i*10.0,0.0,1+i*5))
    for(i in 1L..10)points.add(fix(100.0,i*10.0,51+i*5))
    for(i in 1L..10)points.add(fix(100-i*10.0,100.0,101+i*5))
    for(i in 1L..10)points.add(fix(0.0,100-i*10.0,151+i*5))
    points.forEach{s=apply(s,it)}
    assertEquals(400.0,s.measuredM,0.01);assertEquals(400.0,s.acceptedM,1.0)
    assertTrue(s.counts[0]>=40)
  }
  @Test fun everyInvalidFixHasOneTerminalDisposition(){
    val s=apply(initial(),fix())
    val cases=listOf(
      fix().copy(latitude=Double.NaN) to WalkFixDisposition.REJECTED_JUMP,
      fix(second=2,accuracy=Double.NaN) to WalkFixDisposition.REJECTED_ACCURACY,
      fix(second=2).copy(boot="another-boot") to WalkFixDisposition.REJECTED_TIMESTAMP,
      fix(second=2,epoch=2) to WalkFixDisposition.REJECTED_TIMESTAMP,
      fix(second=2).copy(wallMs=1) to WalkFixDisposition.REJECTED_TIMESTAMP,
      fix() to WalkFixDisposition.REJECTED_DUPLICATE,
      fix(second=2,accuracy=100.0) to WalkFixDisposition.REJECTED_ACCURACY,
      fix(1000.0,second=2) to WalkFixDisposition.REJECTED_JUMP,
      fix(5.0,second=2,speed=20.0) to WalkFixDisposition.REJECTED_SPEED,
    )
    for((f,expected)in cases){val r=engine.evaluate(s,f,f.elapsedNs+1000000,f.wallMs)
      assertEquals(expected,r.disposition);assertEquals(s.total+1,r.state.total);assertEquals(r.state.total,r.state.counts.sum());assertEquals(0.0,r.state.acceptedM,0.0)}
  }
  @Test fun staleCachedAndOutOfOrderAreRejected(){
    val s=apply(initial(),fix(second=10))
    assertEquals(WalkFixDisposition.REJECTED_TIMESTAMP,engine.evaluate(s,fix(second=9),11000000000,wall+11000).disposition)
    assertEquals(WalkFixDisposition.REJECTED_TIMESTAMP,engine.evaluate(initial(),fix(second=1),40000000000,wall+40000).disposition)
    assertEquals(WalkFixDisposition.REJECTED_TIMESTAMP,engine.evaluate(initial(),fix().copy(elapsedNs=1),1000000001,wall+1000).disposition)
  }
  @Test fun poorAccuracyAndSpikeNeverGrowAcceptedDistance(){
    val s=apply(initial(),fix())
    val poor=engine.evaluate(s,fix(100.0,second=6,accuracy=100.0),6001000000,wall+6000)
    assertEquals(100.0,poor.state.measuredM,0.001);assertEquals(0.0,poor.state.acceptedM,0.0)
    val jump=engine.evaluate(s,fix(1000.0,second=6),6001000000,wall+6000)
    val back=apply(jump.state,fix(second=11));assertEquals(0.0,back.acceptedM,0.0)
  }
  @Test fun gapCreatesNewSegmentAndZeroStraightLineCredit(){
    val s=apply(initial(),fix())
    val r=engine.evaluate(s,fix(1000.0,second=61),61001000000,wall+61000)
    assertEquals(0.0,r.state.measuredM,0.0);assertEquals(0.0,r.state.acceptedM,0.0)
    assertEquals(2,r.state.epoch);assertEquals(2,r.state.segments);assertEquals(60000,r.state.gapMs)
  }
  @Test fun repeatedGapTicksDoNotDoubleCount(){
    val s=apply(initial(),fix())
    val first=engine.tick(s,61000000000);val next=engine.tick(first,66000000000)
    assertEquals(65000,next.gapMs);assertEquals(65000,next.maxGapMs)
    val r=engine.evaluate(next,fix(1000.0,second=71),71001000000,wall+71000)
    assertEquals(70000,r.state.gapMs);assertEquals(2,r.state.segments)
  }
  @Test fun pauseRecoveryAndRebootExcludeUnobservedDistance(){
    var s=initial();for(i in 1L..10)s=apply(s,fix((i-1)*10.0,second=1+(i-1)*5))
    val encoded=WalkDistanceCodec.encode(s);val restored=WalkDistanceCodec.decode(encoded);encoded.fill(0)
    val next=engine.beginSegment(restored,"public-reboot",1000000000)
    val f=fix(10000.0,second=2,epoch=next.epoch).copy(boot="public-reboot")
    val after=engine.evaluate(next,f,2001000000,f.wallMs).state
    assertEquals(s.acceptedM,after.acceptedM,0.0);assertEquals(s.measuredM,after.measuredM,0.0)
    assertEquals(s.segments+1,after.segments);assertEquals(0,next.lastOrderedNs)
    assertEquals(s.counts.sum()+1,after.total)
  }
  @Test fun qualityRecommendationNeverMeansServerAcceptance(){
    var s=initial();for(i in 1L..30)s=apply(s,fix((i-1)*10.0,second=1+(i-1)*5))
    assertEquals("ELIGIBLE_CANDIDATE",engine.recommendation(s,150000))
    assertEquals("INELIGIBLE_CANDIDATE",engine.recommendation(s.copy(mockObserved=true),150000))
    assertEquals("INELIGIBLE_CANDIDATE",engine.recommendation(s.copy(legacySession=true),150000))
  }
  @Test fun rejectedJumpCannotBecomeDistanceMerelyByWaiting(){
    val s=apply(initial(),fix())
    val jump=engine.evaluate(s,fix(1000.0,second=6),6001000000,wall+6000).state
    val reacquired=apply(jump,fix(1000.0,second=11))
    assertEquals(0.0,reacquired.acceptedM,0.0);assertEquals(2,reacquired.segments)
    assertFalse(reacquired.reacquirePending)
  }
  @Test fun impossibleOrNonFiniteSpeedCannotAnchorAFirstRoutePoint(){
    for(speed in listOf(20.0,Double.NaN,Double.POSITIVE_INFINITY,-1.0)){
      val f=fix(speed=speed);val r=engine.evaluate(initial(),f,1001000000,f.wallMs)
      assertEquals(WalkFixDisposition.REJECTED_SPEED,r.disposition);assertEquals(0,r.state.segments)
      val bytes=WalkDistanceCodec.encode(r.state);WalkDistanceCodec.decode(bytes);bytes.fill(0)
    }
  }
  @Test fun corruptedOrTrailingCheckpointNeverSilentlyResetsDistance(){
    val bytes=WalkDistanceCodec.encode(initial())
    try{WalkDistanceCodec.decode(bytes+byteArrayOf(1));fail("Expected strict checkpoint denial")}
    catch(e:WalkFailure){assertEquals("WALK_DISTANCE_CHECKPOINT_INVALID",e.code)}finally{bytes.fill(0)}
    try{WalkDistanceState(acceptedM=Double.NaN).validate();fail("Expected non-finite denial")}
    catch(e:WalkFailure){assertEquals("WALK_DISTANCE_CHECKPOINT_INVALID",e.code)}
  }
  @Test fun simplificationKeepsTurnsEndpointsAndLength(){
    val points=(0..100).map{fix(it.toDouble(),second=it+1L)}+
      (1..100).map{fix(100.0,it.toDouble(),second=it+101L)}
    val result=WalkRouteSimplifier(geo).simplify(points)
    assertEquals(points.first(),result.points.first());assertEquals(points.last(),result.points.last())
    assertTrue(result.points.any{it.longitude==100.0/111195.0&&it.latitude==0.0})
    assertTrue(result.deviation<=0.015);assertTrue(result.points.size<points.size)
  }
  @Test fun longRouteUsesBoundedChunksWithoutDroppingGeometry(){
    val points=(0..5000).map{fix(it.toDouble(),second=it+1L)}
    val simplified=mutableListOf<WalkDistanceFix>();var cursor=0
    while(cursor<points.lastIndex){val end=minOf(points.lastIndex,cursor+511)
      val result=WalkRouteSimplifier(geo).simplify(points.subList(cursor,end+1))
      assertTrue(result.points.size<=512);assertTrue(result.deviation<=0.015)
      if(simplified.isEmpty())simplified.addAll(result.points)else simplified.addAll(result.points.drop(1));cursor=end}
    assertEquals(points.first(),simplified.first());assertEquals(points.last(),simplified.last())
    assertEquals(5000.0,simplified.zipWithNext().sumOf{(a,b)->geo.meters(a,b)},0.001)
  }
  @Test fun simplificationCannotMergeSegments(){
    try{WalkRouteSimplifier(geo).simplify(listOf(fix(),fix(10.0,epoch=2)));fail("Expected segment denial")}
    catch(e:WalkFailure){assertEquals("WALK_ROUTE_SEGMENT_CONFLICT",e.code)}
  }
}
