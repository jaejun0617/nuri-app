// 파일: src/components/MoreDrawer/MoreDrawer.tsx
// 목적:
// - "더보기"를 탭 이동이 아니라 오버레이(drawer)로 표시
// - ✅ 오른쪽에서 슬라이드 + 배경 페이드
// - 닫힘·unmount 후 이동하며 메뉴의 고정 표면만 움직이는 동안 임시 캐시한다.

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  BackHandler,
  Easing,
} from 'react-native';

import MoreDrawerContent from '../../screens/More/MoreDrawerContent';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MoreDrawer({ open, onClose }: Props) {
  const { width: drawerWidth } = useWindowDimensions();
  // ---------------------------------------------------------
  // 0) mount control (닫힐 때 애니메이션 끝나고 unmount)
  // ---------------------------------------------------------
  const [mounted, setMounted] = useState(open);
  const [moving, setMoving] = useState(open);
  const openRef = useRef(open);
  openRef.current = open;
  const pendingNavigation = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (open) {
      pendingNavigation.current = null;
      if (!mounted) {
        setMoving(true);
        setMounted(true);
      }
    }
  }, [mounted, open]);

  // ---------------------------------------------------------
  // 1) animation values
  // ---------------------------------------------------------
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  const overlayOpacity = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.42],
      }),
    [progress],
  );

  const translateX = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [drawerWidth, 0], // ✅ 현재 창의 오른쪽에서 들어옴
      }),
    [drawerWidth, progress],
  );

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    setMoving(true);
    const animation = open
      ? Animated.spring(progress, {
          toValue: 1, useNativeDriver: true, speed: 18, bounciness: 0, isInteraction: false,
        })
      : Animated.timing(progress, {
          toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false,
        });
    animation.start(({ finished }) => {
      if (!finished || cancelled) return;
      setMoving(false);
      if (!openRef.current) setMounted(false);
    });
    return () => {
      cancelled = true;
      animation.stop();
    };
  }, [mounted, open, progress]);

  // Let content cleanup commit before starting the destination transition.
  useEffect(() => {
    if (mounted || open) return;
    const navigate = pendingNavigation.current;
    pendingNavigation.current = null;
    navigate?.();
  }, [mounted, open]);

  useEffect(() => () => { pendingNavigation.current = null; }, []);

  const requestClose = useCallback(() => {
    pendingNavigation.current = null;
    onClose();
  }, [onClose]);
  const requestNavigation = useCallback((navigate: () => void) => {
    if (!openRef.current || pendingNavigation.current) return;
    pendingNavigation.current = navigate;
    onClose();
  }, [onClose]);

  // ---------------------------------------------------------
  // 3) Android back handler
  // ---------------------------------------------------------
  useEffect(() => {
    if (!mounted) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });

    return () => sub.remove();
  }, [mounted, requestClose]);

  // ---------------------------------------------------------
  // 4) render
  // ---------------------------------------------------------
  if (!mounted) return null;

  return (
    <View
      testID="more-drawer-overlay"
      pointerEvents={open ? 'auto' : 'none'}
      style={StyleSheet.absoluteFill}
    >
      {/* overlay */}
      <Pressable onPress={requestClose} style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#000', opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      {/* drawer */}
      <Animated.View
        testID="more-drawer-motion"
        renderToHardwareTextureAndroid={moving}
        style={[
          styles.drawer,
          {
            width: drawerWidth,
            transform: [{ translateX }],
          },
        ]}
      >
        <MoreDrawerContent onRequestClose={requestClose} onRequestNavigate={requestNavigation} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});
