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

export async function signOutBestEffort(timeoutMs = 1200): Promise<{
  timedOut: boolean;
  error: Error | null;
}> {
  let timedOut = false;

  const signOutPromise = supabase.auth
    .signOut()
    .then(({ error }) => {
      if (error) throw error;
      return null;
    })
    .catch((error: unknown) => {
      if (error instanceof Error) return error;
      return new Error(String(error));
    });

  const timeoutPromise = new Promise<null>(resolve => {
    setTimeout(() => {
      timedOut = true;
      resolve(null);
    }, timeoutMs);
  });

  const winner = await Promise.race([signOutPromise, timeoutPromise]);
  if (winner instanceof Error) {
    return { timedOut: false, error: winner };
  }

  if (timedOut) {
    signOutPromise.catch(() => null);
  }

  return { timedOut, error: null };
}

function isMissingDeleteRpcError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message = 'message' in error ? String(error.message ?? '') : '';
  const details = 'details' in error ? String(error.details ?? '') : '';
  const joined = `${message} ${details}`.toLowerCase();

  return (
    joined.includes('delete_my_account') &&
    (joined.includes('does not exist') ||
      joined.includes('schema cache') ||
      joined.includes('function'))
  );
}

export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (!error) return;

  if (isMissingDeleteRpcError(error)) {
    throw new Error(
      '계정 삭제 SQL 함수가 아직 적용되지 않았습니다. docs/sql/공용-릴리즈-묶음/기능-추가/계정-동의-이력-및-계정-삭제.sql을 먼저 적용해 주세요.',
    );
  }

  throw error;
}
