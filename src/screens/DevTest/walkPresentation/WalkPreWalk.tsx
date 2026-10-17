import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import AppText from '../../../app/ui/AppText';
import { resolveCtaPalette } from '../../../app/theme/ctaPalette';
import { lightColors } from '../../../app/theme/tokens/colors';
import type { SeasonKey } from '../../../theme/seasonal/season';
import { getSeasonalWeatherVisualTheme } from '../../../theme/seasonal/weather';
import { buildPetThemePalette } from '../../../services/pets/themePalette';
import { appendKoreanParticle } from '../../../utils/koreanParticle';
import { formatPetCopy } from '../../../utils/petDisplayName';

type IntroSeen = { current: boolean };
type Props = {
  header: React.ReactNode;
  petName: string;
  season: SeasonKey;
  insetBottom: number;
  busy: boolean;
  error: boolean;
  introSeen?: IntroSeen;
  onPrimary: () => void;
};

// Overlapping phrases keep one continuous invitation instead of six hard cuts.
const ENTRANCE = [
  { delay: 250, duration: 1100 },
  { delay: 850, duration: 1150 },
  { delay: 1650, duration: 1050 },
  { delay: 2150, duration: 1050 },
  { delay: 2950, duration: 1200 },
  { delay: 3750, duration: 1250 },
] as const;
const SEASONAL_PRESENTATION: Record<
  SeasonKey,
  { artwork: ImageSourcePropType; emphasis: string; after: string }
> = {
  spring: {
    artwork: require('../../../assets/images/walk/pre-walk-spring-v1.png'),
    emphasis: '봄바람',
    after: '에 발맞춰,',
  },
  summer: {
    artwork: require('../../../assets/images/walk/pre-walk-summer-v1.png'),
    emphasis: '초록 그늘',
    after: '을 따라,',
  },
  autumn: {
    artwork: require('../../../assets/images/walk/pre-walk-autumn-v1.png'),
    emphasis: '발맞춰',
    after: ' 걷는 이 시간,',
  },
  winter: {
    artwork: require('../../../assets/images/walk/pre-walk-winter-v1.png'),
    emphasis: '작은 온기',
    after: '를 나누며,',
  },
};

function useEntrance(sharedSeen?: IntroSeen) {
  const ownSeen = useRef(false);
  const seen = sharedSeen ?? ownSeen;
  const [progress] = useState(() =>
    ENTRANCE.map(() => new Animated.Value(seen.current ? 1 : 0)),
  );
  useEffect(() => {
    let alive = true;
    let animation: Animated.CompositeAnimation | undefined;
    const reveal = () => {
      if (!alive) return;
      animation?.stop();
      progress.forEach(value => value.setValue(1));
      seen.current = true;
    };
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        if (enabled) reveal();
      },
    );
    const appState = AppState.addEventListener('change', state => {
      // An interrupted entrance settles; foreground never replays or hides copy.
      if (state !== 'active') reveal();
    });
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then(enabled => {
        if (!alive) return;
        if (
          enabled !== false ||
          seen.current ||
          AppState.currentState !== 'active'
        ) {
          reveal();
          return;
        }
        seen.current = true;
        animation = Animated.parallel(
          progress.map((value, index) =>
            Animated.timing(value, {
              toValue: 1,
              ...ENTRANCE[index],
              easing: Easing.bezier(0.22, 1, 0.36, 1),
              useNativeDriver: true,
              isInteraction: false,
            }),
          ),
        );
        animation.start();
      })
      .catch(reveal);
    return () => {
      alive = false;
      animation?.stop();
      motion.remove();
      appState.remove();
    };
  }, [progress, seen]);
  return useMemo(
    () =>
      progress.map(value => ({
        opacity: value,
        transform: [
          {
            translateY: value.interpolate({
              inputRange: [0, 1],
              outputRange: [6, 0],
              extrapolate: 'clamp',
            }),
          },
        ],
      })),
    [progress],
  );
}

