import React, { memo, useCallback, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import PetManagementCard from '../../components/pets/PetManagementCard';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { openMoreDrawer } from '../../store/uiStore';
import { usePetStore, type Pet } from '../../store/petStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetManagement'>;
type Route = RootScreenRoute<'PetManagement'>;

const keyExtractor = (item: Pet) => item.id;

const ItemSeparator = memo(function ItemSeparator() {
  return <View style={styles.itemSeparator} />;
});

const EmptyPetState = memo(function EmptyPetState({
  onPressAdd,
  accentColor,
  accentTextColor,
}: {
  onPressAdd: () => void;
  accentColor: string;
  accentTextColor: string;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIconWrap, { backgroundColor: `${accentColor}14` }]}>
        <Feather name="heart" size={22} color={accentColor} />
      </View>
      <AppText preset="headline" style={styles.emptyTitle}>
        아직 등록된 아이가 없어요
      </AppText>
      <AppText preset="body" style={styles.emptyBody}>
        아이를 등록하면 홈과 기록, 일정에서 함께 관리할 수 있어요.
      </AppText>
      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.addButton, { backgroundColor: accentColor }]}
        onPress={onPressAdd}
      >
        <AppText
          preset="body"
          style={[styles.addButtonText, { color: accentTextColor }]}
        >
          아이 등록하기
        </AppText>
      </TouchableOpacity>
    </View>
  );
});

export default function PetManagementScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectPet = usePetStore(s => s.selectPet);

  const selectedPet = useMemo(
    () => pets.find(pet => pet.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const accentPalette = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  const onPressBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    },
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => {
        openMoreDrawer();
      });
    },
    onFallback: () => {
      navigation.goBack();
    },
  });

  const handleSelect = useCallback(
    (petId: string) => {
      selectPet(petId);
    },
    [selectPet],
  );

  const handleEdit = useCallback(
    (petId: string) => {
      navigation.navigate('PetProfileEdit', {
        petId,
        entrySource: route.params?.entrySource,
      });
    },
    [navigation, route.params?.entrySource],
  );

  const handleAddPet = useCallback(() => {
    navigation.navigate('PetCreate', { from: 'header_plus' });
  }, [navigation]);

  const renderItem = useCallback<ListRenderItem<Pet>>(
    ({ item }) => (
      <PetManagementCard
        pet={item}
        isSelected={item.id === selectedPetId}
        onPressSelect={handleSelect}
        onPressEdit={handleEdit}
      />
    ),
    [handleEdit, handleSelect, selectedPetId],
  );

  const footer = useMemo(
    () =>
      pets.length > 0 ? (
        <TouchableOpacity
          activeOpacity={0.92}
          style={[
            styles.addButton,
            styles.footerAddButton,
            { backgroundColor: accentPalette.primary },
          ]}
          onPress={handleAddPet}
        >
          <AppText
            preset="body"
            style={[styles.addButtonText, { color: accentPalette.onPrimary }]}
          >
            + 아이 등록하기
          </AppText>
        </TouchableOpacity>
      ) : null,
    [accentPalette.onPrimary, accentPalette.primary, handleAddPet, pets.length],
  );

  const emptyComponent = useMemo(
    () => (
      <EmptyPetState
        onPressAdd={handleAddPet}
        accentColor={accentPalette.primary}
        accentTextColor={accentPalette.onPrimary}
      />
    ),
    [accentPalette.onPrimary, accentPalette.primary, handleAddPet],
  );

  const subtitle = useMemo(() => {
    if (pets.length === 0) return '등록한 아이들을 한곳에서 관리할 수 있어요.';
    if (selectedPet) {
      return `현재 ${selectedPet.name} 기준으로 홈과 기록, 일정이 연결돼 있어요.`;
    }
    return '아이들을 한곳에서 관리할 수 있어요.';
  }, [pets.length, selectedPet]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top + 8, 18),
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.backButton}
          onPress={onPressBack}
        >
          <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <AppText preset="headline" style={[styles.title, { color: theme.colors.textPrimary }]}>
            아이들 프로필 관리
          </AppText>
          <AppText preset="caption" style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {subtitle}
          </AppText>
        </View>
      </View>

      <FlatList
        data={pets}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 104, 132) },
        ]}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={emptyComponent}
        ListFooterComponent={footer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 6,
    paddingTop: 3,
  },
  title: {
    fontWeight: '900',
  },
  subtitle: {
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    flexGrow: 1,
  },
  itemSeparator: {
    height: 12,
  },
  emptyWrap: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    textAlign: 'center',
    fontWeight: '900',
    color: '#182133',
  },
  emptyBody: {
    marginTop: 10,
    textAlign: 'center',
    color: '#7C889A',
    lineHeight: 22,
  },
  addButton: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  footerAddButton: {
    marginTop: 18,
  },
  addButtonText: {
    fontWeight: '900',
  },
});
