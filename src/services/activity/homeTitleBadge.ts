// 파일: src/services/activity/homeTitleBadge.ts
// 역할:
// - 로그인 홈의 현재 펫 프로필에 표시할 대표 칭호를 고른다.
// - user-level 공통 칭호를 pet 칭호처럼 오표시하지 않기 위해 pet_id가 맞는 칭호만 사용한다.

import { supabase } from '../supabase/client';

export type HomeTitleBadgeRow = {
  titleKey: string;
  titleName: string;
  earnedAt: string;
  petId: string | null;
};

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
