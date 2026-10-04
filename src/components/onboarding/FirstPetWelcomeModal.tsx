import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import { ASSETS } from '../../assets';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { getSeasonalOnboardingVisual } from '../../theme/seasonal/onboarding';
import { useOptionalSafeAreaInsets } from '../../hooks/useOptionalSafeAreaInsets';
import { getResponsiveOverlayMaxHeight } from '../../services/app/responsiveLayout';
import { buildFirstPetWelcomeCopy } from '../../services/local/firstPetWelcome';

const JISU_FONT = 'insungitCutelivelyjisu';

type Props = {
  visible: boolean;
  petName: string | null;
  accentColor: string;
  submitting: boolean;
  onConfirm: () => void;
};

function FirstPetWelcomeModalBase({
  visible,
  petName,
  accentColor,
  submitting,
  onConfirm,
}: Props) {
  const entrance = useRef(new Animated.Value(0)).current;
  const season = useEffectiveSeason();
  const seasonalVisual = useMemo(() => getSeasonalOnboardingVisual(season), [season]);
  const copy = useMemo(() => buildFirstPetWelcomeCopy(petName), [petName]);
  const insets = useOptionalSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxCardHeight = getResponsiveOverlayMaxHeight({
    windowHeight,
    topInset: insets.top,
    bottomInset: insets.bottom,
    verticalMargin: 20,
  });

  useEffect(() => {
    if (!visible) {
      entrance.setValue(0);
      return undefined;
    }

    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const announcementTimer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(
        `NURI에 온 걸 환영해요. ${copy.body}`,
      );
    }, 420);

    animation.start();
    return () => {
      clearTimeout(announcementTimer);
      animation.stop();
    };
  }, [copy.body, entrance, visible]);

  const opacity = entrance;
  const scale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.965, 1],
  });
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={() => undefined}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View pointerEvents="none" style={styles.scrim} />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              maxHeight: maxCardHeight,
              backgroundColor: seasonalVisual.welcomeSurface,
              opacity,
              transform: [{ scale }, { translateY }],
            },
          ]}
        >
          <View pointerEvents="none" style={styles.sparkleLeft}>
            <Feather color={season === 'autumn' ? 'rgba(231, 165, 133, 0.78)' : seasonalVisual.palette.neutralIconColor} name="star" size={17} />
          </View>
          <View pointerEvents="none" style={styles.sparkleRight}>
            <Feather color={season === 'autumn' ? 'rgba(184, 154, 210, 0.66)' : seasonalVisual.palette.neutralIconColor} name="star" size={13} />
          </View>

          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
          >
          <View accessibilityLabel="NURI" accessibilityRole="image" style={styles.symbolWrap}>
            <Image
              accessibilityIgnoresInvertColors
              blurRadius={8}
              pointerEvents="none"
              resizeMode="contain"
              source={ASSETS.logo}
              style={styles.symbolGlow}
            />
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={ASSETS.logo}
              style={styles.symbol}
            />
          </View>

          <AppText accessibilityRole="header" style={styles.title}>
            NURI에 온 걸 환영해요!
          </AppText>
          <AppText style={styles.petCopy}>{copy.body}</AppText>
          <AppText style={styles.supportCopy}>
            오늘부터 함께한 순간들을 하나씩 남겨보세요.
          </AppText>

          <TouchableOpacity
            accessibilityHint="환영 안내를 닫고 홈을 시작합니다."
            accessibilityLabel={copy.cta}
            accessibilityRole="button"
            activeOpacity={0.9}
            disabled={submitting}
            onPress={onConfirm}
            style={[
              styles.primaryButton,
              {
                backgroundColor: accentColor,
                opacity: submitting ? 0.76 : 1,
              },
            ]}
          >
            <AppText style={styles.primaryButtonText}>{copy.cta}</AppText>
          </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardScroll: { flexGrow: 0, width: '100%' },
  cardContent: { width: '100%', alignItems: 'center' },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(35, 25, 45, 0.30)',
  },
  card: {
    width: '100%',
    maxWidth: 352,
    overflow: 'hidden',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.76)',
    backgroundColor: 'rgba(255, 250, 242, 0.94)',
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 22,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#5E4153',
          shadowOpacity: 0.2,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
        }
      : null),
  },
  sparkleLeft: {
    position: 'absolute',
    left: 28,
    top: 38,
    transform: [{ rotate: '-9deg' }],
  },
  sparkleRight: {
    position: 'absolute',
    right: 35,
    top: 73,
    transform: [{ rotate: '12deg' }],
  },
  symbolWrap: {
    width: 68,
    height: 61,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolGlow: {
    position: 'absolute',
    width: 64,
    height: 57,
    tintColor: '#F1AD93',
    opacity: 0.36,
  },
  symbol: {
    width: 58,
    height: 52,
  },
  title: {
    marginTop: 7,
    color: '#49373D',
    fontFamily: JISU_FONT,
    fontSize: 25,
    lineHeight: 33,
    textAlign: 'center',
    letterSpacing: 0,
  },
  petCopy: {
    marginTop: 10,
    color: '#655159',
    fontFamily: JISU_FONT,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: 0,
  },
  supportCopy: {
    marginTop: 5,
    color: '#8A747B',
    fontFamily: JISU_FONT,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0,
  },
  primaryButton: {
    width: '100%',
    minHeight: 54,
    marginTop: 21,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFDF8',
    fontFamily: JISU_FONT,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: 0,
  },
});

export default memo(FirstPetWelcomeModalBase);
