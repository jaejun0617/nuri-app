// 파일: src/services/supabase/auth.ts
// 목적:
// - Supabase Auth 래퍼 (signIn/signUp/signOut)
// - 성공 시 session 반환 (store 반영은 화면/AppProviders에서 수행)

import { Linking } from 'react-native';

import { supabase } from './client';
import { isValidPasswordFormat } from './account';
import { getOAuthRedirectTo } from '../auth/appLinks';
import { clearExplicitLogoutAfterSignIn } from '../auth/localSession';
import { beginPendingOAuth, clearPendingOAuth, consumePendingOAuth } from '../auth/pendingOAuth';
import { requireS256OAuthUrl } from '../auth/pkce';
import { SUPABASE_URL } from './config';
import { resolveAuthTransition, type AuthEntryRoute } from '../auth/transition';
import { recordAuthEvent } from '../auth/trace';
import { captureWalkAccountRestoration } from '../walk/product/finalDeletion';
import {
  ENABLE_GOOGLE_OAUTH,
  ENABLE_KAKAO_OAUTH,
} from './socialOAuthConfig';

export const APP_URL_SCHEME = 'nuri';
export const PASSWORD_RESET_REDIRECT_URL = `${APP_URL_SCHEME}://auth/reset`;
export const OAUTH_CALLBACK_REDIRECT_URL = `${APP_URL_SCHEME}://auth/callback`;

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BuiltInOAuthProvider = Parameters<
  typeof supabase.auth.signInWithOAuth
>[0]['provider'];
type CustomOAuthProvider = `custom:${string}`;
type SupabaseOAuthProvider = BuiltInOAuthProvider | CustomOAuthProvider;
type SupabaseOAuthCredentials = Omit<
  Parameters<typeof supabase.auth.signInWithOAuth>[0],
  'provider'
> & {
  provider: SupabaseOAuthProvider;
};

export type SocialOAuthProvider = 'google' | 'kakao';

const SOCIAL_OAUTH_PROVIDER_READINESS: Readonly<
  Record<SocialOAuthProvider, boolean>
> = {
  google: ENABLE_GOOGLE_OAUTH,
  kakao: ENABLE_KAKAO_OAUTH,
};

const SUPABASE_PROVIDER_BY_SOCIAL_PROVIDER: Readonly<
  Record<SocialOAuthProvider, SupabaseOAuthProvider>
> = {
  google: 'google',
  kakao: 'kakao',
};

type OAuthErrorCode =
  | 'provider_setup_required'
  | 'oauth_url_missing'
  | 'browser_open_failed'
  | 'callback_not_expected'
  | 'callback_session_missing'
  | 'session_exchange_failed';

export class OAuthSignInError extends Error {
  readonly code: OAuthErrorCode;
  readonly provider: SocialOAuthProvider | null;
  readonly sourceError: unknown;

  constructor(input: {
    code: OAuthErrorCode;
    message: string;
    provider?: SocialOAuthProvider | null;
    sourceError?: unknown;
  }) {
    super(input.message);
    this.name = 'OAuthSignInError';
    this.code = input.code;
    this.provider = input.provider ?? null;
    this.sourceError = input.sourceError;
  }
}

export type OAuthCallbackSessionInput = {
  accessToken?: string | null;
  refreshToken?: string | null;
  code?: string | null;
  tokenHash?: string | null;
  verificationType?: string | null;
  provider?: SocialOAuthProvider | null;
};

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
  localContextChanged?: boolean;
  walkCleanupPending?: boolean;
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

export function getOAuthProviderLabel(provider: SocialOAuthProvider): string {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'kakao':
      return '카카오';
  }
}

export function isSocialOAuthProviderReleaseReady(
  provider: SocialOAuthProvider,
): boolean {
  return SOCIAL_OAUTH_PROVIDER_READINESS[provider];
}

export function getOAuthSignInUserMessage(error: unknown): string {
  if (error instanceof OAuthSignInError) {
    if (
      error.code === 'provider_setup_required' ||
      error.code === 'oauth_url_missing'
    ) {
      return '소셜 로그인 연결을 준비하고 있어요. 잠시 후 다시 시도해 주세요.';
    }
  }

  return '소셜 로그인 연결에 실패했어요. 잠시 후 다시 시도해 주세요.';
}

let oauthStartInProgress = false;
let oauthExchangeInProgress = false;

export function isOAuthCompletionPending(): boolean {
  return oauthExchangeInProgress;
}

export async function signInWithOAuthProvider(
  provider: SocialOAuthProvider,
): Promise<void> {
  if (oauthStartInProgress || oauthExchangeInProgress) {
    throw new OAuthSignInError({ code: 'callback_not_expected', message: '로그인을 확인 중이에요.', provider });
  }
  oauthStartInProgress = true;
  recordAuthEvent('OAUTH_INTENT_STARTED');
  try {
    if (typeof globalThis.crypto?.getRandomValues !== 'function') {
      throw new OAuthSignInError({ code: 'provider_setup_required', message: '안전한 로그인 연결을 시작하지 못했어요.', provider });
    }
    await beginPendingOAuth(provider);
    recordAuthEvent('PENDING_FLOW_READY');
    await startOAuthProvider(provider);
  } catch (error: unknown) {
    await clearPendingOAuth();
    throw error;
  } finally {
    oauthStartInProgress = false;
  }
}