/** PRE_WALK presentation only. No map, location, native command or persistence. */
export default function WalkPreWalk(props: Props) {
  const entrance = useEntrance(props.introSeen);
  const name = props.petName.trim();
  const greeting =
    name && name !== '반려동물'
      ? `${appendKoreanParticle(name, '야', '아')},`
      : '우리 함께,';
  const greetingAccent = getSeasonalWeatherVisualTheme(props.season)?.card.accent;
  // The existing deep tone keeps small inline accents readable on white paper.
  const copyAccent = greetingAccent
    ? buildPetThemePalette(greetingAccent).deep
    : lightColors.textSecondary;
  const seasonal = SEASONAL_PRESENTATION[props.season];
  const emotionalLines = [
    {
      before: formatPetCopy('우리 아이와 ', props.petName),
      emphasis: seasonal.emphasis,
      after: seasonal.after,
    },
    {
      before: '오늘도 우리만의 ',
      emphasis: '추억',
      after: '을 쌓아가요.',
    },
  ];
  const palette = (pressed: boolean) =>
    resolveCtaPalette({
      role: 'primary',
      season: props.season,
      colorScheme: 'light',
      colors: lightColors,
      state: props.busy ? 'disabled' : pressed ? 'pressed' : 'default',
    });
  return (
    <View testID="walk-product-screen" style={styles.root}>
      <View testID="walk-pre-screen" style={styles.root}>
        {props.header}
        <ScrollView
          testID="walk-pre-body"
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.copyArea}>
            <View testID="walk-pre-copy-group" style={styles.copyGroup}>
              <View
                testID="walk-pre-title"
                accessible
                accessibilityRole="header"
                accessibilityLabel={`${greeting} 산책 가자!`}
                style={styles.phraseRow}
              >
                {[greeting, '산책 가자!'].map((text, index) => (
                  <Animated.View
                    key={index}
                    testID={`walk-pre-fade-${index}`}
                    style={[styles.phraseChunk, entrance[index]]}
                  >
                    <AppText
                      testID={`walk-pre-title-text-${index}`}
                      preset="titleMd"
                      accessible={false}
                      importantForAccessibility="no"
                      style={[
                        styles.title,
                        index === 0 && { color: greetingAccent },
                      ]}
                    >
                      {text}
                    </AppText>
                  </Animated.View>
                ))}
              </View>
              <View
                testID="walk-pre-subtitle"
                accessible
                accessibilityLabel="오늘도 함께, 한 걸음씩."
                style={[styles.phraseRow, styles.subtitleRow]}
              >
                {['오늘도 함께,', '한 걸음씩.'].map((text, index) => (
                  <Animated.View
                    key={index}
                    testID={`walk-pre-fade-${index + 2}`}
                    style={[
                      styles.phraseChunk,
                      entrance[index + 2],
                    ]}
                  >
                    <AppText
                      testID={`walk-pre-subtitle-text-${index}`}
                      preset="bodySm"
                      accessible={false}
                      importantForAccessibility="no"
                      style={styles.subtitle}
                    >
                      {index === 0 ? (
                        <>
                          {'오늘도 '}
                          <Text
                            testID="walk-pre-emphasis-together"
                            accessible={false}
                            importantForAccessibility="no"
                            style={{ color: copyAccent }}
                          >
                            함께
                          </Text>
                          ,
                        </>
                      ) : (
                        text
                      )}
                    </AppText>
                  </Animated.View>
                ))}
              </View>
              <View
                testID="walk-pre-emotional-copy"
                accessible
                accessibilityLabel={emotionalLines
                  .map(line => `${line.before}${line.emphasis}${line.after}`)
                  .join('\n')}
                style={styles.emotionalCopy}
              >
                {emotionalLines.map((line, index) => (
                  <Animated.View
                    key={index}
                    testID={`walk-pre-fade-${index + 4}`}
                    style={[styles.copyGroup, entrance[index + 4]]}
                  >
                    <AppText
                      testID={`walk-pre-emotional-text-${index}`}
                      preset="caption"
                      accessible={false}
                      importantForAccessibility="no"
                      style={styles.emotionalText}
                    >
                      {line.before}
                      <Text
                        testID={`walk-pre-emphasis-${index}`}
                        accessible={false}
                        importantForAccessibility="no"
                        style={{ color: copyAccent }}
                      >
                        {line.emphasis}
                      </Text>
                      {line.after}
                    </AppText>
                  </Animated.View>
                ))}
              </View>
            </View>
          </View>
          <View testID="walk-pre-artwork-frame" style={styles.artwork}>
            <Image
              source={seasonal.artwork}
              resizeMode="contain"
              accessible={false}
              importantForAccessibility="no"
              style={styles.artworkImage}
            />
          </View>
        </ScrollView>
        <View
          testID="walk-pre-footer"
          style={[styles.footer, { paddingBottom: props.insetBottom + 12 }]}
        >
          {props.error && (
            <AppText
              preset="caption"
              accessibilityLiveRegion="polite"
              style={styles.error}
            >
              지금 시작하지 못했어요. 산책 상태를 확인한 뒤 다시 시도해 주세요.
            </AppText>
          )}
          <Pressable
            testID="walk-primary"
            accessibilityRole="button"
            accessibilityLabel="함께 산책 시작하기"
            accessibilityState={{ disabled: props.busy }}
            disabled={props.busy}
            onPress={props.onPrimary}
            style={({ pressed }) => [
              styles.start,
              {
                backgroundColor: palette(pressed).background,
              },
            ]}
          >
            <AppText
              testID="walk-primary-label"
              preset="button"
              style={[styles.action, { color: palette(false).text }]}
            >
              함께 산책 시작하기
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.surfaceElevated },
  body: { flex: 1 },
  bodyContent: { flexGrow: 1 },
  copyArea: {
    flex: 1,
    minHeight: 240,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    justifyContent: 'flex-end',
  },
  copyGroup: { width: '100%' },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
    color: lightColors.textPrimary,
  },
  // Native views own opacity. Inline Android text spans cannot fade independently.
  phraseRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 6,
  },
  phraseChunk: { maxWidth: '100%', flexShrink: 1 },
  subtitleRow: { marginTop: 6, columnGap: 4 },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0,
    textAlign: 'center',
    color: lightColors.textSecondary,
  },
  emotionalCopy: { width: '100%', marginTop: 12, alignItems: 'center' },
  emotionalText: {
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: 0,
    textAlign: 'center',
    color: lightColors.textSecondary,
  },
  artwork: { width: '100%', aspectRatio: 1402 / 1122, flexShrink: 0 },
  // Both dimensions must override Android Image's asset-size defaults.
  artworkImage: { width: '100%', height: '100%' },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  start: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
  },
  error: {
    color: lightColors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
});
