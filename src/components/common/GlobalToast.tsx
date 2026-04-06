// 파일: src/components/common/GlobalToast.tsx
// 역할:
// - 앱 최상단에서 전역 toast를 렌더링
// - 현재 선택된 펫 테마를 반영해 더 부드럽고 고급스러운 알림 경험을 제공

import React, { useEffect, useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { hideToast, useUiStore } from '../../store/uiStore';
import { usePetStore } from '../../store/petStore';

type ToneMeta = {
  icon: 'info' | 'check-circle' | 'alert-triangle' | 'x-circle';
  iconColor: string;
  badgeColor: string;
};

const TONE_META: Record<'info' | 'success' | 'warning' | 'error', ToneMeta> = {
  info: {
    icon: 'info',
    iconColor: '#1D4ED8',
    badgeColor: 'rgba(29, 78, 216, 0.12)',
  },
  success: {
    icon: 'check-circle',
    iconColor: '#15803D',
    badgeColor: 'rgba(21, 128, 61, 0.12)',
  },
  warning: {
    icon: 'alert-triangle',
    iconColor: '#B45309',
    badgeColor: 'rgba(180, 83, 9, 0.14)',
  },
  error: {
    icon: 'x-circle',
    iconColor: '#B91C1C',
    badgeColor: 'rgba(185, 28, 28, 0.12)',
  },
};

export default function GlobalToast() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const visible = useUiStore(s => s.visible);
  const title = useUiStore(s => s.title);
  const message = useUiStore(s => s.message);
  const tone = useUiStore(s => s.tone);
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);

  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const toneMeta = TONE_META[tone];
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 360 : 220,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
    });
  }, [progress, visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [-28, 0]) },
        { scale: interpolate(progress.value, [0, 1], [0.98, 1]) },
      ],
    };
  });

  if (!visible && !message) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.wrap,
          {
            paddingTop: insets.top + 8,
          },
          animatedStyle,
        ]}
      >
        <Pressable
          onPress={hideToast}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: petTheme.border,
              shadowColor: petTheme.primary,
            },
          ]}
        >
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: toneMeta.badgeColor,
                borderColor: petTheme.border,
              },
            ]}
          >
            <View
              style={[
                styles.iconCore,
                { backgroundColor: petTheme.tint },
              ]}
            >
              <Feather
                name={toneMeta.icon}
                size={18}
                color={toneMeta.iconColor}
              />
            </View>
          </View>

          <View style={styles.copyBlock}>
            {title ? (
              <AppText
                preset="bodySm"
                style={[styles.title, { color: petTheme.deep }]}
              >
                {title}
              </AppText>
            ) : null}
            <AppText
              preset="helper"
              style={[styles.message, { color: theme.colors.textSecondary }]}
            >
              {message}
            </AppText>
          </View>

          <View
            style={[
              styles.dismissHint,
              { backgroundColor: petTheme.soft },
            ]}
          >
            <Feather name="x" size={12} color={petTheme.primary} />
          </View>
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
    minHeight: 66,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...(Platform.OS === 'ios'
      ? {
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        }
      : {
          elevation: 10,
        }),
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBlock: {
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '900',
    marginBottom: 2,
  },
  message: {
    lineHeight: 18,
  },
  dismissHint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
