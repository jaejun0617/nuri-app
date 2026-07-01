// 파일: src/services/activity/xpProgress.ts
// 역할:
// - XP ledger, 레벨 요약, 칭호 조회 RPC를 앱 화면과 write-path 후처리에서 사용한다.
// - 중복 지급과 daily cap은 서버 RPC가 결정하고, 앱은 결과 표시와 회귀 방어만 담당한다.

import { supabase } from '../supabase/client';
import type { ActivityXpEventType } from './progressPolicy';

export type AwardXpResult = {
  awarded: boolean;
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
};

export type UserLevelSummary = {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  updatedAt: string | null;
};

export type UserTitle = {
  titleKey: string;
  titleName: string;
  earnedAt: string;
  sourceType: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function firstRow(data: unknown): unknown {
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function mapAwardXpResult(row: unknown): AwardXpResult {
  if (!isRecord(row)) {
    return {
      awarded: false,
      xpAwarded: 0,
      totalXp: 0,
      level: 1,
      leveledUp: false,
    };
  }

  return {
    awarded: toBoolean(row.awarded),
    xpAwarded: toNumber(row.xp_awarded),
    totalXp: toNumber(row.total_xp),
    level: Math.max(1, toNumber(row.level)),
    leveledUp: toBoolean(row.leveled_up),
  };
}

function mapLevelSummary(row: unknown): UserLevelSummary {
  if (!isRecord(row)) {
    return {
      totalXp: 0,
      level: 1,
      currentLevelXp: 0,
      nextLevelXp: 100,
      updatedAt: null,
    };
  }

  return {
    totalXp: toNumber(row.total_xp),
    level: Math.max(1, toNumber(row.level)),
    currentLevelXp: toNumber(row.current_level_xp),
    nextLevelXp: toNumber(row.next_level_xp),
    updatedAt: toNullableString(row.updated_at),
  };
}

function mapTitle(row: unknown): UserTitle | null {
  if (!isRecord(row)) return null;
  const titleKey = toString(row.title_key).trim();
  const titleName = toString(row.title_name).trim();
  const earnedAt = toString(row.earned_at).trim();
  if (!titleKey || !titleName || !earnedAt) return null;
  return {
    titleKey,
    titleName,
    earnedAt,
    sourceType: toString(row.source_type).trim() || 'xp_ledger',
  };
}

export async function awardUserActivityXp(input: {
  petId?: string | null;
  eventType: ActivityXpEventType;
  sourceType: string;
  sourceId: string;
}): Promise<AwardXpResult> {
  const { data, error } = await supabase.rpc('award_user_activity_xp_v1', {
    p_pet_id: input.petId ?? null,
    p_event_type: input.eventType,
    p_source_type: input.sourceType,
    p_source_id: input.sourceId,
  });
  if (error) throw error;
  return mapAwardXpResult(firstRow(data));
}

export async function getUserLevelSummary(): Promise<UserLevelSummary> {
  const { data, error } = await supabase.rpc('get_user_level_summary_v1');
  if (error) throw error;
  return mapLevelSummary(firstRow(data));
}

export async function getUserTitles(): Promise<UserTitle[]> {
  const { data, error } = await supabase.rpc('get_user_titles_v1');
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map(mapTitle).filter((item): item is UserTitle => Boolean(item));
}
