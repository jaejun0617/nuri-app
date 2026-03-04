// 파일: src/services/home/homeRecall.ts
// 목적:
// - 홈 화면 "오늘날의 사진" 고정 로직(클라이언트 캐시 버전)
// - 우선순위:
//   1) 작년 오늘(월/일 동일) occurredAt 기록 중 "이미지 있는 것" 우선
//   2) 없으면 전체 기록 중 "이미지 있는 것" 랜덤
// - 하루 1회 고정(AsyncStorage 캐시)
// - 다음 챕터(daily_recall 서버 고정)에서 이 로직을 서버 조회/업서트로 교체 가능

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getKstMonthDay, getKstYmd, getTimePhase } from '../../utils/date';
import type { MemoryRecord } from '../supabase/memories';

function randomPick<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildKey(petId: string, ymd: string) {
  return `nuri.home.todayPhoto.${petId}.${ymd}`;
}

function hasImage(m: MemoryRecord) {
  return Boolean(
    (m.imagePath && m.imagePath.trim()) || (m.imageUrl && m.imageUrl.trim()),
  );
}

function isSameMonthDay(m: MemoryRecord, mmdd: string) {
  const occurred = m.occurredAt?.slice(5, 10) ?? null; // YYYY-MM-DD -> MM-DD
  if (!occurred) return false;
  return occurred === mmdd;
}

export type TodayPhotoPickResult = {
  record: MemoryRecord | null;
  mode: 'anniversary' | 'random' | 'none';
};

/**
 * pickTodayPhoto
 * - 오늘날의 사진(이미지 있는 기록) 1개를 "오늘 하루" 고정
 */
export async function pickTodayPhoto(
  petId: string,
  memories: MemoryRecord[],
): Promise<TodayPhotoPickResult> {
  if (!petId) return { record: null, mode: 'none' };

  const candidates = memories.filter(hasImage);
  if (!candidates.length) return { record: null, mode: 'none' };

  const today = getKstYmd();
  const key = buildKey(petId, today);

  // 1) cache hit
  const cachedId = await AsyncStorage.getItem(key);
  if (cachedId) {
    const found = candidates.find(m => m.id === cachedId) ?? null;
    if (found) {
      const mmdd = getKstMonthDay();
      const mode: TodayPhotoPickResult['mode'] = isSameMonthDay(found, mmdd)
        ? 'anniversary'
        : 'random';
      return { record: found, mode };
    }
  }

  // 2) 작년 오늘(월/일 동일) 우선
  const mmdd = getKstMonthDay();
  const anniversary = candidates.filter(m => isSameMonthDay(m, mmdd));
  const picked = anniversary.length
    ? randomPick(anniversary)
    : randomPick(candidates);

  if (picked) {
    await AsyncStorage.setItem(key, picked.id);
    return {
      record: picked,
      mode: anniversary.length ? 'anniversary' : 'random',
    };
  }

  return { record: null, mode: 'none' };
}

/**
 * generateTimeMessage
 * - 07:00 / 12:00 / 18:00 기준 메시지 자동 생성(감성 버전)
 */
export function generateTimeMessage(petName?: string | null) {
  const name = petName?.trim() ? petName.trim() : '우리 아이';
  const phase = getTimePhase();

  if (phase === 'morning') {
    return `🌤️ ${name}와 눈 맞추는 아침이에요. 오늘도 천천히, 포근하게 시작해요.`;
  }

  if (phase === 'noon') {
    return `☀️ ${name}가 웃던 순간을 살짝 떠올려볼까요? 작은 행복 충전 시간이에요.`;
  }

  return `${name}와 보낸 하루를 꼭 안고, 따뜻하게 마무리해요.`;
}
