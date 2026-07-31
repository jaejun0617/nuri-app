// 파일: src/screens/Auth/SignUpScreen.tsx
// 파일 목적:
// - 이메일 회원가입과 필수 동의 입력을 처리하는 인증 시작 화면이다.
// 어디서 쓰이는지:
// - RootNavigator의 `SignUp` 라우트에서 사용되며, SignIn 화면에서 연결된다.
// 핵심 역할:
// - 이메일/비밀번호/동의 여부를 검증하고 Supabase 회원가입을 호출한다.
// - Google/Kakao OAuth 시작 버튼은 동일한 Supabase 세션 복구와 앱 부트 계약을 사용한다.
// - 동의 스냅샷을 저장하고, 성공 시 이메일 인증 또는 NicknameSetup 단계로 흐름을 넘긴다.
// 데이터·상태 흐름:
// - 계정 생성 직전 동의 정보를 로컬에 저장하고, 세션이 있으면 즉시 flush하고 없으면 이후 AppProviders가 복구 flush를 수행한다.
// 수정 시 주의:
// - OAuth 성공 후에는 Splash 부트 플로우가 닉네임/펫 온보딩 경로를 결정한다.
// - 회원가입 성공 후 이동 경로를 바꾸면 닉네임/펫 온보딩 계약이 깨질 수 있다.

import AppTextInput from '../../app/ui/AppTextInput';
import AppText from '../../app/ui/AppText';
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import {
  CURRENT_POLICY_VERSION,
  flushPendingConsentSnapshot,
  savePendingConsentSnapshot,
} from '../../services/legal/consents';
import {
  LEGAL_DOCUMENTS,
  getLegalDocumentActionLabel,
  getLegalDocumentStatusLabel,
  openLegalDocument,
  type LegalDocumentConfig,
  type LegalDocumentId,
} from '../../services/legal/documents';
import {
  clearLocalAuthSession,
  getOAuthProviderLabel,
  getOAuthSignInUserMessage,
  isSocialOAuthProviderReleaseReady,
  signInWithGoogle,
  signInWithKakao,
  signInWithNaver,
  type SocialOAuthProvider,
} from '../../services/supabase/auth';
import { supabase } from '../../services/supabase/client';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/uiStore';

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
      <AppText preset="unifiedLabel" style={styles.label}>{label}</AppText>
      <View style={styles.inputRow}>
        <AppTextInput
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

type ConsentRowProps = {
  actionLabel: string;
  checked: boolean;
  description: string;
  disabled?: boolean;
  expanded: boolean;
  isOpening: boolean;
  onPressAction: () => void;
  onPressDisclosure: () => void;
  required: boolean;
  statusLabel: string;
  summary: string;
  title: string;
  detailDescription: string;
  onToggle: () => void;
};

