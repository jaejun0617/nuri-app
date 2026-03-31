import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { disposePasswordRecoverySession } from '../../services/auth/session';
import { completePasswordRecoverySession } from '../../services/supabase/auth';
import { useAuthStore } from '../../store/authStore';

import { styles } from './PasswordResetFlow.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordResetRecovery'>;

export default function PasswordResetRecoveryScreen({ navigation, route }: Props) {
  const activatePasswordRecovery = useAuthStore(s => s.activatePasswordRecovery);

  useEffect(() => {
    let active = true;

    const failRecoveryEntry = async () => {
      await disposePasswordRecoverySession();
      if (!active) return;
      navigation.replace('PasswordResetRequest', { reason: 'invalid' });
    };

    const handleRecovery = async () => {
      const accessToken = route.params?.access_token?.trim() ?? '';
      const refreshToken = route.params?.refresh_token?.trim() ?? '';
      const type = route.params?.type?.trim() ?? '';

      if (type !== 'recovery' || !accessToken || !refreshToken) {
        await failRecoveryEntry();
        return;
      }

      try {
        await activatePasswordRecovery();
        await completePasswordRecoverySession({
          accessToken,
          refreshToken,
        });
        if (!active) return;
        navigation.replace('PasswordResetForm');
      } catch {
        if (!active) return;
        Alert.alert(
          '비밀번호 재설정을 이어가지 못했어요',
          '링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.',
          [
            {
              text: '확인',
              onPress: () => {
                failRecoveryEntry().catch(() => {});
              },
            },
          ],
        );
      }
    };

    handleRecovery().catch(() => {
      failRecoveryEntry().catch(() => {});
    });

    return () => {
      active = false;
    };
  }, [activatePasswordRecovery, navigation, route.params]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.scrollContent}>
        <View style={styles.processingCard}>
          <ActivityIndicator color="#6D6AF8" size="large" />
          <Text style={styles.processingTitle}>링크를 확인하고 있어요</Text>
          <Text style={styles.processingBody}>
            보안을 위해 복구 링크를 확인한 뒤 새 비밀번호 입력 화면으로 이동합니다.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
