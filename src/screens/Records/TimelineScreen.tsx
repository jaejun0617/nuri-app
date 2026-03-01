// 파일: src/screens/Records/TimelineScreen.tsx
// 목적:
// - petId 기준 memories(타임라인) 표시
// - pull-to-refresh + pagination(load more)
// - "기록하기" → RecordCreate
// - 항목 탭 → RecordDetail

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { MemoryRecord } from '../../services/supabase/memories';
import { useRecordStore } from '../../store/recordStore';
import AppText from '../../app/ui/AppText';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = { key: string; name: string; params: { petId: string } };

export default function TimelineScreen() {
  // ---------------------------------------------------------
  // 1) navigation / params
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const petId = route.params?.petId;

  // ---------------------------------------------------------
  // 2) store (petId별)
  // ---------------------------------------------------------
  const bootstrap = useRecordStore(s => s.bootstrap);
  const refresh = useRecordStore(s => s.refresh);
  const loadMore = useRecordStore(s => s.loadMore);

  const petState = useRecordStore(s => (petId ? s.getPetState(petId) : null));

  // ---------------------------------------------------------
  // 3) data bootstrap
  // ---------------------------------------------------------
  useEffect(() => {
    if (!petId) return;
    bootstrap(petId);
  }, [bootstrap, petId]);

  const records = petState?.items ?? [];
  const refreshing = petState?.refreshing ?? false;
  const loadingMoreFlag = petState?.loadingMore ?? false;
  const hasMore = petState?.hasMore ?? false;

  // ---------------------------------------------------------
  // 4) actions
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

  const onEndReached = useCallback(() => {
    if (!petId) return;
    if (!hasMore) return;
    loadMore(petId);
  }, [hasMore, loadMore, petId]);

  // ---------------------------------------------------------
  // 5) render
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

  const ListFooterComponent = useMemo(() => {
    if (!loadingMoreFlag) return <View style={{ height: 14 }} />;
    return (
      <View style={styles.footer}>
        <ActivityIndicator />
      </View>
    );
  }, [loadingMoreFlag]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <AppText preset="body" style={styles.backText}>
            ←
          </AppText>
        </TouchableOpacity>

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

      {/* List */}
      <FlatList
        data={records}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={records.length ? styles.list : styles.listEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListFooterComponent={ListFooterComponent}
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
  screen: { flex: 1, backgroundColor: '#F6F7FB' },

  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontWeight: '900', color: '#0B1220' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0B1220',
    fontWeight: '900',
  },

  createBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#6D7CFF',
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
    borderColor: '#E6E8F0',
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F6F7FB',
    borderWidth: 1,
    borderColor: '#E6E8F0',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { color: '#8A94A6', fontWeight: '800' },

  itemBody: { flex: 1 },
  itemTitle: { color: '#0B1220', fontWeight: '900' },
  itemContent: { marginTop: 6, color: '#556070' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaText: { color: '#8A94A6', fontWeight: '700' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6E8F0',
    backgroundColor: '#FFFFFF',
  },
  badgeText: { color: '#0B1220', fontWeight: '800' },

  tags: { marginTop: 8, color: '#6D7CFF', fontWeight: '800' },

  empty: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: { color: '#0B1220', fontWeight: '900' },
  emptyDesc: { color: '#556070', textAlign: 'center' },

  primary: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: '#6D7CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },

  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
