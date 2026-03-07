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
import { useTheme } from 'styled-components/native';

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
  const theme = useTheme();
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
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderLeftColor: TONE_COLORS[tone],
              shadowColor:
                theme.mode === 'dark' ? 'rgba(0,0,0,0.45)' : '#000000',
            },
          ]}
        >
          {title ? (
            <AppText
              preset="body"
              style={[styles.title, { color: theme.colors.textPrimary }]}
            >
              {title}
            </AppText>
          ) : null}
          <AppText
            preset="caption"
            style={[styles.message, { color: theme.colors.textSecondary }]}
          >
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
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 5,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    fontWeight: '900',
    marginBottom: 3,
  },
  message: {
    lineHeight: 18,
  },
});
