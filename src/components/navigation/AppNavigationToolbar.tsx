// 파일: src/components/navigation/AppNavigationToolbar.tsx
// 역할:
// - 더보기와 추억 상세에서 공통으로 쓰는 앱 하단 네비게이션 툴바
// - 홈/타임라인/기록/방명록/전체메뉴 이동을 같은 레이아웃과 테마 규칙으로 제공

import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const bottomInset = useMemo(
    () => Math.max(insets.bottom, Platform.OS === 'android' ? 18 : 12),
    [insets.bottom],
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
        { paddingBottom: bottomInset },
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
    minHeight: 62,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF5',
    backgroundColor: '#FFFFFF',
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
    color: '#7D8696',
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
