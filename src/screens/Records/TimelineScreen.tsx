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
  BackHandler,
  FlatList,
  Image,
  type ListRenderItem,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ✅ 따로 분리한 MemoryCard 컴포넌트 불러오기! (경로는 실제 구조에 맞게 수정해주세요)
import { MemoryCard } from '../../components/MemoryCard/MemoryCard';

import type { AppTabParamList } from '../../navigation/AppTabsNavigator';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import {
  MAIN_CATEGORY_OPTIONS,
  OTHER_SUBCATEGORY_OPTIONS,
  normalizeCategoryKey,
  normalizeOtherSubKey,
  readOtherSubCategoryRaw,
  readRecordCategoryRaw,
  type MemoryMainCategory,
  type MemoryOtherSubCategory,
} from '../../services/memories/categoryMeta';
import type { MemoryRecord } from '../../services/supabase/memories';
import {
  buildTimelineHeatmap,
  type TimelineHeatmapWeek,
} from '../../services/timeline/heatmap';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import type { PetRecordsState } from '../../store/recordStore';
import { useRecordStore } from '../../store/recordStore';
import { usePetStore } from '../../store/petStore';
import AppText from '../../app/ui/AppText';
import { styles } from './TimelineScreen.styles';

type TimelineMainRoute = RouteProp<TimelineStackParamList, 'TimelineMain'>;
type TimelineTabNav = BottomTabNavigationProp<AppTabParamList, 'TimelineTab'>;
type TimelineStackNav = NativeStackNavigationProp<
  TimelineStackParamList,
  'TimelineMain'
