// 파일: src/components/MoreDrawer/MoreDrawer.tsx
// 목적:
// - "더보기"를 탭 이동이 아니라 오버레이(drawer)로 표시
// - ✅ 오른쪽에서 슬라이드 + 배경 페이드
// - ✅ 버벅임 개선: 컨텐츠 지연 마운트 + spring + HW 텍스처 힌트

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
  View,
  Dimensions,
  BackHandler,
  Easing,
} from 'react-native';

import MoreDrawerContent from '../../screens/More/MoreDrawerContent';

type Props = {
  open: boolean;
  onClose: () => void;
};

const { width: W } = Dimensions.get('window');
const DRAWER_W = Math.min(320, Math.floor(W * 0.82));

export default function MoreDrawer({ open, onClose }: Props) {
  // ---------------------------------------------------------
  // 0) mount control (닫힐 때 애니메이션 끝나고 unmount)
  // ---------------------------------------------------------
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

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
        outputRange: [DRAWER_W, 0], // ✅ 오른쪽에서 들어옴
      }),
    [progress],
  );

  const runOpen = useCallback(() => {
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      // ✅ 부드러운 감속(튕김 최소)
      speed: 18,
      bounciness: 0,
      // Android에서 UI 인터랙션과 충돌 줄이기
      isInteraction: false,
    }).start();
  }, [progress]);

  const runClose = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    }).start(({ finished }) => {
      if (finished) setMounted(false); // ✅ 애니메이션 끝나고 unmount
    });
  }, [progress]);

  // ---------------------------------------------------------
  // 2) open/close effect
  // ---------------------------------------------------------
  useEffect(() => {
    if (open) runOpen();
    else runClose();
  }, [open, runOpen, runClose]);

  // ---------------------------------------------------------
  // 3) Android back handler
  // ---------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => sub.remove();
  }, [open, onClose]);

  // ---------------------------------------------------------
  // 4) render
  // ---------------------------------------------------------
  if (!mounted) return null;

  return (
    <View
      pointerEvents={open ? 'auto' : 'none'}
      style={StyleSheet.absoluteFill}
    >
      {/* overlay */}
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#000', opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      {/* drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_W,
            transform: [{ translateX }],
          },
        ]}
        // ✅ GPU 합성 힌트(특히 Android에서 체감)
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
      >
        <MoreDrawerContent onRequestClose={onClose} />
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
    elevation: 12,

    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: -6, height: 0 },
  },
});
