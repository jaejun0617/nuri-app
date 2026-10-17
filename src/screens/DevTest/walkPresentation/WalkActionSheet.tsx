import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../../app/ui/AppText';
import { resolveCtaPalette, type CtaRole } from '../../../app/theme/ctaPalette';
import { lightColors } from '../../../app/theme/tokens/colors';
import { HomeFloatingWidgetSurface } from '../../../components/home/HomeWidgetMaterial';
import type { SeasonKey } from '../../../theme/seasonal/season';

type Props = {
  visible: boolean;
  season: SeasonKey;
  insetTop: number;
  insetBottom: number;
  busy: boolean;
  error: boolean;
  errorMessage: string;
  testIDPrefix: string;
  announcement: string;
  dismissLabel: string;
  dismissHint: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryTestID: string;
  secondaryTestID: string;
  primaryRole?: CtaRole;
  paper?: boolean;
  children: React.ReactNode;
  onDismiss: () => void;
  onPrimary: () => void;
};

export default function WalkActionSheet(props: Props) {
  const theme = useTheme();
  const colors = props.paper ? lightColors : theme.colors;
  const { height } = useWindowDimensions();
  const [present, setPresent] = useState(props.visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const transition = useRef(0);
  const closing = useRef(false);
  const announced = useRef(false);
  const current = useRef(props);
  current.current = props;

  const move = useCallback(
    (toValue: number, immediate: boolean, done?: () => void) => {
      const token = ++transition.current;
      animation.current?.stop();
      if (immediate) {
        progress.setValue(toValue);
        drag.setValue(0);
        done?.();
        return;
      }
      animation.current = Animated.timing(progress, {
        toValue,
        duration: toValue === 1 ? 380 : 260,
        easing:
          toValue === 1
            ? Easing.bezier(0.22, 1, 0.36, 1)
            : Easing.inOut(Easing.cubic),
        useNativeDriver: true,
        isInteraction: false,
      });
      animation.current.start(({ finished }) => {
        if (finished && transition.current === token) {
          drag.setValue(0);
          done?.();
        }
      });
    },
    [progress, drag],
  );

  useEffect(() => {
    let alive = true;
    const lifetime = transition;
    const policy = (enabled: boolean) => {
      if (alive) setReduceMotion(enabled);
    };
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      policy,
    );
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then(enabled => policy(enabled !== false))
      .catch(() => policy(true));
    const foreground = AppState.addEventListener('change', state => {
      // Backgrounding settles presentation only. It never resumes the native walk.
      if (state !== 'active') {
        if (closing.current || !current.current.visible) {
          const dismissPending = closing.current;
          move(0, true, () => {
            setPresent(false);
            if (dismissPending) current.current.onDismiss();
          });
        } else move(1, true);
      }
    });
    return () => {
      alive = false;
      lifetime.current++;
      animation.current?.stop();
      subscription.remove();
      foreground.remove();
    };
  }, [move]);

  useEffect(() => {
    if (!props.visible) announced.current = false;
    if (props.visible && !present) {
      closing.current = false;
      progress.setValue(0);
      drag.setValue(0);
      setPresent(true);
      return;
    }
    if (!present || reduceMotion === null || (props.visible && !sheetHeight))
      return;
    move(
      props.visible ? 1 : 0,
      reduceMotion || AppState.currentState !== 'active',
      () => {
        if (!current.current.visible) {
          closing.current = false;
          setPresent(false);
        } else if (!announced.current) {
          announced.current = true;
          AccessibilityInfo.announceForAccessibility(
            current.current.announcement,
          );
        }
      },
    );
  }, [props.visible, present, reduceMotion, sheetHeight, move, progress, drag]);

  const dismiss = useCallback(() => {
    if (current.current.busy || closing.current) return;
    closing.current = true;
    move(0, reduceMotion !== false, () => current.current.onDismiss());
  }, [move, reduceMotion]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !current.current.busy &&
          gesture.dy > 6 &&
          gesture.dy > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) =>
          drag.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 64 || gesture.vy > 0.8) dismiss();
          else
            Animated.spring(drag, {
              toValue: 0,
              damping: 26,
              stiffness: 250,
              mass: 1,
              useNativeDriver: true,
              isInteraction: false,
            }).start();
        },
        onPanResponderTerminate: () => drag.setValue(0),
      }),
    [dismiss, drag],
  );

  if (!present) return null;
  const palette = resolveCtaPalette({
    role: props.primaryRole ?? 'primary',
    season: props.season,
    colorScheme: props.paper ? 'light' : theme.mode,
    colors,
    state: props.busy ? 'disabled' : 'default',
  });
  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismiss}
      testID={`${props.testIDPrefix}-modal`}
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.overlay, opacity: progress },
          ]}
        />
        <Pressable
          testID={`${props.testIDPrefix}-backdrop`}
          accessible={false}
          disabled={props.busy}
          onPress={dismiss}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          testID={`${props.testIDPrefix}-sheet`}
          accessibilityViewIsModal
          onAccessibilityEscape={dismiss}
          onLayout={event => setSheetHeight(event.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            {
              maxHeight: Math.max(1, height - props.insetTop - 24),
              backgroundColor: colors.surfaceElevated,
              transform: [
                {
                  translateY: Animated.add(
                    drag,
                    progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [sheetHeight || height, 0],
                    }),
                  ),
                },
              ],
            },
          ]}
        >
          <HomeFloatingWidgetSurface
            radius={28}
            testIDPrefix={`${props.testIDPrefix}-glass`}
          />
          <View {...pan.panHandlers} testID={`${props.testIDPrefix}-drag-area`}>
            <Pressable
              testID={`${props.testIDPrefix}-handle`}
              accessibilityRole="button"
              accessibilityLabel={props.dismissLabel}
              accessibilityHint={props.dismissHint}
              disabled={props.busy}
              onPress={dismiss}
              style={styles.handleTarget}
            >
              <View
                style={[styles.handle, { backgroundColor: colors.border }]}
              />
            </Pressable>
            <View style={styles.copy}>{props.children}</View>
          </View>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.actions,
              { paddingBottom: props.insetBottom + 16 },
            ]}
          >
            {props.error && (
              <AppText
                testID={`${props.testIDPrefix}-error`}
                preset="caption"
                accessibilityLiveRegion="polite"
                style={[styles.note, { color: colors.textSecondary }]}
              >
                {props.errorMessage}
              </AppText>
            )}
            <Pressable
              testID={props.primaryTestID}
              accessibilityRole="button"
              accessibilityLabel={props.primaryLabel}
              accessibilityState={{ disabled: props.busy, busy: props.busy }}
              disabled={props.busy}
              onPress={() => {
                if (!current.current.busy && !closing.current)
                  current.current.onPrimary();
              }}
              style={({ pressed }) => [
                styles.primary,
                {
                  backgroundColor: palette.background,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                preset="button"
                style={[styles.buttonText, { color: palette.text }]}
              >
                {props.primaryLabel}
              </AppText>
            </Pressable>
            <Pressable
              testID={props.secondaryTestID}
              accessibilityRole="button"
              accessibilityLabel={props.secondaryLabel}
              accessibilityHint={props.dismissHint}
              accessibilityState={{ disabled: props.busy }}
              disabled={props.busy}
              onPress={dismiss}
              style={styles.secondary}
            >
              <AppText
                preset="button"
                style={[styles.buttonText, { color: colors.textSecondary }]}
              >
                {props.secondaryLabel}
              </AppText>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handleTarget: { height: 48, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 32, height: 4, borderRadius: 2 },
  copy: { paddingHorizontal: 24, paddingBottom: 24, gap: 6 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  actions: { paddingHorizontal: 24, gap: 6 },
  primary: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
