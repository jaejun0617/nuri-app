import React, { memo, useCallback, useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../services/supabase/client';
import { useAuthStore } from '../../store/authStore';

import { styles } from './SignUpScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type InputFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  rightAccessory?: React.ReactNode;
};

const InputField = memo(function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  rightAccessory,
}: InputFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B7C0D0"
          secureTextEntry={secureTextEntry}
          style={styles.input}
          value={value}
        />
        {rightAccessory ? (
          <View style={styles.inputAccessory}>{rightAccessory}</View>
        ) : null}
      </View>
    </View>
  );
});

type SocialButtonProps = {
  label: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  badge: React.ReactNode;
  onPress: () => void;
};

const SocialButton = memo(function SocialButton({
  label,
  backgroundColor,
  borderColor,
  textColor,
  badge,
  onPress,
}: SocialButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.socialButton, { backgroundColor, borderColor }]}
    >
      <View style={styles.socialBadge}>{badge}</View>
      <Text style={[styles.socialButtonText, { color: textColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '다시 시도해 주세요.';
}

function getSignUpErrorMeta(error: unknown): { title: string; message: string } {
  const raw = getErrorMessage(error);
  const normalized = raw.toLowerCase();

  if (normalized.includes('email rate limit exceeded')) {
    return {
      title: '가입 요청이 많습니다',
      message: '이메일 발송 요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.',
    };
  }

  if (normalized.includes('user already registered')) {
    return {
      title: '이미 가입된 이메일입니다',
      message: '이미 가입된 계정입니다. 로그인 화면에서 다시 진행해주세요.',
    };
  }

  if (normalized.includes('database error saving new user')) {
    return {
      title: '가입 처리 오류',
      message:
        '가입 초기화 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }

  if (normalized.includes('password')) {
    return {
      title: '비밀번호를 확인해주세요',
      message: raw,
    };
  }

  return {
    title: '회원가입 실패',
    message: raw,
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function signUpWithTimeout(email: string, password: string, timeoutMs = 12000) {
  const signUpPromise = supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          '회원가입 요청이 지연되고 있습니다. 네트워크를 확인한 뒤 다시 시도해주세요.',
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([signUpPromise, timeoutPromise]);
}

export default function SignUpScreen() {
  const navigation = useNavigation<Nav>();
  const setSession = useAuthStore(s => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const passwordValid = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const disabled = useMemo(
    () =>
      submitting ||
      !emailValid ||
      !passwordValid ||
      !passwordsMatch ||
      !agreeTerms,
    [agreeTerms, emailValid, passwordValid, passwordsMatch, submitting],
  );

  const onSubmit = useCallback(async () => {
    if (disabled) return;

    try {
      setSubmitting(true);

      const { data, error } = await signUpWithTimeout(email, password);
      if (error) throw error;

      await setSession(data.session ?? null);

      if (!data.session) {
        Alert.alert(
          '이메일 확인 필요',
          '회원가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.',
          [{ text: '확인', onPress: () => navigation.replace('SignIn') }],
        );
        return;
      }

      navigation.replace('NicknameSetup', { after: 'signup' });
    } catch (error) {
      const { title, message } = getSignUpErrorMeta(error);
      Alert.alert(title, message);
    } finally {
      setSubmitting(false);
    }
  }, [disabled, email, navigation, password, setSession]);

  const onSocialPress = useCallback((provider: 'kakao' | 'google') => {
    const label = provider === 'kakao' ? '카카오' : 'Google';
    Alert.alert(
      `${label} 회원가입 준비 중`,
      '소셜 로그인 연동은 다음 단계에서 연결됩니다.',
    );
  }, []);

  const onOpenTerms = useCallback((kind: 'terms' | 'privacy') => {
    const title = kind === 'terms' ? '이용약관' : '개인정보 처리방침';
    Alert.alert(title, `${title} 화면은 다음 단계에서 실제 문서와 연결됩니다.`);
  }, []);

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
          <View style={styles.headerRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
              style={styles.headerBackButton}
            >
              <Feather color="#1B2435" name="arrow-left" size={20} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>회원가입</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              새로운 시작을{'\n'}
              함께해요
            </Text>
            <Text style={styles.heroBody}>
              소중한 반려동물과의 기억을 기록하세요
            </Text>
          </View>

          <InputField
            autoCapitalize="none"
            keyboardType="email-address"
            label="이메일 주소"
            onChangeText={setEmail}
            placeholder="example@petmemory.com"
            value={email}
          />

          <InputField
            autoCapitalize="none"
            label="비밀번호"
            onChangeText={setPassword}
            placeholder="8자 이상 입력해주세요"
            rightAccessory={
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSecurePassword(prev => !prev)}
              >
                <Feather
                  color="#9DA7BA"
                  name={securePassword ? 'eye-off' : 'eye'}
                  size={18}
                />
              </TouchableOpacity>
            }
            secureTextEntry={securePassword}
            value={password}
          />

          <InputField
            autoCapitalize="none"
            label="비밀번호 확인"
            onChangeText={setConfirmPassword}
            placeholder="비밀번호를 다시 입력해주세요"
            rightAccessory={
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSecureConfirmPassword(prev => !prev)}
              >
                <Feather
                  color="#9DA7BA"
                  name={secureConfirmPassword ? 'eye-off' : 'eye'}
                  size={18}
                />
              </TouchableOpacity>
            }
            secureTextEntry={secureConfirmPassword}
            value={confirmPassword}
          />

          {!emailValid && email.length > 0 ? (
            <Text style={styles.errorText}>
              올바른 이메일 형식을 입력해주세요.
            </Text>
          ) : null}
          {!passwordValid && password.length > 0 ? (
            <Text style={styles.errorText}>
              비밀번호는 8자 이상이어야 합니다.
            </Text>
          ) : null}
          {confirmPassword.length > 0 && !passwordsMatch ? (
            <Text style={styles.errorText}>비밀번호가 일치하지 않습니다.</Text>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setAgreeTerms(prev => !prev)}
            style={styles.termsRow}
          >
            <View
              style={[
                styles.checkbox,
                agreeTerms ? styles.checkboxChecked : null,
              ]}
            >
              {agreeTerms ? (
                <Feather color="#FFFFFF" name="check" size={12} />
              ) : null}
            </View>
            <Text style={styles.termsText}>
              <Text
                onPress={() => onOpenTerms('terms')}
                style={styles.termsLink}
              >
                이용약관
              </Text>{' '}
              및{' '}
              <Text
                onPress={() => onOpenTerms('privacy')}
                style={styles.termsLink}
              >
                개인정보 처리방침
              </Text>
              에 동의합니다.
            </Text>
          </TouchableOpacity>

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
              {submitting ? '가입 중...' : '가입하기'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.socialLead}>또는 소셜 계정으로 시작하기</Text>

          <SocialButton
            backgroundColor="#FFE100"
            badge={<View style={styles.kakaoBadge} />}
            borderColor="#FFE100"
            label="카카오로 시작하기"
            onPress={() => onSocialPress('kakao')}
            textColor="#191600"
          />

          <SocialButton
            backgroundColor="#FFFFFF"
            badge={
              <View style={styles.googleBadge}>
                <Text style={styles.googleBadgeText}>G</Text>
              </View>
            }
            borderColor="#E2E8F2"
            label="Google로 시작하기"
            onPress={() => onSocialPress('google')}
            textColor="#334155"
          />

          <View style={styles.signInRow}>
            <Text style={styles.signInHint}>이미 계정이 있으신가요?</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.replace('SignIn')}
            >
              <Text style={styles.signInLink}>로그인</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
