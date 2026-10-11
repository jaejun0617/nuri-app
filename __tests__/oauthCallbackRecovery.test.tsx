import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import OAuthCallbackScreen from '../src/screens/Auth/OAuthCallbackScreen';
import type { RootStackParamList } from '../src/navigation/RootNavigator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { registerAuthTransitionOwner } from '../src/services/auth/transition';
import { completeOAuthCallbackSession } from '../src/services/supabase/auth';

jest.mock('../src/app/ui/AppText', () => jest.requireActual('react-native').Text);

jest.mock('../src/services/supabase/auth', () => ({
  completeOAuthCallbackSession: jest.fn(async () => { throw new Error('callback_not_expected'); }),
  getOAuthSignInUserMessage: jest.fn(() => 'Sign-in could not be completed.'),
}));

type Props = NativeStackScreenProps<RootStackParamList, 'OAuthCallback'>;

beforeEach(() => {
  jest.mocked(completeOAuthCallbackSession).mockReset().mockRejectedValue(new Error('callback_not_expected'));
});

it.each(['AppTabs', 'SignIn'] as const)('recovers an unsolicited callback to the validated %s route', async target => {
  const unregister = registerAuthTransitionOwner(async () => ({ name: target, params: undefined }));
  const replace = jest.fn();
  const reset = jest.fn();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let tree: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<OAuthCallbackScreen
      navigation={{ replace, reset } as unknown as Props['navigation']}
      route={{ key: 'synthetic-callback', name: 'OAuthCallback', params: { code: 'synthetic-unsolicited' } }}
    />);
  });
  await act(async () => { alert.mock.calls[0]?.[2]?.[0]?.onPress?.(); });
  expect(replace).not.toHaveBeenCalledWith('SignIn');
  expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: target, params: undefined }] });
  await act(async () => { tree.unmount(); });
  alert.mockRestore();
  unregister();
});

it.each(['AppTabs', 'NicknameSetup', 'PetCreate'] as const)('uses the owner-resolved %s route exactly once after successful exchange', async name => {
  const target = name === 'PetCreate'
    ? { name, params: { from: 'auto' as const } }
    : { name, params: undefined };
  jest.mocked(completeOAuthCallbackSession).mockResolvedValue(target);
  const reset = jest.fn(); const replace = jest.fn();
  let tree: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<OAuthCallbackScreen navigation={{ reset, replace } as unknown as Props['navigation']}
      route={{ key: 'valid-callback', name: 'OAuthCallback', params: { code: 'public-fixture-valid' } }} />);
  });
  expect(reset).toHaveBeenCalledTimes(1);
  expect(reset).toHaveBeenCalledWith({ index: 0, routes: [target] });
  expect(replace).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
});

it('preserves the pre-flow authenticated route when the provider cancels', async () => {
  const unregister = registerAuthTransitionOwner(async () => ({ name: 'AppTabs', params: undefined }));
  const reset = jest.fn(); const replace = jest.fn();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let tree: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<OAuthCallbackScreen navigation={{ reset, replace } as unknown as Props['navigation']}
      route={{ key: 'cancel-callback', name: 'OAuthCallback', params: { error: 'access_denied', provider: 'google' } }} />);
  });
  await act(async () => { alert.mock.calls[0]?.[2]?.[0]?.onPress?.(); });
  expect(completeOAuthCallbackSession).not.toHaveBeenCalled();
  expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'AppTabs', params: undefined }] });
  await act(async () => tree.unmount());
  unregister(); alert.mockRestore();
});
