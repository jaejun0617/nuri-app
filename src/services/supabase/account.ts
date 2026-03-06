// 파일: src/services/supabase/account.ts
// 역할:
// - 내 계정 설정 중 비밀번호 변경을 담당
// - 현재 비밀번호 검증 후 Supabase Auth 비밀번호를 갱신

import { supabase } from './client';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export function isValidPasswordFormat(value: string): boolean {
  return PASSWORD_RULE.test(value.trim());
}

export async function changeMyPassword(input: {
  currentPassword: string;
  nextPassword: string;
}): Promise<void> {
  const currentPassword = input.currentPassword.trim();
  const nextPassword = input.nextPassword.trim();

  if (!currentPassword) {
    throw new Error('현재 비밀번호를 입력해 주세요.');
  }
  if (!nextPassword) {
    throw new Error('새 비밀번호를 입력해 주세요.');
  }
  if (!isValidPasswordFormat(nextPassword)) {
    throw new Error('영문, 숫자, 특수문자를 포함한 8자 이상으로 입력해 주세요.');
  }
  if (currentPassword === nextPassword) {
    throw new Error('새 비밀번호는 현재 비밀번호와 다르게 입력해 주세요.');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;

  const email = user?.email?.trim() ?? '';
  if (!email) {
    throw new Error('이 계정은 비밀번호 변경을 지원하지 않습니다.');
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (verifyError) {
    throw new Error('현재 비밀번호가 올바르지 않습니다.');
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: nextPassword,
  });
  if (updateError) throw updateError;
}
