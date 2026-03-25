import { Linking } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './RootNavigator';

const PREFIXES = ['nuri://'];

function normalizeIncomingUrl(url: string): string {
  const [base, hashFragment] = url.split('#', 2);
  if (!hashFragment) return url;

  const normalizedHash = hashFragment.startsWith('/')
    ? hashFragment.slice(1)
    : hashFragment;

  if (!normalizedHash.includes('=')) {
    return url;
  }

  const joiner = base.includes('?') ? '&' : '?';
  return `${base}${joiner}${normalizedHash}`;
}

export const appLinking: LinkingOptions<RootStackParamList> = {
  prefixes: PREFIXES,
  config: {
    screens: {
      SignIn: 'auth/sign-in',
      PasswordResetRequest: 'auth/reset/request',
      PasswordResetRecovery: 'auth/reset',
      PasswordResetForm: 'auth/reset/form',
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    return url ? normalizeIncomingUrl(url) : null;
  },
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      listener(normalizeIncomingUrl(url));
    });

    return () => {
      subscription.remove();
    };
  },
};