>;
type Nav = CompositeNavigationProp<TimelineStackNav, TimelineTabNav>;

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
type MainCategory = MemoryMainCategory;
type OtherSubCategory = MemoryOtherSubCategory;

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
  theme,
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
  theme: ReturnType<typeof buildPetThemePalette>;
}) {
  return (
    <View style={styles.controlsWrap}>
      {/* row 1: sort / month / search */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.controlChip,
            {
              borderColor: theme.border,
              backgroundColor: theme.tint,
            },
          ]}
          onPress={onToggleSort}
        >
          <AppText
            preset="caption"
            style={[styles.controlChipText, { color: theme.primary }]}
          >
            {sortLabel}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.controlChip,
            {
              borderColor: theme.border,
              backgroundColor: theme.tint,
            },
          ]}
          onPress={onOpenMonthModal}
        >
          <AppText
            preset="caption"
            style={[styles.controlChipText, { color: theme.primary }]}
          >
            {monthLabel}
          </AppText>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.iconBtn, { borderColor: theme.border }]}
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
          {MAIN_CATEGORY_OPTIONS.map(item => {
            const active =
              item.key === 'other'
                ? mainCategory === 'other'
                : mainCategory === item.key;

            // ✅ other 라벨은 "other가 active일 때만" 서브라벨로 표시
            const label =
              item.key === 'other'
                ? mainCategory === 'other'
                  ? categoryLabel
                  : '···'
                : item.label;

            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.9}
                style={[
                  styles.categoryChip,
                  active ? styles.categoryChipActive : null,
                  active
                    ? {
                        borderColor: theme.border,
                        backgroundColor: theme.tint,
                      }
                    : null,
                ]}
                onPress={() => onPressMainCategory(item.key)}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.categoryChipText,
                    active ? styles.categoryChipTextActive : null,
                    active ? { color: theme.primary } : null,
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
              style={[styles.clearBtn, { backgroundColor: theme.primary }]}
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

const HEATMAP_DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

function getHeatmapIntensityStyle(intensity: 0 | 1 | 2 | 3 | 4) {
  switch (intensity) {
    case 1:
      return styles.heatmapCell1;
    case 2:
      return styles.heatmapCell2;
    case 3:
      return styles.heatmapCell3;
    case 4:
      return styles.heatmapCell4;
    default:
      return styles.heatmapCell0;
  }
}

function getHeatmapIntensityColor(
  intensity: 0 | 1 | 2 | 3 | 4,
  theme: ReturnType<typeof buildPetThemePalette>,
) {
  switch (intensity) {
    case 1:
      return theme.tint;
    case 2:
      return theme.glow;
    case 3:
      return theme.border;
    case 4:
      return theme.primary;
    default:
      return '#EFF1F6';
  }
}

const HeatmapSection = memo(function HeatmapSection({
  monthLabel,
  weeks,
  expanded,
  onToggle,
  theme,
}: {
  monthLabel: string;
  weeks: TimelineHeatmapWeek[];
  expanded: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof buildPetThemePalette>;
}) {
  return (
    <View
      style={[
        styles.heatmapWrap,
        {
          backgroundColor: theme.soft,
          borderColor: theme.border,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.heatmapToggleRow}
        onPress={onToggle}
      >
        <View style={styles.heatmapHeader}>
          <AppText
            preset="caption"
            style={[styles.heatmapEyebrow, { color: theme.primary }]}
          >
            기록 밀도
          </AppText>
          <AppText preset="body" style={styles.heatmapTitle}>
            최근 12주 히트맵
          </AppText>
          <AppText preset="caption" style={styles.heatmapDesc}>
            {monthLabel} 기준으로 기록이 남은 날을 한눈에 보여줘요.
          </AppText>
        </View>

        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.primary}
        />
      </TouchableOpacity>

      {expanded ? (
        <>
          <View style={styles.heatmapGridRow}>
            <View style={styles.heatmapLabelsCol}>
              {HEATMAP_DAY_LABELS.map(label => (
                <AppText
                  key={label}
                  preset="caption"
                  style={styles.heatmapDayLabel}
                >
                  {label}
                </AppText>
              ))}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.heatmapWeeksRow}
            >
              {weeks.map(week => (
                <View key={week.key} style={styles.heatmapWeekCol}>
                  {week.cells.map(cell => (
                    <View
                      key={cell.key}
                      style={[
                        styles.heatmapCell,
                        getHeatmapIntensityStyle(cell.intensity),
                        {
                          backgroundColor: getHeatmapIntensityColor(
                            cell.intensity,
                            theme,
                          ),
                        },
                        cell.isToday ? styles.heatmapCellToday : null,
                        cell.isToday ? { borderColor: theme.deep } : null,
                        !cell.isCurrentMonth ? styles.heatmapCellMuted : null,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.heatmapLegendRow}>
            <AppText preset="caption" style={styles.heatmapLegendText}>
              적음
            </AppText>
            {[0, 1, 2, 3, 4].map(level => (
              <View
                key={`legend-${level}`}
                style={[
                  styles.heatmapLegendCell,
                  getHeatmapIntensityStyle(level as 0 | 1 | 2 | 3 | 4),
                  {
                    backgroundColor: getHeatmapIntensityColor(
                      level as 0 | 1 | 2 | 3 | 4,
                      theme,
                    ),
                  },
                ]}
              />
            ))}
            <AppText preset="caption" style={styles.heatmapLegendText}>
              많음
            </AppText>
          </View>
        </>
      ) : null}
    </View>
  );
});

export default function TimelineScreen() {
  // ---------------------------------------------------------
  // 1) navigation / route
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<TimelineMainRoute>();

  // ---------------------------------------------------------
  // 1.5) petId resolve (params → store fallback)
  // ---------------------------------------------------------
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);

  const petIdFromParams = route?.params?.petId ?? null;
  const mainCategoryFromParams = route?.params?.mainCategory ?? null;
  const otherSubCategoryFromParams = route?.params?.otherSubCategory ?? null;

  const petId = useMemo(() => {
    if (petIdFromParams) return petIdFromParams;

    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return selectedPetId;
    }
    return pets[0]?.id ?? null;
  }, [petIdFromParams, selectedPetId, pets]);
  const selectedPet = useMemo(
    () => pets.find(item => item.id === petId) ?? null,
    [petId, pets],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  // ---------------------------------------------------------
  // 2) store (✅ 안정: byPetId[petId] 직접 구독 + 동일참조 fallback)
  // ---------------------------------------------------------
  const bootstrap = useRecordStore(s => s.bootstrap);
  const refresh = useRecordStore(s => s.refresh);
  const loadMore = useRecordStore(s => s.loadMore);

  const petState = useRecordStore(s => {
    if (!petId) return FALLBACK_PET_STATE;
    return s.byPetId[petId] ?? FALLBACK_PET_STATE;
  }) as PetRecordsState | typeof FALLBACK_PET_STATE;

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
  const [heatmapExpanded, setHeatmapExpanded] = useState(false);

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
    setHeatmapExpanded(false);

    setPendingJumpYm(null);
  }, [petId]);

  useEffect(() => {
    if (!mainCategoryFromParams) return;

    setMainCategory(mainCategoryFromParams);
    setOtherModalOpen(false);

    if (mainCategoryFromParams === 'other') {
      setOtherSubCategory(otherSubCategoryFromParams ?? null);
      return;
    }

    setOtherSubCategory(null);
  }, [mainCategoryFromParams, otherSubCategoryFromParams, petId]);

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
      return MAIN_CATEGORY_OPTIONS.find(x => x.key === mainCategory)?.label ?? '전체';
    }
    if (!otherSubCategory) return '···';
    return (
      OTHER_SUBCATEGORY_OPTIONS.find(x => x.key === otherSubCategory)?.label ??
      '···'
    );
  }, [mainCategory, otherSubCategory]);

  const showSearchHint = Boolean(query);
  const heatmapWeeks = useMemo(
    () => buildTimelineHeatmap(baseItems as MemoryRecord[], 12),
    [baseItems],
  );

  // ---------------------------------------------------------
  // 7) renderItem (stable) - 🔥 외부 MemoryCard 호출!
  // ---------------------------------------------------------
  const renderItem = useCallback<ListRenderItem<MemoryRecord>>(
    ({ item }) => {
      // ✅ TimelineRow를 삭제하고 따로 만든 MemoryCard 컴포넌트를 호출합니다!
      return <MemoryCard item={item} onPress={onPressItem} />;
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

  const onPressHome = useCallback(() => {
    navigation.navigate('HomeTab');
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          navigation.navigate('HomeTab');
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [navigation]),
  );

  // ---------------------------------------------------------
  // 10) Render
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.homeBtn}
          onPress={onPressHome}
        >
          <Feather name="home" size={20} color={petTheme.primary} />
        </TouchableOpacity>
        <AppText preset="headline" style={styles.headerTitle}>
          {headerTitle}
        </AppText>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.createBtn, { backgroundColor: petTheme.primary }]}
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
          <>
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
              theme={petTheme}
            />
            <HeatmapSection
              monthLabel={monthLabel}
              weeks={heatmapWeeks}
              expanded={heatmapExpanded}
              onToggle={() => setHeatmapExpanded(prev => !prev)}
              theme={petTheme}
            />
          </>
        }
        stickyHeaderIndices={[0]}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyHero}>
              <Image
                source={require('../../assets/logo/logo_v2.png')}
                style={styles.emptyPawImage}
                resizeMode="contain"
              />
            </View>

            <AppText preset="headline" style={styles.emptyTitle}>
              아직 남겨진 추억이 없어요
            </AppText>
            <AppText preset="body" style={styles.emptyDesc}>
              우리 아이와 함께한 반짝이는 순간을
            </AppText>
            <AppText preset="body" style={styles.emptyDesc}>
              첫 기록으로 천천히 시작해보세요
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.primary, { backgroundColor: petTheme.primary }]}
              onPress={onPressCreate}
            >
              <AppText preset="body" style={styles.primaryIcon}>
                ✎
              </AppText>
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

            {OTHER_SUBCATEGORY_OPTIONS.map(sub => (
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
