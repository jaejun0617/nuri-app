// 파일: src/services/home/homeRecall.ts
// 목적:
// - 홈 화면 "오늘의 추억" 고정 로직(클라이언트 캐시 버전)
// - 우선순위:
//   1) 작년 오늘(월/일 동일) occurredAt이 있는 기록 우선
//   2) 없으면 전체 기록 중 랜덤
// - 하루 1회 고정(AsyncStorage 캐시)
// - 다음 챕터(daily_recall 서버 고정)로 갈 때 이 파일의 pick 로직을
//   서버 조회/업서트로 교체하면 됨.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getKstMonthDay, getKstYmd, getTimePhase } from '../../utils/date';
import type { MemoryRecord } from '../supabase/memories';

function randomPick<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildKey(petId: string, ymd: string) {
  return `nuri.home.todayMemory.${petId}.${ymd}`;
}

/**
 * pickTodayMemory
 * - 같은 petId에 대해 "오늘" 1개를 고정
 * - 캐시가 있으면 해당 id를 우선 반환(없으면 다시 pick)
 */
export async function pickTodayMemory(
  petId: string,
  memories: MemoryRecord[],
): Promise<MemoryRecord | null> {
  if (!petId) return null;
  if (!memories.length) return null;

  const today = getKstYmd();
  const key = buildKey(petId, today);

  // 1) cache hit
  const cachedId = await AsyncStorage.getItem(key);
  if (cachedId) {
    const found = memories.find(m => m.id === cachedId);
    if (found) return found;
  }

  // 2) "작년 오늘(월/일 동일)" 우선
  const monthDay = getKstMonthDay(); // MM-DD

  const sameMonthDay = memories.filter(m => {
    const occurred = m.occurredAt?.slice(5, 10) ?? null; // YYYY-MM-DD -> MM-DD
    if (!occurred) return false;
    return occurred === monthDay;
  });

  const picked =
    sameMonthDay.length > 0 ? randomPick(sameMonthDay) : randomPick(memories);

  if (picked) {
    await AsyncStorage.setItem(key, picked.id);
  }

  return picked ?? null;
}

/**
 * generateTimeMessage
 * - 07:00 / 12:00 / 18:00 기준으로 메시지 자동 생성(임시 버전)
 * - 다음 단계에서 ai_messages(kind='daily_pet_message')로 치환 가능
 */
export function generateTimeMessage(petName?: string | null) {
  const name = petName?.trim() ? petName.trim() : '우리 아이';
  const phase = getTimePhase();

  if (phase === 'morning') {
    return `${name}와 함께한 아침을 떠올려볼까요?`;
  }

  if (phase === 'noon') {
    return `${name}가 좋아했을 순간을 잠깐 꺼내보세요.`;
  }

  return `${name}와의 하루를 오늘도 따뜻하게 마무리해요.`;
}
