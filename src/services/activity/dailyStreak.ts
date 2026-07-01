// 파일: src/services/activity/dailyStreak.ts
// 역할:
// - 산책/타임라인 활동 기반 데일리 streak RPC를 앱에서 타입 안전하게 호출한다.
// - 기록 write path 후처리에서 실패해도 원본 기록 저장을 막지 않도록 호출부가 선택적으로 흡수할 수 있게 한다.

import { supabase } from '../supabase/client';

export type DailyActivitySourceType = 'timeline_walk_post' | 'walk_place_record';

export type DailyStreakStatus = {
  currentStreak: number;
  bestStreak: number;
  todayCompleted: boolean;
  inserted?: boolean;
  showCelebration?: boolean;
  activityDateKst: string | null;
  lastCompletedDateKst?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function mapDailyStreakStatus(row: unknown): DailyStreakStatus {
  if (!isRecord(row)) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      todayCompleted: false,
      activityDateKst: null,
    };
  }

  return {
    currentStreak: toNumber(row.current_streak),
    bestStreak: toNumber(row.best_streak),
    todayCompleted: toBoolean(row.today_completed),
    inserted: typeof row.inserted === 'boolean' ? row.inserted : undefined,
    showCelebration:
      typeof row.show_celebration === 'boolean' ? row.show_celebration : undefined,
    activityDateKst: toNullableString(row.activity_date_kst),
    lastCompletedDateKst: toNullableString(row.last_completed_date_kst),
  };
}

function firstRow(data: unknown): unknown {
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

export async function getPetDailyStatus(
  petId: string,
): Promise<DailyStreakStatus> {
  const { data, error } = await supabase.rpc('get_pet_daily_status_v1', {
    p_pet_id: petId,
  });
  if (error) throw error;
  return mapDailyStreakStatus(firstRow(data));
}

export async function recordPetDailyActivity(input: {
  petId: string;
  sourceType: DailyActivitySourceType;
  sourceId: string;
}): Promise<DailyStreakStatus> {
  const { data, error } = await supabase.rpc('record_pet_daily_activity_v1', {
    p_pet_id: input.petId,
    p_source_type: input.sourceType,
    p_source_id: input.sourceId,
  });
  if (error) throw error;
  return mapDailyStreakStatus(firstRow(data));
}

export async function removePetDailyActivitySource(input: {
  petId: string;
  sourceType: DailyActivitySourceType;
  sourceId: string;
}): Promise<DailyStreakStatus> {
  const { data, error } = await supabase.rpc(
    'remove_pet_daily_activity_source_v1',
    {
      p_pet_id: input.petId,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
    },
  );
  if (error) throw error;
  return mapDailyStreakStatus(firstRow(data));
}
