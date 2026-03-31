import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { disposePasswordRecoverySession } from '../../services/auth/session';
import { isValidPasswordFormat } from '../../services/supabase/account';
import { updatePasswordWithRecovery } from '../../services/supabase/auth';
import { showToast } from '../../store/uiStore';

import { styles } from './PasswordResetFlow.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordResetForm'>;
type ResetNotice = NonNullable<RootStackParamList['SignIn']>['notice'];

export default function PasswordResetFormScreen({ navigation }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const cleanupInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const disabled = useMemo(() => {
    if (submitting) return true;
    if (!password.trim() || !confirmPassword.trim()) return true;
    return false;
  }, [confirmPassword, password, submitting]);

  const resetToSignIn = useCallback(
    (notice?: ResetNotice) => {
      navigation.reset({
        index: 0,
        routes: notice
          ? [{ name: 'SignIn', params: { notice } }]
          : [{ name: 'SignIn' }],
      });
    },
    [navigation],
  );

  const leaveRecoveryFlow = useCallback(
    async (options?: {
      notice?: ResetNotice;
      toast?: {
        tone: 'warning';
        title: string;
        message: string;
      };
    }) => {
      if (cleanupInFlightRef.current) return;
      cleanupInFlightRef.current = true;

      try {
        await disposePasswordRecoverySession();
      } finally {
        if (options?.toast) {
          showToast({
            tone: options.toast.tone,
            title: options.toast.title,
            message: options.toast.message,
            durationMs: 3200,
          });
        }

        resetToSignIn(options?.notice);
      }
    },
    [resetToSignIn],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (cleanupInFlightRef.current) return;

      event.preventDefault();
      leaveRecoveryFlow().catch(() => {});
    });

    return unsubscribe;
  }, [leaveRecoveryFlow, navigation]);

  const onSubmit = useCallback(async () => {
    if (disabled) return;

    const nextPassword = password.trim();
    const nextConfirmPassword = confirmPassword.trim();

    if (!isValidPasswordFormat(nextPassword)) {
      Alert.alert(
        '비밀번호를 다시 확인해 주세요',
        '영문, 숫자, 특수문자를 포함한 8자 이상으로 입력해 주세요.',
      );
      return;
    }

    if (nextPassword !== nextConfirmPassword) {
      Alert.alert(
        '비밀번호가 일치하지 않아요',
        '새 비밀번호와 확인용 비밀번호를 동일하게 입력해 주세요.',
      );
      return;
    }

    try {
      setSubmitting(true);
      await updatePasswordWithRecovery(nextPassword);
      await leaveRecoveryFlow({ notice: 'password-reset-success' });
    } catch (error) {
      const message =
        error instanceof Error &&
        /session|jwt|token|auth/i.test(error.message)
          ? '링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.'
          : getBrandedErrorMeta(error, 'password-change').message;

      await leaveRecoveryFlow({
        toast: {
          tone: 'warning',
          title: '비밀번호 재설정을 이어가지 못했어요',
          message,
        },
      });
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [confirmPassword, disabled, leaveRecoveryFlow, password]);

  const onPressCancelRecovery = useCallback(() => {
    if (submitting) return;
    leaveRecoveryFlow().catch(() => {});
  }, [leaveRecoveryFlow, submitting]);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.hero}>
              <Text style={styles.heroEyebrow}>NEW PASSWORD</Text>
              <Text style={styles.heroTitle}>새 비밀번호 설정</Text>
              <Text style={styles.heroBody}>
                비밀번호를 변경한 뒤에는 새 비밀번호로 다시 로그인해야 합니다.
              </Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>새 비밀번호</Text>
              <View style={styles.inputRow}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setPassword}
                  placeholder="새 비밀번호를 입력해 주세요"
                  placeholderTextColor="#B7C0D0"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>
              <Text style={styles.helperText}>
                영문, 숫자, 특수문자를 포함한 8자 이상으로 입력해 주세요.
              </Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>새 비밀번호 확인</Text>
              <View style={styles.inputRow}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setConfirmPassword}
                  placeholder="비밀번호를 한 번 더 입력해 주세요"
                  placeholderTextColor="#B7C0D0"
                  secureTextEntry
                  style={styles.input}
                  value={confirmPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={disabled}
              onPress={onSubmit}
              style={[
                styles.primaryButton,
                disabled ? styles.primaryButtonDisabled : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? '비밀번호를 변경하고 있어요...' : '비밀번호 변경하기'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onPressCancelRecovery}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>로그인으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
