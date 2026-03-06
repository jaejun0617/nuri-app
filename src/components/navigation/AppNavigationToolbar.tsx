// 파일: src/components/navigation/AppNavigationToolbar.tsx
// 역할:
// - 더보기와 추억 상세에서 공통으로 쓰는 앱 하단 네비게이션 툴바
// - 홈/타임라인/기록/방명록/전체메뉴 이동을 같은 레이아웃과 테마 규칙으로 제공

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../navigation/RootNavigator';
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

  const navigateTo = useCallback(
    (target: ActiveTabKey) => {
      onBeforeNavigate?.();

      if (target === 'more') {
        openMoreDrawer();
        return;
      }

      if (target === 'timeline') {
        navigation.navigate('AppTabs', {
          screen: 'TimelineTab',
          params: {
            screen: 'TimelineMain',
            params: { mainCategory: 'all' },
          },
        });
        return;
      }

      if (target === 'record') {
        navigation.navigate('AppTabs', {
          screen: 'RecordCreateTab',
          params: selectedPet?.id ? { petId: selectedPet.id } : undefined,
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
    [navigation, onBeforeNavigate, selectedPet?.id],
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
        { paddingBottom: Math.max(12, insets.bottom || 12) },
      ]}
    >
      <View style={styles.bar}>
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
                color={active ? petTheme.primary : '#7D8696'}
              />
              <Text
                style={[
                  styles.label,
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
          style={[styles.recordButton, { backgroundColor: petTheme.primary }]}
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
                color={active ? petTheme.primary : '#7D8696'}
              />
              <Text
                style={[
                  styles.label,
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
    backgroundColor: '#FFFFFF',
  },
  bar: {
    minHeight: 72,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF5',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  item: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    color: '#7D8696',
    fontWeight: '600',
  },
  recordButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D6AF8',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,

    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.96)',
  },
});
