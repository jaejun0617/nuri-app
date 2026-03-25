// 파일: src/screens/Auth/SignUpScreen.tsx
// 파일 목적:
// - 이메일 회원가입과 필수 동의 입력을 처리하는 인증 시작 화면이다.
// 어디서 쓰이는지:
// - RootNavigator의 `SignUp` 라우트에서 사용되며, SignIn 화면에서 연결된다.
// 핵심 역할:
// - 이메일/비밀번호/동의 여부를 검증하고 Supabase 회원가입을 호출한다.
// - 동의 스냅샷을 저장하고, 성공 시 이메일 인증 또는 NicknameSetup 단계로 흐름을 넘긴다.
// 데이터·상태 흐름:
// - 계정 생성 직전 동의 정보를 로컬에 저장하고, 세션이 있으면 즉시 flush하고 없으면 이후 AppProviders가 복구 flush를 수행한다.
// 수정 시 주의:
// - 약관/개인정보 문서와 소셜 회원가입은 아직 완성되지 않았으므로, 현재 노출 범위를 넘어서는 설명을 넣으면 안 된다.
// - 회원가입 성공 후 이동 경로를 바꾸면 닉네임/펫 온보딩 계약이 깨질 수 있다.

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
                <Text
                  style={[
                    styles.consentBadgeText,
                    required
                      ? styles.requiredBadgeText
                      : styles.optionalBadgeText,
                  ]}
                >
                  {required ? '필수' : '선택'}
                </Text>
              </View>
              <Text style={styles.consentTitle}>{title}</Text>
            </View>
            <Text style={styles.termsText}>{description}</Text>
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
            <Text style={styles.expandedTitle}>{title}</Text>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.expandedSummary}>{summary}</Text>
          <Text style={styles.expandedDescription}>{detailDescription}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            disabled={disabled || isOpening}
            onPress={onPressAction}
            style={styles.documentButton}
          >
            <Text style={styles.documentButtonText}>
              {isOpening ? '열어보는 중...' : actionLabel}
            </Text>
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
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
      !emailValid ||
      !passwordValid ||
      !passwordsMatch ||
      !agreeTerms ||
      !agreePrivacy,
    [
      agreePrivacy,
      agreeTerms,
      emailValid,
      passwordValid,
      passwordsMatch,
      submitting,
    ],
  );
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
          [{ text: '확인', onPress: () => navigation.replace('SignIn') }],
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

  const onSocialPress = useCallback((provider: 'kakao' | 'google') => {
    const label = provider === 'kakao' ? '카카오' : 'Google';
    Alert.alert(
      `${label} 회원가입 준비 중`,
      '소셜 로그인 연동은 다음 단계에서 연결됩니다.',
    );
  }, []);

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

          <View style={styles.termsCard}>
            <View style={styles.termsCardHeader}>
              <View style={styles.termsCardHeaderCopy}>
                <Text style={styles.termsCardTitle}>약관 및 정책 동의</Text>
                <Text style={styles.termsCardBody}>
                  필수 2개 동의가 완료되면 가입할 수 있고, 마케팅 수신은 선택으로
                  둘 수 있어요.
                </Text>
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
                <Text style={styles.allAgreeLabel}>모두 동의하기</Text>
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

          <Text style={styles.termsMeta}>
            필수 동의: 이용약관, 개인정보처리방침
          </Text>
          {consentErrorVisible ? (
            <Text style={styles.errorText}>
              회원가입을 진행하려면 필수 동의 2가지를 모두 체크해 주세요.
            </Text>
          ) : null}
          {requiredDocumentPending ? (
            <View style={styles.legalNoticeBox}>
              <Text style={styles.legalNoticeTitle}>
                정책 문서 연결 상태 안내
              </Text>
              <Text style={styles.legalNoticeBody}>
                현재 앱에서는 정책 초안 구조와 요약만 먼저 제공합니다. 전체 문서
                열람 연결과 최종 법무 문안은 후속 운영 작업에서 확정됩니다.
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
