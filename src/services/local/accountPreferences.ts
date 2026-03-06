// 파일: src/services/local/accountPreferences.ts
// 역할:
// - 계정 설정 관련 로컬 정책(닉네임 변경 주기)을 관리
// - 현재는 월 1회 닉네임 변경 제한을 앱 단에서 안정적으로 적용

import AsyncStorage from '@react-native-async-storage/async-storage';

const NICKNAME_CHANGED_AT_KEY = 'nuri.account.nicknameChangedAt.v1';

export async function getNicknameChangedAt(): Promise<string | null> {
  const value = await AsyncStorage.getItem(NICKNAME_CHANGED_AT_KEY);
  return value?.trim() || null;
}

export async function saveNicknameChangedAt(value: string): Promise<void> {
  await AsyncStorage.setItem(NICKNAME_CHANGED_AT_KEY, value);
}

export function getNextNicknameChangeDate(
  changedAt: string | null,
): Date | null {
  if (!changedAt) return null;

  const base = new Date(changedAt);
  if (Number.isNaN(base.getTime())) return null;

  const next = new Date(base);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export function canChangeNickname(
  changedAt: string | null,
  now = new Date(),
): boolean {
  const next = getNextNicknameChangeDate(changedAt);
  if (!next) return true;
  return now.getTime() >= next.getTime();
}
