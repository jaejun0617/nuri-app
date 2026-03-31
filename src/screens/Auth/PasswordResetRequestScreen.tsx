import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  isValidEmailFormat,
  requestPasswordReset,
} from '../../services/supabase/auth';

import { styles } from './PasswordResetFlow.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordResetRequest'>;

const COOLDOWN_SECONDS = 60;

export default function PasswordResetRequestScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email?.trim() ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!cooldownUntil) {
      setRemainingSeconds(0);
      return;
    }

    const tick = () => {
      const next = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next <= 0) {
        setCooldownUntil(null);
      }
    };

    tick();
    const timer = setInterval(tick, 250);

    return () => {
      clearInterval(timer);
    };
  }, [cooldownUntil]);

  const disabled = useMemo(() => {
    if (submitting) return true;
    if (!isValidEmailFormat(email)) return true;
    return remainingSeconds > 0;
  }, [email, remainingSeconds, submitting]);

  const onSubmit = useCallback(async () => {
    if (disabled) return;

    try {
      setSubmitting(true);
      await requestPasswordReset(email);
      setLastSentEmail(email.trim());
      setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'generic');
      Alert.alert(title, message);
    } finally {
      setSubmitting(false);
    }
  }, [disabled, email]);

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.replace('SignIn');
  }, [navigation]);

  const reasonMessage = useMemo(() => {
    if (route.params?.reason === 'expired' || route.params?.reason === 'invalid') {
      return '링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.';
    }
    return null;
  }, [route.params?.reason]);

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
              <Text style={styles.heroEyebrow}>PASSWORD RESET</Text>
              <Text style={styles.heroTitle}>비밀번호 재설정</Text>
              <Text style={styles.heroBody}>
                가입된 계정이 있다면 입력한 이메일로 비밀번호 재설정 안내를 보내드려요.
              </Text>
            </View>

            {reasonMessage ? (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>{reasonMessage}</Text>
              </View>
            ) : null}

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>이메일</Text>
              <View style={styles.inputRow}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="이메일을 입력해 주세요"
                  placeholderTextColor="#B7C0D0"
                  style={styles.input}
                  value={email}
                />
              </View>
            </View>

            {lastSentEmail ? (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>메일 전송 안내</Text>
                <Text style={styles.successBody}>
                  {`${lastSentEmail} 주소로 계정이 있다면 안내 메일을 보냈어요. 메일함과 스팸함을 함께 확인해 주세요.`}
                </Text>
                <Text style={styles.successBody}>
                  {remainingSeconds > 0
                    ? `${remainingSeconds}초 후 다시 요청할 수 있어요.`
                    : '필요하면 같은 이메일로 다시 요청할 수 있어요.'}
                </Text>
              </View>
            ) : null}

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
                {submitting
                  ? '메일을 준비하고 있어요...'
                  : remainingSeconds > 0
                    ? `${remainingSeconds}초 후 재발송`
                    : lastSentEmail
                      ? '재발송'
                      : '재설정 메일 보내기'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footerAction}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onPressBack}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>로그인으로 돌아가기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
