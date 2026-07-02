// 파일: src/services/activity/timelineActivity.ts
// 역할:
// - 타임라인 write/edit/delete 이후 V1.1 2차 MVP activity side effect를 한 곳에서 처리한다.
// - 기록 저장 자체는 기존 계약이므로, streak/XP 후처리 실패는 호출부가 release blocker로 전파하지 않게 분리한다.

import type { RecordMainCategoryKey } from '../records/form';
import {
  recordPetDailyActivity,
  removePetDailyActivitySource,
  type DailyStreakStatus,
} from './dailyStreak';
import { awardUserActivityXp, type AwardXpResult } from './xpProgress';

export type TimelineActivitySideEffectResult = {
  streak: DailyStreakStatus | null;
  xp: AwardXpResult | null;
};

function isWalkCategory(category: string | null | undefined): boolean {
  return category === 'walk';
}

function resolveTimelineXpEventType(category: RecordMainCategoryKey) {
  if (category === 'health') return 'health_record';
  return isWalkCategory(category) ? 'walk_timeline_post' : 'timeline_post';
}

export async function recordTimelineCreateActivity(input: {
  petId: string;
  memoryId: string;
  category: RecordMainCategoryKey;
}): Promise<TimelineActivitySideEffectResult> {
  const [streakResult, xpResult] = await Promise.allSettled([
    isWalkCategory(input.category)
      ? recordPetDailyActivity({
          petId: input.petId,
          sourceType: 'timeline_walk_post',
          sourceId: input.memoryId,
        })
      : Promise.resolve(null),
    awardUserActivityXp({
      petId: input.petId,
      eventType: resolveTimelineXpEventType(input.category),
      sourceType: 'timeline_memory',
      sourceId: input.memoryId,
    }),
  ]);

  return {
    streak: streakResult.status === 'fulfilled' ? streakResult.value : null,
    xp: xpResult.status === 'fulfilled' ? xpResult.value : null,
  };
}

export async function recordTimelineCategoryChangeActivity(input: {
  petId: string;
  memoryId: string;
  previousCategory: string | null | undefined;
  nextCategory: RecordMainCategoryKey;
}): Promise<TimelineActivitySideEffectResult> {
  const previousWasWalk = isWalkCategory(input.previousCategory);
  const nextIsWalk = isWalkCategory(input.nextCategory);

  const streakPromise =
    previousWasWalk && !nextIsWalk
      ? removePetDailyActivitySource({
          petId: input.petId,
          sourceType: 'timeline_walk_post',
          sourceId: input.memoryId,
        })
      : !previousWasWalk && nextIsWalk
        ? recordPetDailyActivity({
            petId: input.petId,
            sourceType: 'timeline_walk_post',
            sourceId: input.memoryId,
          })
        : Promise.resolve(null);

  const xpPromise = !previousWasWalk && nextIsWalk
    ? awardUserActivityXp({
        petId: input.petId,
        eventType: 'walk_timeline_post',
        sourceType: 'timeline_memory',
        sourceId: input.memoryId,
      })
    : Promise.resolve(null);

  const [streakResult, xpResult] = await Promise.allSettled([
    streakPromise,
    xpPromise,
  ]);

  return {
    streak: streakResult.status === 'fulfilled' ? streakResult.value : null,
    xp: xpResult.status === 'fulfilled' ? xpResult.value : null,
  };
}

export async function removeTimelineWalkActivity(input: {
  petId: string;
  memoryId: string;
  category: string | null | undefined;
}): Promise<DailyStreakStatus | null> {
  if (!isWalkCategory(input.category)) return null;
  try {
    return await removePetDailyActivitySource({
      petId: input.petId,
      sourceType: 'timeline_walk_post',
      sourceId: input.memoryId,
    });
  } catch {
    return null;
  }
}
