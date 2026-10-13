package com.nuri.walk

import org.json.JSONArray
import org.json.JSONObject

internal class WalkRouteProjection(private val storage:WalkStorage) {
  private val simplifier=WalkRouteSimplifier(androidWalkGeodesic)
  private fun groups(chunks:List<WalkPointChunk>):List<List<WalkDistanceFix>> {
    val result=mutableListOf<MutableList<WalkDistanceFix>>()
    for(chunk in chunks){val fix=storage.routeFix(chunk)
      if(result.lastOrNull()?.lastOrNull()?.epoch!=fix.epoch)result.add(mutableListOf())
      result.last().add(fix)
    }
    return result
  }
  fun page(row:WalkLocalSession,s:WalkDistanceState,direction:String,cursor:Long):JSONObject {
    val count=WalkDistancePolicyV1.MAP_POINT_BOUND-1
    val chunks=when(direction){
      "FIRST"->storage.dao.routePage(row.sessionId,-1,count)
      "TAIL"->storage.dao.routeBefore(row.sessionId,Long.MAX_VALUE,count).reversed()
      "BEFORE"->storage.dao.routeBefore(row.sessionId,cursor,count).reversed()
      "AFTER"->storage.dao.routePage(row.sessionId,cursor,count)
      else->throw WalkFailure("WALK_ROUTE_PAGE_INVALID")
    }.toMutableList()
    val first=chunks.firstOrNull()?.chunkIndex
    if(first!=null){val previous=storage.dao.routeBefore(row.sessionId,first,1).firstOrNull()
      if(previous!=null&&previous.routeSegment==chunks.first().routeSegment)chunks.add(0,previous)}
    val last=chunks.lastOrNull()?.chunkIndex
    val hasEarlier=first!=null&&storage.dao.routeBefore(row.sessionId,chunks.first().chunkIndex,1).isNotEmpty()
    val hasLater=last!=null&&storage.dao.routePage(row.sessionId,last,1).isNotEmpty()
    return JSONObject().apply{
      put("routeRevision",s.routeRevision.toString());put("filteredPointCount",storage.dao.routeCount(row.sessionId).toString())
      put("startCursor",(chunks.firstOrNull()?.chunkIndex?:-1).toString());put("endCursor",(last?:-1).toString())
      put("hasEarlier",hasEarlier);put("hasLater",hasLater)
      put("current",s.accepted?.let{JSONObject().put("latitude",it.latitude).put("longitude",it.longitude)}?:JSONObject.NULL)
      put("segments",JSONArray().apply{groups(chunks).forEach{points->
        val route=simplifier.simplify(points)
        put(JSONObject().put("segmentId",points.first().epoch.toString()).put("points",JSONArray().apply{
          route.points.forEach{put(JSONObject().put("latitude",it.latitude).put("longitude",it.longitude))}
        }))
      }})
    }
  }
  fun summary(row:WalkLocalSession):JSONObject {
    var cursor=-1L;var filtered=0L;var simplified=0L;var originalMeters=0.0;var simplifiedMeters=0.0
    var overlap:WalkPointChunk?=null;var turns=0;var preservedTurns=0
    while(true){
      val next=storage.dao.routePage(row.sessionId,cursor,WalkDistancePolicyV1.MAP_POINT_BOUND-1)
      if(next.isEmpty())break
      filtered+=next.size
      val chunks=if(overlap!=null&&overlap.routeSegment==next.first().routeSegment) listOf(overlap)+next else next
      val routes=groups(chunks).map(simplifier::simplify)
      simplified+=routes.sumOf{it.points.size}-(if(chunks.size>next.size)1 else 0)
      originalMeters+=routes.sumOf{it.originalM};simplifiedMeters+=routes.sumOf{it.simplifiedM}
      turns+=routes.sumOf{it.turnCount};preservedTurns+=routes.sumOf{it.preservedTurnCount}
      overlap=next.last();cursor=overlap.chunkIndex
    }
    return JSONObject().apply{
      put("filteredPointCount",filtered);put("simplifiedPointCount",simplified)
      put("filteredRouteDistanceM",WalkDistanceEngineV1.decimal(originalMeters))
      put("simplifiedRouteDistanceM",WalkDistanceEngineV1.decimal(simplifiedMeters))
      put("lengthDeviation",if(originalMeters==0.0)0.0 else kotlin.math.abs(originalMeters-simplifiedMeters)/originalMeters)
      put("endpointLoss",0);put("segmentMerge",0);put("gapBridgeM","0");put("turnLoss",turns-preservedTurns);put("filteredTurnCount",turns);put("preservedTurnCount",preservedTurns)
    }
  }
}
