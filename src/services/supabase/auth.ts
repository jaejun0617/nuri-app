// 파일: src/services/supabase/auth.ts
// 목적:
// - Supabase Auth 래퍼 (signIn/signUp/signOut)
// - 성공 시 session 반환 (store 반영은 화면/AppProviders에서 수행)

import { supabase } from './client';
import { isValidPasswordFormat } from './account';

export const APP_URL_SCHEME = 'nuri';
export const PASSWORD_RESET_REDIRECT_URL = `${APP_URL_SCHEME}://auth/reset`;

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AccountDeletionStatus =
  | 'requested'
  | 'pending_grace_period'
  | 'cancelled'
  | 'in_progress'
  | 'db_deleted'
  | 'cleanup_pending'
  | 'completed'
  | 'completed_with_cleanup_pending'
  | 'failed'
  | 'unknown_pending_confirmation';

export type AccountDeletionGate = {
  requestId: string;
  userId: string;
  status: 'pending_grace_period';
  requestedAt: string | null;
  scheduledDeletionAt: string;
  canRestore: boolean;
};

export type AccountDeletionResult = {
  requestId: string;
  status: AccountDeletionStatus;
  actualStatus: AccountDeletionStatus | null;
  storageCleanupPending: boolean;
  cleanupItemCount: number;
  cleanupCompletedCount: number;
  requestedAt: string | null;
  scheduledDeletionAt: string | null;
  cancelledAt: string | null;
  restoredAt: string | null;
  completedAt: string | null;
  canRestore: boolean;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

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

export async function clearLocalAuthSession(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export function isValidEmailFormat(value: string): boolean {
  return EMAIL_RULE.test(value.trim());
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmailFormat(normalizedEmail)) {
    throw new Error('올바른 이메일 주소를 입력해 주세요.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: PASSWORD_RESET_REDIRECT_URL,
  });
  if (error) throw error;
}

export async function completePasswordRecoverySession(input: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  const accessToken = input.accessToken.trim();
  const refreshToken = input.refreshToken.trim();

  if (!accessToken || !refreshToken) {
    throw new Error('복구 링크 정보를 확인하지 못했어요.');
  }

  await supabase.auth.signOut({ scope: 'local' });

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
}

export async function updatePasswordWithRecovery(nextPassword: string): Promise<void> {
  const normalizedPassword = nextPassword.trim();
  if (!normalizedPassword) {
    throw new Error('새 비밀번호를 입력해 주세요.');
  }
  if (!isValidPasswordFormat(normalizedPassword)) {
    throw new Error('영문, 숫자, 특수문자를 포함한 8자 이상으로 입력해 주세요.');
  }

  const { error } = await supabase.auth.updateUser({
    password: normalizedPassword,
  });
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
    (joined.includes('delete_my_account') ||
      joined.includes('create_account_deletion_request') ||
      joined.includes('mark_account_deletion_unknown')) &&
    (joined.includes('does not exist') ||
      joined.includes('schema cache') ||
      joined.includes('function'))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAccountDeletionStatus(value: unknown): value is AccountDeletionStatus {
  return (
    value === 'requested' ||
    value === 'pending_grace_period' ||
    value === 'cancelled' ||
    value === 'in_progress' ||
    value === 'db_deleted' ||
    value === 'cleanup_pending' ||
    value === 'completed' ||
    value === 'completed_with_cleanup_pending' ||
    value === 'failed' ||
    value === 'unknown_pending_confirmation'
  );
}

function parseAccountDeletionResult(data: unknown): AccountDeletionResult | null {
  if (!isRecord(data)) return null;

  const requestId = data.request_id;
  const status = data.status;
  if (typeof requestId !== 'string' || !isAccountDeletionStatus(status)) {
    return null;
  }

  const cleanupItemCount =
    typeof data.cleanup_item_count === 'number' ? data.cleanup_item_count : 0;
  const cleanupCompletedCount =
    typeof data.cleanup_completed_count === 'number'
      ? data.cleanup_completed_count
      : 0;

  return {
    requestId,
    status,
    actualStatus: isAccountDeletionStatus(data.actual_status)
      ? data.actual_status
      : status,
    storageCleanupPending: Boolean(data.storage_cleanup_pending),
    cleanupItemCount,
    cleanupCompletedCount,
    requestedAt:
      typeof data.requested_at === 'string' ? data.requested_at : null,
    scheduledDeletionAt:
      typeof data.scheduled_deletion_at === 'string'
        ? data.scheduled_deletion_at
        : null,
    cancelledAt:
      typeof data.cancelled_at === 'string' ? data.cancelled_at : null,
    restoredAt:
      typeof data.restored_at === 'string' ? data.restored_at : null,
    completedAt:
      typeof data.completed_at === 'string' ? data.completed_at : null,
    canRestore: Boolean(data.can_restore),
    lastErrorCode:
      typeof data.last_error_code === 'string' ? data.last_error_code : null,
    lastErrorMessage:
      typeof data.last_error_message === 'string'
        ? data.last_error_message
        : null,
  };
}

async function createAccountDeletionRequest(requestOrigin = 'app') {
  const { data, error } = await supabase.rpc('create_account_deletion_request', {
    p_request_origin: requestOrigin,
  });
  if (error) throw error;

  const parsed = parseAccountDeletionResult(data);
  if (!parsed) {
    throw new Error('계정 삭제 요청 상태를 해석하지 못했어요.');
  }

  return parsed;
}

async function markAccountDeletionUnknown(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_account_deletion_unknown', {
    p_request_id: requestId,
  });
  if (error) throw error;
}

