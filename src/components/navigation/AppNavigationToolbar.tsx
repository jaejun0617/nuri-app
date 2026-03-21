// 파일: src/components/navigation/AppNavigationToolbar.tsx
// 파일 목적:
// - 앱 하단 공통 이동 UI를 한 컴포넌트로 유지해 홈/상세/드로어에서 같은 동작을 재사용한다.
// 어디서 쓰이는지:
// - AppTabsNavigator의 커스텀 탭바와 More 드로어/일부 상세 화면 하단 툴바에서 사용된다.
// 핵심 역할:
// - 홈, 타임라인, 기록 작성, 전체메뉴 이동을 제공한다.
// - 현재 선택 펫 테마를 읽어 아이콘과 FAB 강조색을 맞춘다.
// 데이터·상태 흐름:
// - selectedPetId와 pets는 petStore에서 읽고, More 오픈 상태는 uiStore를 사용한다.
// - 기록 작성으로 이동할 때는 현재 activeKey를 기반으로 복귀용 returnTo 파라미터를 만든다.
// 수정 시 주의:
// - activeKey와 returnTo 규칙은 RecordCreateScreen 복귀 흐름과 맞물려 있으므로 함께 봐야 한다.
// - 탭 라벨이나 target route를 바꿀 때는 AppTabsNavigator와 RootNavigator 타입까지 같이 확인해야 한다.

import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'styled-components/native';
import Feather from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { ScreenEntrySource } from '../../navigation/entry';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';

type ActiveTabKey = 'home' | 'timeline' | 'record' | 'guestbook' | 'more';

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
  const recordReturnTo = useMemo(() => {
    switch (activeKey) {
      case 'home':
        return { tab: 'HomeTab' } as const;
      case 'timeline':
        return {
          tab: 'TimelineTab',
          params: {
            screen: 'TimelineMain',
            params: { mainCategory: 'all' },
          },
        } as const;
      case 'guestbook':
        return { tab: 'GuestbookTab' } as const;
      default:
        return undefined;
    }
  }, [activeKey]);

  const navigateTo = useCallback(
    (target: ActiveTabKey) => {
      onBeforeNavigate?.();
      const entrySource: ScreenEntrySource = activeKey === 'more' ? 'more' : 'home';

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

      if (target === 'record') {
        navigation.navigate('AppTabs', {
          screen: 'RecordCreateTab',
          params:
            selectedPet?.id || recordReturnTo
              ? {
                  petId: selectedPet?.id,
                  returnTo: recordReturnTo,
                }
              : undefined,
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
    [activeKey, navigation, onBeforeNavigate, recordReturnTo, selectedPet?.id],
  );

  const tabs = useMemo(
    () => [
      { key: 'home' as const, label: '홈', icon: 'home' },
      { key: 'timeline' as const, label: '타임라인', icon: 'activity' },
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
        {tabs.slice(0, 2).map(tab => {
          const active = activeKey === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.9}
              style={styles.item}
              onPress={() => navigateTo(tab.key)}
            >
              <Feather
                name={tab.icon as never}
                size={18}
                color={active ? petTheme.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.textMuted },
                  active ? { color: petTheme.primary } : null,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          activeOpacity={0.92}
          style={[
            styles.recordButton,
            {
              backgroundColor: petTheme.primary,
              borderColor: theme.colors.background,
            },
          ]}
          onPress={() => navigateTo('record')}
        >
          <Feather name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {tabs.slice(2).map(tab => {
          const active = activeKey === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.9}
              style={styles.item}
              onPress={() => navigateTo(tab.key)}
            >
              <Feather
                name={tab.icon as never}
                size={18}
                color={active ? petTheme.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.textMuted },
                  active ? { color: petTheme.primary } : null,
                ]}
              >
                {tab.label}
              </Text>
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
    minHeight: 62,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  item: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  label: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '500',
  },
  recordButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D6AF8',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginTop: -8,

    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
});
