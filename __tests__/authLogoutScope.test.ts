import { AuthError } from '@supabase/supabase-js';

jest.mock('../src/services/supabase/client', () => ({
  supabase: { auth: { signOut: jest.fn() } },
}));

import { supabase } from '../src/services/supabase/client';
import {
  clearLocalAuthSession,
  signOut,
  signOutBestEffort,
} from '../src/services/supabase/auth';

const mockSignOut = jest.mocked(supabase.auth.signOut);

describe('logout is scoped to this installation session', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSignOut.mockReset().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it.each([
    ['explicit logout', signOut],
    ['local credential cleanup', clearLocalAuthSession],
  ])('%s does not revoke another device session', async (_name, logout) => {
    await logout();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('best-effort logout keeps the same scope on success', async () => {
    await expect(signOutBestEffort()).resolves.toEqual({
      timedOut: false,
      error: null,
    });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('reports a remote failure without falling back to global logout', async () => {
    const error = new AuthError('QA logout rejected');
    mockSignOut.mockResolvedValue({ error });
    await expect(signOutBestEffort()).resolves.toEqual({
      timedOut: false,
      error,
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('does not start another logout when a local request times out', async () => {
    let finish: ((value: { error: null }) => void) | undefined;
    mockSignOut.mockImplementation(() => new Promise(resolve => {
      finish = resolve;
    }));
    const pending = signOutBestEffort(1200);
    await jest.advanceTimersByTimeAsync(1200);
    await expect(pending).resolves.toEqual({ timedOut: true, error: null });
    finish?.({ error: null });
    await Promise.resolve();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('preserves rejection for callers that require completed logout', async () => {
    const error = new AuthError('QA logout rejected');
    mockSignOut.mockResolvedValue({ error });
    await expect(signOut()).rejects.toBe(error);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
