// 파일: src/services/supabase/auth.ts
// 목적:
// - Supabase Auth 래퍼 (signIn/signUp/signOut)
// - 성공 시 session 반환 (store 반영은 화면/AppProviders에서 수행)

import { supabase } from './client';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  // 이메일 인증을 켠 경우 session이 null일 수 있음
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
