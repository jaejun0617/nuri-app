import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import Feather from '../../components/icons/NuriFeatherIcon';
import { SeasonalFormBackground, SeasonalFormPanel } from '../../components/common/SeasonalFormSurface';
import { tutorialCatalog, type GuideStep, type TutorialId } from '../../services/tutorial/catalog';
import { tutorialBlockVisible, tutorialMotion, type BlockBounds } from '../../services/tutorial/motion';
import { getTutorialArtwork } from '../../services/tutorial/artwork';
import { getAppFontModeLabel } from '../../app/typography/appFontMode';

function ExampleArtwork({ source }: { source: ImageSourcePropType | undefined }) {
  const [failed, setFailed] = useState(false);
  return <View style={styles.artwork} accessible={false} importantForAccessibility="no-hide-descendants">
    {source && !failed ? <Image source={source} resizeMode="contain" style={styles.artImage}
      onError={() => setFailed(true)} testID="tutorial-example-artwork" /> : null}
  </View>;
}

type Signal = { start(slide: boolean): void; reveal(): void };
function FadeBlock({ index, animated, register, layout, children }: React.PropsWithChildren<{
  index: number; animated: boolean; register(index: number, signal: Signal | null): void;
  layout(index: number, event: LayoutChangeEvent): void;
}>) {
  const progress = useSharedValue(animated ? 0 : 1);
  const distance = useSharedValue(0);
  useLayoutEffect(() => {
    register(index, {
      start: slide => {
        distance.set(slide ? tutorialMotion.scrollOffsetDp : 0);
        progress.set(withTiming(1, {
          duration: tutorialMotion.durationMs, easing: Easing.inOut(Easing.cubic),
        }));
      },
      reveal: () => { cancelAnimation(progress); progress.set(1); },
    });
    return () => { register(index, null); cancelAnimation(progress); };
  }, [distance, index, progress, register]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.get(), transform: [{ translateY: distance.get() * (1 - progress.get()) }],
  }));
  return <Animated.View onLayout={event => layout(index, event)} style={style}>{children}</Animated.View>;
}

function StepBody({ step, topic, index, shown, animate, active, suspended, top, storeScroll }: {
  step: GuideStep; topic: TutorialId; index: number; shown: boolean;
  animate: boolean; active: boolean; suspended: boolean; top: number; storeScroll(y: number): void;
}) {
  const theme = useTheme();
  const elements = useMemo(() => [
    <AppText accessibilityRole="header" preset="unifiedTitle" style={styles.title}>{step.title}</AppText>,
    <AppText preset="body" style={styles.copy}>{step.body}</AppText>,
    ...(step.hint ? [<AppText preset="body" color={theme.colors.textSecondary} style={styles.hint}>{step.hint}</AppText>] : []),
    <SeasonalFormPanel style={styles.example}>
      <AppText preset="unifiedLabel" color={theme.colors.textSecondary}>화면 예시</AppText>
      <ExampleArtwork source={getTutorialArtwork(topic, index)} />
      {topic === 'font' && index === 1 ? <View style={styles.fontExamples}>
        <AppText preset="unifiedLabel" fontModeOverride="jisu">{getAppFontModeLabel('jisu')} · 아이와 보낸 하루</AppText>
        <AppText preset="unifiedLabel" fontModeOverride="pretendard">{getAppFontModeLabel('pretendard')} · 아이와 보낸 하루</AppText>
      </View> : <View style={[styles.sampleRow, topic === 'timeline' && index === 2 ? styles.grid : null]}>
        {step.example.map(label => <View key={label} style={[styles.sample, { borderColor: theme.colors.border }]}>
          <AppText preset="unifiedLabel" style={styles.sampleLabel}>{label}</AppText>
        </View>)}
      </View>}
    </SeasonalFormPanel>,
  ], [index, step, theme.colors.border, theme.colors.textSecondary, topic]);
  const [animationEnabled] = useState(animate && !shown);
  const geometry = useRef(new Map<number, BlockBounds>());
  const signals = useRef(new Map<number, Signal>());
  const revealed = useRef(new Set<number>());
  const delayed = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const viewport = useRef(0);
  const offset = useRef(top);
  const started = useRef(false);
  const stopped = useRef(!animationEnabled);
  const clear = useCallback(() => {
    delayed.current.forEach(clearTimeout);
    delayed.current.clear();
  }, []);
  const reveal = useCallback(() => {
    stopped.current = true;
    clear();
    signals.current.forEach(signal => signal.reveal());
  }, [clear]);
  const register = useCallback((block: number, signal: Signal | null) => {
    if (signal) {
      signals.current.set(block, signal);
      if (stopped.current) signal.reveal();
    } else signals.current.delete(block);
  }, []);
  const check = useCallback(() => {
    if (!active || stopped.current || viewport.current === 0 || geometry.current.size !== elements.length) return;
    const visible = (block: number) => {
      const bounds = geometry.current.get(block);
      return !!bounds && tutorialBlockVisible(bounds, offset.current, viewport.current);
    };
    const start = (block: number, slide: boolean) => {
      const signal = signals.current.get(block);
      if (!signal || revealed.current.has(block) || stopped.current) return;
      revealed.current.add(block);
      signal.start(slide);
    };
    if (!started.current) {
      started.current = true;
      let order = 0;
      elements.forEach((_, block) => {
        if (!visible(block)) return;
        const delay = order++ * tutorialMotion.intervalMs;
        if (!delay) { start(block, false); return; }
        delayed.current.set(block, setTimeout(() => {
          delayed.current.delete(block);
          if (visible(block)) start(block, false);
        }, delay));
      });
      return;
    }
    for (const [block, timer] of delayed.current) {
      if (!visible(block)) { clearTimeout(timer); delayed.current.delete(block); }
    }
    elements.forEach((_, block) => { if (visible(block) && !delayed.current.has(block)) start(block, true); });
  }, [active, elements]);
  useEffect(() => { if (!animate || suspended) reveal(); else check(); }, [animate, check, reveal, suspended]);
  useEffect(() => clear, [clear]);
  const layout = useCallback((block: number, event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    geometry.current.set(block, { y, height });
    check();
  }, [check]);
  return <ScrollView testID="tutorial-body" contentOffset={top ? { x: 0, y: top } : undefined}
    onLayout={event => { viewport.current = event.nativeEvent.layout.height; check(); }}
    onScroll={event => {
      offset.current = event.nativeEvent.contentOffset.y;
      storeScroll(offset.current);
      check();
    }} scrollEventThrottle={32} contentContainerStyle={styles.body}>
    {elements.map((element, block) => <FadeBlock key={block} index={block}
      animated={animationEnabled} register={register} layout={layout}>{element}</FadeBlock>)}
  </ScrollView>;
}

