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
// - 회원가입 성공 후 이동 경로를 바꾸면 닉네임/펫 온보딩 계약이 깨질 수 있다.

import AppTextInput from '../../app/ui/AppTextInput';
import AppText from '../../app/ui/AppText';
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import {
  CURRENT_POLICY_VERSION,
  flushPendingConsentSnapshot,
  savePendingConsentSnapshot,
} from '../../services/legal/consents';
import {
  LEGAL_DOCUMENTS,
  type LegalDocumentConfig,
  type LegalDocumentId,
} from '../../services/legal/documents';
import { getPolicyPresentationDocument } from '../../services/legal/presentation';
import { supabase } from '../../services/supabase/client';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/uiStore';
import {
  getSeasonalSignupVisual,
  type SeasonalSignupVisual,
} from '../../theme/seasonal/signup';
import { getSeasonalThemeKey } from '../../theme/seasonal/season';

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
  seasonalVisual?: SeasonalSignupVisual | null;
};

const InputField = memo(function InputFieldComponent({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  rightAccessory,
  seasonalVisual,
}: InputFieldProps) {
  const seasonal = seasonalVisual !== null && seasonalVisual !== undefined;

  return (
    <View
      style={[styles.fieldBlock, seasonal ? styles.seasonalFieldBlock : null]}
    >
      {seasonal ? null : (
        <AppText preset="unifiedLabel" style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.inputRow,
          seasonal ? styles.seasonalInputRow : null,
          seasonalVisual
            ? {
                backgroundColor: seasonalVisual.fieldBackgroundColor,
                borderColor: seasonalVisual.fieldBorderColor,
                shadowColor: seasonalVisual.accentShadowColor,
              }
            : null,
        ]}
      >
        <AppTextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={
            seasonalVisual?.fieldPlaceholderColor ?? '#B7C0D0'
          }
          selectionColor={seasonalVisual?.accentColor}
          secureTextEntry={secureTextEntry}
          style={[
            styles.input,
            seasonal ? styles.seasonalInput : null,
            seasonalVisual ? { color: seasonalVisual.fieldTextColor } : null,
          ]}
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
  seasonalVisual?: SeasonalSignupVisual | null;
};

const ConsentRow = memo(function ConsentRowComponent({
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
  seasonalVisual,
}: ConsentRowProps) {
  const seasonal = seasonalVisual !== null && seasonalVisual !== undefined;

  return (
    <View
      style={[
        styles.consentCardRow,
        seasonal ? styles.seasonalConsentCardRow : null,
        seasonalVisual
          ? {
              backgroundColor: seasonalVisual.surfaceStrongColor,
              borderColor: seasonalVisual.borderColor,
            }
          : null,
      ]}
    >
      <View
        style={[
          styles.consentHeaderRow,
          seasonal ? styles.seasonalConsentHeaderRow : null,
        ]}
      >
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
              seasonal ? styles.seasonalCheckbox : null,
              checked ? styles.checkboxChecked : null,
              disabled ? styles.checkboxDisabled : null,
              checked && seasonalVisual
                ? {
                    backgroundColor: seasonalVisual.accentColor,
                    borderColor: seasonalVisual.accentColor,
                  }
                : null,
            ]}
          >
            {checked ? (
              <Feather color="#FFFFFF" name="check" size={12} />
            ) : null}
          </View>
          <View
            style={[
              styles.consentCopy,
              seasonal ? styles.seasonalConsentCopy : null,
            ]}
          >
            <View style={styles.consentTitleRow}>
              <View
                style={[
                  styles.consentBadge,
                  seasonal ? styles.seasonalConsentBadge : null,
                  required ? styles.requiredBadge : styles.optionalBadge,
                  seasonalVisual
                    ? {
                        backgroundColor: required
                          ? seasonalVisual.requiredBadgeBackgroundColor
                          : seasonalVisual.optionalBadgeBackgroundColor,
                      }
                    : null,
                ]}
              >
                <AppText
                  preset="unifiedLabel"
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
              <AppText
                preset="unifiedTitle"
                style={[
                  styles.consentTitle,
                  seasonal ? styles.seasonalConsentTitle : null,
                  seasonalVisual ? { color: seasonalVisual.textColor } : null,
                ]}
              >
                {title}
              </AppText>
            </View>
            <AppText
              preset="unifiedBody"
              numberOfLines={2}
              style={[
                styles.termsText,
                seasonal ? styles.seasonalTermsText : null,
                seasonalVisual
                  ? { color: seasonalVisual.mutedTextColor }
                  : null,
              ]}
            >
              {description}
            </AppText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityHint={`${title} 상세 안내를 ${
            expanded ? '접습니다' : '엽니다'
          }.`}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          activeOpacity={0.85}
          disabled={disabled}
          onPress={onPressDisclosure}
          style={[
            styles.disclosureButton,
            seasonal ? styles.seasonalDisclosureButton : null,
          ]}
        >
          <Feather
            color={seasonalVisual?.mutedTextColor ?? '#8B96A9'}
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={18}
          />
        </TouchableOpacity>
      </View>

      {expanded ? (
        <View
          style={[
            styles.consentExpandedBox,
            seasonal ? styles.seasonalConsentExpandedBox : null,
            seasonalVisual
              ? {
                  backgroundColor: seasonalVisual.surfaceColor,
                  borderColor: seasonalVisual.borderColor,
                }
              : null,
          ]}
        >
          <View style={styles.expandedMetaRow}>
            <AppText preset="unifiedTitle" style={styles.expandedTitle}>
              {title}
            </AppText>
            <View style={styles.statusChip}>
              <AppText preset="unifiedBody" style={styles.statusChipText}>
                {statusLabel}
              </AppText>
            </View>
          </View>
          <AppText preset="unifiedBody" style={styles.expandedSummary}>
            {summary}
          </AppText>
          <AppText preset="unifiedBody" style={styles.expandedDescription}>
            {detailDescription}
          </AppText>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            disabled={disabled || isOpening}
            onPress={onPressAction}
            style={styles.documentButton}
          >
            <AppText
              preset="unifiedLabel"
              style={[
                styles.documentButtonText,
                seasonalVisual?.season === 'winter'
                  ? { color: seasonalVisual.policyLinkColor }
                  : null,
              ]}
            >
              {isOpening ? '열어보는 중...' : actionLabel}
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
});

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function signUpWithTimeout(
  email: string,
  password: string,
  timeoutMs = 12000,
) {
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
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const setSession = useAuthStore(s => s.setSession);

  const season = useMemo(() => getSeasonalThemeKey(), []);
  const seasonalVisual = useMemo(
    () => getSeasonalSignupVisual(season),
    [season],
  );
  const seasonal = seasonalVisual !== null;
  const winterErrorStyle =
    seasonalVisual?.season === 'winter'
      ? { color: seasonalVisual.errorColor }
      : null;
  const seasonalBackgroundHeight = seasonalVisual
    ? viewportWidth * seasonalVisual.backgroundAspectRatio
    : 0;
  const seasonalHeroSpacerHeight = useMemo(() => {
    if (!seasonal) return 0;

    const heroEnd =
      seasonalVisual?.season === 'winter'
        ? Math.min(360, Math.max(320, seasonalBackgroundHeight * 0.48))
        : Math.min(260, Math.max(210, seasonalBackgroundHeight * 0.34));
    return Math.max(172, heroEnd - insets.top);
  }, [insets.top, seasonal, seasonalBackgroundHeight, seasonalVisual?.season]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedConsentId, setExpandedConsentId] =
    useState<LegalDocumentId | null>(null);

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
        description: '회원가입과 서비스 이용에 필요한 필수 동의예요.',
        checked: agreeTerms,
        required: true,
        document: LEGAL_DOCUMENTS.terms,
        onToggle: () => setAgreeTerms(prev => !prev),
      },
      {
        id: 'privacy',
        title: '개인정보처리방침 동의',
        description: '개인정보 처리 기준을 안내하는 필수 동의예요.',
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

  const onPressLegalDocument = useCallback(
    (documentId: LegalDocumentId) => {
      navigation.navigate('PolicyDetail', { documentId });
    },
    [navigation],
  );

  const onToggleExpandedConsent = useCallback((documentId: LegalDocumentId) => {
    setExpandedConsentId(current =>
      current === documentId ? null : documentId,
    );
  }, []);

  const onToggleAllConsents = useCallback(() => {
    const nextValue = !allConsentsChecked;
    setAgreeTerms(nextValue);
    setAgreePrivacy(nextValue);
    setAgreeMarketing(nextValue);
  }, [allConsentsChecked]);

  const signInPrompt = (
    <View style={[styles.signInRow, seasonal ? styles.seasonalSignInRow : null]}>
      <AppText
        preset="unifiedBody"
        style={[
          styles.signInHint,
          seasonal ? styles.seasonalSignInText : null,
          seasonalVisual ? { color: seasonalVisual.signInTextColor } : null,
        ]}
      >
        이미 계정이 있으신가요?
      </AppText>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => navigation.navigate('SignIn')}
      >
        <AppText
          preset="unifiedLabel"
          style={[
            styles.signInLink,
            seasonal ? styles.seasonalSignInText : null,
            seasonalVisual ? { color: seasonalVisual.signInTextColor } : null,
          ]}
        >
          로그인
        </AppText>
      </TouchableOpacity>
    </View>
  );

  const content = (
    <>
      {seasonal ? null : (
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate('SignIn')}
            style={styles.headerBackButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather color="#1B2435" name="arrow-left" size={20} />
          </TouchableOpacity>
          <AppText preset="unifiedTitle" style={styles.headerTitle}>
            회원가입
          </AppText>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {seasonal ? (
        <>
          <AppText
            accessibilityRole="header"
            style={styles.accessibilityHeading}
          >
            새로운 시작을 함께해요. 소중한 반려동물과의 기억을 기록하세요.
          </AppText>
          <View
            style={[
              styles.seasonalHeroSpacer,
              { height: seasonalHeroSpacerHeight },
            ]}
          />
        </>
      ) : (
        <View style={styles.heroCopy}>
          <AppText preset="unifiedTitle" style={styles.heroTitle}>
            새로운 시작을{'\n'}
            함께해요
          </AppText>
          <AppText preset="unifiedBody" style={styles.heroBody}>
            소중한 반려동물과의 기억을 기록하세요
          </AppText>
        </View>
      )}

      <View
        style={[
          styles.termsCard,
          seasonal ? styles.seasonalTermsCard : null,
          seasonalVisual
            ? {
                backgroundColor: seasonalVisual.surfaceColor,
                borderColor: seasonalVisual.borderColor,
              }
            : null,
        ]}
      >
        <View
          style={[
            styles.termsCardHeader,
            seasonal ? styles.seasonalTermsCardHeader : null,
          ]}
        >
          <View
            style={[
              styles.termsCardHeaderCopy,
              seasonal ? styles.seasonalTermsCardHeaderCopy : null,
            ]}
          >
            <AppText
              preset="unifiedTitle"
              style={[
                styles.termsCardTitle,
                seasonal ? styles.seasonalTermsCardTitle : null,
                seasonalVisual ? { color: seasonalVisual.textColor } : null,
              ]}
            >
              약관 및 정책 동의
            </AppText>
            <AppText
              preset="unifiedBody"
              numberOfLines={1}
              style={[
                styles.termsCardBody,
                seasonal ? styles.seasonalTermsCardBody : null,
                seasonalVisual
                  ? { color: seasonalVisual.mutedTextColor }
                  : null,
              ]}
            >
              필수 항목에 동의하면 가입할 수 있어요.
            </AppText>
          </View>
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allConsentsChecked }}
            activeOpacity={0.85}
            onPress={onToggleAllConsents}
            style={[
              styles.allAgreeButton,
              seasonal ? styles.seasonalAllAgreeButton : null,
              seasonalVisual
                ? {
                    backgroundColor: seasonalVisual.surfaceStrongColor,
                    borderColor: seasonalVisual.borderColor,
                  }
                : null,
            ]}
          >
            <View
              style={[
                styles.checkbox,
                seasonal ? styles.seasonalCheckbox : null,
                allConsentsChecked ? styles.checkboxChecked : null,
                allConsentsChecked && seasonalVisual
                  ? {
                      backgroundColor: seasonalVisual.accentColor,
                      borderColor: seasonalVisual.accentColor,
                    }
                  : null,
              ]}
            >
              {allConsentsChecked ? (
                <Feather color="#FFFFFF" name="check" size={12} />
              ) : null}
            </View>
            <AppText
              preset="unifiedLabel"
              style={[
                styles.allAgreeLabel,
                seasonal ? styles.seasonalAllAgreeLabel : null,
                seasonalVisual ? { color: seasonalVisual.textColor } : null,
              ]}
            >
              모두 동의하기
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.termsDivider} />

        {consentItems.map(item => (
          <ConsentRow
            key={item.id}
            actionLabel="내용 보기"
            checked={item.checked}
            description={item.description}
            detailDescription={item.document.description}
            disabled={submitting}
            expanded={expandedConsentId === item.id}
            isOpening={false}
            onPressAction={() => onPressLegalDocument(item.id)}
            onPressDisclosure={() => onToggleExpandedConsent(item.id)}
            onToggle={item.onToggle}
            required={item.required}
            statusLabel={
              getPolicyPresentationDocument(item.id)?.contentStatusLabel ??
              '내용 검토 중'
            }
            summary={item.document.summary}
            seasonalVisual={seasonalVisual}
            title={item.title}
          />
        ))}
      </View>

      {seasonal ? null : (
        <AppText preset="unifiedBody" style={styles.termsMeta}>
          필수 동의: 이용약관, 개인정보처리방침
        </AppText>
      )}

      <InputField
        autoCapitalize="none"
        keyboardType="email-address"
        label="이메일 주소"
        onChangeText={setEmail}
        placeholder="example@petmemory.com"
        seasonalVisual={seasonalVisual}
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
              color={seasonalVisual?.fieldIconColor ?? '#9DA7BA'}
              name={securePassword ? 'eye-off' : 'eye'}
              size={18}
            />
          </TouchableOpacity>
        }
        secureTextEntry={securePassword}
        seasonalVisual={seasonalVisual}
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
              color={seasonalVisual?.fieldIconColor ?? '#9DA7BA'}
              name={secureConfirmPassword ? 'eye-off' : 'eye'}
              size={18}
            />
          </TouchableOpacity>
        }
        secureTextEntry={secureConfirmPassword}
        seasonalVisual={seasonalVisual}
        value={confirmPassword}
      />

      {!emailValid && email.length > 0 ? (
        <AppText
          preset="unifiedBody"
          style={[
            styles.errorText,
            seasonal ? styles.seasonalErrorText : null,
            winterErrorStyle,
          ]}
        >
          올바른 이메일 형식을 입력해주세요.
        </AppText>
      ) : null}
      {!passwordValid && password.length > 0 ? (
        <AppText
          preset="unifiedBody"
          style={[
            styles.errorText,
            seasonal ? styles.seasonalErrorText : null,
            winterErrorStyle,
          ]}
        >
          비밀번호는 8자 이상이어야 합니다.
        </AppText>
      ) : null}
      {confirmPassword.length > 0 && !passwordsMatch ? (
        <AppText
          preset="unifiedBody"
          style={[
            styles.errorText,
            seasonal ? styles.seasonalErrorText : null,
            winterErrorStyle,
          ]}
        >
          비밀번호가 일치하지 않습니다.
        </AppText>
      ) : null}

      {consentErrorVisible ? (
        <AppText
          preset="unifiedBody"
          style={[
            styles.errorText,
            seasonal ? styles.seasonalErrorText : null,
            winterErrorStyle,
          ]}
        >
          회원가입을 진행하려면 필수 동의 2가지를 모두 체크해 주세요.
        </AppText>
      ) : null}
      <TouchableOpacity
        activeOpacity={0.9}
        disabled={disabled}
        onPress={onSubmit}
        style={[
          styles.primaryButton,
          seasonal ? styles.seasonalPrimaryButton : null,
          seasonalVisual
            ? {
                backgroundColor: seasonalVisual.accentColor,
                shadowColor: seasonalVisual.accentShadowColor,
              }
            : null,
          disabled ? styles.primaryButtonDisabled : null,
        ]}
      >
        <AppText
          preset="unifiedLabel"
          style={[
            styles.primaryButtonText,
            seasonal ? styles.seasonalPrimaryButtonText : null,
          ]}
        >
          {submitting ? '가입 중...' : '가입하기'}
        </AppText>
      </TouchableOpacity>

      {signInPrompt}
    </>
  );

  if (seasonalVisual) {
    return (
      <View
        style={[
          styles.seasonalBackground,
          { backgroundColor: seasonalVisual.backgroundColor },
        ]}
      >
        <Image
          accessible={false}
          pointerEvents="none"
          resizeMode="cover"
          source={seasonalVisual.source}
          style={[
            styles.seasonalBackgroundTail,
            { width: viewportWidth, height: seasonalBackgroundHeight },
          ]}
        />
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={seasonalVisual.accessibilityLabel}
          accessible={false}
          pointerEvents="none"
          resizeMode="cover"
          source={seasonalVisual.source}
          style={[
            styles.seasonalBackgroundImage,
            { width: viewportWidth, height: seasonalBackgroundHeight },
          ]}
        />
        <LinearGradient
          colors={[
            seasonalVisual.backgroundFadeTransparentColor,
            seasonalVisual.backgroundColor,
            seasonalVisual.backgroundFadeTransparentColor,
          ]}
          pointerEvents="none"
          style={[
            styles.seasonalBackgroundFade,
            { top: seasonalBackgroundHeight - 120 },
          ]}
        />
        <StatusBar barStyle="dark-content" />
        <View
          pointerEvents="none"
          style={[
            styles.seasonalBackgroundWash,
            { backgroundColor: seasonalVisual.backgroundWashColor },
          ]}
        />
        <SafeAreaView
          edges={['top', 'bottom', 'left', 'right']}
          style={styles.seasonalSafeArea}
        >
          <KeyboardAwareScrollView
            bounces={false}
            contentContainerStyle={styles.seasonalScrollContent}
            enableOnAndroid
            extraScrollHeight={96}
            keyboardOpeningTime={0}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </KeyboardAwareScrollView>
        </SafeAreaView>
        <TouchableOpacity
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          activeOpacity={0.75}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          onPress={() => navigation.navigate('SignIn')}
          style={[styles.seasonalFixedBackButton, { top: insets.top + 2 }]}
        >
          <Feather color={seasonalVisual.textColor} name="arrow-left" size={20} />
        </TouchableOpacity>
      </View>
    );
  }

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
          {content}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
