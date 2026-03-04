// 파일: src/services/supabase/profile.ts
// 목적:
// - profiles.nickname 조회/저장
// - update-first 전략으로 RLS/충돌 리스크 최소화
//
// DB 기준(너 MASTER SETUP):
// - profiles PK: user_id (auth.uid())

import { supabase } from './client';

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

  const trimmed = nickname.trim();
  if (!trimmed) throw new Error('닉네임이 비어있습니다.');

  // 1) update 먼저 시도
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ nickname: trimmed })
    .eq('user_id', userId);

  if (!updateError) return;

  // 2) update 실패(예: row 없음)면 insert fallback
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({ user_id: userId, nickname: trimmed });

  if (insertError) throw insertError;
}

/* ---------------------------------------------------------
 * 3) 닉네임 사용 가능 여부 확인
 * -------------------------------------------------------- */
export async function checkNicknameAvailability(
  nickname: string,
): Promise<boolean> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const trimmed = nickname.trim();
  if (!trimmed) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('nickname', trimmed);

  if (error) throw error;

  const rows = Array.isArray(data)
    ? (data as Array<{ user_id?: string | null }>)
    : [];

  return !rows.some(row => row.user_id && row.user_id !== userId);
}
