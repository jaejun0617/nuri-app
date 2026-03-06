import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPendingConsentSnapshot,
  CURRENT_POLICY_VERSION,
  loadPendingConsentSnapshot,
  savePendingConsentSnapshot,
} from '../src/services/legal/consents';

jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      ),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

describe('consent snapshot storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('동의 스냅샷을 저장하고 다시 불러온다', async () => {
    const snapshot = {
      termsAccepted: true,
      privacyAccepted: true,
      marketingAccepted: false,
      policyVersion: CURRENT_POLICY_VERSION,
      capturedAt: '2026-03-06T00:00:00.000Z',
      source: 'signup' as const,
    };

    let storedValue: string | null = null;
    (AsyncStorage.setItem as jest.Mock).mockImplementation((_key, value) => {
      storedValue = value;
      return Promise.resolve(null);
    });
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
      Promise.resolve(storedValue),
    );

    await savePendingConsentSnapshot(snapshot);
    await expect(loadPendingConsentSnapshot()).resolves.toEqual(snapshot);
  });

  it('동의 스냅샷을 정리한다', async () => {
    await clearPendingConsentSnapshot();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });
});
