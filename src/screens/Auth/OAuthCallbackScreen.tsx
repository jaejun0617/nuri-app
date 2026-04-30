// 파일: src/screens/Auth/OAuthCallbackScreen.tsx
// 파일 목적:
// - Supabase Google/Kakao OAuth web flow가 앱으로 돌아왔을 때 세션을 복구한다.
// 어디서 쓰이는지:
// - nuri://auth/callback deep link와 RootNavigator의 `OAuthCallback` 라우트에서 사용된다.
// 핵심 역할:
// - OAuth code flow 또는 token fragment callback을 Supabase session으로 교환한 뒤 Splash boot contract로 복귀시킨다.
// 데이터·상태 흐름:
// - 세션 저장은 Supabase client storage와 auth listener가 맡고, profile/nickname/pet 분기는 기존 AppProviders/Splash 흐름이 처리한다.
// 수정 시 주의:
// - password reset recovery route와 섞지 않는다. `nuri://auth/reset`은 이 화면에서 처리하지 않는다.

import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  completeOAuthCallbackSession,
  getOAuthSignInUserMessage,
  type SocialOAuthProvider,
} from '../../services/supabase/auth';

import { styles } from './PasswordResetFlow.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'OAuthCallback'>;

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? '';
  return value?.trim() ?? '';
}

function parseProvider(value: string): SocialOAuthProvider | null {
  if (value === 'google' || value === 'kakao') return value;
  return null;
}

export default function OAuthCallbackScreen({ navigation, route }: Props) {
  useEffect(() => {
    let active = true;

    const returnToSignIn = () => {
      if (!active) return;
      navigation.replace('SignIn');
    };

    const handleCallback = async () => {
      const error = readParam(route.params?.error);
      const errorDescription = readParam(route.params?.error_description);
      const provider = parseProvider(readParam(route.params?.provider));

      if (error) {
        Alert.alert(
          '소셜 로그인을 완료하지 못했어요',
          errorDescription ||
            '소셜 로그인 연결에 실패했어요. 이메일 로그인을 이용해 주세요.',
          [{ text: '확인', onPress: returnToSignIn }],
        );
        return;
      }

      try {
        await completeOAuthCallbackSession({
          accessToken: readParam(route.params?.access_token),
          refreshToken: readParam(route.params?.refresh_token),
          code: readParam(route.params?.code),
          provider,
        });
        if (!active) return;
        navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
      } catch (sessionError: unknown) {
        if (!active) return;
        Alert.alert(
          '소셜 로그인을 완료하지 못했어요',
          getOAuthSignInUserMessage(sessionError),
          [{ text: '확인', onPress: returnToSignIn }],
        );
      }
    };

    handleCallback().catch(() => {
      returnToSignIn();
    });

    return () => {
      active = false;
    };
  }, [navigation, route.params]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.scrollContent}>
        <View style={styles.processingCard}>
          <ActivityIndicator color="#6D6AF8" size="large" />
          <Text style={styles.processingTitle}>소셜 로그인을 확인하고 있어요</Text>
          <Text style={styles.processingBody}>
            인증 결과를 확인한 뒤 NURI 시작 화면으로 돌아갑니다.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
