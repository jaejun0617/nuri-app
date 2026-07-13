import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    rpc: jest.Mock<Promise<{ data: unknown; error: null }>, [string, Record<string, unknown>]>;
    from: jest.Mock;
  };
};

const mockMaybeSingle = jest.fn<Promise<{ data: unknown; error: null }>, []>();
const mockEqSecond = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEqFirst = jest.fn(() => ({ eq: mockEqSecond }));
const mockSelect = jest.fn(() => ({ eq: mockEqFirst, maybeSingle: mockMaybeSingle }));

import {
  fetchPushNotificationLifecycleState,
  revokeCurrentDevicePushToken,
  setPushNotificationOptIn,
} from '../src/services/notifications/pushTokenLifecycle';

describe('push token lifecycle policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.rpc.mockResolvedValue({ data: 1, error: null });
    supabase.from.mockReturnValue({ select: mockSelect });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('opt-in은 실제 push provider token 없이 disabled provider 상태로만 저장한다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const result = await setPushNotificationOptIn(true);

    expect(result).toEqual({ pushOptIn: true, providerStatus: 'provider_unavailable' });
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'set_user_notification_opt_in_v1', {
      p_push_opt_in: true,
      p_categories: {
        service: true,
        community: true,
        schedule: true,
      },
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      2,
      'upsert_user_push_token_v1',
      expect.objectContaining({
        p_provider: 'disabled',
        p_token_fingerprint: null,
        p_token_ciphertext: null,
        p_opt_in: true,
      }),
    );
  });

  it('opt-out은 현재 기기 token을 user_opt_out 사유로 revoke한다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('device-install-id');

    const result = await setPushNotificationOptIn(false);

    expect(result).toEqual({ pushOptIn: false, providerStatus: 'revoked' });
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'set_user_notification_opt_in_v1', {
      p_push_opt_in: false,
      p_categories: {
        service: false,
        community: false,
        schedule: false,
      },
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'revoke_user_push_token_v1', {
      p_device_id: 'device-install-id',
      p_provider: 'disabled',
      p_reason: 'user_opt_out',
    });
  });

  it('logout/account deletion revoke는 device scoped RPC만 호출하고 token 원문을 다루지 않는다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('device-install-id');

    await expect(revokeCurrentDevicePushToken('user_logout')).resolves.toBe(1);

    expect(supabase.rpc).toHaveBeenCalledWith('revoke_user_push_token_v1', {
      p_device_id: 'device-install-id',
      p_provider: 'disabled',
      p_reason: 'user_logout',
    });
  });

  it('cache에 device id가 없으면 revoke RPC를 호출하지 않는다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    await expect(revokeCurrentDevicePushToken('account_deleted')).resolves.toBe(0);

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('opt-in preference가 꺼져 있으면 revoked 상태로 표시한다', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { push_opt_in: false }, error: null });

    await expect(fetchPushNotificationLifecycleState()).resolves.toEqual({
      pushOptIn: false,
      providerStatus: 'revoked',
    });
  });
});
