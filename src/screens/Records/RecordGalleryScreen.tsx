import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type CompositeNavigationProp, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '../../app/ui/AppText';
import { LavenderScreenBackground } from '../../components/common/LavenderScreenBackground';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { AppHeaderLayout } from '../../components/navigation/AppHeaderLayout';
import { APP_HEADER } from '../../components/navigation/headerAppearance';
import { ToolbarHeightContext } from '../../components/navigation/ToolbarHeightContext';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { AppTabParamList } from '../../navigation/AppTabsNavigator';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import type { MemoryRecord } from '../../services/supabase/memories';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { TIMELINE_DESIGN as C } from '../../theme/timelineDesign';
import { buildRecordGalleryRows, RECORD_GALLERY_COLUMNS, type RecordGalleryRow } from './recordGalleryPresentation';
import { RecordGalleryThumbnail } from './RecordGalleryThumbnail';

type Navigation = CompositeNavigationProp<
  NativeStackNavigationProp<TimelineStackParamList, 'RecordGallery'>,
  BottomTabNavigationProp<AppTabParamList>
>;


export default function RecordGalleryScreen() {
  const navigation = useNavigation<Navigation>();
  const { params } = useRoute<RouteProp<TimelineStackParamList, 'RecordGallery'>>();
  const insets = useSafeAreaInsets();
  const toolbarHeight = useContext(ToolbarHeightContext);
  const ownerId = useAuthStore(state => state.session?.user.id ?? null);
  const pet = usePetStore(state => state.pets.find(item => item.id === params.petId));
  const petId = ownerId && pet ? pet.id : null;
  const records = useRecordStore(state => state.selectLegacyPetRecordsState(petId));
  const bootstrap = useRecordStore(state => state.bootstrap);
  const refresh = useRecordStore(state => state.refresh);
  const loadMore = useRecordStore(state => state.loadMore);
  const [tileRowWidth, setTileRowWidth] = useState(0);
  const rows = useMemo(() => buildRecordGalleryRows(records.items), [records.items]);
  const tileSize = Math.max(0, (tileRowWidth - GRID_GAP * (RECORD_GALLERY_COLUMNS - 1)) / RECORD_GALLERY_COLUMNS);

  useEffect(() => {
    if (petId) bootstrap(petId).catch(() => {});
  }, [bootstrap, ownerId, petId]);

  const goHome = useCallback(() => {
    navigation.goBack();
    navigation.navigate('HomeTab');
  }, [navigation]);
  const goBack = useCallback(() => navigation.goBack(), [navigation]);
  const onBack = useEntryAwareBackAction({
    entrySource: params.entrySource,
    onHome: goHome,
    onMore: goHome,
    onFallback: goBack,
  });
  const openRecord = useCallback((record: MemoryRecord) => {
    if (!petId || record.petId !== petId) return;
    navigation.navigate('RecordDetail', {
      petId,
      memoryId: record.id,
      entrySource: 'record-gallery',
    });
  }, [navigation, petId]);
  const onLoadMore = useCallback(() => {
    if (petId && records.status === 'ready' && records.hasMore) {
      loadMore(petId).catch(() => {});
    }
  }, [loadMore, petId, records.hasMore, records.status]);
  const renderItem = useCallback(({ item }: { item: RecordGalleryRow }) => (
    item.type === 'month' ? (
      <AppText accessibilityRole="header" preset="unifiedLabel" style={styles.month}>{item.title}</AppText>
    ) : (
      <View style={styles.row}>
        {tileSize > 0 && item.records.map(record => (
          <View key={record.id} style={{ width: tileSize, height: tileSize }}>
            <RecordGalleryThumbnail record={record} onOpen={openRecord} />
          </View>
        ))}
      </View>
    )
  ), [openRecord, tileSize]);

  return (
    <View style={styles.screen} testID="record-gallery">
      <LavenderScreenBackground />
      <AppHeaderLayout subtitle={pet?.name ?? ''} topInset={insets.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="전체 기록 뒤로가기" onPress={onBack} style={styles.headerSlot}>
          <NuriSemanticIcon family="feather" name="chevron-left" size={APP_HEADER.backIconSize} color={C.ink} preserveOriginal />
        </Pressable>
        <AppText preset="unifiedTitle" styleOverridesPreset style={styles.title}>전체 기록</AppText>
        <View style={styles.headerSlot} />
      </AppHeaderLayout>
      <View
        style={[styles.list, { marginLeft: GUTTER + insets.left, marginRight: GUTTER + insets.right }]}
        onLayout={event => setTileRowWidth(event.nativeEvent.layout.width)}
      >
        <FlatList
          data={rows}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: (toolbarHeight ?? insets.bottom) + 16 }}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          showsVerticalScrollIndicator={false}
          refreshing={records.status === 'refreshing'}
          onRefresh={petId ? () => { refresh(petId).catch(() => {}); } : undefined}
          onEndReached={records.errorMessage ? undefined : onLoadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={petId && (records.status === 'idle' || records.status === 'loading' || records.status === 'refreshing') ? (
            <ActivityIndicator accessibilityLabel="기록 불러오는 중" style={styles.status} color={C.primary} />
          ) : records.errorMessage ? undefined : (
            <AppText preset="unifiedBody" style={styles.status}>아직 기록이 없어요.</AppText>
          )}
          ListFooterComponent={records.status === 'loadingMore' ? (
            <ActivityIndicator accessibilityLabel="기록 더 불러오는 중" style={styles.status} color={C.primary} />
          ) : records.errorMessage && petId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (records.status === 'error' || !records.hasMore) refresh(petId).catch(() => {});
                else onLoadMore();
              }}
              style={styles.retry}
            >
              <AppText preset="unifiedLabel" style={styles.retryText}>기록 다시 불러오기</AppText>
            </Pressable>
          ) : undefined}
        />
      </View>
    </View>
  );
}

const GRID_GAP = 4;
const GUTTER = 12;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.canvas },
  list: { flex: 1 },
  headerSlot: { width: APP_HEADER.targetSize, height: APP_HEADER.targetSize, alignItems: 'center', justifyContent: 'center' },
  title: { ...APP_HEADER.title, flex: 1, textAlign: 'center' },
  month: { color: C.ink, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },
  status: { marginTop: 24, color: C.muted, textAlign: 'center' },
  retry: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  retryText: { color: C.primary },
});
