import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AppText from '../../../app/ui/AppText';
import Feather from '../../../components/icons/NuriFeatherIcon';
import { lightColors } from '../../../app/theme/tokens/colors';
import { resolveCtaPalette } from '../../../app/theme/ctaPalette';
import { formatPetCopy } from '../../../utils/petDisplayName';
import type { SeasonKey } from '../../../theme/seasonal/season';
import WalkSummaryMetrics from './WalkSummaryMetrics';
import { finishArtwork } from './finishArtwork';
import { walkCopyAccent } from './walkAccent';

type Props = {
  header: React.ReactNode;
  map: React.ReactNode;
  petName: string;
  season: SeasonKey;
  distanceM: string | null;
  activeMs: string;
  sessionKey?: string | null;
  routeAvailable: boolean;
  routePartial?: boolean;
  qualityNeedsReview: boolean;
  insetBottom: number;
  busy: boolean;
  onClose: () => void;
  fixtureOnly?: boolean;
  fixtureContext?: React.ReactNode;
};
export default function WalkLocalResult(props: Props) {
  const [routeOpen, setRouteOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const revealPending = useRef(false);
  const reduceMotion = useRef(true);
  const accent = walkCopyAccent(props.season);
  useEffect(() => {
    setRouteOpen(false);
    revealPending.current = false;
  }, [props.sessionKey, props.routeAvailable]);
  useEffect(() => {
    let alive = true;
    const update = (enabled: boolean) => {
      if (alive) reduceMotion.current = enabled;
    };
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      update,
    );
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then(enabled => update(enabled !== false))
      .catch(() => update(true));
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return (
    <View testID="walk-result-screen" style={styles.root}>
      {props.header}
      <ScrollView
        ref={scroll}
        testID="walk-result-body"
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}
        onContentSizeChange={() => {
          // Content layout follows map expansion; never guess its height with a timer.
          if (!revealPending.current || !routeOpen || !props.routeAvailable)
            return;
          revealPending.current = false;
          scroll.current?.scrollToEnd({ animated: !reduceMotion.current });
        }}
      >
        <View testID="walk-result-artwork-frame" style={styles.artFrame}>
          <Image
            testID={
              props.fixtureOnly ? 'walk-future-artwork' : 'walk-result-artwork'
            }
            source={finishArtwork(props.season)}
            resizeMode="contain"
            accessible={false}
            importantForAccessibility="no"
            style={styles.art}
          />
        </View>
        <View
          style={[styles.summary, props.fixtureOnly && styles.fixtureSummary]}
        >
          <View
            testID={props.fixtureOnly ? 'walk-future-copy' : undefined}
            style={props.fixtureOnly ? styles.fixtureHeading : styles.heading}
          >
            <AppText
              testID="walk-result-title"
              preset="titleSm"
              accessibilityRole="header"
              style={[styles.title, { color: accent }]}
            >
              {props.fixtureOnly
                ? '함께 걸은 오늘을 남겨볼까요?'
                : '우리, 오늘도 잘 다녀왔어요!'}
            </AppText>
            <AppText
              testID="walk-result-pet-copy"
              preset="bodySm"
              style={styles.subtitle}
            >
              {formatPetCopy('우리 아이와 남긴 소중한 발자국', props.petName)}
            </AppText>
          </View>
          <WalkSummaryMetrics
            distanceM={props.distanceM}
            activeMs={props.activeMs}
            accent={accent}
          />
          {!props.fixtureOnly && (
            <AppText preset="caption" style={styles.note}>
              산책 결과를 기기에 저장했어요.
            </AppText>
          )}
          {props.qualityNeedsReview && (
            <AppText
              testID="walk-result-quality-warning"
              preset="caption"
              accessibilityLiveRegion="polite"
              style={styles.note}
            >
              일부 구간의 위치 기록을 확인해야 해요.
            </AppText>
          )}
          {props.fixtureOnly ? (
            <View style={styles.fixtureActions}>{props.fixtureContext}</View>
          ) : (
            <Pressable
              testID="walk-result-route-toggle"
              accessibilityRole="button"
              accessibilityLabel={
                routeOpen ? '걸어온 길 접기' : '걸어온 길 보기'
              }
              accessibilityState={{
                expanded: routeOpen,
                disabled: !props.routeAvailable,
              }}
              disabled={!props.routeAvailable}
              onPress={() => {
                if (!props.routeAvailable) return;
                revealPending.current = !routeOpen;
                setRouteOpen(!routeOpen);
              }}
              style={styles.routeAction}
            >
              <AppText
                testID="walk-result-route-label"
                preset="button"
                style={[styles.routeLabel, { color: accent }]}
              >
                {props.routeAvailable
                  ? routeOpen
                    ? '걸어온 길 접기'
                    : '걸어온 길 보기'
                  : '표시할 경로가 없어요'}
              </AppText>
              {props.routeAvailable && (
                <Feather
                  name={routeOpen ? 'chevron-up' : 'chevron-right'}
                  color={accent}
                  size={16}
                  accessible={false}
                />
              )}
            </Pressable>
          )}
          {routeOpen && props.routeAvailable && (
            <>
              {props.routePartial && (
                <AppText
                  testID="walk-result-route-partial"
                  preset="caption"
                  style={styles.note}
                >
                  경로 일부를 표시하고 있어요.
                </AppText>
              )}
              <View
                testID="walk-result-route"
                style={[
                  styles.routeMap,
                  {
                    height:
                      viewportHeight > 0
                        ? Math.min(240, Math.max(1, viewportHeight - 16))
                        : 240,
                  },
                ]}
              >
                {props.map}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: props.insetBottom + 16 }]}>
        {props.fixtureOnly ? (
          <View style={styles.fixtureFooter}>
            {(['산책 기록으로 남기기', '나중에 기록하기'] as const).map(
              (label, index) => (
                <Pressable
                  key={label}
                  testID={
                    index === 0 ? 'walk-future-record' : 'walk-future-later'
                  }
                  disabled
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ disabled: true }}
                  style={[styles.primary, styles.fixtureDisabled]}
                >
                  <AppText
                    preset="button"
                    style={[styles.buttonText, styles.fixtureDisabledText]}
                  >
                    {label}
                  </AppText>
                </Pressable>
              ),
            )}
          </View>
        ) : (
          <Pressable
            testID="walk-primary"
            accessibilityRole="button"
            accessibilityLabel="산책 화면 닫기"
            accessibilityState={{ disabled: props.busy }}
            disabled={props.busy}
            onPress={props.onClose}
            style={({ pressed }) => [
              styles.primary,
              {
                backgroundColor: resolveCtaPalette({
                  role: 'primary',
                  season: props.season,
                  colorScheme: 'light',
                  colors: lightColors,
                  state: props.busy
                    ? 'disabled'
                    : pressed
                    ? 'pressed'
                    : 'default',
                }).background,
              },
            ]}
          >
            <AppText
              testID="walk-primary-label"
              preset="button"
              style={styles.buttonText}
            >
              산책 화면 닫기
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.surfaceElevated },
  content: { flexGrow: 1, paddingBottom: 8 },
  artFrame: { width: '100%', aspectRatio: 1402 / 1122, marginTop: 6 },
  art: { width: '100%', height: '100%' },
  summary: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
    justifyContent: 'space-evenly',
  },
  heading: { gap: 6 },
  fixtureSummary: { flexGrow: 0, justifyContent: 'flex-start', gap: 16 },
  fixtureHeading: { paddingTop: 16, paddingBottom: 16, gap: 8 },
  fixtureActions: { gap: 12, paddingTop: 8, paddingBottom: 16 },
  fixtureFooter: { gap: 12 },
  fixtureDisabled: {
    backgroundColor: lightColors.surface,
    borderColor: lightColors.border,
    borderWidth: 1,
  },
  fixtureDisabledText: { color: lightColors.textSecondary },
  title: {
    fontSize: 17,
    lineHeight: 25,
    color: lightColors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: lightColors.textSecondary,
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: lightColors.textSecondary,
    textAlign: 'center',
  },
  routeAction: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  routeLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: lightColors.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },
  routeMap: { height: 240, width: '100%', overflow: 'hidden' },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  primary: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 13,
    lineHeight: 20,
    color: lightColors.surfaceElevated,
    textAlign: 'center',
  },
});
