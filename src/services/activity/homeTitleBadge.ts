// 파일: src/services/activity/homeTitleBadge.ts
// 역할:
// - 로그인 홈의 현재 펫 프로필에 표시할 대표 칭호를 고른다.
// - user-level 공통 칭호를 pet 칭호처럼 오표시하지 않기 위해 pet_id가 맞는 칭호만 사용한다.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../supabase/client';

export type HomeTitleBadgeRow = {
  titleKey: string;
  titleName: string;
  earnedAt: string;
  petId: string | null;
};

type HomeTitleBadgeCacheEntry = {
  savedAt: number;
  title: string | null;
};

const HOME_TITLE_BADGE_CACHE_PREFIX = '@nuri/home-title-badge/v1';
const HOME_TITLE_BADGE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNullableString(value: unknown): string | null {
  const normalized = toString(value);
  return normalized.length > 0 ? normalized : null;
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getHomeTitleBadgeCacheKey(input: {
  userId: string;
  petId: string;
}): string {
  return `${HOME_TITLE_BADGE_CACHE_PREFIX}:${input.userId}:${input.petId}`;
}

function mapTitleBadgeRow(value: unknown): HomeTitleBadgeRow | null {
  if (!isRecord(value)) return null;
  const titleKey = toString(value.title_key);
  const titleName = toString(value.title_name);
  const earnedAt = toString(value.earned_at);
  if (!titleKey || !titleName || !earnedAt) return null;

  return {
    titleKey,
    titleName,
    earnedAt,
    petId: toNullableString(value.pet_id),
  };
}

export function pickHomePetTitleBadge(input: {
  titles: HomeTitleBadgeRow[];
  petId: string | null;
}): string | null {
  if (!input.petId) return null;
  const petTitles = input.titles
    .filter(title => title.petId === input.petId)
    .sort((left, right) => {
      const earnedDelta =
        Date.parse(right.earnedAt) - Date.parse(left.earnedAt);
      if (Number.isFinite(earnedDelta) && earnedDelta !== 0) {
        return earnedDelta;
      }
      return left.titleName.localeCompare(right.titleName, 'ko-KR');
    });

  return petTitles[0]?.titleName ?? null;
}

export async function loadCachedHomePetTitleBadge(input: {
  userId: string | null;
  petId: string | null;
  now?: number;
}): Promise<string | null> {
  if (!input.userId || !input.petId) return null;

  const cacheKey = getHomeTitleBadgeCacheKey({
    userId: input.userId,
    petId: input.petId,
  });
  const raw = await AsyncStorage.getItem(cacheKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;

    const savedAt = toFiniteNumber(parsed.savedAt);
    if (!savedAt) return null;

    const now = input.now ?? Date.now();
    if (now - savedAt > HOME_TITLE_BADGE_CACHE_MAX_AGE_MS) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return toNullableString(parsed.title);
  } catch {
    await AsyncStorage.removeItem(cacheKey);
    return null;
  }
}

export async function saveCachedHomePetTitleBadge(input: {
  userId: string | null;
  petId: string | null;
  title: string | null;
  now?: number;
}): Promise<void> {
  if (!input.userId || !input.petId) return;

  const entry: HomeTitleBadgeCacheEntry = {
    savedAt: input.now ?? Date.now(),
    title: toNullableString(input.title),
  };

  await AsyncStorage.setItem(
    getHomeTitleBadgeCacheKey({
      userId: input.userId,
      petId: input.petId,
    }),
    JSON.stringify(entry),
  );
}

export async function fetchHomePetTitleBadge(
  petId: string | null,
): Promise<string | null> {
  if (!petId) return null;

  const { data, error } = await supabase
    .from('user_titles')
    .select('title_key, title_name, earned_at, pet_id')
    .eq('pet_id', petId)
    .order('earned_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  if (!Array.isArray(data)) return null;

  const titles = data
    .map(mapTitleBadgeRow)
    .filter((item): item is HomeTitleBadgeRow => item !== null);

  return pickHomePetTitleBadge({ titles, petId });
}
