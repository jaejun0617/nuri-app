import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '../../components/icons/NuriFeatherIcon';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { spacing } from '../../app/theme/tokens/spacing';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PetDeleteConfirmDialog from '../../components/pets/PetDeleteConfirmDialog';
import PetManagementCard from '../../components/pets/PetManagementCard';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import {
  captureMonitoringException,
  captureMonitoringMessage,
} from '../../services/monitoring/sentry';
import { NEUTRAL_UI_PALETTE } from '../../services/pets/themePalette';
import {
  deletePetSafely,
  fetchMyPets,
  getPetDeleteErrorMessage,
} from '../../services/supabase/pets';
import { usePetStore, type Pet } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { openMoreDrawer, showToast } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetManagement'>;
type Route = RootScreenRoute<'PetManagement'>;

const keyExtractor = (item: Pet) => item.id;

const ItemSeparator = memo(function ItemSeparator() {
  return <View style={styles.itemSeparator} />;
});

const EmptyPetState = memo(function EmptyPetState({
  onPressAdd,
  accentColor,
  accentTextColor: _accentTextColor,
}: {
  onPressAdd: () => void;
  accentColor: string;
  accentTextColor: string;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View
        style={[styles.emptyIconWrap, { backgroundColor: `${accentColor}14` }]}
      >
        <Feather name="heart" size={22} color={accentColor} />
      </View>
      <AppText
        typographyRole="celebration"
        preset="unifiedTitle"
        style={styles.emptyTitle}
      >
        아직 등록된 아이가 없어요
      </AppText>
      <AppText preset="unifiedBody" style={styles.emptyBody}>
        아이를 등록하면 홈과 기록, 일정에서 함께 관리할 수 있어요.
      </AppText>
      <CtaButton
        role="primary"
        activeOpacity={0.92}
        style={[styles.addButton, {}]}
        onPress={onPressAdd}
      >
        <CtaText
          preset="unifiedBody"
          styleOverridesPreset
          style={styles.addButtonText}
        >
          아이 등록하기
        </CtaText>
      </CtaButton>
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
  const setPets = usePetStore(s => s.setPets);
  const [deleteTarget, setDeleteTarget] = useState<Pet | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lastPetGuardVisible, setLastPetGuardVisible] = useState(false);

  const accentPalette = NEUTRAL_UI_PALETTE;

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
        // Editing returns to this list, not the list's original Home/More entry.
        entrySource: 'stack',
      });
    },
    [navigation],
  );

  const handleDelete = useCallback(
    (petId: string) => {
      if (deleting) return;
      if (pets.length <= 1) {
        setLastPetGuardVisible(true);
        return;
      }

      const target = pets.find(pet => pet.id === petId) ?? null;
      if (!target) {
        Alert.alert('삭제할 수 없어요', '아이 프로필을 다시 확인해 주세요.');
        return;
      }

      setDeleteTarget(target);
    },
    [deleting, pets],
  );

  const executeDeletePet = useCallback(async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      const result = await deletePetSafely(deleteTarget.id);
      const localRemainingPets = pets.filter(
        candidate => candidate.id !== deleteTarget.id,
      );

      useRecordStore.getState().clearPet(deleteTarget.id);
      useScheduleStore.getState().clearPet(deleteTarget.id);
      setPets(localRemainingPets, { userId: result.userId });

      try {
        const refreshedPets = await fetchMyPets(result.userId);
        setPets(refreshedPets, { userId: result.userId });
      } catch (refreshError) {
        captureMonitoringException(refreshError);
      }

      setDeleteTarget(null);

      if (result.storageCleanup.failedBuckets.length > 0) {
        captureMonitoringMessage('pet_delete_storage_cleanup_pending', {
          level: 'warning',
          tags: { petId: deleteTarget.id },
          extras: { failedBuckets: result.storageCleanup.failedBuckets },
        });
        showToast({
          tone: 'warning',
          title: '프로필은 삭제됐어요',
          message: '일부 사진 파일 정리를 완료하지 못했어요.',
          durationMs: 3200,
        });
      } else {
        showToast({
          tone: 'success',
          title: '프로필을 삭제했어요',
          message: `${deleteTarget.name} 프로필이 목록에서 정리됐어요.`,
        });
      }
    } catch (error) {
      captureMonitoringException(error);
      Alert.alert(
        '아이 프로필을 삭제하지 못했어요',
        getPetDeleteErrorMessage(error),
      );
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, pets, setPets]);

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
        onPressDelete={handleDelete}
      />
    ),
    [handleDelete, handleEdit, handleSelect, selectedPetId],
  );

  const footer = useMemo(
    () =>
      pets.length > 0 ? (
        <CtaButton
          role="primary"
          activeOpacity={0.92}
          style={[styles.addButton, styles.footerAddButton, {}]}
          onPress={handleAddPet}
        >
          <CtaText
            preset="unifiedBody"
            styleOverridesPreset
            style={styles.addButtonText}
          >
            + 아이 등록하기
          </CtaText>
        </CtaButton>
      ) : null,
    [handleAddPet, pets.length],
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

  const subtitle =
    pets.length > 0
      ? `우리 아이 ${pets.length}마리`
      : '등록한 아이들을 한곳에서 관리할 수 있어요.';

  return (
    <View
      testID="pet-management-screen"
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: insets.bottom,
        },
      ]}
    >
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
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={onPressBack}
        >
          <Feather
            name="arrow-left"
            size={20}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <AppText
            typographyRole="screenTitle"
            preset="unifiedTitle"
            styleOverridesPreset
            style={[styles.title, { color: theme.colors.textPrimary }]}
          >
            아이들 프로필 관리
          </AppText>
          <AppText
            preset="unifiedMeta"
            styleOverridesPreset
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
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
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={emptyComponent}
        ListFooterComponent={footer ?? undefined}
        showsVerticalScrollIndicator={false}
      />

      {deleteTarget ? (
        <PetDeleteConfirmDialog
          visible
          pet={deleteTarget}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            executeDeletePet().catch(() => {});
          }}
        />
      ) : null}
      <ConfirmDialog
        confirmRole="primary"
        cancelRole="neutral"
        visible={lastPetGuardVisible}
        typographyMode="unified"
        title="아이 프로필을 삭제하지 못했어요"
        message="최소 1개의 아이 프로필은 필요해요."
        cancelLabel="돌아가기"
        confirmLabel="확인"
        tone="warning"
        onCancel={() => setLastPetGuardVisible(false)}
        onConfirm={() => setLastPetGuardVisible(false)}
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
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 6,
    paddingTop: 3,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
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
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  footerAddButton: {
    marginTop: 18,
  },
  addButtonText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
});
