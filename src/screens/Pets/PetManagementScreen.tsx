import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Alert,
  findNodeHandle,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ListRenderItem,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LavenderScreenBackground } from '../../components/common/LavenderScreenBackground';
import AppText from '../../app/ui/AppText';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import PetDeleteConfirmDialog, {
  isPetDeleteConfirmationReady,
  type PetDeleteConfirmation,
} from '../../components/pets/PetDeleteConfirmDialog';
import PetManagementCard from '../../components/pets/PetManagementCard';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import {
  captureMonitoringException,
  captureMonitoringMessage,
} from '../../services/monitoring/sentry';
import {
  deletePetSafely,
  fetchMyPets,
  getPetDeleteErrorMessage,
} from '../../services/supabase/pets';
import { usePetStore, type Pet } from '../../store/petStore';
import { useAuthStore } from '../../store/authStore';
import { useRecordStore } from '../../store/recordStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { openMoreDrawer, showToast } from '../../store/uiStore';
import {
  PET_MANAGEMENT_COLORS as colors,
  PET_MANAGEMENT_TYPE as type,
  getPetManagementLayout,
} from '../../theme/pets/management';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetManagement'>;
type Route = RootScreenRoute<'PetManagement'>;
const keyExtractor = (pet: Pet) => pet.id;
const Separator = memo(function PetManagementSeparator() {
  return <View style={styles.separator} />;
});

