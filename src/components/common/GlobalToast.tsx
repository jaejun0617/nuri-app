// 파일: src/components/common/GlobalToast.tsx
// 역할:
// - 앱 최상단에서 전역 toast를 렌더링
// - 에러/성공/경고 상태를 공용 톤으로 표시

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '../../app/ui/AppText';
import { hideToast, useUiStore } from '../../store/uiStore';

const TONE_COLORS = {
  info: '#1D4ED8',
  success: '#15803D',
  warning: '#B45309',
  error: '#B91C1C',
} as const;

export default function GlobalToast() {
  const insets = useSafeAreaInsets();
  const visible = useUiStore(s => s.visible);
  const title = useUiStore(s => s.title);
  const message = useUiStore(s => s.message);
  const tone = useUiStore(s => s.tone);

  const translateY = useRef(new Animated.Value(-32)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : -32,
        duration: visible ? 180 : 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 180 : 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible]);

  if (!visible && !message) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.wrap,
          {
            paddingTop: insets.top + 8,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Pressable
          onPress={hideToast}
          style={[
            styles.card,
            { borderLeftColor: TONE_COLORS[tone] },
          ]}
        >
          {title ? (
            <AppText preset="body" style={styles.title}>
              {title}
            </AppText>
          ) : null}
          <AppText preset="caption" style={styles.message}>
            {message}
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999,
  },
  wrap: {
    paddingHorizontal: 14,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    color: '#111827',
    fontWeight: '900',
    marginBottom: 3,
  },
  message: {
    color: '#374151',
    lineHeight: 18,
  },
});