const ConsentRow = memo(function ConsentRow({
  actionLabel,
  checked,
  description,
  disabled = false,
  expanded,
  isOpening,
  onPressAction,
  onPressDisclosure,
  required,
  statusLabel,
  summary,
  title,
  detailDescription,
  onToggle,
}: ConsentRowProps) {
  return (
    <View style={styles.consentCardRow}>
      <View style={styles.consentHeaderRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="checkbox"
          accessibilityState={{ checked, disabled }}
          disabled={disabled}
          onPress={onToggle}
          style={styles.consentToggle}
        >
          <View
            style={[
              styles.checkbox,
              checked ? styles.checkboxChecked : null,
              disabled ? styles.checkboxDisabled : null,
            ]}
          >
            {checked ? (
              <Feather color="#FFFFFF" name="check" size={12} />
            ) : null}
          </View>
          <View style={styles.consentCopy}>
            <View style={styles.consentTitleRow}>
              <View
                style={[
                  styles.consentBadge,
                  required ? styles.requiredBadge : styles.optionalBadge,
                ]}
              >
                <AppText preset="unifiedLabel"
                  style={[
                    styles.consentBadgeText,
                    required
                      ? styles.requiredBadgeText
                      : styles.optionalBadgeText,
                  ]}
                >
                  {required ? '필수' : '선택'}
                </AppText>
              </View>
              <AppText preset="unifiedTitle" style={styles.consentTitle}>{title}</AppText>
            </View>
            <AppText preset="unifiedBody" style={styles.termsText}>{description}</AppText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityHint={`${title} 상세 안내를 ${expanded ? '접습니다' : '엽니다'}.`}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          activeOpacity={0.85}
          disabled={disabled}
          onPress={onPressDisclosure}
          style={styles.disclosureButton}
        >
          <Feather
            color="#8B96A9"
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={18}
          />
        </TouchableOpacity>
      </View>

      {expanded ? (
        <View style={styles.consentExpandedBox}>
          <View style={styles.expandedMetaRow}>
            <AppText preset="unifiedTitle" style={styles.expandedTitle}>{title}</AppText>
            <View style={styles.statusChip}>
              <AppText preset="unifiedBody" style={styles.statusChipText}>{statusLabel}</AppText>
            </View>
          </View>
          <AppText preset="unifiedBody" style={styles.expandedSummary}>{summary}</AppText>
          <AppText preset="unifiedBody" style={styles.expandedDescription}>{detailDescription}</AppText>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            disabled={disabled || isOpening}
            onPress={onPressAction}
            style={styles.documentButton}
          >
            <AppText preset="unifiedLabel" style={styles.documentButtonText}>
              {isOpening ? '열어보는 중...' : actionLabel}
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
});

type SocialButtonProps = {
  label: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  badge: React.ReactNode;
  disabled: boolean;
  onPress: () => void;
};

const SocialButton = memo(function SocialButton({
  label,
  backgroundColor,
  borderColor,
  textColor,
  badge,
  disabled,
  onPress,
}: SocialButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.88}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.socialButton,
        { backgroundColor, borderColor, opacity: disabled ? 0.55 : 1 },
      ]}
    >
      <View style={styles.socialBadge}>{badge}</View>
      <AppText preset="unifiedLabel" style={[styles.socialButtonText, { color: textColor }]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
});

type SocialConsentNoticeProps = {
  linkColor: string;
  onPressDocument: (documentId: LegalDocumentId) => void;
  textColor: string;
};

const SocialConsentNotice = memo(function SocialConsentNotice({
  linkColor,
  onPressDocument,
  textColor,
}: SocialConsentNoticeProps) {
  const textStyle = {
    color: textColor,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '700' as const,
  };
  const linkStyle = {
    ...textStyle,
    color: linkColor,
    fontWeight: '900' as const,
  };

  return (
    <View
      accessibilityLabel="소셜 계정으로 계속 진행 시 NURI의 이용약관 및 개인정보처리방침을 확인하고 동의한 것으로 간주합니다."
      accessible
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 2,
        paddingHorizontal: 8,
        rowGap: 2,
      }}
    >
      <AppText preset="unifiedLabel" style={textStyle}>소셜 계정으로 계속 진행 시 NURI의 </AppText>
      <TouchableOpacity
        accessibilityRole="link"
        activeOpacity={0.72}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        onPress={() => onPressDocument('terms')}
      >
        <AppText preset="unifiedLabel" style={linkStyle}>[이용약관]</AppText>
      </TouchableOpacity>
      <AppText preset="unifiedLabel" style={textStyle}> 및 </AppText>
      <TouchableOpacity
        accessibilityRole="link"
        activeOpacity={0.72}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        onPress={() => onPressDocument('privacy')}
      >
        <AppText preset="unifiedLabel" style={linkStyle}>[개인정보처리방침]</AppText>
      </TouchableOpacity>
      <AppText preset="unifiedLabel" style={textStyle}>을 확인하고 동의한 것으로 간주합니다.</AppText>
    </View>
  );
});

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const SHOW_KAKAO_OAUTH = isSocialOAuthProviderReleaseReady('kakao');
const SHOW_GOOGLE_OAUTH = isSocialOAuthProviderReleaseReady('google');
const SHOW_NAVER_OAUTH = isSocialOAuthProviderReleaseReady('naver');
const SHOW_SOCIAL_OAUTH_SECTION =
  SHOW_KAKAO_OAUTH || SHOW_GOOGLE_OAUTH || SHOW_NAVER_OAUTH;

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
  const theme = useTheme();
  const setSession = useAuthStore(s => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] =
    useState<SocialOAuthProvider | null>(null);
  const [expandedConsentId, setExpandedConsentId] = useState<LegalDocumentId | null>(
    null,
  );
  const [openingDocumentId, setOpeningDocumentId] = useState<LegalDocumentId | null>(
    null,
  );

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const passwordValid = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const disabled = useMemo(
    () =>
      submitting ||
      !!oauthSubmitting ||
      !emailValid ||
      !passwordValid ||
      !passwordsMatch ||
      !agreeTerms ||
      !agreePrivacy,
    [
      agreePrivacy,
      agreeTerms,
      emailValid,
      oauthSubmitting,
      passwordValid,
      passwordsMatch,
      submitting,
    ],
  );
  const socialDisabled = submitting || !!oauthSubmitting;
  const consentErrorVisible = useMemo(
    () =>
      emailValid &&
      passwordValid &&
      passwordsMatch &&
      (!agreeTerms || !agreePrivacy),
    [agreePrivacy, agreeTerms, emailValid, passwordValid, passwordsMatch],
  );

  const requiredDocumentPending = useMemo(
    () =>
      LEGAL_DOCUMENTS.terms.status !== 'external' ||
      LEGAL_DOCUMENTS.privacy.status !== 'external',
    [],
  );
  const allConsentsChecked = agreeTerms && agreePrivacy && agreeMarketing;

  const consentItems = useMemo<
    Array<{
      checked: boolean;
      description: string;
      document: LegalDocumentConfig;
      id: LegalDocumentId;
      onToggle: () => void;
      required: boolean;
      title: string;
    }>
  >(
    () => [
      {
        id: 'terms',
        title: '이용약관 동의',
        description: '회원가입과 기본 서비스 이용에 필요한 필수 동의예요.',
        checked: agreeTerms,
        required: true,
        document: LEGAL_DOCUMENTS.terms,
        onToggle: () => setAgreeTerms(prev => !prev),
      },
      {
        id: 'privacy',
        title: '개인정보처리방침 동의',
        description: '개인정보 수집, 이용, 보관 원칙을 안내하는 필수 동의예요.',
        checked: agreePrivacy,
        required: true,
        document: LEGAL_DOCUMENTS.privacy,
        onToggle: () => setAgreePrivacy(prev => !prev),
      },
      {
        id: 'marketing',
        title: '마케팅 수신 동의',
        description: '혜택과 업데이트 소식을 받기 위한 선택 동의예요.',
        checked: agreeMarketing,
        required: false,
        document: LEGAL_DOCUMENTS.marketing,
        onToggle: () => setAgreeMarketing(prev => !prev),
      },
    ],
    [agreeMarketing, agreePrivacy, agreeTerms],
  );

  const onSubmit = useCallback(async () => {
    if (disabled) return;

    try {
      setSubmitting(true);

      await savePendingConsentSnapshot({
        termsAccepted: agreeTerms,
        privacyAccepted: agreePrivacy,
        marketingAccepted: agreeMarketing,
        policyVersion: CURRENT_POLICY_VERSION,
        capturedAt: new Date().toISOString(),
        source: 'signup',
      });

      const { data, error } = await signUpWithTimeout(email, password);
      if (error) throw error;

      await setSession(data.session ?? null);

      if (!data.session) {
        Alert.alert(
          '이메일 확인 필요',
          '회원가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.',
          [{ text: '확인', onPress: () => navigation.navigate('SignIn') }],
        );
        return;
      }

      try {
        await flushPendingConsentSnapshot(data.session.user.id);
      } catch {
        // AppProviders flush에 맡긴다.
      }

      showToast({
        tone: 'success',
        title: '회원가입 완료',
        message: '계정이 준비됐어요. 닉네임만 정하면 바로 시작할 수 있어요.',
      });
      navigation.replace('NicknameSetup', { after: 'signup' });
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'signup');
      Alert.alert(title, message);
      showToast({
        tone: 'error',
        title,
        message,
        durationMs: 2600,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    agreeMarketing,
    agreePrivacy,
    agreeTerms,
    disabled,
    email,
    navigation,
    password,
    setSession,
  ]);

  const onSocialPress = useCallback(
    async (provider: SocialOAuthProvider) => {
      if (socialDisabled) return;

      try {
        setOauthSubmitting(provider);
        await clearLocalAuthSession();

        switch (provider) {
          case 'google':
            await signInWithGoogle();
            break;
          case 'kakao':
            await signInWithKakao();
            break;
          case 'naver':
            await signInWithNaver();
            break;
        }
      } catch (error: unknown) {
        Alert.alert(
          `${getOAuthProviderLabel(provider)} 로그인`,
          getOAuthSignInUserMessage(error),
        );
      } finally {
        setOauthSubmitting(null);
      }
    },
    [socialDisabled],
  );

  const onPressLegalDocument = useCallback(async (documentId: LegalDocumentId) => {
    if (openingDocumentId) return;

    try {
      setOpeningDocumentId(documentId);
      const result = await openLegalDocument(documentId);

      if (!result.ok) {
        if (result.reason === 'failed') {
          Alert.alert(result.document.title, result.message);
        }

        showToast({
          tone: result.reason === 'failed' ? 'error' : 'info',
          title: result.document.title,
          message: result.message,
          durationMs: 3200,
        });
      }
    } finally {
      setOpeningDocumentId(null);
    }
  }, [openingDocumentId]);

  const onToggleExpandedConsent = useCallback((documentId: LegalDocumentId) => {
    setExpandedConsentId(current => (current === documentId ? null : documentId));
  }, []);

  const onToggleAllConsents = useCallback(() => {
    const nextValue = !allConsentsChecked;
    setAgreeTerms(nextValue);
    setAgreePrivacy(nextValue);
    setAgreeMarketing(nextValue);
  }, [allConsentsChecked]);

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
              onPress={() => navigation.navigate('SignIn')}
              style={styles.headerBackButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather color="#1B2435" name="arrow-left" size={20} />
            </TouchableOpacity>
            <AppText preset="unifiedTitle" style={styles.headerTitle}>회원가입</AppText>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCopy}>
            <AppText preset="unifiedTitle" style={styles.heroTitle}>
              새로운 시작을{'\n'}
              함께해요
            </AppText>
            <AppText preset="unifiedBody" style={styles.heroBody}>
              소중한 반려동물과의 기억을 기록하세요
            </AppText>
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
            <AppText preset="unifiedBody" style={styles.errorText}>
              올바른 이메일 형식을 입력해주세요.
            </AppText>
          ) : null}
          {!passwordValid && password.length > 0 ? (
            <AppText preset="unifiedBody" style={styles.errorText}>
              비밀번호는 8자 이상이어야 합니다.
            </AppText>
          ) : null}
          {confirmPassword.length > 0 && !passwordsMatch ? (
            <AppText preset="unifiedBody" style={styles.errorText}>비밀번호가 일치하지 않습니다.</AppText>
          ) : null}

          <View style={styles.termsCard}>
            <View style={styles.termsCardHeader}>
              <View style={styles.termsCardHeaderCopy}>
                <AppText preset="unifiedTitle" style={styles.termsCardTitle}>약관 및 정책 동의</AppText>
                <AppText preset="unifiedBody" style={styles.termsCardBody}>
                  필수 2개 동의가 완료되면 가입할 수 있고, 마케팅 수신은 선택으로
                  둘 수 있어요.
                </AppText>
              </View>
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: allConsentsChecked }}
                activeOpacity={0.85}
                onPress={onToggleAllConsents}
                style={styles.allAgreeButton}
              >
                <View
                  style={[
                    styles.checkbox,
                    allConsentsChecked ? styles.checkboxChecked : null,
                  ]}
                >
                  {allConsentsChecked ? (
                    <Feather color="#FFFFFF" name="check" size={12} />
                  ) : null}
                </View>
                <AppText preset="unifiedLabel" style={styles.allAgreeLabel}>모두 동의하기</AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.termsDivider} />

            {consentItems.map(item => (
              <ConsentRow
                key={item.id}
                actionLabel={getLegalDocumentActionLabel(item.document)}
                checked={item.checked}
                description={item.description}
                detailDescription={item.document.description}
                disabled={submitting}
                expanded={expandedConsentId === item.id}
                isOpening={openingDocumentId === item.id}
                onPressAction={() => {
                  onPressLegalDocument(item.id).catch(() => {});
                }}
                onPressDisclosure={() => onToggleExpandedConsent(item.id)}
                onToggle={item.onToggle}
                required={item.required}
                statusLabel={getLegalDocumentStatusLabel(item.document.status)}
                summary={item.document.summary}
                title={item.title}
              />
            ))}
          </View>

          <AppText preset="unifiedBody" style={styles.termsMeta}>
            필수 동의: 이용약관, 개인정보처리방침
          </AppText>
          {consentErrorVisible ? (
            <AppText preset="unifiedBody" style={styles.errorText}>
              회원가입을 진행하려면 필수 동의 2가지를 모두 체크해 주세요.
            </AppText>
          ) : null}
          {requiredDocumentPending ? (
            <View style={styles.legalNoticeBox}>
              <AppText preset="unifiedTitle" style={styles.legalNoticeTitle}>
                정책 문서 연결 상태 안내
              </AppText>
              <AppText preset="unifiedBody" style={styles.legalNoticeBody}>
                현재 앱에서는 정책 초안 구조와 요약만 먼저 제공합니다. 전체 문서
                열람 연결과 최종 법무 문안은 후속 운영 작업에서 확정됩니다.
              </AppText>
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
            <AppText preset="unifiedLabel" style={styles.primaryButtonText}>
              {submitting ? '가입 중...' : '가입하기'}
            </AppText>
          </TouchableOpacity>

          {SHOW_SOCIAL_OAUTH_SECTION ? (
            <>
              <AppText preset="unifiedLabel" style={styles.socialLead}>또는 소셜 계정으로 시작하기</AppText>

              {SHOW_KAKAO_OAUTH ? (
                <SocialButton
                  backgroundColor="#FFE100"
                  badge={<View style={styles.kakaoBadge} />}
                  borderColor="#FFE100"
                  disabled={socialDisabled}
                  label={
                    oauthSubmitting === 'kakao'
                      ? '카카오로 연결 중...'
                      : '카카오로 시작하기'
                  }
                  onPress={() => {
                    onSocialPress('kakao').catch(() => {});
                  }}
                  textColor="#191600"
                />
              ) : null}

              {SHOW_GOOGLE_OAUTH ? (
                <SocialButton
                  backgroundColor="#FFFFFF"
                  badge={
                    <View style={styles.googleBadge}>
                      <AppText preset="unifiedLabel" style={styles.googleBadgeText}>G</AppText>
                    </View>
                  }
                  borderColor="#E2E8F2"
                  disabled={socialDisabled}
                  label={
                    oauthSubmitting === 'google'
                      ? 'Google로 연결 중...'
                      : 'Google로 시작하기'
                  }
                  onPress={() => {
                    onSocialPress('google').catch(() => {});
                  }}
                  textColor="#334155"
                />
              ) : null}

              {SHOW_NAVER_OAUTH ? (
                <SocialButton
                  backgroundColor="#03C75A"
                  badge={
                    <View
                      style={[
                        styles.googleBadge,
                        {
                          backgroundColor: '#03C75A',
                          borderColor: '#03C75A',
                        },
                      ]}
                    >
                      <AppText preset="unifiedLabel" style={{ color: '#FFFFFF', fontWeight: '900' }}>
                        N
                      </AppText>
                    </View>
                  }
                  borderColor="#03C75A"
                  disabled={socialDisabled}
                  label={
                    oauthSubmitting === 'naver'
                      ? '네이버로 연결 중...'
                      : '네이버로 시작하기'
                  }
                  onPress={() => {
                    onSocialPress('naver').catch(() => {});
                  }}
                  textColor="#FFFFFF"
                />
              ) : null}

              <SocialConsentNotice
                linkColor={theme.colors.brand}
                onPressDocument={documentId => {
                  onPressLegalDocument(documentId).catch(() => {});
                }}
                textColor={theme.colors.textMuted}
              />
            </>
          ) : null}

          <View style={styles.signInRow}>
            <AppText preset="unifiedBody" style={styles.signInHint}>이미 계정이 있으신가요?</AppText>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.navigate('SignIn')}
            >
              <AppText preset="unifiedLabel" style={styles.signInLink}>로그인</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
