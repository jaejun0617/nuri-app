// 파일: src/services/supabase/profile.ts
// 목적:
// - profiles.nickname 조회/저장
// - update-first 전략으로 RLS/충돌 리스크 최소화
//
// DB 기준(너 MASTER SETUP):
// - profiles PK: user_id (auth.uid())

import { supabase } from './client';

type NicknameAvailabilityCode =
  | 'ok'
  | 'not_authenticated'
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'blocked'
  | 'taken';

type NicknameAvailabilityRow = {
  available: boolean;
  code: NicknameAvailabilityCode;
  normalized: string;
};

function normalizeNickname(value: string): string {
  return value.trim();
}

function mapNicknameError(error: unknown): Error {
  if (error instanceof Error) {
    const anyErr = error as Error & {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
    };
    const code = String(anyErr.code ?? '');
    const msg = String(anyErr.message ?? '');
    const details = String(anyErr.details ?? '');
    const joined = `${code} ${msg} ${details}`.toLowerCase();

    if (code === '23505' || joined.includes('uq_profiles_nickname')) {
      return new Error('이미 사용중인 닉네임 입니다.');
    }
    if (joined.includes('blocked') || joined.includes('금칙')) {
      return new Error('사용할 수 없는 닉네임입니다.');
    }
    return error;
  }
  return new Error('다시 시도해 주세요.');
}

/* ---------------------------------------------------------
 * 1) 내 닉네임 조회
 * -------------------------------------------------------- */
export async function fetchMyNickname(): Promise<string | null> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.nickname ?? null) as string | null;
}

/* ---------------------------------------------------------
 * 2) 내 닉네임 저장 (update-first → insert fallback)
 * -------------------------------------------------------- */
export async function saveMyNickname(nickname: string): Promise<void> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const trimmed = normalizeNickname(nickname);
  if (!trimmed) throw new Error('닉네임이 비어있습니다.');

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, nickname: trimmed }, { onConflict: 'user_id' });

  if (error) throw mapNicknameError(error);
}

/* ---------------------------------------------------------
 * 3) 닉네임 사용 가능 여부 확인
 * -------------------------------------------------------- */
export async function checkNicknameAvailability(
  nickname: string,
): Promise<boolean> {
  const trimmed = normalizeNickname(nickname);
  if (!trimmed) return false;

  const { data, error } = await supabase.rpc('check_nickname_availability', {
    p_nickname: trimmed,
  });
  if (error) throw error;

  const rows = Array.isArray(data) ? (data as NicknameAvailabilityRow[]) : [];
  const row = rows[0] ?? null;
  if (!row) return false;
  return row.available;
}

export async function checkNicknameAvailabilityDetailed(
  nickname: string,
): Promise<NicknameAvailabilityRow> {
  const trimmed = normalizeNickname(nickname);
  if (!trimmed) {
    return { available: false, code: 'empty', normalized: '' };
  }

  const rpcPromise = supabase.rpc('check_nickname_availability', {
    p_nickname: trimmed,
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('닉네임 확인이 지연되고 있습니다. 잠시 후 다시 시도해주세요.'));
    }, 6000);
  });
  const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
  if (error) throw error;

  const rows = Array.isArray(data) ? (data as NicknameAvailabilityRow[]) : [];
  return (
    rows[0] ?? {
      available: false,
      code: 'empty',
      normalized: trimmed,
    }
  );
}
