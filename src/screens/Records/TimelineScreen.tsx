// 파일: src/screens/Records/TimelineScreen.tsx
// 목적:
// - petId 기준 memories(타임라인) 표시
// - pull-to-refresh
// - 무한 스크롤(loadMore)
// - 정렬 토글(최신/오래된) ✅ 화면 고정(Sticky)
// - 돋보기 → 검색바 토글(제목/태그 + debounce)
// - ✅ 카테고리 필터(전체/산책/식사/건강기록/일기장/기타) + 기타 서브카테고리(미용/병원&약 ...)
// - 월/연도 필터 + 섹션 점프(월 선택 시 해당 구간으로 스크롤)
// - "기록하기" → RecordCreate(탭)
// - 항목 탭 → RecordDetail
//
// ✅ 공통 탭 대응(중요):
// - 탭에서 진입하면 route params가 없을 수 있음
// - 이 경우 petStore(selectedPetId 또는 첫 pet)에서 petId를 fallback으로 사용
//
// ✅ store 계약(Chapter 6):
// - byPetId[petId] = { items, status, hasMore, errorMessage, ... }
// - status: 'idle' | 'loading' | 'ready' | 'refreshing' | 'loadingMore' | 'error'
// - actions: bootstrap(petId), refresh(petId), loadMore(petId)

import React, {
  memo,
  startTransition,
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
  ScrollView,
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
type Status =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'loadingMore'
  | 'error';

function normalizeStatus(v: unknown): Status {
  switch (v) {
    case 'idle':
    case 'loading':
    case 'ready':
    case 'refreshing':
    case 'loadingMore':
    case 'error':
      return v;
    default:
      return 'idle';
  }
}

const DEBOUNCE_MS = 250;

// ✅ 경고/렌더 안정화: 빈 배열/빈 상태는 “항상 동일 참조”
const EMPTY_ITEMS = Object.freeze<MemoryRecord[]>([]);
const FALLBACK_PET_STATE = Object.freeze({
  items: EMPTY_ITEMS as ReadonlyArray<MemoryRecord>,
  status: 'idle' as const,
  hasMore: false,
  errorMessage: null as string | null,
});

// ---------------------------------------------------------
// ✅ Category 정의 (UI key)
// ---------------------------------------------------------
type MainCategory = 'all' | 'walk' | 'meal' | 'health' | 'diary' | 'other';
type OtherSubCategory = 'grooming' | 'hospital' | 'etc';

const MAIN_CATEGORIES: Array<{ key: MainCategory; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'walk', label: '산책' },
  { key: 'meal', label: '식사' },
  { key: 'health', label: '건강' },
  { key: 'diary', label: '일기장' },
  { key: 'other', label: '기타' },
];

const OTHER_SUBCATEGORIES: Array<{ key: OtherSubCategory; label: string }> = [
  { key: 'grooming', label: '미용' },
  { key: 'hospital', label: '병원/약' },
  { key: 'etc', label: '기타(추가예정)' },
];

// ---------------------------------------------------------
// helpers
// ---------------------------------------------------------
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
  return title.includes(q) || tags.includes(q);
}

/**
 * ✅ record의 category를 최대한 안전하게 읽어서 canonical key로 정규화
 */
function readRecordCategoryRaw(r: MemoryRecord): string {
  const anyR = r as any;
  const raw =
    anyR.category ??
    anyR.type ??
    anyR.kind ??
    anyR.recordType ??
    anyR.mainCategory ??
    anyR.categoryKey ??
    '';
  return String(raw ?? '').trim();
}

function normalizeCategoryKey(raw: string): MainCategory {
  const v = raw.trim().toLowerCase();
  if (!v) return 'all';

  // 영문 canonical
  if (v === 'walk' || v === 'stroll') return 'walk';
  if (v === 'meal' || v === 'food' || v === 'feed') return 'meal';
  if (v === 'health' || v === 'medical') return 'health';
  if (v === 'diary' || v === 'journal') return 'diary';
  if (v === 'other' || v === 'etc') return 'other';

  // 한글 라벨 대응
  if (v.includes('산책')) return 'walk';
  if (v.includes('식사') || v.includes('간식')) return 'meal';
  if (v.includes('건강') || v.includes('병원') || v.includes('약'))
    return 'health';
  if (v.includes('일기')) return 'diary';
  if (v.includes('기타')) return 'other';

  return 'other';
}