// Preload outside the visible narrative; null/failed checks always render immediately.
export function useTutorialMotionPermission() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let alive = true;
    let revision = 0;
    const read = () => {
      const expected = ++revision;
      Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AccessibilityInfo.isScreenReaderEnabled()])
        .then(([reduce, reader]) => { if (alive && expected === revision) setAllowed(!reduce && !reader); })
        .catch(() => { if (alive && expected === revision) setAllowed(false); });
    };
    const reduce = AccessibilityInfo.addEventListener('reduceMotionChanged', () => { setAllowed(false); read(); });
    const reader = AccessibilityInfo.addEventListener('screenReaderChanged', () => { setAllowed(false); read(); });
    read();
    return () => { alive = false; reduce.remove(); reader.remove(); };
  }, []);
  return allowed;
}

export default function TutorialReader({ topic, replay, motion, onClose, onComplete }: {
  topic: TutorialId; replay: boolean; motion: boolean; onClose(): void; onComplete(): void;
}) {
  const guide = tutorialCatalog[topic];
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const seen = useRef(new Set<number>());
  const scroll = useRef(new Map<number, number>());
  const moving = useRef(false);
  const transitioning = useRef<number | null>(null);
  const finished = useRef(false);
  const last = index === guide.steps.length - 1;
  useEffect(() => {
    const next = getTutorialArtwork(topic, index + 1);
    if (typeof next !== 'number' || next === getTutorialArtwork(topic, index)) return;
    const asset = Image.resolveAssetSource(next);
    if (asset?.uri.startsWith('http')) Image.prefetch(asset.uri).catch(() => {});
  }, [index, topic]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') setSuspended(true); });
    return () => { subscription.remove(); if (transitioning.current !== null) cancelAnimationFrame(transitioning.current); };
  }, []);
  function leave(action: () => void) {
    if (finished.current) return;
    finished.current = true;
    action();
  }
  function move(next: number) {
    if (moving.current || finished.current) return;
    moving.current = true;
    seen.current.add(index);
    setIndex(next);
    transitioning.current = requestAnimationFrame(() => { moving.current = false; transitioning.current = null; });
  }
  const back = () => index > 0 ? move(index - 1) : leave(onClose);
  return <Modal visible animationType="none" onShow={() => setVisible(true)} onRequestClose={back}
    hardwareAccelerated={Platform.OS === 'android'}>
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]} accessibilityViewIsModal>
      <SeasonalFormBackground />
      <View style={styles.header}>
        <AppText preset="unifiedLabel" style={styles.headerTitle}>{guide.title}</AppText>
        <AppText preset="unifiedLabel" accessibilityLabel={`${guide.steps.length}단계 중 ${index + 1}단계`}>{index + 1}/{guide.steps.length}</AppText>
        <Pressable testID="tutorial-close" accessibilityRole="button" accessibilityLabel="안내 닫기" onPress={() => leave(onClose)} style={styles.close}>
          <Feather name="x" size={24} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
      <StepBody key={index} step={guide.steps[index]} topic={topic} index={index} shown={seen.current.has(index)}
        active={visible} animate={motion} suspended={suspended} top={scroll.current.get(index) ?? 0}
        storeScroll={value => { scroll.current.set(index, value); }} />
      <View style={styles.footer}>
        {index > 0 ? <CtaButton role="neutral" onPress={back}><CtaText>이전</CtaText></CtaButton> : null}
        <CtaButton role="primary" testID="tutorial-next" onPress={() => last ? leave(onComplete) : move(index + 1)}>
          <CtaText>{last ? replay ? '목록으로' : '시작하기' : '다음'}</CtaText>
        </CtaButton>
        {!replay ? <Pressable accessibilityRole="button" onPress={() => leave(onClose)} style={styles.later}>
          <AppText preset="unifiedLabel" color={theme.colors.textSecondary}>나중에 보기</AppText>
        </Pressable> : null}
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 20 },
  headerTitle: { flex: 1 }, close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, gap: 22 },
  title: { lineHeight: 38, fontSize: 29 }, copy: { fontSize: 17, lineHeight: 26 }, hint: { lineHeight: 24 },
  footer: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  later: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  example: { padding: 16, minHeight: 118, gap: 14 }, sampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  artwork: { alignSelf: 'center', width: '70%', maxWidth: 144, height: 124 },
  artImage: { width: '100%', height: '100%' }, fontExamples: { gap: 8 },
  grid: { flexWrap: 'nowrap' }, sample: { flexGrow: 1, flexBasis: '19%', minHeight: 42, padding: 5, borderWidth: 1, borderRadius: 6, justifyContent: 'center' },
  sampleLabel: { textAlign: 'center' },
});
