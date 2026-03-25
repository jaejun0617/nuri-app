// 파일: src/services/legal/consents.ts
// 역할:
// - 회원가입 시점의 약관/개인정보/마케팅 동의 스냅샷을 로컬에 저장
// - 로그인 세션이 준비되면 user_consent_history 테이블로 flush

import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureMonitoringException } from '../monitoring/sentry';
import { supabase } from '../supabase/client';
import { CURRENT_LEGAL_POLICY_VERSION } from './documents';

export const CURRENT_POLICY_VERSION = CURRENT_LEGAL_POLICY_VERSION;
const CONSENT_PENDING_STORAGE_KEY = 'nuri.pending-consents.v1';

export type ConsentSnapshot = {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  policyVersion: string;
  capturedAt: string;
  source: 'signup';
};

type ConsentHistoryRow = {
  user_id: string;
  consent_type: 'terms' | 'privacy' | 'marketing';
  agreed: boolean;
  policy_version: string;
  source: 'signup';
  captured_at: string;
  created_at?: string;
};

export type ConsentHistoryItem = {
  consentType: 'terms' | 'privacy' | 'marketing';
  agreed: boolean;
  policyVersion: string;
  source: 'signup';
  capturedAt: string;
  createdAt: string | null;
};

export async function savePendingConsentSnapshot(
  snapshot: ConsentSnapshot,
): Promise<void> {
  await AsyncStorage.setItem(
    CONSENT_PENDING_STORAGE_KEY,
    JSON.stringify(snapshot),
  );
}

export async function loadPendingConsentSnapshot(): Promise<ConsentSnapshot | null> {
  const raw = await AsyncStorage.getItem(CONSENT_PENDING_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ConsentSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPendingConsentSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(CONSENT_PENDING_STORAGE_KEY);
}

function mapConsentRows(userId: string, snapshot: ConsentSnapshot): ConsentHistoryRow[] {
  return [
    {
      user_id: userId,
      consent_type: 'terms',
      agreed: snapshot.termsAccepted,
      policy_version: snapshot.policyVersion,
      source: snapshot.source,
      captured_at: snapshot.capturedAt,
    },
    {
      user_id: userId,
      consent_type: 'privacy',
      agreed: snapshot.privacyAccepted,
      policy_version: snapshot.policyVersion,
      source: snapshot.source,
      captured_at: snapshot.capturedAt,
    },
    {
      user_id: userId,
      consent_type: 'marketing',
      agreed: snapshot.marketingAccepted,
      policy_version: snapshot.policyVersion,
      source: snapshot.source,
      captured_at: snapshot.capturedAt,
    },
  ];
}

function isMissingConsentTableError(error: unknown): boolean {
  const raw =
    error instanceof Error
      ? `${error.message}`
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);
  const normalized = raw.toLowerCase();

  return (
    normalized.includes('user_consent_history') &&
    (normalized.includes('does not exist') ||
      normalized.includes('schema cache') ||
      normalized.includes('relation'))
  );
}

export async function flushPendingConsentSnapshot(userId: string): Promise<boolean> {
  const snapshot = await loadPendingConsentSnapshot();
  if (!snapshot) return false;

  const rows = mapConsentRows(userId, snapshot);
  const { error } = await supabase.from('user_consent_history').insert(rows);

  if (error) {
    if (!isMissingConsentTableError(error)) {
      captureMonitoringException(error);
    }
    throw error;
  }

  await clearPendingConsentSnapshot();
  return true;
}

export async function fetchMyConsentHistory(
  limit = 12,
): Promise<ConsentHistoryItem[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const userId = userData.user?.id ?? null;
  if (!userId) throw new Error('로그인 세션이 없습니다.');

  const { data, error } = await supabase
    .from('user_consent_history')
    .select(
      'user_id, consent_type, agreed, policy_version, source, captured_at, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingConsentTableError(error)) {
      throw new Error(
        'user_consent_history 테이블이 아직 없습니다. 계정-동의-이력-및-계정-삭제.sql 적용 여부를 확인해 주세요.',
      );
    }
    throw error;
  }

  return ((Array.isArray(data) ? data : []) as ConsentHistoryRow[]).map(row => ({
    consentType: row.consent_type,
    agreed: row.agreed,
    policyVersion: row.policy_version,
    source: row.source,
    capturedAt: row.captured_at,
    createdAt: row.created_at ?? null,
  }));
}
