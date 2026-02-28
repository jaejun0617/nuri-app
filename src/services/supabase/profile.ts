// 파일: src/services/supabase/profile.ts
// 목적:
// - profiles.nickname 조회/저장
// - MASTER SETUP 기준: profiles PK = user_id (auth.users.id)
//
// 전략:
// - update-first → insert fallback (row가 없다면 insert)
// - RLS 정책: auth.uid() = user_id

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
