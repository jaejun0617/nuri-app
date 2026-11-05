// Shared presentation only: auth ownership and callback validation stay in the screens.
import React, { memo } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AppText from '../../app/ui/AppText';
import { HomeFloatingWidgetSurface } from '../../components/home/HomeWidgetMaterial';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import {
  getSeasonalLoginVisual,
  getSocialLoginLayout,
} from '../../theme/seasonal/login';
import {
  isSocialOAuthProviderReleaseReady,
  type SocialOAuthProvider,
} from '../../services/supabase/auth';
import type { LegalDocumentId } from '../../services/legal/documents';
import type { RecentLoginProvider } from '../../services/auth/recentLoginProvider';
import { LOGIN_PROGRESS_RADIUS, styles } from './SignInScreen.styles';

const PROVIDERS = {
  kakao: {
    label: '카카오 로그인',
    source: require('../../assets/auth/providers/kakao-symbol.png'),
  },
  google: {
    label: 'Google로 계속하기',
    source: require('../../assets/auth/providers/google-g.png'),
  },
} as const;

const SocialButton = memo(function SocialButtonContent({
  provider,
  busy,
  disabled,
  recent,
  onPress,
}: {
  provider: SocialOAuthProvider;
  busy: boolean;
  disabled: boolean;
  recent: boolean;
  onPress: (provider: SocialOAuthProvider) => void;
}) {
  const config = PROVIDERS[provider];
  return (
    <TouchableOpacity
      testID={`social-login-${provider}`}
      accessibilityRole="button"
      accessibilityLabel={config.label}
      accessibilityHint={recent ? '최근 로그인한 계정입니다.' : undefined}
      accessibilityState={{ disabled, busy }}
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onPress(provider)}
      style={[
        styles.socialButton,
        provider === 'kakao' ? styles.kakaoButton : styles.googleButton,
        disabled && !busy ? styles.disabledButton : null,
      ]}
    >
      <View style={styles.buttonLeading}>
        <Image
          accessible={false}
          source={config.source}
          resizeMode="contain"
          style={styles.providerIcon}
        />
      </View>
      <View style={styles.buttonCopy}>
        <AppText
          preset="unifiedLabel"
          styleOverridesPreset
          style={[
            styles.buttonLabel,
            provider === 'kakao' ? styles.kakaoLabel : null,
          ]}
        >
          {config.label}
        </AppText>
      </View>
      <View style={styles.buttonTrailingSpace}>
        {!busy && recent ? (
          <AppText
            testID={`social-login-${provider}-recent`}
            preset="caption"
            styleOverridesPreset
            style={styles.recentLabel}
          >
            최근 로그인
          </AppText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

type Props = {
  busyProvider?: SocialOAuthProvider | null;
  recentProvider?: RecentLoginProvider | null;
  disabled: boolean;
  sessionPending?: boolean;
  onProviderPress: (provider: SocialOAuthProvider) => void;
  onLegalPress: (documentId: LegalDocumentId) => void;
  children?: React.ReactNode;
};

export default function SocialLoginSurface({
  busyProvider,
  recentProvider,
  disabled,
  sessionPending = false,
  onProviderPress,
  onLegalPress,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const viewport = useWindowDimensions();
  const season = useEffectiveSeason();
  const visual = getSeasonalLoginVisual(season);
  // The image has a plain top band. Keep the shared PO-approved placement while
  // a fixed background protects the status bar when short screens need scrolling.
  const topSpacing = Math.max(0, insets.top - 32);
  const layout = getSocialLoginLayout(
    Math.max(0, viewport.width - insets.left - insets.right),
    Math.max(0, viewport.height - topSpacing - insets.bottom),
  );
  const showKakao = isSocialOAuthProviderReleaseReady('kakao');
  const showGoogle = isSocialOAuthProviderReleaseReady('google');
  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topSpacing },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View
          testID="social-login-hero"
          style={[styles.hero, { height: layout.heroHeight }]}
        >
          <Image
            accessible
            accessibilityRole="image"
            accessibilityLabel={visual.accessibilityLabel}
            source={visual.source}
            resizeMode="contain"
            style={{ width: layout.imageWidth, height: layout.imageHeight }}
          />
        </View>
        <View
          testID="social-login-actions"
          style={[styles.actions, { minHeight: layout.actionsMinHeight }]}
        >
          {showKakao ? (
            <SocialButton
              provider="kakao"
              busy={busyProvider === 'kakao'}
              disabled={disabled}
              recent={recentProvider === 'kakao'}
              onPress={onProviderPress}
            />
          ) : null}
          {showGoogle ? (
            <SocialButton
              provider="google"
              busy={busyProvider === 'google'}
              disabled={disabled}
              recent={recentProvider === 'google'}
              onPress={onProviderPress}
            />
          ) : null}
          {!showKakao && !showGoogle ? (
            <AppText style={styles.unavailableText}>
              현재 사용할 수 있는 로그인 방식이 없습니다.
            </AppText>
          ) : null}
          <View style={styles.legal}>
            <View style={styles.legalLinks}>
              <TouchableOpacity
                accessibilityRole="link"
                disabled={sessionPending}
                accessibilityState={{ disabled: sessionPending }}
                onPress={() => onLegalPress('terms')}
                style={styles.legalLink}
              >
                <AppText
                  preset="caption"
                  styleOverridesPreset
                  style={styles.legalLinkText}
                >
                  이용약관
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="link"
                disabled={sessionPending}
                accessibilityState={{ disabled: sessionPending }}
                onPress={() => onLegalPress('privacy')}
                style={styles.legalLink}
              >
                <AppText
                  preset="caption"
                  styleOverridesPreset
                  style={styles.legalLinkText}
                >
                  개인정보처리방침
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      {sessionPending ? (
        <View testID="social-login-progress-overlay" pointerEvents="none" style={styles.progressOverlay}>
          <View
            testID="social-login-progress"
            style={styles.sessionProgress}
            accessibilityLiveRegion="polite"
            accessibilityState={{ busy: true }}
          >
            <HomeFloatingWidgetSurface
              radius={LOGIN_PROGRESS_RADIUS}
              testIDPrefix="social-login-progress-glass"
            />
            <ActivityIndicator size="small" color={styles.progressTitle.color} />
            <AppText preset="unifiedLabel" style={styles.progressTitle}>
              누리에 로그인하고 있어요
            </AppText>
            <AppText preset="caption" style={styles.progressDescription}>
              잠시만 기다려 주세요
            </AppText>
          </View>
        </View>
      ) : null}
      <View
        testID="social-login-status-bar-background"
        pointerEvents="none"
        accessible={false}
        style={[styles.statusBarBackground, { height: insets.top }]}
      />
      {children}
    </SafeAreaView>
  );
}
