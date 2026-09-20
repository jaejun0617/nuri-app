// 파일: src/screens/Auth/SignInScreen.tsx
// 파일 목적:
// - 이메일/비밀번호 로그인 화면을 제공하고, 인증 완료 후 앱 부트 플로우로 복귀시킨다.
// 어디서 쓰이는지:
// - RootNavigator의 `SignIn` 라우트에서 사용되며, 게스트 홈과 회원가입 화면에서 진입한다.
// 핵심 역할:
// - 로그인 입력값 검증, Supabase 로그인 호출, 세션 store 반영, Splash reset 이동을 담당한다.
// - Google/Kakao OAuth 시작, 비밀번호 찾기, 회원가입 진입 라벨도 함께 노출한다.
// 데이터·상태 흐름:
// - 성공 시 authStore에 session을 넣고, 실제 프로필/펫 동기화는 AppProviders 부트스트랩이 이어받는다.
// 수정 시 주의:
// - 로그인 성공 직후 바로 홈으로 보내지 않고 Splash를 다시 거쳐야 닉네임/펫 가드가 맞게 작동한다.
// - OAuth 성공 후에도 Splash를 다시 거쳐야 닉네임/펫 가드가 이메일 로그인과 동일하게 작동한다.

import AppTextInput from '../../app/ui/AppTextInput';
import AppText from '../../app/ui/AppText';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native';

import { ASSETS } from '../../assets';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import WaveText from '../../components/common/WaveText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { performLogout } from '../../services/auth/session';
import {
  isInvalidCredentialSignInError,
  resolveSignInNotice,
  type SignInNotice,
} from '../../services/auth/notices';
import {
  getRecentLoginProvider,
  type RecentLoginProvider,
} from '../../services/auth/recentLoginProvider';
import {
  cancelAccountDeletion,
  clearLocalAuthSession,
  getOAuthProviderLabel,
  getOAuthSignInUserMessage,
  isSocialOAuthProviderReleaseReady,
  signInWithGoogle,
  signInWithKakao,
  type SocialOAuthProvider,
} from '../../services/supabase/auth';
import type { LegalDocumentId } from '../../services/legal/documents';
import { supabase } from '../../services/supabase/client';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/uiStore';
import { getKstDateParts } from '../../utils/date';
import { scheduleIdleTask } from '../../utils/scheduleIdleTask';
import {
  getSeasonalLoginVisual,
  type SeasonalLoginVisual,
} from '../../theme/seasonal/login';
import { getSeasonalThemeKey } from '../../theme/seasonal/season';

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
  inputRef?: React.Ref<React.ComponentRef<typeof TextInput>>;
  leftIconName?: React.ComponentProps<typeof Feather>['name'];
  seasonalVisual?: SeasonalLoginVisual | null;
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
  inputRef,
  leftIconName,
  seasonalVisual,
}: FieldProps) {
  const seasonal = seasonalVisual !== null && seasonalVisual !== undefined;

  return (
    <View
      style={[styles.fieldBlock, seasonal ? styles.seasonalFieldBlock : null]}
    >
      <AppText preset="unifiedLabel" style={styles.fieldLabel}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          seasonal ? styles.seasonalInputRow : null,
          seasonalVisual
            ? {
                backgroundColor: seasonalVisual.fieldBackgroundColor,
                borderColor: seasonalVisual.fieldBorderColor,
                shadowColor: seasonalVisual.fieldShadowColor,
              }
            : null,
        ]}
      >
        {leftIconName ? (
          <Feather
            color={seasonalVisual?.fieldIconColor ?? '#9DA7BA'}
            name={leftIconName}
            size={20}
            style={styles.inputLeadingIcon}
          />
        ) : null}
        <AppTextInput
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={
            seasonalVisual?.fieldPlaceholderColor ?? '#B7C0D0'
          }
          ref={inputRef}
          secureTextEntry={secureTextEntry}
          selectionColor={seasonalVisual?.accentColor}
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

type SocialButtonProps = {
  label: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  badge: React.ReactNode;
  disabled: boolean;
  isRecentLogin?: boolean;
  onPress: () => void;
  seasonalVisual?: SeasonalLoginVisual | null;
};