function readOtherSubCategoryRaw(r: MemoryRecord): string {
  const anyR = r as any;
  const raw =
    anyR.subCategory ??
    anyR.subcategory ??
    anyR.sub_type ??
    anyR.detailCategory ??
    anyR.otherSubCategory ??
    '';
  return String(raw ?? '').trim();
}

function normalizeOtherSubKey(raw: string): OtherSubCategory {
  const v = raw.trim().toLowerCase();
  if (!v) return 'etc';

  // 영문
  if (v === 'grooming') return 'grooming';
  if (v === 'hospital' || v === 'medicine' || v === 'clinic') return 'hospital';

  // 한글
  if (v.includes('미용')) return 'grooming';
  if (v.includes('병원') || v.includes('약')) return 'hospital';

  return 'etc';
}

// ---------------------------------------------------------
// ✅ Memo Row Item (리스트 스크롤 스무스 핵심)
// ---------------------------------------------------------
const TimelineRow = memo(function TimelineRow({
  item,
  onPress,
}: {
  item: MemoryRecord;
  onPress: (item: MemoryRecord) => void;
}) {
  const dateText = item.occurredAt ?? item.createdAt?.slice(0, 10) ?? '';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.item}
      onPress={() => onPress(item)}
    >
      <View style={styles.thumb}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumbImg}
            fadeDuration={120}
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <AppText preset="caption" style={styles.thumbPlaceholderText}>
              NO IMAGE
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.itemBody}>
        <AppText preset="headline" numberOfLines={1} style={styles.itemTitle}>
          {(item.title ?? '').trim() ? item.title : '제목 없음'}
        </AppText>

        <AppText preset="caption" numberOfLines={2} style={styles.itemContent}>
          {item.content?.trim() ? item.content.trim() : '내용이 없습니다.'}
        </AppText>

        <View style={styles.metaRow}>
          <AppText preset="caption" style={styles.metaText}>
            {dateText}
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
});

