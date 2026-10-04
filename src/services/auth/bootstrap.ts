import type { Session, User } from '@supabase/supabase-js';

export type AuthBootDecision =
  | { state: 'no_local_session' | 'explicit_logout' | 'invalid'; session: null }
  | { state: 'validated' | 'offline_unverified'; session: Session };

export type AuthBootPorts = {
  readLocalSession: () => Promise<Session | null>;
  hasExplicitLogout: () => Promise<boolean>;
  getSession: () => Promise<{ data: { session: Session | null }; error: unknown }>;
  getUser: (jwt: string) => Promise<{ data: { user: User | null }; error: unknown }>;
};

export class AuthNetworkTimeout extends Error {
  constructor() {
    super('Auth network validation timed out');
    this.name = 'AuthNetworkTimeout';
  }
}

export function classifyAuthFailure(error: unknown): 'network' | 'invalid' | 'unknown' {
  if (!error || typeof error !== 'object') return 'unknown';
  const status = 'status' in error ? error.status : null;
  const code = 'code' in error ? error.code : null;
  const name = 'name' in error ? error.name : null;
  // A server denial takes precedence over misleading network text.
  if (status === 401 || status === 403 || [
    'bad_jwt', 'session_not_found', 'refresh_token_not_found',
    'refresh_token_already_used', 'user_not_found', 'user_banned',
  ].includes(String(code))) return 'invalid';
  if (error instanceof AuthNetworkTimeout || name === 'AuthRetryableFetchError') return 'network';
  if (error instanceof TypeError && /network request failed|failed to fetch|fetch failed|load failed/i.test(error.message)) return 'network';
  if (['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH'].includes(String(code))) return 'network';
  return 'unknown';
}

async function networkBound<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new AuthNetworkTimeout()), ms);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function resolveAuthBoot(ports: AuthBootPorts): Promise<AuthBootDecision> {
  const decision = await resolveSession(ports);
  // Logout can occur while getSession/getUser is pending.
  return await ports.hasExplicitLogout()
    ? { state: 'explicit_logout', session: null }
    : decision;
}

async function resolveSession(ports: AuthBootPorts): Promise<AuthBootDecision> {
  if (await ports.hasExplicitLogout()) return { state: 'explicit_logout', session: null };
  const persisted = await ports.readLocalSession();
  let session: Session | null;
  try {
    const result = await networkBound(ports.getSession(), 4_000);
    if (result.error) throw result.error;
    session = result.data.session;
  } catch (error: unknown) {
    const failure = classifyAuthFailure(error);
    if (failure === 'invalid') return { state: 'invalid', session: null };
    if (failure !== 'network') throw error;
    return persisted
      ? { state: 'offline_unverified', session: persisted }
      : { state: 'no_local_session', session: null };
  }
  if (!session?.user?.id) return { state: 'no_local_session', session: null };
  try {
    // An explicit JWT avoids waiting for another SDK refresh while offline.
    const result = await networkBound(ports.getUser(session.access_token), 5_000);
    if (result.error) throw result.error;
    if (!result.data.user || result.data.user.id !== session.user.id) return { state: 'invalid', session: null };
    return { state: 'validated', session: { ...session, user: result.data.user } };
  } catch (error: unknown) {
    const failure = classifyAuthFailure(error);
    if (failure === 'invalid') return { state: 'invalid', session: null };
    if (failure !== 'network') throw error;
    return { state: 'offline_unverified', session };
  }
}
