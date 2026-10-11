// 파일: src/screens/Auth/OAuthCallbackScreen.tsx
// 파일 목적:
// - Supabase Google/Kakao OAuth web flow가 앱으로 돌아왔을 때 세션을 복구한다.
// 어디서 쓰이는지:
// - nuri://auth/callback deep link와 RootNavigator의 `OAuthCallback` 라우트에서 사용된다.
// 핵심 역할:
// - 이 기기에서 시작한 PKCE code만 교환한 뒤 단일 auth owner의 route 결정을 적용한다.
// 데이터·상태 흐름:
// - AppProviders가 세션 및 profile/pet 준비를 확정하고 이 화면은 결정된 route만 표시한다.
// 수정 시 주의:
// - password reset recovery route와 섞지 않는다. `nuri://auth/reset`은 이 화면에서 처리하지 않는다.

import AppText from '../../app/ui/AppText';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  completeOAuthCallbackSession,
  getOAuthSignInUserMessage,
  type SocialOAuthProvider,
} from '../../services/supabase/auth';

import { styles } from './PasswordResetFlow.styles';
import { consumePendingOAuth } from '../../services/auth/pendingOAuth';
import { resolveAuthTransition, type AuthEntryRoute } from '../../services/auth/transition';
import { recordAuthEvent } from '../../services/auth/trace';

type Props = NativeStackScreenProps<RootStackParamList, 'OAuthCallback'>;

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? '';
  return value?.trim() ?? '';
}

function parseProvider(value: string): SocialOAuthProvider | null {
  if (value === 'google' || value === 'kakao') {
    return value;
  }
  return null;
}

export default function OAuthCallbackScreen({ navigation, route }: Props) {
  const error = readParam(route.params?.error);
  const errorDescription = readParam(route.params?.error_description);
  const provider = parseProvider(readParam(route.params?.provider));
  const accessToken = readParam(route.params?.access_token);
  const refreshToken = readParam(route.params?.refresh_token);
  const code = readParam(route.params?.code);
  const tokenHash = readParam(route.params?.token_hash);
  const verificationType = readParam(route.params?.type);
  useEffect(() => {
    let active = true;

    const navigateResolved = (target: AuthEntryRoute) => {
      if (!active) return;
      recordAuthEvent(target.name === 'SignIn' ? 'ROUTE_TARGET_ANONYMOUS' : 'ROUTE_TARGET_AUTHENTICATED');
      navigation.reset({ index: 0, routes: [target] });
    };

    const recover = async () => {
      const target = await resolveAuthTransition();
      recordAuthEvent('CALLBACK_RECOVERY_COMPLETE');
      navigateResolved(target);
    };

    const showFailure = (message: string) => {
      recordAuthEvent('CALLBACK_REJECTED');
      if (!active) return;
      Alert.alert('소셜 로그인을 완료하지 못했어요', message, [{
        text: '확인', onPress: () => { recover().catch(() => {
          if (active) Alert.alert('로그인 상태를 확인하지 못했어요', '앱을 다시 열어 주세요.');
        }); },
      }]);
    };

    const handleCallback = async () => {
      recordAuthEvent('CALLBACK_RECEIVED');
      if (error) {
        await consumePendingOAuth(provider);
        showFailure('로그인이 취소되었거나 만료됐어요. 소셜 로그인을 다시 시작해 주세요.');
        return;
      }

      try {
        const target = await completeOAuthCallbackSession({
          accessToken,
          refreshToken,
          code,
          tokenHash,
          verificationType,
          provider,
        });
        if (!active) return;
        navigateResolved(target);
      } catch (sessionError: unknown) {
        if (!active) return;
        showFailure(getOAuthSignInUserMessage(sessionError));
      }
    };

    handleCallback().catch(() => {
      showFailure('로그인 상태를 다시 확인해 주세요.');
    });

    return () => {
      active = false;
    };
  }, [navigation, error, errorDescription, provider, accessToken, refreshToken, code, tokenHash, verificationType]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.scrollContent}>
        <View style={styles.processingCard}>
          <ActivityIndicator color="#6D6AF8" size="large" />
          <AppText typographyRole="celebration" preset="unifiedTitle" style={styles.processingTitle}>소셜 로그인을 확인하고 있어요</AppText>
          <AppText preset="unifiedBody" style={styles.processingBody}>
            인증 결과를 확인한 뒤 NURI 시작 화면으로 돌아갑니다.
          </AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}