// ---------------------------------------------------------
// ✅ Memo Controls Bar (Sticky 헤더 스무스 핵심)
// ---------------------------------------------------------
const ControlsBar = memo(function ControlsBar({
  sortLabel,
  monthLabel,
  searchOpen,
  searchInput,
  showSearchHint,
  mainCategory,
  categoryLabel,
  onToggleSort,
  onOpenMonthModal,
  onToggleSearch,
  onChangeSearch,
  onClearSearch,
  onPressMainCategory,
}: {
  sortLabel: string;
  monthLabel: string;
  searchOpen: boolean;
  searchInput: string;
  showSearchHint: boolean;
  mainCategory: MainCategory;
  categoryLabel: string;

  onToggleSort: () => void;
  onOpenMonthModal: () => void;
  onToggleSearch: () => void;

  onChangeSearch: (t: string) => void;
  onClearSearch: () => void;

  onPressMainCategory: (key: MainCategory) => void;
}) {
  return (
    <View style={styles.controlsWrap}>
      {/* row 1: sort / month / search */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.controlChip}
          onPress={onToggleSort}
        >
          <AppText preset="caption" style={styles.controlChipText}>
            {sortLabel}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.controlChip}
          onPress={onOpenMonthModal}
        >
          <AppText preset="caption" style={styles.controlChipText}>
            {monthLabel}
          </AppText>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.iconBtn}
          onPress={onToggleSearch}
        >
          <AppText preset="headline" style={styles.iconText}>
            🔍
          </AppText>
        </TouchableOpacity>
      </View>

      {/* row 2: categories (✅ FlatList 제거 → ScrollView map) */}
      <View style={styles.categoryRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {MAIN_CATEGORIES.map(item => {
            const active =
              item.key === 'other'
                ? mainCategory === 'other'
                : mainCategory === item.key;

            // ✅ other 라벨은 "other가 active일 때만" 서브라벨로 표시
            const label =
              item.key === 'other'
                ? mainCategory === 'other'
                  ? categoryLabel
                  : '기타'
                : item.label;

            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.9}
                style={[
                  styles.categoryChip,
                  active ? styles.categoryChipActive : null,
                ]}
                onPress={() => onPressMainCategory(item.key)}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.categoryChipText,
                    active ? styles.categoryChipTextActive : null,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {searchOpen ? (
        <View style={styles.searchBox}>
          <TextInput
            value={searchInput}
            onChangeText={onChangeSearch}
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
              onPress={onClearSearch}
            >
              <AppText preset="caption" style={styles.clearBtnText}>
                지우기
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {showSearchHint ? (
        <View style={styles.hintRow}>
          <AppText preset="caption" style={styles.hintText}>
            검색 중에는 자동 무한 로드를 멈추고, 하단 버튼으로 추가 로드를
            제공합니다.
          </AppText>
        </View>
      ) : null}
    </View>
  );
});

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
    status: Status;
    hasMore: boolean;
    errorMessage: string | null;
  };

  const status = normalizeStatus(petState.status);
  const hasMore = Boolean(petState.hasMore);
  const baseItems = (petState.items ??
    EMPTY_ITEMS) as ReadonlyArray<MemoryRecord>;
  const refreshing = status === 'refreshing';

  // ---------------------------------------------------------
  // 3) bootstrap
  // ---------------------------------------------------------
  useEffect(() => {
    if (!petId) return;
    bootstrap(petId);
  }, [bootstrap, petId]);

  // ---------------------------------------------------------
  // 4) UI state: sort / search / month / category
  // ---------------------------------------------------------
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  const [ymFilter, setYmFilter] = useState<string | null>(null);
  const [ymModalOpen, setYmModalOpen] = useState(false);

  // ✅ category
  const [mainCategory, setMainCategory] = useState<MainCategory>('all');
  const [otherSubCategory, setOtherSubCategory] =
    useState<OtherSubCategory | null>(null);
  const [otherModalOpen, setOtherModalOpen] = useState(false);

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

    setMainCategory('all');
    setOtherSubCategory(null);
    setOtherModalOpen(false);

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
  // 4.3) filtered + sorted (✅ 3중 filter 제거 → 단일 루프)
  // ---------------------------------------------------------
  const filteredItems = useMemo(() => {
    const out: MemoryRecord[] = [];
    const q = query;

    for (const r of baseItems) {
      // (1) YM
      if (ymFilter) {
        const ym = toYmKey(getYmd(r));
        if (ym !== ymFilter) continue;
      }

      // (2) Category
      if (mainCategory !== 'all') {
        const cat = normalizeCategoryKey(readRecordCategoryRaw(r));
        if (mainCategory !== 'other') {
          if (cat !== mainCategory) continue;
        } else {
          // mainCategory === 'other'
          if (cat !== 'other') continue;

          // sub filter (선택 시)
          if (otherSubCategory) {
            const sub = normalizeOtherSubKey(readOtherSubCategoryRaw(r));
            if (sub !== otherSubCategory) continue;
          }
        }
      }

      // (3) Search
      if (q && !recordMatchesQuery(r, q)) continue;

      out.push(r);
    }

    // (4) Sort
    if (sortMode === 'oldest') out.reverse();
    return out;
  }, [baseItems, ymFilter, mainCategory, otherSubCategory, query, sortMode]);

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

  // ✅ 무한 스크롤(loadMore) 중복 호출 방지
  const endReachedLockRef = useRef(0);

  const onEndReached = useCallback(() => {
    if (!petId) return;
    if (status !== 'ready') return;
    if (!hasMore) return;
    if (query) return;

    const now = Date.now();
    if (now - endReachedLockRef.current < 800) return;
    endReachedLockRef.current = now;

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

  const onPressMainCategory = useCallback((key: MainCategory) => {
    if (key === 'other') {
      setMainCategory('other');
      setOtherModalOpen(true);
      return;
    }
    setMainCategory(key);
    setOtherSubCategory(null);
  }, []);

  const applyOtherSub = useCallback((sub: OtherSubCategory) => {
    setOtherSubCategory(sub);
    setOtherModalOpen(false);
  }, []);

  const clearOtherSub = useCallback(() => {
    setOtherSubCategory(null);
    setOtherModalOpen(false);
  }, []);

  // ---------------------------------------------------------
  // 6) UI derived
  // ---------------------------------------------------------
  const headerTitle = useMemo(() => '타임라인', []);
  const sortLabel = useMemo(
    () => (sortMode === 'recent' ? '최신순' : '오래된순'),
    [sortMode],
  );

  const monthLabel = useMemo(
    () => (ymFilter ? humanYm(ymFilter) : '월/전체'),
    [ymFilter],
  );

  const categoryLabel = useMemo(() => {
    if (mainCategory !== 'other') {
      return MAIN_CATEGORIES.find(x => x.key === mainCategory)?.label ?? '전체';
    }
    if (!otherSubCategory) return '기타';
    return (
      OTHER_SUBCATEGORIES.find(x => x.key === otherSubCategory)?.label ?? '기타'
    );
  }, [mainCategory, otherSubCategory]);

  const showSearchHint = Boolean(query);

  // ---------------------------------------------------------
  // 7) renderItem (stable)
  // ---------------------------------------------------------
  const renderItem = useCallback(
    ({ item }: { item: MemoryRecord }) => {
      return <TimelineRow item={item} onPress={onPressItem} />;
    },
    [onPressItem],
  );

  const keyExtractor = useCallback((item: MemoryRecord) => item.id, []);

  // ---------------------------------------------------------
  // 8) Footer
  // ---------------------------------------------------------
  const ListFooterComponent = useMemo(() => {
    if (baseItems.length === 0) return null;

    switch (status) {
      case 'loadingMore':
        return (
          <View style={styles.footer}>
            <ActivityIndicator />
            <AppText preset="caption" style={styles.footerText}>
              더 불러오는 중...
            </AppText>
          </View>
        );

      case 'ready':
        if (hasMore && query) {
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

        if (!hasMore) {
          return (
            <View style={styles.footer}>
              <AppText preset="caption" style={styles.footerText}>
                마지막 기록이에요
              </AppText>
            </View>
          );
        }

        return <View style={{ height: 18 }} />;

      default:
        return <View style={{ height: 18 }} />;
    }
  }, [baseItems.length, status, hasMore, query, petId, loadMore]);

  // ---------------------------------------------------------
  // 9) Handlers for ControlsBar (stable)
  // ---------------------------------------------------------
  const onToggleSort = useCallback(() => {
    setSortMode(prev => (prev === 'recent' ? 'oldest' : 'recent'));
  }, []);

  const onOpenMonthModal = useCallback(() => setYmModalOpen(true), []);
  const onToggleSearch = useCallback(() => setSearchOpen(v => !v), []);

  const onChangeSearch = useCallback((t: string) => {
    // ✅ 입력 스무스: 타이핑을 UI 우선으로 두고, 상태 업데이트는 transition
    startTransition(() => {
      setSearchInput(t);
    });
  }, []);

  const onClearSearch = useCallback(() => {
    setSearchInput('');
    setQuery('');
  }, []);

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

      {/* List */}
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
        ListHeaderComponent={
          <ControlsBar
            sortLabel={sortLabel}
            monthLabel={monthLabel}
            searchOpen={searchOpen}
            searchInput={searchInput}
            showSearchHint={showSearchHint}
            mainCategory={mainCategory}
            categoryLabel={categoryLabel}
            onToggleSort={onToggleSort}
            onOpenMonthModal={onOpenMonthModal}
            onToggleSearch={onToggleSearch}
            onChangeSearch={onChangeSearch}
            onClearSearch={onClearSearch}
            onPressMainCategory={onPressMainCategory}
          />
        }
        stickyHeaderIndices={[0]}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText preset="headline" style={styles.emptyTitle}>
              아직 기록이 없어요
            </AppText>
            <AppText preset="body" style={styles.emptyDesc}>
              우리 아이와 함께한 소중한
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
                기록 시작하기
              </AppText>
            </TouchableOpacity>
          </View>
        }
        // ✅ FlatList 성능 옵션
        // removeClippedSubviews 는 Android에서 "깜빡임/튐"이 있으면 false로 내려도 됨.
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={11}
        updateCellsBatchingPeriod={50}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onScrollToIndexFailed={info => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 120);
        }}
      />

      {/* Month/Year Modal */}
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

      {/* Other SubCategory Modal */}
      <Modal
        visible={otherModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOtherModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setOtherModalOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <AppText preset="headline" style={styles.modalTitle}>
              기타 선택
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.modalItem}
              onPress={clearOtherSub}
            >
              <AppText preset="body" style={styles.modalItemText}>
                기타(전체)
              </AppText>
            </TouchableOpacity>

            {OTHER_SUBCATEGORIES.map(sub => (
              <TouchableOpacity
                key={sub.key}
                activeOpacity={0.9}
                style={styles.modalItem}
                onPress={() => applyOtherSub(sub.key)}
              >
                <AppText preset="body" style={styles.modalItemText}>
                  {sub.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
