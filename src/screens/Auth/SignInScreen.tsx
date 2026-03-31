// 파일: src/screens/Auth/SignInScreen.tsx
// 파일 목적:
// - 이메일/비밀번호 로그인 화면을 제공하고, 인증 완료 후 앱 부트 플로우로 복귀시킨다.
// 어디서 쓰이는지:
// - RootNavigator의 `SignIn` 라우트에서 사용되며, 게스트 홈과 회원가입 화면에서 진입한다.
// 핵심 역할:
// - 로그인 입력값 검증, Supabase 로그인 호출, 세션 store 반영, Splash reset 이동을 담당한다.
// - 현재는 소셜 로그인과 비밀번호 찾기 진입 라벨도 함께 노출한다.
// 데이터·상태 흐름:
// - 성공 시 authStore에 session을 넣고, 실제 프로필/펫 동기화는 AppProviders 부트스트랩이 이어받는다.
// 수정 시 주의:
// - 로그인 성공 직후 바로 홈으로 보내지 않고 Splash를 다시 거쳐야 닉네임/펫 가드가 맞게 작동한다.
// - 소셜 로그인/비밀번호 재설정은 아직 placeholder이므로 실제 구현 전까지 과장된 주석을 넣으면 안 된다.

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native';

import { ASSETS } from '../../assets';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { clearLocalAuthSession } from '../../services/supabase/auth';
import { supabase } from '../../services/supabase/client';
import { useAuthStore } from '../../store/authStore';

import { styles } from './SignInScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SignInRoute = RouteProp<RootStackParamList, 'SignIn'>;

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

const KakaoBadgeMark = memo(function KakaoBadgeMark() {
  return (
    <View style={styles.kakaoBadge}>
      <View style={styles.kakaoBubble}>
        <View style={styles.kakaoBubbleTail} />
      </View>
    </View>
  );
});

const GoogleBadgeMark = memo(function GoogleBadgeMark() {
  return (
    <View style={styles.googleBadge}>
      <MaterialCommunityIcons name="google" size={15} color="#4285F4" />
    </View>
  );
});

export default function SignInScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<SignInRoute>();
  const theme = useTheme();

  const setSession = useAuthStore(s => s.setSession);
  const clearPasswordRecovery = useAuthStore(s => s.clearPasswordRecovery);
  const passwordRecoveryStatus = useAuthStore(s => s.passwordRecoveryFlow.status);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [passwordResetSuccessModalVisible, setPasswordResetSuccessModalVisible] =
    useState(false);

  const disabled = useMemo(
    () => submitting || !email.trim() || password.length < 8,
    [email, password, submitting],
  );

  const onSubmit = useCallback(async () => {
    if (disabled) return;

    try {
      setSubmitting(true);
      await clearPasswordRecovery();
      await clearLocalAuthSession();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      await setSession(data.session ?? null);
      navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'signin');
      Alert.alert(title, message);
    } finally {
      setSubmitting(false);
    }
  }, [clearPasswordRecovery, disabled, email, navigation, password, setSession]);

  const onSocialPress = useCallback((provider: 'kakao' | 'google') => {
    const label = provider === 'kakao' ? '카카오' : 'Google';
    Alert.alert(`${label} 로그인 준비 중`, '소셜 로그인 연동은 다음 단계에서 연결됩니다.');
  }, []);

  const onToggleSecurePassword = useCallback(() => {
    setSecurePassword(prev => !prev);
  }, []);

  const onPressForgotPassword = useCallback(() => {
    navigation.navigate('PasswordResetRequest', {
      email: email.trim() || undefined,
    });
  }, [email, navigation]);

  const onPressSignUp = useCallback(() => {
    navigation.replace('SignUp');
  }, [navigation]);

  useEffect(() => {
    if (passwordRecoveryStatus !== 'active') {
      return;
    }

    clearPasswordRecovery()
      .then(() => clearLocalAuthSession())
      .catch(() => {});
  }, [clearPasswordRecovery, passwordRecoveryStatus]);

  useEffect(() => {
    if (route.params?.notice !== 'password-reset-success') {
      return;
    }

    setPasswordResetSuccessModalVisible(true);
    navigation.setParams({ notice: undefined });
  }, [navigation, route.params?.notice]);

  const closePasswordResetSuccessModal = useCallback(() => {
    setPasswordResetSuccessModalVisible(false);
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
            <Text style={styles.heroBody}>
              함께한 모든 순간이, 오래도록 기억이 되도록
            </Text>
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
                onPress={onToggleSecurePassword}
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
              onPress={onPressForgotPassword}
            >
              <Text style={styles.inlineLinkText}>비밀번호 찾기</Text>
            </TouchableOpacity>
            <Text style={styles.inlineDivider}>|</Text>
            <TouchableOpacity activeOpacity={0.75} onPress={onPressSignUp}>
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
            badge={<KakaoBadgeMark />}
            borderColor="#FFE100"
            label="카카오로 시작하기"
            onPress={() => onSocialPress('kakao')}
            textColor="#191600"
          />

          <SocialButton
            backgroundColor="#FFFFFF"
            badge={<GoogleBadgeMark />}
            borderColor="#E2E8F2"
            label="Google로 시작하기"
            onPress={() => onSocialPress('google')}
            textColor="#334155"
          />
        </ScrollView>

        <Modal
          visible={passwordResetSuccessModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closePasswordResetSuccessModal}
        >
          <View style={styles.successBackdrop}>
            <Pressable
              style={[styles.successScrim, { backgroundColor: theme.colors.overlay }]}
              onPress={closePasswordResetSuccessModal}
            />
            <View
              style={[
                styles.successCard,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.successHalo,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.successIcon,
                    { backgroundColor: theme.colors.brand },
                  ]}
                >
                  <Feather name="check" size={28} color="#FFF8EE" />
                </View>
              </View>

              <Text style={[styles.successEyebrow, { color: theme.colors.brand }]}>
                PASSWORD UPDATED
              </Text>
              <Text style={[styles.successTitle, { color: theme.colors.textPrimary }]}>
                비밀번호가 변경되었습니다
              </Text>
              <Text style={[styles.successBody, { color: theme.colors.textSecondary }]}>
                보안을 위해 임시 세션을 종료했어요.{'\n'}새 비밀번호로 다시 로그인해
                주세요.
              </Text>

              <TouchableOpacity
                activeOpacity={0.92}
                onPress={closePasswordResetSuccessModal}
                style={[
                  styles.successButton,
                  { backgroundColor: theme.colors.brand },
                ]}
              >
                <Text style={styles.successButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
