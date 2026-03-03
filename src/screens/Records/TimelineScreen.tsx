// 파일: src/screens/Records/TimelineScreen.tsx
// 목적:
// - petId 기준 memories(타임라인) 표시
// - pull-to-refresh
// - 무한 스크롤(loadMore)
// - 정렬 토글(최신/오래된)
// - 돋보기 → 검색바 토글(제목/태그 + debounce)
// - 월/연도 필터 + 섹션 점프(월 선택 시 해당 구간으로 스크롤)
// - "기록하기" → RecordCreate(탭)
// - 항목 탭 → RecordDetail
//
// ✅ 공통 탭 대응(중요):
// - 탭에서 진입하면 route params가 없을 수 있음
// - 이 경우 petStore(selectedPetId 또는 첫 pet)에서 petId를 fallback으로 사용
//
// ✅ 네비 경고 해결:
// - RecordCreate는 스택('RecordCreate')이 아니라 탭 라우트('RecordCreateTab')로 이동
//
// ✅ store 계약(Chapter 6 기준 가정):
// - byPetId[petId] = { items, status, hasMore, errorMessage, ... }
// - status: 'idle' | 'loading' | 'ready' | 'refreshing' | 'loadingMore' | 'error'
// - actions: bootstrap(petId), refresh(petId), loadMore(petId)

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { MemoryRecord } from '../../services/supabase/memories';
import { useRecordStore } from '../../store/recordStore';
import { usePetStore } from '../../store/petStore';
import AppText from '../../app/ui/AppText';

type Nav = NativeStackNavigationProp<any>;
type SortMode = 'recent' | 'oldest';

const DEBOUNCE_MS = 250;

