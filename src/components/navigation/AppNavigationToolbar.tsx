// 파일: src/components/navigation/AppNavigationToolbar.tsx
// 파일 목적:
// - 앱 하단 공통 이동 UI를 한 컴포넌트로 유지해 홈/상세/드로어에서 같은 동작을 재사용한다.
// 어디서 쓰이는지:
// - AppTabsNavigator의 커스텀 탭바와 More 드로어/일부 상세 화면 하단 툴바에서 사용된다.
// 핵심 역할:
// - 홈, 타임라인, 커뮤니티, 방명록, 전체메뉴 이동을 제공한다.
// - 현재 선택 펫 테마를 읽어 아이콘과 강조색을 맞춘다.
// 데이터·상태 흐름:
// - selectedPetId와 pets는 petStore에서 읽고, More 오픈 상태는 uiStore를 사용한다.
// 수정 시 주의:
// - 탭 라벨이나 target route를 바꿀 때는 AppTabsNavigator와 RootNavigator 타입까지 같이 확인해야 한다.

import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'styled-components/native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { ScreenEntrySource } from '../../navigation/entry';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';

type ActiveTabKey = 'home' | 'timeline' | 'community' | 'guestbook' | 'more';

type Props = {
  activeKey: ActiveTabKey;
  onBeforeNavigate?: () => void;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AppNavigationToolbar({
  activeKey,
  onBeforeNavigate,
}: Props) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);

  const selectedPet = useMemo(
    () => pets.find(pet => pet.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const bottomInset = useMemo(
    () => Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10),
    [insets.bottom],
  );

  const navigateTo = useCallback(
    (target: ActiveTabKey) => {
      onBeforeNavigate?.();
      const entrySource: ScreenEntrySource =
        activeKey === 'more' ? 'more' : 'home';

      if (target === 'more') {
        openMoreDrawer();
        return;
      }

      if (target === 'timeline') {
        navigation.navigate('AppTabs', {
          screen: 'TimelineTab',
          params: {
            screen: 'TimelineMain',
            params: { mainCategory: 'all', entrySource },
          },
        });
        return;
      }

      if (target === 'community') {
        navigation.navigate('AppTabs', {
          screen: 'CommunityTab',
        });
        return;
      }

      if (target === 'guestbook') {
        navigation.navigate('AppTabs', {
          screen: 'GuestbookTab',
        });
        return;
      }

      navigation.navigate('AppTabs', {
        screen: 'HomeTab',
      });
    },
    [activeKey, navigation, onBeforeNavigate],
  );

  const tabs = useMemo(
    () => [
      { key: 'home' as const, label: '홈', icon: 'home' },
      { key: 'timeline' as const, label: '타임라인', icon: 'activity' },
      { key: 'community' as const, label: '커뮤니티', icon: 'message-circle' },
      { key: 'guestbook' as const, label: '방명록', icon: 'book-open' },
      { key: 'more' as const, label: '전체메뉴', icon: 'menu' },
    ],
    [],
  );

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.colors.background },
        { paddingBottom: bottomInset },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        {tabs.map(tab => {
          const active = activeKey === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.9}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={styles.item}
              onPress={() => navigateTo(tab.key)}
            >
              <Feather
                name={tab.icon as never}
                size={18}
                color={active ? petTheme.primary : theme.colors.textMuted}
              />
              <AppText
                preset="tab"
                maxFontSizeMultiplier={1.6}
                style={[
                  styles.label,
                  { color: theme.colors.textMuted },
                  active ? { color: petTheme.primary } : null,
                ]}
              >
                {tab.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 0,
  },
  bar: {
    minHeight: 48,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 0,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
    paddingVertical: 6,
  },
  label: {
    textAlign: 'center',
  },
});
