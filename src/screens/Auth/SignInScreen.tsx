import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
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

import { ASSETS } from '../../assets';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../services/supabase/client';
import { useAuthStore } from '../../store/authStore';

import { styles } from './SignInScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  rightAccessory?: React.ReactNode;
};

const AuthField = memo(function AuthField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  rightAccessory,
}: FieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
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
      style={[
        styles.socialButton,
        { backgroundColor, borderColor },
      ]}
    >
      <View style={styles.socialBadge}>{badge}</View>
      <Text style={[styles.socialButtonText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '다시 시도해 주세요.';
}

export default function SignInScreen() {
  const navigation = useNavigation<Nav>();

  const setSession = useAuthStore(s => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const disabled = useMemo(
    () => submitting || !email.trim() || password.length < 8,
    [email, password, submitting],
  );

  const onSubmit = useCallback(async () => {
    if (disabled) return;

    try {
      setSubmitting(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      await setSession(data.session ?? null);
      navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
    } catch (error) {
      Alert.alert('로그인 실패', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }, [disabled, email, navigation, password, setSession]);

  const onSocialPress = useCallback((provider: 'kakao' | 'google') => {
    const label = provider === 'kakao' ? '카카오' : 'Google';
    Alert.alert(`${label} 로그인 준비 중`, '소셜 로그인 연동은 다음 단계에서 연결됩니다.');
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
          <View style={styles.hero}>
            <View style={styles.heroLogoWrap}>
              <Image
                resizeMode="contain"
                source={ASSETS.logo}
                style={styles.heroLogo}
              />
            </View>
            <Text style={styles.heroTitle}>NURI</Text>
            <Text style={styles.heroBody}>소중한 우리 아이와의 추억 기록</Text>
          </View>

          <AuthField
            autoCapitalize="none"
            keyboardType="email-address"
            label=""
            onChangeText={setEmail}
            placeholder="이메일"
            value={email}
          />

          <AuthField
            autoCapitalize="none"
            label=""
            onChangeText={setPassword}
            placeholder="비밀번호"
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
              {submitting ? '로그인 중...' : '로그인'}
            </Text>
          </TouchableOpacity>

          <View style={styles.inlineLinks}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => Alert.alert('비밀번호 찾기', '비밀번호 재설정 플로우는 다음 단계에서 연결됩니다.')}
            >
              <Text style={styles.inlineLinkText}>비밀번호 찾기</Text>
            </TouchableOpacity>
            <Text style={styles.inlineDivider}>|</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.replace('SignUp')}
            >
              <Text style={styles.inlineLinkText}>회원가입</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.socialSection}>
            <View style={styles.socialDivider} />
            <Text style={styles.socialSectionTitle}>SNS 계정으로 시작하기</Text>
            <View style={styles.socialDivider} />
          </View>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
