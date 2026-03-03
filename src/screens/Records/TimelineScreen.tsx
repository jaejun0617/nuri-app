// 파일: src/screens/Records/TimelineScreen.tsx
// 목적:
// - petId 기준 memories(타임라인) 표시
// - pull-to-refresh
// - "기록하기" → RecordCreate
// - 항목 탭 → RecordDetail
//
// ✅ Chapter 5 반영
// - recordStore는 상태머신(status) 기반
// - selector는 factory(selectPetRecords)로 고정하여 snapshot 안정성 확보
// - route params가 없으면 petStore(selectedPetId → 첫 pet)로 fallback

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { MemoryRecord } from '../../services/supabase/memories';
import { useRecordStore, selectPetRecords } from '../../store/recordStore';
import { usePetStore } from '../../store/petStore';
import AppText from '../../app/ui/AppText';

type Nav = NativeStackNavigationProp<any>;

export default function TimelineScreen() {
  // ---------------------------------------------------------
  // 1) navigation / route
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();

  // ---------------------------------------------------------
  // 2) petId resolve (params → store fallback)
  // ---------------------------------------------------------
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);

  const petIdFromParams = route?.params?.petId ?? null;

  const petId = useMemo(() => {
    if (petIdFromParams) return petIdFromParams;

    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return selectedPetId;
    }
    return pets[0]?.id ?? null;
  }, [petIdFromParams, selectedPetId, pets]);

  // ---------------------------------------------------------
  // 3) store
  // ---------------------------------------------------------
  const bootstrap = useRecordStore(s => s.bootstrap);
  const refresh = useRecordStore(s => s.refresh);

  // ✅ selector factory로 안정 구독
  const petState = useRecordStore(s => selectPetRecords(petId)(s));

  // ---------------------------------------------------------
  // 4) bootstrap
  // ---------------------------------------------------------
  useEffect(() => {
    if (!petId) return;
    bootstrap(petId);
  }, [bootstrap, petId]);

  const records = petState.items;
  const refreshing = petState.status === 'refreshing';

  // ---------------------------------------------------------
  // 5) actions
  // ---------------------------------------------------------
  const onPressCreate = useCallback(() => {
    if (!petId) return;
    navigation.navigate('RecordCreate', { petId });
  }, [navigation, petId]);

  const onPressItem = useCallback(
    (item: MemoryRecord) => {
      if (!petId) return;
      navigation.navigate('RecordDetail', { petId, memoryId: item.id });
    },
    [navigation, petId],
  );

  const onRefresh = useCallback(() => {
    if (!petId) return;
    refresh(petId);
  }, [petId, refresh]);

  // ---------------------------------------------------------
  // 6) render
  // ---------------------------------------------------------
  const headerTitle = useMemo(() => '추억보기', []);

  const renderItem = useCallback(
    ({ item }: { item: MemoryRecord }) => {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.item}
          onPress={() => onPressItem(item)}
        >
          <View style={styles.thumb}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumbImg} />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <AppText preset="caption" style={styles.thumbPlaceholderText}>
                  NO IMAGE
                </AppText>
              </View>
            )}
          </View>

          <View style={styles.itemBody}>
            <AppText
              preset="headline"
              numberOfLines={1}
              style={styles.itemTitle}
            >
              {item.title}
            </AppText>

            <AppText
              preset="caption"
              numberOfLines={2}
              style={styles.itemContent}
            >
              {item.content?.trim() ? item.content.trim() : '내용이 없습니다.'}
            </AppText>

            <View style={styles.metaRow}>
              <AppText preset="caption" style={styles.metaText}>
                {item.occurredAt ?? item.createdAt.slice(0, 10)}
              </AppText>

              {item.emotion ? (
                <View style={styles.badge}>
                  <AppText preset="caption" style={styles.badgeText}>
                    {item.emotion}
                  </AppText>
                </View>
              ) : null}
            </View>

            {item.tags?.length ? (
              <AppText preset="caption" numberOfLines={1} style={styles.tags}>
                {item.tags.join(' ')}
              </AppText>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [onPressItem],
  );

  const keyExtractor = useCallback((item: MemoryRecord) => item.id, []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={{ width: 44 }} />
        <AppText preset="headline" style={styles.headerTitle}>
          {headerTitle}
        </AppText>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.createBtn}
          onPress={onPressCreate}
        >
          <AppText preset="caption" style={styles.createText}>
            기록하기
          </AppText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={records}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={records.length ? styles.list : styles.listEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText preset="headline" style={styles.emptyTitle}>
              아직 기록이 없어요
            </AppText>
            <AppText preset="body" style={styles.emptyDesc}>
              첫 번째 추억을 남겨보세요.
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.primary}
              onPress={onPressCreate}
            >
              <AppText preset="body" style={styles.primaryText}>
                기록하기
              </AppText>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#000000',
    fontWeight: '900',
  },

  createBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { color: '#FFFFFF', fontWeight: '900' },

  list: { padding: 14, gap: 10, paddingBottom: 24 },
  listEmpty: { flexGrow: 1, padding: 14 },

  item: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { color: '#888888', fontWeight: '800' },

  itemBody: { flex: 1 },
  itemTitle: { color: '#000000', fontWeight: '900' },
  itemContent: { marginTop: 6, color: '#333333' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaText: { color: '#777777', fontWeight: '700' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  badgeText: { color: '#000000', fontWeight: '800' },

  tags: { marginTop: 8, color: '#000000', fontWeight: '800' },

  empty: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: { color: '#000000', fontWeight: '900' },
  emptyDesc: { color: '#333333', textAlign: 'center' },

  primary: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },
});
