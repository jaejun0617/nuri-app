import type { Session } from '@supabase/supabase-js';
import { AuthNetworkTimeout, classifyAuthFailure, resolveAuthBoot, type AuthBootPorts } from '../src/services/auth/bootstrap';

const session: Session = {
  access_token: 'local-access', refresh_token: 'local-refresh', expires_in: 3600,
  expires_at: 1, token_type: 'bearer',
  user: { id: 'existing-user', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01' },
};
const networkError = Object.assign(new Error('Network request failed'), { name: 'AuthRetryableFetchError', status: 0 });
const ports = (): AuthBootPorts => ({
  readLocalSession: jest.fn(async () => session),
  hasExplicitLogout: jest.fn(async () => false),
  getSession: jest.fn(async () => ({ data: { session }, error: null })),
  getUser: jest.fn(async () => ({ data: { user: session.user }, error: null })),
});

describe('offline auth boundary', () => {
  it('validates an online local session', async () => {
    expect((await resolveAuthBoot(ports())).state).toBe('validated');
  });
  it('retains a local session for a returned getUser network error', async () => {
    const p = ports(); p.getUser = jest.fn(async () => ({ data: { user: null }, error: networkError }));
    expect(await resolveAuthBoot(p)).toEqual({ state: 'offline_unverified', session });
  });
  it('retains expired persisted credentials only when SDK refresh fails transiently', async () => {
    const p = ports(); p.getSession = jest.fn(async () => ({ data: { session: null }, error: networkError }));
    expect(await resolveAuthBoot(p)).toEqual({ state: 'offline_unverified', session });
    expect(p.getUser).not.toHaveBeenCalled();
  });
  it('does not admit an offline guest', async () => {
    const p = ports(); p.readLocalSession = jest.fn(async () => null);
    p.getSession = jest.fn(async () => ({ data: { session: null }, error: networkError }));
    expect(await resolveAuthBoot(p)).toEqual({ state: 'no_local_session', session: null });
  });
  it('does not resurrect a clean SDK signout from a stale snapshot', async () => {
    const p = ports(); p.getSession = jest.fn(async () => ({ data: { session: null }, error: null }));
    expect((await resolveAuthBoot(p)).session).toBeNull();
  });
  it.each([401, 403])('rejects definitive %i even with network text', async status => {
    const p = ports(); p.getUser = jest.fn(async () => ({ data: { user: null }, error: { status, message: 'Network request failed' } }));
    expect(await resolveAuthBoot(p)).toEqual({ state: 'invalid', session: null });
  });
  it('rejects a revoked refresh token', async () => {
    const p = ports(); p.getSession = jest.fn(async () => ({ data: { session: null }, error: { code: 'refresh_token_not_found', status: 400 } }));
    expect((await resolveAuthBoot(p)).state).toBe('invalid');
  });
  it('explicit logout wins before SDK/session reads', async () => {
    const p = ports(); p.hasExplicitLogout = jest.fn(async () => true);
    expect((await resolveAuthBoot(p)).state).toBe('explicit_logout');
    expect(p.getSession).not.toHaveBeenCalled();
  });
  it('logout while a user validation is pending wins over its success', async () => {
    const p = ports(); let loggedOut = false;
    p.hasExplicitLogout = jest.fn(async () => loggedOut);
    p.getUser = jest.fn(async () => { loggedOut = true; return { data: { user: session.user }, error: null }; });
    expect((await resolveAuthBoot(p)).state).toBe('explicit_logout');
  });
  it('offline to online revalidates the same user and refreshed token', async () => {
    const p = ports(); p.getUser = jest.fn(async () => ({ data: { user: null }, error: networkError }));
    expect((await resolveAuthBoot(p)).state).toBe('offline_unverified');
    p.getUser = jest.fn(async () => ({ data: { user: session.user }, error: null }));
    p.getSession = jest.fn(async () => ({ data: { session: { ...session, access_token: 'refreshed' } }, error: null }));
    const restored = await resolveAuthBoot(p);
    expect(restored.state).toBe('validated');
    expect(restored.session?.access_token).toBe('refreshed');
  });
  it('does not reinterpret an unknown implementation error as offline access', async () => {
    const p = ports(); p.getUser = jest.fn(async () => { throw new Error('unexpected'); });
    await expect(resolveAuthBoot(p)).rejects.toThrow('unexpected');
  });
  it('bounds a stalled network request without removing the session', async () => {
    jest.useFakeTimers();
    const p = ports(); p.getUser = jest.fn(() => new Promise(() => {}));
    const result = resolveAuthBoot(p);
    await jest.advanceTimersByTimeAsync(5_000);
    expect((await result).state).toBe('offline_unverified');
    jest.useRealTimers();
  });
  it('classifies network timeouts and DNS, but not unknown errors', () => {
    expect(classifyAuthFailure(new AuthNetworkTimeout())).toBe('network');
    expect(classifyAuthFailure({ code: 'ENOTFOUND' })).toBe('network');
    expect(classifyAuthFailure(new TypeError('Network request failed'))).toBe('network');
    expect(classifyAuthFailure(new Error('bad state'))).toBe('unknown');
  });
});