function getYmd(item: MemoryRecord): string {
  const s = (item.occurredAt ?? item.createdAt?.slice(0, 10) ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : item.createdAt?.slice(0, 10) ?? '';
}

function toYmKey(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return `${ymd.slice(0, 4)}-${ymd.slice(5, 7)}`; // YYYY-MM
}

function humanYm(ym: string): string {
  // YYYY-MM -> YYYY.MM
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  return `${ym.slice(0, 4)}.${ym.slice(5, 7)}`;
}

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

function recordMatchesQuery(r: MemoryRecord, q: string) {
  if (!q) return true;

  const title = (r.title ?? '').toLowerCase();
  const content = (r.content ?? '').toLowerCase();
  const tags = Array.isArray(r.tags) ? r.tags.join(' ').toLowerCase() : '';

  // ✅ 제목/태그 중심 + 내용도 보조로 포함(원치 않으면 content 제거 가능)
  return title.includes(q) || tags.includes(q) || content.includes(q);
}

export default function TimelineScreen() {
  // ---------------------------------------------------------
  // 1) navigation / route
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();

  // ---------------------------------------------------------
  // 1.5) petId resolve (params → store fallback)
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
  // 2) store (✅ 안정: byPetId[petId] 직접 구독)
  // ---------------------------------------------------------
  const bootstrap = useRecordStore(s => s.bootstrap);
  const refresh = useRecordStore(s => s.refresh);
  const loadMore = useRecordStore(s => s.loadMore);

  const petState = useRecordStore(s => {
    if (!petId) return undefined;
    return s.byPetId[petId];
  });

  const status = petState?.status ?? 'idle';
  const hasMore = petState?.hasMore ?? false;
  const baseItems = petState?.items ?? [];

  // ---------------------------------------------------------
  // 3) bootstrap
  // ---------------------------------------------------------
  useEffect(() => {
    if (!petId) return;
    bootstrap(petId);
  }, [bootstrap, petId]);

  // ---------------------------------------------------------
  // 4) UI state: sort / search / filter
  // ---------------------------------------------------------
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  // 검색바 토글(돋보기)
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  // 월/연도 필터(= 선택한 월만 보기) + 섹션 점프
  const [ymFilter, setYmFilter] = useState<string | null>(null); // YYYY-MM or null(전체)
  const [ymModalOpen, setYmModalOpen] = useState(false);

  // pet 변경 시: UX 안정화 기본값으로 초기화
  useEffect(() => {
    setSortMode('recent');
    setSearchOpen(false);
    setSearchInput('');
    setQuery('');
    setYmFilter(null);
    setYmModalOpen(false);
  }, [petId]);

  // ---------------------------------------------------------
  // 4.1) debounce search
  // ---------------------------------------------------------
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(normalizeQuery(searchInput));
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [searchInput]);

  // ---------------------------------------------------------
  // 4.2) available YM list (for modal)
  // - baseItems는 store의 최신순 기준(일관된 기준 유지)
  // ---------------------------------------------------------
  const availableYmList = useMemo(() => {
    const set = new Set<string>();
    for (const r of baseItems) {
      const ym = toYmKey(getYmd(r));
      if (ym) set.add(ym);
    }
    // 최신월이 위로 오게 정렬(내림차순)
    return Array.from(set).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
  }, [baseItems]);

  // ---------------------------------------------------------
  // 4.3) filtered + sorted (렌더 전용)
  // - store는 pagination 안정성을 위해 "항상 최신순"으로 유지
  // - 화면에서만 oldest는 reverse
  // ---------------------------------------------------------
  const filteredItems = useMemo(() => {
    const q = query;

    // 1) 월 필터
    const byYm = ymFilter
      ? baseItems.filter(r => toYmKey(getYmd(r)) === ymFilter)
      : baseItems;

    // 2) 검색 필터
    const bySearch = q ? byYm.filter(r => recordMatchesQuery(r, q)) : byYm;

    // 3) 정렬(렌더링에서만)
    if (sortMode === 'recent') return bySearch;

    const copy = [...bySearch];
    copy.reverse();
    return copy;
  }, [baseItems, ymFilter, query, sortMode]);

  const refreshing = status === 'refreshing';

  // ---------------------------------------------------------
  // 5) actions
  // ---------------------------------------------------------
  const onPressCreate = useCallback(() => {
    if (!petId) return;
    navigation.navigate('RecordCreateTab', { petId });
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

  // ✅ 무한 스크롤(loadMore)
  // - 검색/월필터 중에도 동작은 가능하지만, 과도한 네트워크를 피하려면 막는 게 UX상 더 안정적
  // - 여기서는 "검색 중일 때만" 자동 loadMore를 막고(디바운스/결과 안정),
  //   필요하면 사용자가 필터를 끄고 자연스럽게 탐색하도록 유도한다.
  const onEndReached = useCallback(() => {
    if (!petId) return;
    if (status !== 'ready') return;
    if (!hasMore) return;
    if (query) return; // ✅ 검색 중 자동 추가 로드 방지

    loadMore(petId);
  }, [petId, status, hasMore, query, loadMore]);

  // ---------------------------------------------------------
  // 6) section jump (월 선택 시 해당 구간으로 스크롤)
  // - 현재 화면 데이터(filteredItems) 기준으로 index 계산
  // ---------------------------------------------------------
  const listRef = useRef<FlatList<MemoryRecord>>(null);

  const jumpToYm = useCallback(
    (ym: string | null) => {
      setYmFilter(ym);
      setYmModalOpen(false);

      // 전체(null)면 그냥 맨 위로
      if (!ym) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
        return;
      }

      // 선택 월의 첫 인덱스 찾기(현재 정렬/검색 반영된 filteredItems 기준)
      // 주의: setYmFilter가 비동기라 즉시 filteredItems가 바뀌지 않음.
      // → "baseItems에서 먼저 후보 인덱스를 계산"하고 다음 프레임에 scrollToIndex.
      requestAnimationFrame(() => {
        const nextBase = baseItems.filter(r => toYmKey(getYmd(r)) === ym);
        const nextFiltered = query
          ? nextBase.filter(r => recordMatchesQuery(r, query))
          : nextBase;

        const nextRender =
          sortMode === 'recent' ? nextFiltered : [...nextFiltered].reverse();

        if (nextRender.length === 0) {
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
          return;
        }

        // 해당 월의 첫 아이템 id를 기준으로 전체 렌더 배열에서 index 탐색
        const firstId = nextRender[0].id;
        const idx = filteredItems.findIndex(r => r.id === firstId);

        if (idx >= 0) {
          listRef.current?.scrollToIndex({ index: idx, animated: true });
        } else {
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
      });
    },
    [baseItems, filteredItems, query, sortMode],
  );

  // ---------------------------------------------------------
  // 7) UI helpers
  // ---------------------------------------------------------
  const headerTitle = useMemo(() => '타임라인', []);

  const sortLabel = useMemo(() => {
    return sortMode === 'recent' ? '최신순' : '오래된순';
  }, [sortMode]);

  const filterLabel = useMemo(() => {
    if (!ymFilter) return '전체';
    return humanYm(ymFilter);
  }, [ymFilter]);

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

  // ---------------------------------------------------------
  // 8) Sticky Controls Bar (정렬/검색/필터 고정)
  // ---------------------------------------------------------
  const ControlsBar = useMemo(() => {
    return (
      <View style={styles.controlsWrap}>
        <View style={styles.controlsRow}>
          {/* Sort */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.controlChip}
            onPress={() =>
              setSortMode(prev => (prev === 'recent' ? 'oldest' : 'recent'))
            }
          >
            <AppText preset="caption" style={styles.controlChipText}>
              {sortLabel}
            </AppText>
          </TouchableOpacity>

          {/* Month/Year Filter + Jump */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.controlChip}
            onPress={() => setYmModalOpen(true)}
          >
            <AppText preset="caption" style={styles.controlChipText}>
              {filterLabel}
            </AppText>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Search icon */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.iconBtn}
            onPress={() => setSearchOpen(v => !v)}
          >
            <AppText preset="headline" style={styles.iconText}>
              🔍
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {searchOpen ? (
          <View style={styles.searchBox}>
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="제목/태그로 검색"
              placeholderTextColor="#8A94A6"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />

            {searchInput.trim() ? (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.clearBtn}
                onPress={() => {
                  setSearchInput('');
                  setQuery('');
                }}
              >
                <AppText preset="caption" style={styles.clearBtnText}>
                  지우기
                </AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Hint row */}
        {query ? (
          <View style={styles.hintRow}>
            <AppText preset="caption" style={styles.hintText}>
              검색 중에는 자동 무한 로드를 잠시 멈춥니다(결과 안정).
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }, [filterLabel, query, searchInput, searchOpen, sortLabel]);

  // ---------------------------------------------------------
  // 9) Footer
  // ---------------------------------------------------------
  const ListFooterComponent = useMemo(() => {
    if (baseItems.length === 0) return null;

    if (status === 'loadingMore') {
      return (
        <View style={styles.footer}>
          <ActivityIndicator />
          <AppText preset="caption" style={styles.footerText}>
            더 불러오는 중...
          </AppText>
        </View>
      );
    }

    // 검색 중이면 footer에서 수동 로드를 제공(선택)
    if (status === 'ready' && hasMore && query) {
      return (
        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.manualMoreBtn}
            onPress={() => {
              if (!petId) return;
              loadMore(petId);
            }}
          >
            <AppText preset="caption" style={styles.manualMoreText}>
              검색 결과 더 불러오기
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'ready' && !hasMore) {
      return (
        <View style={styles.footer}>
          <AppText preset="caption" style={styles.footerText}>
            마지막 기록이에요
          </AppText>
        </View>
      );
    }

    return <View style={{ height: 18 }} />;
  }, [baseItems.length, status, hasMore, query, petId, loadMore]);

  // ---------------------------------------------------------
  // 10) Render
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      {/* Header */}
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
        ref={listRef}
        data={filteredItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={
          filteredItems.length ? styles.list : styles.listEmpty
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListHeaderComponent={ControlsBar}
        stickyHeaderIndices={[0]} // ✅ 정렬/검색/필터 바 고정
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
        // ✅ FlatList 성능 옵션
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={9}
        updateCellsBatchingPeriod={50}
        // scrollToIndex 안정
        onScrollToIndexFailed={info => {
          // 안전 fallback: 조금 기다렸다가 재시도
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 80);
        }}
      />

      {/* Month/Year modal */}
      <Modal
        visible={ymModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setYmModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setYmModalOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <AppText preset="headline" style={styles.modalTitle}>
              월/연도 선택
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.modalItem}
              onPress={() => jumpToYm(null)}
            >
              <AppText preset="body" style={styles.modalItemText}>
                전체 보기
              </AppText>
            </TouchableOpacity>

            {availableYmList.map(ym => (
              <TouchableOpacity
                key={ym}
                activeOpacity={0.9}
                style={styles.modalItem}
                onPress={() => jumpToYm(ym)}
              >
                <AppText preset="body" style={styles.modalItemText}>
                  {humanYm(ym)}
                </AppText>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
  createText: { color: '#ffffff', fontWeight: '900' },

  // sticky controls
  controlsWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  controlChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlChipText: { color: '#000000', fontWeight: '900' },

  iconBtn: {
    width: 38,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: '#000000' },

  searchBox: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 12,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  clearBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { color: '#FFFFFF', fontWeight: '900' },

  hintRow: { marginTop: 8 },
  hintText: { color: '#777777', fontWeight: '800' },

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

  footer: {
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: { color: '#777777', fontWeight: '800' },

  manualMoreBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualMoreText: { color: '#000000', fontWeight: '900' },

  // modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  modalTitle: { color: '#000000', fontWeight: '900', marginBottom: 10 },

  modalItem: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalItemText: { color: '#000000', fontWeight: '900' },
});
