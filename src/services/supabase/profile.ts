// 파일: src/services/supabase/profile.ts
// 목적:
// - profiles 테이블에서 nickname 조회/업데이트
//
// 전제:
// - profiles.id = auth.uid()
// - RLS: 본인 row만 select/update 가능

import { supabase } from './client';

export async function fetchMyNickname(): Promise<string | null> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.nickname ?? null) as string | null;
}

export async function upsertMyNickname(nickname: string): Promise<void> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, nickname }, { onConflict: 'id' });

  if (error) throw error;
}
