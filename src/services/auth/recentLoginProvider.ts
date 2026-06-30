// 파일: src/services/auth/recentLoginProvider.ts
// 역할:
// - 최근 로그인 방식 표시를 위해 민감 정보 없이 provider key만 로컬에 저장한다.
// - 이메일/소셜 계정 식별자, 토큰, 이메일 주소는 저장하지 않는다.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

const RECENT_LOGIN_PROVIDER_STORAGE_KEY = 'nuri.auth.recentLoginProvider.v1';

export type RecentLoginProvider = 'email' | 'google' | 'kakao';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeRecentLoginProvider(
  value: unknown,
): RecentLoginProvider | null {
  if (value === 'email' || value === 'google' || value === 'kakao') {
    return value;
  }

  return null;
}

function readSessionProviderCandidates(session: Session): unknown[] {
  const candidates: unknown[] = [];
  const appMetadata = isRecord(session.user.app_metadata)
    ? session.user.app_metadata
    : {};

  candidates.push(appMetadata.provider);

  if (Array.isArray(appMetadata.providers)) {
    candidates.push(...appMetadata.providers);
  }

  if (Array.isArray(session.user.identities)) {
    for (const identity of session.user.identities) {
      if (isRecord(identity)) {
        candidates.push(identity.provider);
      }
    }
  }

  return candidates;
}

export function resolveRecentLoginProviderFromSession(
  session: Session | null,
): RecentLoginProvider | null {
  if (!session) return null;

  for (const candidate of readSessionProviderCandidates(session)) {
    const provider = normalizeRecentLoginProvider(candidate);
    if (provider) return provider;
  }

  return null;
}

export async function getRecentLoginProvider(): Promise<RecentLoginProvider | null> {
  const raw = await AsyncStorage.getItem(RECENT_LOGIN_PROVIDER_STORAGE_KEY);
  return normalizeRecentLoginProvider(raw);
}

export async function setRecentLoginProvider(
  provider: RecentLoginProvider,
): Promise<void> {
  await AsyncStorage.setItem(RECENT_LOGIN_PROVIDER_STORAGE_KEY, provider);
}

export async function rememberRecentLoginProviderFromSession(
  session: Session | null,
): Promise<void> {
  const provider = resolveRecentLoginProviderFromSession(session);
  if (!provider) return;

  await setRecentLoginProvider(provider);
}

export async function clearRecentLoginProvider(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_LOGIN_PROVIDER_STORAGE_KEY);
}

export const RECENT_LOGIN_PROVIDER_STORAGE_KEY_FOR_TEST =
  RECENT_LOGIN_PROVIDER_STORAGE_KEY;
