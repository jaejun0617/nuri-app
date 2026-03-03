// 파일: src/screens/Records/TimelineScreen.tsx
// 목적:
// - petId 기준 memories(타임라인) 표시
// - pull-to-refresh
// - 무한 스크롤(loadMore)
// - 정렬 토글(최신/오래된) ✅ 화면 고정(Sticky)
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
// ✅ store 계약(Chapter 6):
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
import { styles } from './TimelineScreen.styles';

type Nav = NativeStackNavigationProp<any>;
type SortMode = 'recent' | 'oldest';

const DEBOUNCE_MS = 250;

// ✅ 경고/렌더 안정화: 빈 배열/빈 상태는 “항상 동일 참조”
// - TS가 []를 never[]로 추론하는 케이스를 막기 위해 generic 지정
const EMPTY_ITEMS = Object.freeze<MemoryRecord[]>([]);
const FALLBACK_PET_STATE = Object.freeze({
  items: EMPTY_ITEMS as ReadonlyArray<MemoryRecord>,
  status: 'idle' as const,
  hasMore: false,
  errorMessage: null as string | null,
});

function getYmd(item: MemoryRecord): string {
  const s = (item.occurredAt ?? item.createdAt?.slice(0, 10) ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : item.createdAt?.slice(0, 10) ?? '';
}

function toYmKey(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return `${ymd.slice(0, 4)}-${ymd.slice(5, 7)}`; // YYYY-MM
}

function humanYm(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  return `${ym.slice(0, 4)}.${ym.slice(5, 7)}`;
}

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

function recordMatchesQuery(r: MemoryRecord, q: string) {
  if (!q) return true;

  const title = (r.title ?? '').toLowerCase();
  const tags = Array.isArray(r.tags) ? r.tags.join(' ').toLowerCase() : '';
  // ✅ 제목/태그 중심
  return title.includes(q) || tags.includes(q);
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
  // 2) store (✅ 안정: byPetId[petId] 직접 구독 + 동일참조 fallback)
  // ---------------------------------------------------------
  const bootstrap = useRecordStore(s => s.bootstrap);
  const refresh = useRecordStore(s => s.refresh);
  const loadMore = useRecordStore(s => s.loadMore);

  const petState = useRecordStore(s => {
    if (!petId) return FALLBACK_PET_STATE;
    return (s.byPetId[petId] as any) ?? FALLBACK_PET_STATE;
  }) as typeof FALLBACK_PET_STATE & {
    items: ReadonlyArray<MemoryRecord>;
    status:
      | 'idle'
      | 'loading'
      | 'ready'
      | 'refreshing'
      | 'loadingMore'
      | 'error';
    hasMore: boolean;
    errorMessage: string | null;
  };

  const status = petState.status ?? 'idle';
  const hasMore = petState.hasMore ?? false;
  const baseItems =
    petState.items ?? (EMPTY_ITEMS as ReadonlyArray<MemoryRecord>);
  const refreshing = status === 'refreshing';

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

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  const [ymFilter, setYmFilter] = useState<string | null>(null);
  const [ymModalOpen, setYmModalOpen] = useState(false);

  // 점프 요청(필터 적용 후 렌더 완료 다음 scrollToIndex)
  const [pendingJumpYm, setPendingJumpYm] = useState<string | null>(null);

  // pet 변경 시: UX 안정화 초기화
  useEffect(() => {
    setSortMode('recent');
    setSearchOpen(false);
    setSearchInput('');
    setQuery('');
    setYmFilter(null);
    setYmModalOpen(false);
    setPendingJumpYm(null);
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
  // ---------------------------------------------------------
  const availableYmList = useMemo(() => {
    const set = new Set<string>();
    for (const r of baseItems) {
      const ym = toYmKey(getYmd(r));
      if (ym) set.add(ym);
    }
    return Array.from(set).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
  }, [baseItems]);

  // ---------------------------------------------------------
  // 4.3) filtered + sorted (렌더 전용)
  // - store는 pagination 안정성을 위해 "항상 최신순" 유지
  // - oldest는 화면에서만 reverse
  // ---------------------------------------------------------
  const filteredItems = useMemo(() => {
    const q = query;

    const byYm = ymFilter
      ? baseItems.filter(r => toYmKey(getYmd(r)) === ymFilter)
      : baseItems;

    const bySearch = q ? byYm.filter(r => recordMatchesQuery(r, q)) : byYm;

    if (sortMode === 'recent') return bySearch;

    const copy = [...bySearch];
    copy.reverse();
    return copy;
  }, [baseItems, ymFilter, query, sortMode]);

  // ---------------------------------------------------------
  // 4.4) 월 점프: 필터 적용 후 렌더 완료 타이밍에 scrollToIndex
  // ---------------------------------------------------------
  const listRef = useRef<FlatList<MemoryRecord>>(null);

  useEffect(() => {
    if (!pendingJumpYm) return;

    if (pendingJumpYm === '__ALL__') {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
      setPendingJumpYm(null);
      return;
    }

    const idx = filteredItems.findIndex(
      r => toYmKey(getYmd(r)) === pendingJumpYm,
    );

    requestAnimationFrame(() => {
      if (idx >= 0)
        listRef.current?.scrollToIndex({ index: idx, animated: true });
      else listRef.current?.scrollToOffset({ offset: 0, animated: true });
      setPendingJumpYm(null);
    });
  }, [pendingJumpYm, filteredItems]);

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
  // - 검색 중 자동 로드는 결과 흔들림/비용 때문에 기본 OFF
  // - 대신 footer에 수동 “검색 결과 더 불러오기” 제공
  const onEndReached = useCallback(() => {
    if (!petId) return;
    if (status !== 'ready') return;
    if (!hasMore) return;
    if (query) return;

    loadMore(petId);
  }, [petId, status, hasMore, query, loadMore]);

  const jumpToYm = useCallback((ym: string | null) => {
    setYmModalOpen(false);

    if (!ym) {
      setYmFilter(null);
      setPendingJumpYm('__ALL__');
      return;
    }

    setYmFilter(ym);
    setPendingJumpYm(ym);
  }, []);

  // ---------------------------------------------------------
  // 6) UI derived
  // ---------------------------------------------------------
  const headerTitle = useMemo(() => '타임라인', []);
  const sortLabel = useMemo(
    () => (sortMode === 'recent' ? '최신순' : '오래된순'),
    [sortMode],
  );
  const filterLabel = useMemo(
    () => (ymFilter ? humanYm(ymFilter) : '전체'),
    [ymFilter],
  );

  // ---------------------------------------------------------
  // 7) Sticky Controls Bar
  // ---------------------------------------------------------
  const ControlsBar = useMemo(() => {
    return (
      <View style={styles.controlsWrap}>
        <View style={styles.controlsRow}>
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

        {query ? (
          <View style={styles.hintRow}>
            <AppText preset="caption" style={styles.hintText}>
              검색 중에는 자동 무한 로드를 멈추고, 하단 버튼으로 추가 로드를
              제공합니다.
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }, [filterLabel, query, searchInput, searchOpen, sortLabel]);

  // ---------------------------------------------------------
  // 8) renderItem
  // ---------------------------------------------------------
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
        data={filteredItems as MemoryRecord[]}
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
        stickyHeaderIndices={[0]}
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
        onScrollToIndexFailed={info => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 80);
        }}
      />

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
