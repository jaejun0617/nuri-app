import { Linking } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './RootNavigator';
import { AUTH_APP_LINK_ORIGIN, createCallbackDeliveryGuard, normalizeAppLink } from '../services/auth/appLinks';

const PREFIXES = ['nuri://', `${AUTH_APP_LINK_ORIGIN}/`];
const shouldDeliverCallback = createCallbackDeliveryGuard();

export const appLinking: LinkingOptions<RootStackParamList> = {
  prefixes: PREFIXES,
  config: {
    screens: {
      SignIn: 'auth/sign-in',
      PasswordResetRequest: 'auth/reset/request',
      PasswordResetRecovery: 'auth/reset',
      PasswordResetForm: 'auth/reset/form',
      OAuthCallback: 'auth/callback',
      WalkSpotList: 'walk-spots',
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    const normalized = url ? normalizeAppLink(url) : null;
    return normalized && shouldDeliverCallback(normalized) ? normalized : null;
  },
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const normalized = normalizeAppLink(url);
      if (normalized && shouldDeliverCallback(normalized)) listener(normalized);
    });

    return () => {
      subscription.remove();
    };
  },
};
