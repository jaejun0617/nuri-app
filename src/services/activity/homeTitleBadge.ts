// 파일: src/services/activity/homeTitleBadge.ts
// 역할:
// - 로그인 홈의 현재 펫 프로필에 표시할 대표 칭호를 고른다.
// - user-level 공통 칭호를 pet 칭호처럼 오표시하지 않기 위해 pet_id가 맞는 칭호만 사용한다.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../supabase/client';
import { getCanonicalTitleIdentity } from './titleVaultV2';

export type HomeTitleBadgeRow = {
  titleKey: string;
  titleName: string;
  earnedAt: string;
  petId: string | null;
};
export type HomeTitleBadgeIdentity = {
  titleKey: string | null;
  titleName: string;
};

type HomeTitleBadgeCacheEntry = {
  savedAt: number;
  title: string | null;
  titleKey?: string;
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

export function pickHomePetTitleBadgeIdentity(input: {
  titles: HomeTitleBadgeRow[];
  petId: string | null;
}): HomeTitleBadgeIdentity | null {
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

  const title = petTitles[0];
  return title
    ? { titleKey: title.titleKey, titleName: title.titleName }
    : null;
}
export function pickHomePetTitleBadge(input: {
  titles: HomeTitleBadgeRow[];
  petId: string | null;
}): string | null {
  return pickHomePetTitleBadgeIdentity(input)?.titleName ?? null;
}

export async function loadCachedHomePetTitleBadgeIdentity(input: {
  userId: string | null;
  petId: string | null;
  now?: number;
}): Promise<HomeTitleBadgeIdentity | null> {
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

    const titleName = toNullableString(parsed.title);
    const titleKey = toNullableString(parsed.titleKey);
    const canonical = titleKey ? getCanonicalTitleIdentity(titleKey) : null;
    return titleName
      ? canonical ?? { titleName, titleKey }
      : null;
  } catch {
    await AsyncStorage.removeItem(cacheKey);
    return null;
  }
}
export async function loadCachedHomePetTitleBadge(input: {
  userId: string | null;
  petId: string | null;
  now?: number;
}): Promise<string | null> {
  return (await loadCachedHomePetTitleBadgeIdentity(input))?.titleName ?? null;
}

export async function saveCachedHomePetTitleBadge(input: {
  userId: string | null;
  petId: string | null;
  title: string | null;
  titleKey?: string | null;
  now?: number;
}): Promise<void> {
  if (!input.userId || !input.petId) return;

  const entry: HomeTitleBadgeCacheEntry = {
    savedAt: input.now ?? Date.now(),
    title: toNullableString(input.title),
    ...(input.titleKey ? { titleKey: input.titleKey } : {}),
  };

  await AsyncStorage.setItem(
    getHomeTitleBadgeCacheKey({
      userId: input.userId,
      petId: input.petId,
    }),
    JSON.stringify(entry),
  );
}

export async function fetchHomePetTitleBadgeIdentity(
  petId: string | null,
): Promise<HomeTitleBadgeIdentity | null> {
  if (!petId) return null;

  const { data, error } = await supabase.rpc('get_nuri_home_title_v2', { p_pet_id: petId });
  if (error) throw error;
  if (data === null) return null;
  if (!isRecord(data) || typeof data.titleKey !== 'string' || typeof data.titleName !== 'string' ||
    !data.titleKey || !data.titleName) throw new Error('TITLE_VAULT_RESPONSE_INVALID');
  const canonical = getCanonicalTitleIdentity(data.titleKey);
  if (!canonical || canonical.titleKey !== data.titleKey || canonical.titleName !== data.titleName) {
    throw new Error('TITLE_VAULT_RESPONSE_INVALID');
  }
  return canonical;
}
export async function fetchHomePetTitleBadge(
  petId: string | null,
): Promise<string | null> {
  return (await fetchHomePetTitleBadgeIdentity(petId))?.titleName ?? null;
}