export default function PetManagementScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(window.width);
  const layout = getPetManagementLayout(containerWidth);
  const backRef = useRef<React.ComponentRef<typeof TouchableOpacity> | null>(
    null,
  );
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectPet = usePetStore(s => s.selectPet);
  const setPets = usePetStore(s => s.setPets);
  const [deleteTarget, setDeleteTarget] = useState<Pet | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lastPetGuardVisible, setLastPetGuardVisible] = useState(false);
  const requestInFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onPressBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () =>
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      }),
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => openMoreDrawer());
    },
    onFallback: () => navigation.goBack(),
  });
  const handleSelect = useCallback((id: string) => selectPet(id), [selectPet]);
  const handleEdit = useCallback(
    (id: string) => {
      navigation.navigate('PetProfileEdit', {
        petId: id,
        entrySource: 'stack',
      });
    },
    [navigation],
  );
  const handleAddPet = useCallback(
    () => navigation.navigate('PetCreate', { from: 'header_plus' }),
    [navigation],
  );
  const cancelDelete = useCallback(() => {
    if (requestInFlight.current) return;
    setDeleteTarget(null);
    setDeleteError(null);
    requestAnimationFrame(() => {
      const tag = findNodeHandle(backRef.current);
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    });
  }, []);
  const handleDelete = useCallback(
    (id: string) => {
      if (requestInFlight.current) return;
      if (pets.length <= 1) {
        setLastPetGuardVisible(true);
        return;
      }
      const target = pets.find(pet => pet.id === id);
      if (!target) {
        Alert.alert('삭제할 수 없어요', '아이 프로필을 다시 확인해 주세요.');
        return;
      }
      setDeleteError(null);
      setDeleteTarget(target);
    },
    [pets],
  );

  const executeDeletePet = useCallback(
    async (confirmation: PetDeleteConfirmation) => {
      const target = deleteTarget;
      if (
        !target ||
        confirmation.petId !== target.id ||
        requestInFlight.current ||
        !isPetDeleteConfirmationReady(
          confirmation.consentChecked,
          confirmation.confirmationText,
        )
      )
        return;
      const ownerId = useAuthStore.getState().session?.user.id;
      if (!ownerId) {
        setDeleteError(
          '로그인이 잠시 끊어졌어요. 다시 로그인한 뒤 시도해 주세요.',
        );
        return;
      }
      requestInFlight.current = true;
      setDeleting(true);
      setDeleteError(null);
      try {
        const result = await deletePetSafely(target.id);
        if (
          useAuthStore.getState().session?.user.id !== result.userId ||
          result.userId !== ownerId
        )
          return;
        // Only successful deletion changes the list. Preserve the store's current selection/fallback policy.
        const remaining = usePetStore
          .getState()
          .pets.filter(candidate => candidate.id !== target.id);
        useRecordStore.getState().clearPet(target.id);
        useScheduleStore.getState().clearPet(target.id);
        setPets(remaining, { userId: result.userId });
        try {
          const refreshed = await fetchMyPets(result.userId);
          if (useAuthStore.getState().session?.user.id === result.userId)
            setPets(refreshed, { userId: result.userId });
        } catch (error) {
          captureMonitoringException(error);
        }
        if (!mounted.current) return;
        setDeleteTarget(null);
        if (result.walkCleanupPending) {
          showToast({
            tone: 'warning',
            title: '프로필은 삭제됐어요',
            message: '기기에 남은 산책 정보 정리를 다시 시도할게요.',
            durationMs: 3200,
          });
        } else if (result.storageCleanup.failedBuckets.length > 0) {
          captureMonitoringMessage('pet_delete_storage_cleanup_pending', {
            level: 'warning',
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
            message: `${target.name} 프로필이 목록에서 정리됐어요.`,
          });
        }
      } catch (error) {
        captureMonitoringException(error);
        if (
          mounted.current &&
          useAuthStore.getState().session?.user.id === ownerId
        )
          setDeleteError(getPetDeleteErrorMessage(error));
      } finally {
        requestInFlight.current = false;
        if (mounted.current) setDeleting(false);
      }
    },
    [deleteTarget, setPets],
  );

  const renderItem = useCallback<ListRenderItem<Pet>>(
    ({ item }) => (
      <PetManagementCard
        pet={item}
        availableWidth={containerWidth}
        isSelected={item.id === selectedPetId}
        onPressSelect={handleSelect}
        onPressEdit={handleEdit}
        onPressDelete={handleDelete}
      />
    ),
    [containerWidth, handleDelete, handleEdit, handleSelect, selectedPetId],
  );
  const addButton = useMemo(
    () => (
      <TouchableOpacity
        testID="pet-management-add"
        accessibilityRole="button"
        style={styles.add}
        activeOpacity={0.85}
        onPress={handleAddPet}
      >
        <AppText preset="button" style={styles.addText}>
          + 아이 등록하기
        </AppText>
      </TouchableOpacity>
    ),
    [handleAddPet],
  );

  return (
    <View
      testID="pet-management-screen"
      style={[styles.screen, { paddingBottom: insets.bottom }]}
      onLayout={event => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <LavenderScreenBackground testID="pet-management-background-gradient" />
      <View
        style={styles.content}
        accessibilityElementsHidden={Boolean(deleteTarget)}
        importantForAccessibility={
          deleteTarget ? 'no-hide-descendants' : 'auto'
        }
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top + 8, 18),
              paddingHorizontal: layout.pageInset,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              ref={backRef}
              testID="pet-management-back"
              accessibilityRole="button"
              accessibilityLabel="뒤로가기"
              style={styles.back}
              onPress={onPressBack}
            >
              <NuriSemanticIcon
                family="feather"
                name="arrow-left"
                preserveOriginal
                size={24}
                color={colors.ink}
              />
            </TouchableOpacity>
            <AppText preset="title1" style={styles.title}>
              아이들 프로필 관리
            </AppText>
          </View>
          <AppText preset="body" style={styles.count}>
            우리 아이{' '}
            <AppText preset="body" style={styles.countAccent}>
              {pets.length}마리
            </AppText>
          </AppText>
        </View>
        <FlatList
          testID="pet-management-list"
          data={pets}
          extraData={selectedPetId}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: layout.pageInset },
          ]}
          ItemSeparatorComponent={Separator}
          ListFooterComponent={pets.length > 0 ? addButton : undefined}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <NuriSemanticIcon
                family="feather"
                name="heart"
                preserveOriginal
                size={28}
                color={colors.accent}
              />
              <AppText preset="titleMd" style={styles.emptyTitle}>
                아직 등록된 아이가 없어요
              </AppText>
              <AppText preset="bodySm" style={styles.emptyBody}>
                아이를 등록하면 홈과 기록, 일정에서 함께 관리할 수 있어요.
              </AppText>
              {addButton}
            </View>
          }
        />
      </View>
      {deleteTarget ? (
        <PetDeleteConfirmDialog
          key={deleteTarget.id}
          visible
          pet={deleteTarget}
          deleting={deleting}
          errorMessage={deleteError}
          onCancel={cancelDelete}
          onConfirm={confirmation => {
            executeDeletePet(confirmation).catch(() => {});
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
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1 },
  header: { paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.managementTitle,
    flex: 1,
    color: colors.ink,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  count: {
    ...type.count,
    color: colors.muted,
    marginLeft: 48,
    marginTop: -3,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  countAccent: { ...type.count, color: colors.accent },
  list: { flexGrow: 1, paddingTop: 0, paddingBottom: 24 },
  separator: { height: 14 },
  add: {
    minHeight: 56,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 16,
    backgroundColor: colors.accent,
  },
  addText: {
    ...type.add,
    color: colors.white,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  empty: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  emptyTitle: { ...type.title, color: colors.ink, textAlign: 'center' },
  emptyBody: { ...type.dialogBody, color: colors.muted, textAlign: 'center' },
});