export async function fetchMyAccountDeletionGate(): Promise<AccountDeletionGate | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = session?.user?.id ?? null;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('id, status, requested_at, scheduled_deletion_at')
    .eq('user_id', userId)
    .eq('status', 'pending_grace_period')
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || typeof data.scheduled_deletion_at !== 'string') {
    return null;
  }

  const scheduledAt = Date.parse(data.scheduled_deletion_at);

  return {
    requestId: data.id,
    userId,
    status: 'pending_grace_period',
    requestedAt: typeof data.requested_at === 'string' ? data.requested_at : null,
    scheduledDeletionAt: data.scheduled_deletion_at,
    canRestore: Number.isFinite(scheduledAt) && scheduledAt > Date.now(),
  };
}

export async function cancelAccountDeletion(
  requestId?: string | null,
): Promise<AccountDeletionResult> {
  const { data, error } = await supabase.rpc('cancel_account_deletion', {
    p_request_id: requestId ?? null,
  });
  if (error) throw error;

  const parsed = parseAccountDeletionResult(data);
  if (!parsed) {
    throw new Error('계정 복구 결과를 해석하지 못했어요.');
  }

  return parsed;
}

export async function deleteMyAccount(options?: {
  requestOrigin?: string;
  timeoutMs?: number;
}): Promise<AccountDeletionResult> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  let request: AccountDeletionResult;
  try {
    request = await createAccountDeletionRequest(options?.requestOrigin);
  } catch (error) {
    if (isMissingDeleteRpcError(error)) {
      throw new Error(
        '계정 삭제 SQL 함수가 아직 적용되지 않았습니다. docs/sql/공용-릴리즈-묶음/기능-추가/계정-동의-이력-및-계정-삭제.sql을 먼저 적용해 주세요.',
      );
    }
    throw error;
  }

  const rpcPromise = supabase
    .rpc('delete_my_account', {
      p_request_id: request.requestId,
    })
    .then(({ data, error }) => {
      if (error) throw error;
      const parsed = parseAccountDeletionResult(data);
      if (!parsed) {
        throw new Error('계정 삭제 결과를 해석하지 못했어요.');
      }
      return parsed;
    });

  const timeoutPromise = new Promise<AccountDeletionResult>(resolve => {
    setTimeout(() => {
      resolve({
        requestId: request.requestId,
        status: 'unknown_pending_confirmation',
        actualStatus: request.actualStatus,
        storageCleanupPending: request.storageCleanupPending,
        cleanupItemCount: request.cleanupItemCount,
        cleanupCompletedCount: request.cleanupCompletedCount,
        requestedAt: request.requestedAt,
        scheduledDeletionAt: request.scheduledDeletionAt,
        cancelledAt: request.cancelledAt,
        restoredAt: request.restoredAt,
        completedAt: null,
        canRestore: request.canRestore,
        lastErrorCode: null,
        lastErrorMessage: null,
      });
    }, timeoutMs);
  });

  let result: AccountDeletionResult;
  try {
    result = await Promise.race([rpcPromise, timeoutPromise]);
  } catch (error) {
    if (isMissingDeleteRpcError(error)) {
      throw new Error(
        '계정 삭제 SQL 함수가 아직 적용되지 않았습니다. docs/sql/공용-릴리즈-묶음/기능-추가/계정-동의-이력-및-계정-삭제.sql을 먼저 적용해 주세요.',
      );
    }
    throw error;
  }

  if (result.status === 'unknown_pending_confirmation') {
    markAccountDeletionUnknown(result.requestId).catch(() => null);
    return result;
  }

  if (result.status === 'failed') {
    throw new Error(
      result.lastErrorMessage ??
        '회원 정리를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  }

  return result;
}