async function startOAuthProvider(
  provider: SocialOAuthProvider,
): Promise<void> {
  if (!isSocialOAuthProviderReleaseReady(provider)) {
    const readinessError = new OAuthSignInError({
      code: 'provider_setup_required',
      message: getOAuthSignInUserMessage(null),
      provider,
    });
    logOAuthError({ provider, stage: 'readiness_gate', error: readinessError });
    throw readinessError;
  }

  const { data, error } = await signInWithSupabaseOAuth({
    provider: SUPABASE_PROVIDER_BY_SOCIAL_PROVIDER[provider],
    options: {
      redirectTo: getOAuthRedirectTo(provider),
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    logOAuthError({ provider, stage: 'start', error });
    throw new OAuthSignInError({
      code: 'provider_setup_required',
      message: getOAuthSignInUserMessage(error),
      provider,
      sourceError: error,
    });
  }

  if (!data.url) {
    logOAuthError({ provider, stage: 'start', error: 'missing_url' });
    throw new OAuthSignInError({
      code: 'oauth_url_missing',
      message: getOAuthSignInUserMessage(null),
      provider,
    });
  }

  try {
    await Linking.openURL(requireS256OAuthUrl(data.url, SUPABASE_URL));
  } catch (openError: unknown) {
    logOAuthError({ provider, stage: 'open_browser', error: openError });
    throw new OAuthSignInError({
      code: 'browser_open_failed',
      message:
        '브라우저를 열지 못했어요. 잠시 후 다시 시도하거나 이메일 로그인을 이용해 주세요.',
      provider,
      sourceError: openError,
    });
  }
}

export function signInWithGoogle(): Promise<void> {
  return signInWithOAuthProvider('google');
}

export function signInWithKakao(): Promise<void> {
  return signInWithOAuthProvider('kakao');
}

const callbackExchanges = new Map<string, { promise: Promise<AuthEntryRoute>; timer: ReturnType<typeof setTimeout> | null }>();

export function completeOAuthCallbackSession(input: OAuthCallbackSessionInput): Promise<AuthEntryRoute> {
  const code = input.code?.trim();
  if (!code || code.length > 4096 || input.tokenHash || input.accessToken || input.refreshToken || input.verificationType) {
    return Promise.reject(new OAuthSignInError({ code: 'callback_not_expected', message: '앱에서 소셜 로그인을 다시 시작해 주세요.' }));
  }
  const key = JSON.stringify([code, input.provider ?? null]);
  const pending = callbackExchanges.get(key);
  if (pending) return pending.promise;
  if (oauthStartInProgress || oauthExchangeInProgress) {
    return Promise.reject(new OAuthSignInError({ code: 'callback_not_expected', message: '로그인을 확인 중이에요.' }));
  }
  if (callbackExchanges.size >= 4) {
    const completed = [...callbackExchanges.entries()].find(([, entry]) => entry.timer !== null);
    if (!completed) return Promise.reject(new OAuthSignInError({ code: 'session_exchange_failed', message: '로그인을 확인 중이에요. 잠시 후 다시 시도해 주세요.' }));
    if (completed[1].timer) clearTimeout(completed[1].timer);
    callbackExchanges.delete(completed[0]);
  }
  const expireCompleted = () => {
    const entry = callbackExchanges.get(key);
    if (entry) entry.timer = setTimeout(() => callbackExchanges.delete(key), 60_000);
  };
  oauthExchangeInProgress = true;
  const promise = exchangeOAuthCallbackSession(input).then(async session => {
    await clearExplicitLogoutAfterSignIn();
    recordAuthEvent('EXPLICIT_LOGOUT_STATE_CLEARED');
    // SIGNED_IN is emitted inside exchangeCodeForSession's auth lock. Publish
    // exactly once, after that lock and explicit-logout suppression are cleared.
    return resolveAuthTransition(session);
  }).finally(() => { oauthExchangeInProgress = false; }).then(
    route => { expireCompleted(); return route; },
    (error: unknown) => { expireCompleted(); throw error; },
  );
  callbackExchanges.set(key, { promise, timer: null });
  return promise;
}

async function exchangeOAuthCallbackSession(
  input: OAuthCallbackSessionInput,
): Promise<NonNullable<Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>['data']['session']>> {
  const code = normalizeOptionalToken(input.code);
  const provider = await consumePendingOAuth(input.provider ?? null);
  if (!code || !provider) {
    throw new OAuthSignInError({
      code: 'callback_not_expected',
      message: '앱에서 소셜 로그인을 다시 시작해 주세요.',
      provider: input.provider ?? null,
    });
  }
  recordAuthEvent('PENDING_FLOW_VALIDATED');
  recordAuthEvent('CODE_EXCHANGE_STARTED');
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    throw new OAuthSignInError({
      code: 'session_exchange_failed',
      message: getOAuthSignInUserMessage(error),
      provider,
    });
  }
  recordAuthEvent('CODE_EXCHANGE_SUCCESS');
  recordAuthEvent('SESSION_AVAILABLE');
  return data.session;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (data.session) await clearExplicitLogoutAfterSignIn();
  return data.session;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  if (data.session) await clearExplicitLogoutAfterSignIn();
  // 이메일 인증을 켠 경우 session이 null일 수 있음
  return data.session;
}

export async function signOut() {
  // Ordinary logout must preserve independently authenticated device sessions.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
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
    .signOut({ scope: 'local' })
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

function normalizeOptionalToken(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function getStableErrorCode(error: unknown): string {
  if (error instanceof OAuthSignInError) return error.code;
  if (error instanceof Error) return error.name || 'error';
  if (isRecord(error)) {
    const code = error.code;
    if (typeof code === 'string' && code.trim()) return code.trim();
    const status = error.status;
    if (typeof status === 'number') return `status_${status}`;
    if (typeof status === 'string' && status.trim()) return status.trim();
  }
  if (typeof error === 'string' && error.trim()) return error.trim();
  return 'unknown';
}

function logOAuthError(input: {
  provider: SocialOAuthProvider | null;
  stage: string;
  error: unknown;
}): void {
  if (!__DEV__) return;

  console.warn('[NURI-AUTH-OAUTH]', {
    provider: input.provider ?? 'unknown',
    stage: input.stage,
    code: getStableErrorCode(input.error),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function signInWithSupabaseOAuth(credentials: SupabaseOAuthCredentials) {
  // Supabase 공식 custom OAuth 문서는 `custom:` provider id를 client SDK에서
  // 사용하도록 안내하지만, 현재 설치된 auth-js 타입은 built-in provider union에
  // 머물러 있어 이 경계에서만 실제 런타임 계약으로 좁혀 호출한다.
  const signInWithOAuth = supabase.auth.signInWithOAuth.bind(
    supabase.auth,
  ) as unknown as (
    input: SupabaseOAuthCredentials,
  ) => ReturnType<typeof supabase.auth.signInWithOAuth>;

  return signInWithOAuth(credentials);
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
  const walkRestore = await captureWalkAccountRestoration(requestId);
  try {
    const { data, error } = await supabase.rpc('cancel_account_deletion', {
      p_request_id: requestId ?? null,
    });
    if (error) throw error;

    const parsed = parseAccountDeletionResult(data);
    if (!parsed) {
      throw new Error('계정 복구 결과를 해석하지 못했어요.');
    }

    // Authoritative restore success is not downgraded by local proof/disk retry.
    await walkRestore?.complete(parsed).catch(() => undefined);
    return parsed;
  } finally {
    walkRestore?.dispose();
  }
}

export async function deleteMyAccount(options?: {
  requestOrigin?: string;
  timeoutMs?: number;
  onResult?: (result: AccountDeletionResult) => Promise<boolean>;
  onNonFinalResult?: (result: AccountDeletionResult) => Promise<void>;
  onRequest?: (result: AccountDeletionResult) => Promise<void>;
  onRequestRejected?: (code: string) => Promise<void>;
}): Promise<AccountDeletionResult> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  let request: AccountDeletionResult;
  try {
    request = await createAccountDeletionRequest(options?.requestOrigin);
  } catch (error) {
    // Creation itself schedules deletion. Only an explicit PostgreSQL failure
    // proves THIS RPC rolled back; transport/parse failures may have committed.
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
    if (typeof code === 'string' && ['42501', '23503', '23514', '22023', 'P0001'].includes(code))
      await options?.onRequestRejected?.(code).catch(() => undefined);
    if (isMissingDeleteRpcError(error)) {
      throw new Error(
        '계정 삭제 SQL 함수가 아직 적용되지 않았습니다. docs/sql/공용-릴리즈-묶음/기능-추가/계정-동의-이력-및-계정-삭제.sql을 먼저 적용해 주세요.',
      );
    }
    throw error;
  }

  // Creation above ALREADY authorizes scheduled deletion. Binding failure must
  // retain UNKNOWN, even though the compatibility delete RPC is not dispatched.
  await options?.onRequest?.(request);
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
      // The authenticated RPC may complete after the UI's unknown-result
      // deadline. Deliver that actual receipt to the captured cleanup scope.
      const final = ['db_deleted', 'cleanup_pending', 'completed', 'completed_with_cleanup_pending'];
      if (!final.includes(parsed.status) || !parsed.actualStatus || !final.includes(parsed.actualStatus) || parsed.canRestore) {
        options?.onNonFinalResult?.(parsed).catch(() => undefined);
        return parsed;
      }
      if (!options?.onResult) return parsed;
      // Local disk cleanup cannot delay or downgrade this authoritative result.
      // The confirmed Native journal/retry coordinator owns its completion.
      options.onResult(parsed).catch(() => undefined);
      return { ...parsed, walkCleanupPending: true };
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
