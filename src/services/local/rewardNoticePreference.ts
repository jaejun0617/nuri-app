// 파일: src/services/local/rewardNoticePreference.ts
// 역할:
// - XP/포인트 획득 안내 모달의 "오늘 하루 안 보기" 선호를 사용자별 local state로 관리한다.
// - XP ledger, level summary 같은 서버 계약에는 영향을 주지 않는 presentation-only 상태다.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getKstYmd } from '../../utils/date';

const REWARD_NOTICE_DISMISS_STORAGE_PREFIX = 'nuri.rewardNotice.dismissedDate.v1';

function normalizeUserScope(userId: string | null | undefined): string {
  const trimmed = (userId ?? '').trim();
  return trimmed.length > 0 ? trimmed : 'anonymous';
}

export function buildRewardNoticeDismissStorageKey(
  userId: string | null | undefined,
): string {
  return `${REWARD_NOTICE_DISMISS_STORAGE_PREFIX}:${normalizeUserScope(userId)}`;
}

export async function isRewardNoticeDismissedToday(
  userId: string | null | undefined,
  now = new Date(),
): Promise<boolean> {
  const today = getKstYmd(now);
  if (!today) return false;

  const storedDate = await AsyncStorage.getItem(
    buildRewardNoticeDismissStorageKey(userId),
  );
  return storedDate === today;
}

export async function dismissRewardNoticeForToday(
  userId: string | null | undefined,
  now = new Date(),
): Promise<void> {
  const today = getKstYmd(now);
  if (!today) return;

  await AsyncStorage.setItem(buildRewardNoticeDismissStorageKey(userId), today);
}

export const REWARD_NOTICE_DISMISS_STORAGE_PREFIX_FOR_TEST =
  REWARD_NOTICE_DISMISS_STORAGE_PREFIX;
