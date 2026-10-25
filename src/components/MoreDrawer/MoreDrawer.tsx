// 파일: src/components/MoreDrawer/MoreDrawer.tsx
// 목적:
// - "더보기"를 탭 이동이 아니라 오버레이(drawer)로 표시
// - 하단 탭과 같은 곡선의 400ms 페이드만 사용하며 가로 슬라이드는 사용하지 않는다.
// - 메뉴에서 연 상세 화면은 native stack이 덮는다. 먼저 메뉴를 지워 홈을 노출하지 않는다.

import React, {
  memo,
  useEffect,
  useLayoutEffect,
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
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import MoreDrawerContent from '../../screens/More/MoreDrawerContent';
import { TAB_FADE_TIMING } from '../../navigation/navigationTransitionPolicy';
import { useNavigationMotion } from '../../navigation/useNavigationMotion';

type Props = {
  open: boolean;
  onClose: () => void;
  onVisibilityChange?: (visible: boolean) => void;
};

function MoreDrawer({ open, onClose, onVisibilityChange }: Props) {
  const { width: drawerWidth } = useWindowDimensions();
  const reduceMotion = useNavigationMotion();
  const focused = useIsFocused();
  const [mounted, setMounted] = useState(open);
  const opacity = useRef(new Animated.Value(open ? 1 : 0)).current;
  const openRef = useRef(open);
  openRef.current = open;
  const navigationRequested = useRef(false);

  useLayoutEffect(() => {
    onVisibilityChange?.(mounted);
  }, [mounted, onVisibilityChange]);

  useEffect(() => {
    if (open) {
      navigationRequested.current = false;
      setMounted(true);
    }
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    if (reduceMotion) {
      opacity.setValue(open ? 1 : 0);
      if (!open) setMounted(false);
      return;
    }

    let cancelled = false;
    const animation = Animated.timing(opacity, {
      ...TAB_FADE_TIMING,
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished && !cancelled && !openRef.current) setMounted(false);
    });
    return () => {
      cancelled = true;
      animation.stop();
    };
  }, [mounted, open, reduceMotion, opacity]);

  // The menu is the native destination's return surface, not a closing overlay.
  // Release only the per-gesture latch on focus loss; the stack owns visibility.
  useEffect(() => {
    if (!focused) navigationRequested.current = false;
  }, [focused]);

  const requestClose = useCallback(() => {
    navigationRequested.current = false;
    onClose();
  }, [onClose]);
  const requestNavigation = useCallback((navigate: () => boolean) => {
    if (!focused || !openRef.current || navigationRequested.current) return;
    navigationRequested.current = true;
    try {
      if (!navigate()) navigationRequested.current = false;
    } catch (error) {
      navigationRequested.current = false;
      throw error;
    }
  }, [focused]);
  const requestTabNavigation = useCallback((navigate: () => boolean) => {
    if (!focused || !openRef.current || navigationRequested.current) return;
    // Replace the underlay while More is still opaque; only the drawer fades.
    navigationRequested.current = true;
    try {
      if (navigate()) onClose();
      else navigationRequested.current = false;
    } catch (error) {
      navigationRequested.current = false;
      throw error;
    }
  }, [focused, onClose]);

  // ---------------------------------------------------------
  // 3) Android back handler
  // ---------------------------------------------------------
  useEffect(() => {
    if (!mounted || !focused) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationRequested.current) return false;
      requestClose();
      return true;
    });

    return () => sub.remove();
  }, [mounted, focused, requestClose]);

  // ---------------------------------------------------------
  // 4) render
  // ---------------------------------------------------------
  if (!mounted) return null;

  return (
    <Animated.View
      testID="more-drawer-overlay"
      pointerEvents={open && focused ? 'auto' : 'none'}
      accessibilityElementsHidden={!focused}
      importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'}
      style={[StyleSheet.absoluteFill, { opacity }]}
    >
      {/* overlay */}
      <Pressable testID="more-drawer-backdrop" onPress={requestClose} style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, styles.backdrop]} />
      </Pressable>

      {/* drawer */}
      <View
        testID="more-drawer-panel"
        style={[styles.drawer, { width: drawerWidth }]}
      >
        <MoreDrawerContent
          onRequestClose={requestClose}
          onRequestNavigate={requestNavigation}
          onRequestTabNavigate={requestTabNavigation}
        />
      </View>
    </Animated.View>
  );
}

export default memo(MoreDrawer);

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000', opacity: 0.42 },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});