const SocialButton = memo(function SocialButton({
  label,
  backgroundColor,
  borderColor,
  textColor,
  badge,
  disabled,
  isRecentLogin = false,
  onPress,
  seasonalVisual,
}: SocialButtonProps) {
  const seasonal = seasonalVisual !== null && seasonalVisual !== undefined;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.88}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.socialButton,
        seasonal ? styles.seasonalSocialButton : null,
        { backgroundColor, borderColor, opacity: disabled ? 0.55 : 1 },
      ]}
    >
      <View style={styles.socialBadge}>{badge}</View>
      <AppText
        preset="unifiedLabel"
        style={[
          styles.socialButtonText,
          seasonal ? styles.seasonalSocialButtonText : null,
          { color: textColor },
        ]}
        styleOverridesPreset={seasonal}
      >
        {label}
      </AppText>
      {isRecentLogin ? (
        <RecentLoginPill seasonalVisual={seasonalVisual} />
      ) : null}
    </TouchableOpacity>
  );
});

const RecentLoginPill = memo(function RecentLoginPill({
  seasonalVisual,
}: {
  seasonalVisual?: SeasonalLoginVisual | null;
}) {
  const seasonal = seasonalVisual !== null && seasonalVisual !== undefined;

  return (
    <View
      style={[
        styles.recentLoginPill,
        seasonal ? styles.seasonalRecentLoginPill : null,
        seasonalVisual
          ? {
              backgroundColor: seasonalVisual.recentLoginBackgroundColor,
              borderColor: seasonalVisual.recentLoginBorderColor,
            }
          : null,
      ]}
    >
      <AppText
        preset="unifiedLabel"
        style={[
          styles.recentLoginPillText,
          seasonal ? styles.seasonalRecentLoginPillText : null,
          seasonalVisual
            ? { color: seasonalVisual.recentLoginTextColor }
            : null,
        ]}
        styleOverridesPreset={seasonal}
      >
        최근 로그인
      </AppText>
    </View>
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

type SocialConsentNoticeProps = {
  compact?: boolean;
  linkColor: string;
  onPressDocument: (documentId: LegalDocumentId) => void;
  shadowColor?: string;
  textColor: string;
};

const SocialConsentNotice = memo(function SocialConsentNotice({
  compact = false,
  linkColor,
  onPressDocument,
  shadowColor,
  textColor,
}: SocialConsentNoticeProps) {
  const textStyle = {
    color: textColor,
    fontSize: compact ? 10 : 12,
    lineHeight: compact ? 15 : 19,
    fontWeight: compact ? ('500' as const) : ('700' as const),
    ...(compact
      ? {
          textShadowColor: shadowColor ?? 'rgba(255, 249, 240, 0.96)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }
      : null),
  };
  const linkStyle = {
    ...textStyle,
    color: linkColor,
    fontWeight: compact ? ('700' as const) : ('900' as const),
  };

  if (compact) {
    return (
      <View
        accessibilityLabel="소셜 계정으로 계속 진행 시 NURI의 이용약관 및 개인정보처리방침을 확인하고 동의한 것으로 간주합니다."
        accessible
        style={{ alignItems: 'center' }}
      >
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <AppText preset="unifiedLabel" style={textStyle} styleOverridesPreset>
            소셜 계정으로 계속 진행 시 NURI의{' '}
          </AppText>
          <TouchableOpacity
            accessibilityRole="link"
            activeOpacity={0.72}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            onPress={() => onPressDocument('terms')}
          >
            <AppText
              preset="unifiedLabel"
              style={linkStyle}
              styleOverridesPreset
            >
              [이용약관]
            </AppText>
          </TouchableOpacity>
          <AppText preset="unifiedLabel" style={textStyle} styleOverridesPreset>
            {' '}
            및
          </AppText>
        </View>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <TouchableOpacity
            accessibilityRole="link"
            activeOpacity={0.72}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            onPress={() => onPressDocument('privacy')}
          >
            <AppText
              preset="unifiedLabel"
              style={linkStyle}
              styleOverridesPreset
            >
              [개인정보처리방침]
            </AppText>
          </TouchableOpacity>
          <AppText preset="unifiedLabel" style={textStyle} styleOverridesPreset>
            을 확인하고 동의한 것으로 간주합니다.
          </AppText>
        </View>
      </View>
    );
  }

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
      <AppText
        preset="unifiedLabel"
        style={textStyle}
        styleOverridesPreset={false}
      >
        소셜 계정으로 계속 진행 시 NURI의{' '}
      </AppText>
      <TouchableOpacity
        accessibilityRole="link"
        activeOpacity={0.72}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        onPress={() => onPressDocument('terms')}
      >
        <AppText
          preset="unifiedLabel"
          style={linkStyle}
          styleOverridesPreset={false}
        >
          [이용약관]
        </AppText>
      </TouchableOpacity>
      <AppText
        preset="unifiedLabel"
        style={textStyle}
        styleOverridesPreset={false}
      >
        {' '}
        및{' '}
      </AppText>
      <TouchableOpacity
        accessibilityRole="link"
        activeOpacity={0.72}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        onPress={() => onPressDocument('privacy')}
      >
        <AppText
          preset="unifiedLabel"
          style={linkStyle}
          styleOverridesPreset={false}
        >
          [개인정보처리방침]
        </AppText>
      </TouchableOpacity>
      <AppText
        preset="unifiedLabel"
        style={textStyle}
        styleOverridesPreset={false}
      >
        을 확인하고 동의한 것으로 간주합니다.
      </AppText>
    </View>
  );
});

const SHOW_KAKAO_OAUTH = isSocialOAuthProviderReleaseReady('kakao');
const SHOW_GOOGLE_OAUTH = isSocialOAuthProviderReleaseReady('google');
const SHOW_SOCIAL_OAUTH_SECTION = SHOW_KAKAO_OAUTH || SHOW_GOOGLE_OAUTH;

function formatScheduledDeletionDate(value: string | null) {
  const parts = getKstDateParts(value);
  if (!parts) return '-';
  return `${parts.year}.${String(parts.month).padStart(2, '0')}.${String(
    parts.day,
  ).padStart(2, '0')}`;
}

export default function SignInScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<SignInRoute>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const season = useMemo(() => getSeasonalThemeKey(), []);
  const seasonalVisual = useMemo(
    () => getSeasonalLoginVisual(season),
    [season],
  );
  const isSeasonalLogin = seasonalVisual !== null;
  const seasonalHeroHeight =
    Math.min(330, Math.max(315, viewportHeight * 0.41)) +
    (seasonalVisual?.heroHeightOffset ?? 0);

  const setSession = useAuthStore(s => s.setSession);
  const setAccountDeletionGate = useAuthStore(s => s.setAccountDeletionGate);
  const clearPasswordRecovery = useAuthStore(s => s.clearPasswordRecovery);
  const passwordRecoveryStatus = useAuthStore(
    s => s.passwordRecoveryFlow.status,
  );
  const accountDeletionGate = useAuthStore(s => s.accountDeletionGate);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] =
    useState<SocialOAuthProvider | null>(null);
  const [recoverySubmitting, setRecoverySubmitting] = useState<
    'restore' | 'logout' | null
  >(null);
  const [activeNotice, setActiveNotice] = useState<SignInNotice | null>(null);
  const [recentLoginProvider, setRecentLoginProviderState] =
    useState<RecentLoginProvider | null>(null);
  const emailInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const passwordInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const disabled = useMemo(
    () =>
      submitting || !!oauthSubmitting || !email.trim() || password.length < 8,
    [email, oauthSubmitting, password, submitting],
  );

  const socialDisabled = submitting || !!oauthSubmitting;

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      getRecentLoginProvider()
        .then(provider => {
          if (alive) {
            setRecentLoginProviderState(provider);
          }
        })
        .catch(() => {
          if (alive) {
            setRecentLoginProviderState(null);
          }
        });

      return () => {
        alive = false;
      };
    }, []),
  );

  const onSubmit = useCallback(async () => {
    if (disabled) return;

    try {
      setSubmitting(true);
      setActiveNotice(null);
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
      if (isInvalidCredentialSignInError(error)) {
        setActiveNotice('invalid-credentials');
        return;
      }

      const { title, message } = getBrandedErrorMeta(error, 'signin');
      Alert.alert(title, message);
    } finally {
      setSubmitting(false);
    }
  }, [
    clearPasswordRecovery,
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
        setActiveNotice(null);
        await clearPasswordRecovery();
        await clearLocalAuthSession();

        switch (provider) {
          case 'google':
            await signInWithGoogle();
            break;
          case 'kakao':
            await signInWithKakao();
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
    [clearPasswordRecovery, socialDisabled],
  );

  const onToggleSecurePassword = useCallback(() => {
    setSecurePassword(prev => !prev);
  }, []);

  const onPressForgotPassword = useCallback(() => {
    navigation.navigate('PasswordResetRequest', {
      email: email.trim() || undefined,
    });
  }, [email, navigation]);

  const onPressSignUp = useCallback(() => {
    navigation.navigate('SignUp');
  }, [navigation]);

  const onPressLegalDocument = useCallback(
    (documentId: LegalDocumentId) => {
      navigation.navigate('PolicyDetail', { documentId });
    },
    [navigation],
  );

  useEffect(() => {
    if (passwordRecoveryStatus !== 'active') {
      return;
    }

    clearPasswordRecovery()
      .then(() => clearLocalAuthSession())
      .catch(() => {});
  }, [clearPasswordRecovery, passwordRecoveryStatus]);

  useEffect(() => {
    const nextNotice = route.params?.notice;
    if (
      nextNotice !== 'password-reset-success' &&
      nextNotice !== 'logout-success' &&
      nextNotice !== 'account-deletion-success'
    ) {
      return;
    }

    const task = scheduleIdleTask(() => {
      setActiveNotice(nextNotice);
      navigation.setParams({ notice: undefined });
    });

    return () => {
      task.cancel();
    };
  }, [navigation, route.params?.notice]);

  const focusCredentialField = useCallback(() => {
    const target =
      password.trim().length > 0
        ? passwordInputRef.current
        : emailInputRef.current;

    setTimeout(() => {
      target?.focus();
    }, 0);
  }, [password]);

  const closeNoticeModal = useCallback(() => {
    const shouldClearPassword = activeNotice === 'invalid-credentials';
    setActiveNotice(null);

    if (shouldClearPassword) {
      setPassword('');
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 0);
      return;
    }

    focusCredentialField();
  }, [activeNotice, focusCredentialField]);

  const handleNoticeConfirm = useCallback(() => {
    closeNoticeModal();
  }, [closeNoticeModal]);

  const handleNoticeSecondaryAction = useCallback(
    (kind: 'password-reset' | 'signup') => {
      setActiveNotice(null);
      setPassword('');

      if (kind === 'password-reset') {
        navigation.navigate('PasswordResetRequest', {
          email: email.trim() || undefined,
        });
        return;
      }

      navigation.navigate('SignUp');
    },
    [email, navigation],
  );

  const noticeConfig = useMemo(
    () => (activeNotice ? resolveSignInNotice(activeNotice) : null),
    [activeNotice],
  );

  const secondaryActions = useMemo(
    () =>
      noticeConfig?.secondaryActions?.map(action => ({
        label: action.label,
        onPress: () => handleNoticeSecondaryAction(action.kind),
      })),
    [handleNoticeSecondaryAction, noticeConfig?.secondaryActions],
  );

  const scheduledDeletionLabel = useMemo(
    () =>
      formatScheduledDeletionDate(
        accountDeletionGate?.scheduledDeletionAt ?? null,
      ),
    [accountDeletionGate?.scheduledDeletionAt],
  );

  const handleAccountRecovery = useCallback(async () => {
    if (!accountDeletionGate || recoverySubmitting) return;

    try {
      setRecoverySubmitting('restore');
      await cancelAccountDeletion(accountDeletionGate.requestId);
      setAccountDeletionGate(null);
      navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'account-delete');
      Alert.alert(title, message);
    } finally {
      setRecoverySubmitting(null);
    }
  }, [
    accountDeletionGate,
    navigation,
    recoverySubmitting,
    setAccountDeletionGate,
  ]);

  const handleGateLogout = useCallback(async () => {
    if (recoverySubmitting) return;

    try {
      setRecoverySubmitting('logout');
      const result = await performLogout(1200);
      navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });

      if (result.timedOut) {
        showToast({
          tone: 'info',
          title: '세션 정리 진행 중',
          message:
            '이 기기에서는 바로 로그아웃되었고 서버 세션 정리는 잠시 이어질 수 있어요.',
        });
      }
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'logout');
      Alert.alert(title, message);
    } finally {
      setRecoverySubmitting(null);
    }
  }, [navigation, recoverySubmitting]);

  const screenContent = (
    <KeyboardAwareScrollView
      style={styles.keyboardView}
      bounces={false}
      contentContainerStyle={[
        styles.scrollContent,
        isSeasonalLogin ? styles.seasonalScrollContent : null,
        { paddingBottom: insets.bottom + (isSeasonalLogin ? 18 : 32) },
      ]}
      enableOnAndroid
      extraScrollHeight={isSeasonalLogin ? 80 : 24}
      keyboardDismissMode="none"
      keyboardOpeningTime={0}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {isSeasonalLogin ? (
        <View style={[styles.seasonalHero, { minHeight: seasonalHeroHeight }]}>
          <View style={styles.seasonalHeadlineGroup}>
            <AppText
              preset="title2"
              style={[
                styles.seasonalHeadline,
                seasonalVisual
                  ? {
                      color: seasonalVisual.headlineColor,
                      textShadowColor: seasonalVisual.headlineShadowColor,
                    }
                  : null,
              ]}
            >
              {seasonalVisual?.headlineFirstLine}
            </AppText>
            <Text
              style={[
                styles.seasonalHeadline,
                seasonalVisual
                  ? {
                      color: seasonalVisual.headlineColor,
                      textShadowColor: seasonalVisual.headlineShadowColor,
                    }
                  : null,
              ]}
            >
              {seasonalVisual?.headlineSecondLinePrefix}
              <Text
                style={[
                  styles.seasonalHeadlineAccent,
                  seasonalVisual
                    ? { color: seasonalVisual.headlineAccentColor }
                    : null,
                ]}
              >
                {seasonalVisual?.headlineAccent}
              </Text>
              {seasonalVisual?.headlineSecondLineSuffix}
            </Text>
            <View style={styles.seasonalHeadlineOrnament}>
              <View
                style={[
                  styles.seasonalOrnamentLine,
                  seasonalVisual
                    ? { backgroundColor: seasonalVisual.accentColor }
                    : null,
                ]}
              />
              <MaterialCommunityIcons
                color={seasonalVisual?.accentColor}
                name={seasonalVisual?.ornamentIcon ?? 'leaf-maple'}
                size={18}
              />
              <View
                style={[
                  styles.seasonalOrnamentLine,
                  seasonalVisual
                    ? { backgroundColor: seasonalVisual.accentColor }
                    : null,
                ]}
              />
            </View>
            <AppText
              preset="unifiedLabel"
              style={[
                styles.seasonalSubtitle,
                seasonalVisual ? { color: seasonalVisual.subtitleColor } : null,
              ]}
              styleOverridesPreset
            >
              {seasonalVisual?.subtitle}
            </AppText>
          </View>

          <AppText
            preset="unifiedLabel"
            style={[
              styles.seasonalEnglishCopy,
              seasonalVisual
                ? { color: seasonalVisual.englishCopyColor }
                : null,
            ]}
            styleOverridesPreset
          >
            {seasonalVisual?.englishCopy}
          </AppText>
        </View>
      ) : (
        <View style={styles.hero}>
          <View style={styles.heroLogoWrap}>
            <Image
              resizeMode="contain"
              source={ASSETS.logo}
              style={styles.heroLogo}
            />
          </View>
          <AppText preset="unifiedBody" style={styles.heroBody}>
            함께한 모든 순간이, 오래도록 기억이 되도록
          </AppText>
        </View>
      )}

      <View style={isSeasonalLogin ? styles.seasonalFormContent : null}>
        <AuthField
          autoCapitalize="none"
          inputRef={emailInputRef}
          keyboardType="email-address"
          label="이메일"
          leftIconName={isSeasonalLogin ? 'mail' : undefined}
          onChangeText={setEmail}
          placeholder="이메일"
          seasonalVisual={seasonalVisual}
          value={email}
        />

        <AuthField
          autoCapitalize="none"
          inputRef={passwordInputRef}
          label="비밀번호"
          leftIconName={isSeasonalLogin ? 'lock' : undefined}
          onChangeText={setPassword}
          placeholder="비밀번호"
          rightAccessory={
            <TouchableOpacity
              accessibilityLabel={
                securePassword ? '비밀번호 표시' : '비밀번호 숨기기'
              }
              accessibilityRole="button"
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={onToggleSecurePassword}
            >
              <Feather
                color={seasonalVisual?.fieldIconColor ?? '#9DA7BA'}
                name={securePassword ? 'eye-off' : 'eye'}
                size={20}
              />
            </TouchableOpacity>
          }
          seasonalVisual={seasonalVisual}
          secureTextEntry={securePassword}
          value={password}
        />

        <TouchableOpacity
          accessibilityLabel={submitting ? 'NURI와 연결하는 중' : '로그인'}
          accessibilityRole="button"
          activeOpacity={0.9}
          disabled={disabled}
          onPress={onSubmit}
          style={[
            styles.primaryButton,
            isSeasonalLogin ? styles.seasonalPrimaryButton : null,
            seasonalVisual
              ? {
                  backgroundColor: seasonalVisual.ctaColor,
                  shadowColor: seasonalVisual.ctaShadowColor,
                }
              : null,
            disabled ? styles.primaryButtonDisabled : null,
          ]}
        >
          {submitting ? (
            <WaveText
              text="NURI와 연결하는 중 🐾"
              color="#FFFFFF"
              textStyle={styles.primaryButtonText}
              amplitude={2.6}
              staggerMs={55}
            />
          ) : (
            <AppText
              preset="unifiedLabel"
              style={[
                styles.primaryButtonText,
                isSeasonalLogin ? styles.seasonalPrimaryButtonText : null,
              ]}
              styleOverridesPreset={isSeasonalLogin}
            >
              로그인
            </AppText>
          )}
          {recentLoginProvider === 'email' ? (
            <RecentLoginPill seasonalVisual={seasonalVisual} />
          ) : null}
        </TouchableOpacity>

        <View
          style={[
            styles.inlineLinks,
            isSeasonalLogin ? styles.seasonalInlineLinks : null,
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.75}
            onPress={onPressForgotPassword}
            style={isSeasonalLogin ? styles.seasonalInlineLinkButton : null}
          >
            <AppText
              preset="unifiedLabel"
              style={[
                styles.inlineLinkText,
                isSeasonalLogin ? styles.seasonalInlineLinkText : null,
                seasonalVisual
                  ? { color: seasonalVisual.inlineTextColor }
                  : null,
              ]}
              styleOverridesPreset={isSeasonalLogin}
            >
              비밀번호 찾기
            </AppText>
          </TouchableOpacity>
          <Text
            style={[
              styles.inlineDivider,
              isSeasonalLogin ? styles.seasonalInlineDivider : null,
              seasonalVisual
                ? { color: seasonalVisual.inlineDividerColor }
                : null,
            ]}
          >
            |
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.75}
            onPress={onPressSignUp}
            style={isSeasonalLogin ? styles.seasonalInlineLinkButton : null}
          >
            <AppText
              preset="unifiedLabel"
              style={[
                styles.inlineLinkText,
                isSeasonalLogin ? styles.seasonalInlineLinkText : null,
                seasonalVisual
                  ? { color: seasonalVisual.inlineTextColor }
                  : null,
              ]}
              styleOverridesPreset={isSeasonalLogin}
            >
              회원가입
            </AppText>
          </TouchableOpacity>
        </View>

        {SHOW_SOCIAL_OAUTH_SECTION ? (
          <>
            <View
              style={[
                styles.socialSection,
                isSeasonalLogin ? styles.seasonalSocialSection : null,
              ]}
            >
              <View
                style={[
                  styles.socialDivider,
                  isSeasonalLogin ? styles.seasonalSocialDivider : null,
                  seasonalVisual
                    ? { backgroundColor: seasonalVisual.socialDividerColor }
                    : null,
                ]}
              />
              <AppText
                preset="unifiedTitle"
                style={[
                  styles.socialSectionTitle,
                  isSeasonalLogin ? styles.seasonalSocialSectionTitle : null,
                  seasonalVisual
                    ? { color: seasonalVisual.socialTextColor }
                    : null,
                ]}
                styleOverridesPreset={isSeasonalLogin}
              >
                {seasonalVisual?.socialLabel ?? '소셜 계정으로 시작하기'}
              </AppText>
              <View
                style={[
                  styles.socialDivider,
                  isSeasonalLogin ? styles.seasonalSocialDivider : null,
                  seasonalVisual
                    ? { backgroundColor: seasonalVisual.socialDividerColor }
                    : null,
                ]}
              />
            </View>

            {SHOW_KAKAO_OAUTH ? (
              <SocialButton
                backgroundColor="#FEE500"
                badge={<KakaoBadgeMark />}
                borderColor="#FEE500"
                disabled={socialDisabled}
                isRecentLogin={recentLoginProvider === 'kakao'}
                label={
                  oauthSubmitting === 'kakao'
                    ? '카카오로 연결 중...'
                    : '카카오로 시작하기'
                }
                onPress={() => {
                  onSocialPress('kakao').catch(() => {});
                }}
                seasonalVisual={seasonalVisual}
                textColor="#191600"
              />
            ) : null}

            {SHOW_GOOGLE_OAUTH ? (
              <SocialButton
                backgroundColor={
                  seasonalVisual?.googleBackgroundColor ?? '#FFFFFF'
                }
                badge={<GoogleBadgeMark />}
                borderColor={seasonalVisual?.googleBorderColor ?? '#E2E8F2'}
                disabled={socialDisabled}
                isRecentLogin={recentLoginProvider === 'google'}
                label={
                  oauthSubmitting === 'google'
                    ? 'Google로 연결 중...'
                    : 'Google로 시작하기'
                }
                onPress={() => {
                  onSocialPress('google').catch(() => {});
                }}
                seasonalVisual={seasonalVisual}
                textColor="#332C29"
              />
            ) : null}

            <SocialConsentNotice
              compact={isSeasonalLogin}
              linkColor={seasonalVisual?.policyLinkColor ?? theme.colors.brand}
              onPressDocument={onPressLegalDocument}
              shadowColor={seasonalVisual?.policyShadowColor}
              textColor={
                seasonalVisual?.policyTextColor ?? theme.colors.textMuted
              }
            />
          </>
        ) : null}
      </View>

      {noticeConfig && !accountDeletionGate ? (
        <PremiumNoticeModal
          visible
          typographyMode="unified"
          eyebrow={noticeConfig.eyebrow}
          iconName={noticeConfig.iconName}
          titleLines={noticeConfig.titleLines}
          bodyLines={noticeConfig.bodyLines}
          confirmLabel={noticeConfig.confirmLabel}
          accentColor={theme.colors.brand}
          secondaryActions={secondaryActions}
          onClose={closeNoticeModal}
          onConfirm={handleNoticeConfirm}
        />
      ) : null}

      {accountDeletionGate ? (
        <PremiumNoticeModal
          visible
          typographyMode="unified"
          eyebrow="ACCOUNT RECOVERY"
          iconName="user-plus"
          titleLines={['잠시만요! 계정 삭제가 진행 중이에요 🥺']}
          bodyLines={[
            `현재 계정은 삭제 대기 상태입니다. (삭제 예정일: ${scheduledDeletionLabel})`,
            '다시 찾아주셔서 정말 반가워요! 계정을 복구하고 NURI와 계속 함께하시겠어요?',
          ]}
          accessibilityTitleLines={['잠시만요! 계정 삭제가 진행 중이에요']}
          accessibilityBodyLines={[
            `현재 계정은 삭제 대기 상태입니다. 삭제 예정일: ${scheduledDeletionLabel}`,
            '다시 찾아주셔서 정말 반가워요! 계정을 복구하고 NURI와 계속 함께하시겠어요?',
          ]}
          confirmLabel="계정 복구하기"
          confirmAccessibilityHint="두 번 탭하면 계정 삭제를 취소하고 앱으로 돌아갑니다."
          accentColor={theme.colors.brand}
          secondaryActions={[
            {
              label: '로그아웃',
              onPress: handleGateLogout,
            },
          ]}
          onClose={() => {}}
          onConfirm={handleAccountRecovery}
        />
      ) : null}
    </KeyboardAwareScrollView>
  );

  if (seasonalVisual) {
    return (
      <View
        style={[
          styles.screen,
          { backgroundColor: seasonalVisual.backgroundColor },
        ]}
      >
        <StatusBar barStyle="dark-content" />
        <ImageBackground
          accessible={false}
          resizeMode="stretch"
          source={seasonalVisual.source}
          style={styles.seasonalBackground}
        >
          <View
            pointerEvents="none"
            style={[
              styles.seasonalBackgroundWash,
              { backgroundColor: seasonalVisual.backgroundWashColor },
            ]}
          />
          <SafeAreaView style={styles.seasonalSafeArea}>
            {screenContent}
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      {screenContent}
    </SafeAreaView>
  );
}
