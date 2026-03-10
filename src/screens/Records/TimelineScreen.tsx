// 파일: src/screens/Records/TimelineScreen.tsx
// 목적:
// - petId 기준 memories(타임라인) 표시
// - pull-to-refresh
// - 무한 스크롤(loadMore)
// - 월/카테고리 필터 + 월 점프
// - "기록하기" → RecordCreate(탭)
// - 항목 탭 → RecordDetail

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  InteractionManager,
  type LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  FlashList,
  type FlashListRef,
  type ListRenderItem,
  type ViewToken,
} from '@shopify/flash-list';
import Feather from 'react-native-vector-icons/Feather';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'styled-components/native';

import { MemoryCard } from '../../components/MemoryCard/MemoryCard';
import { preloadOptimizedImages } from '../../components/images/OptimizedImage';
import AppText from '../../app/ui/AppText';
import type { AppTabParamList } from '../../navigation/AppTabsNavigator';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import {
  MAIN_CATEGORY_OPTIONS,
  OTHER_SUBCATEGORY_OPTIONS,
  type MemoryMainCategory,
  type MemoryOtherSubCategory,
} from '../../services/memories/categoryMeta';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import type { MemoryRecord } from '../../services/supabase/memories';
import {
  buildTimelineView,
  humanizeTimelineMonthKey,
  type TimelineSortMode,
} from '../../services/timeline/query';
import { getPrimaryMemoryImageRef } from '../../services/records/imageSources';
import { getMemoryImageSignedUrlsCached } from '../../services/supabase/storageMemories';
import { usePetStore, resolveSelectedPetId } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { styles } from './TimelineScreen.styles';

type TimelineMainRoute = RouteProp<TimelineStackParamList, 'TimelineMain'>;
type TimelineTabNav = BottomTabNavigationProp<AppTabParamList, 'TimelineTab'>;
type TimelineStackNav = NativeStackNavigationProp<
  TimelineStackParamList,
  'TimelineMain'
>;
type Nav = CompositeNavigationProp<TimelineStackNav, TimelineTabNav>;

type MainCategory = MemoryMainCategory;
type OtherSubCategory = MemoryOtherSubCategory;
type Status =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'loadingMore'
  | 'error';
type DevDummyMode = 'off' | 'text500' | 'image500';

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

const JUMP_TO_ALL = '__ALL__';
const TIMELINE_WINDOW_SIZE = 3;
const TIMELINE_EAGER_IMAGE_COUNT = 2;
const TIMELINE_INITIAL_IMAGE_WINDOW = {
  start: 0,
  end: 4,
  eagerUntil: 1,
};
const TIMELINE_IMAGE_BUFFER_BEHIND = 2;
const TIMELINE_IMAGE_BUFFER_AHEAD = 4;
const TIMELINE_ITEM_HEIGHT = 96;
const TIMELINE_PRELOAD_VISIBLE_COUNT = 2;
const TIMELINE_PRELOAD_DEFERRED_COUNT = 2;
const TIMELINE_PRELOAD_DEFER_DELAY_MS = 180;
const TIMELINE_DIAG_LOG_VIEWABILITY = true;
const TIMELINE_DIAG_LOG_RENDERS = true;

let timelineScreenRenderCount = 0;
let timelineViewabilityLogCount = 0;

function buildDevDummyRecord(input: {
  index: number;
  petId: string | null;
  sampleImagePath: string | null;
  mode: Exclude<DevDummyMode, 'off'>;
}): MemoryRecord {
  const monthOffset = input.index % 18;
  const day = (input.index % 27) + 1;
  const hour = input.index % 24;
  const minute = (input.index * 7) % 60;
  const createdAt = new Date(
    Date.UTC(2026, 2 - monthOffset, day, hour, minute, 0),
  ).toISOString();
  const categoryCycle: MainCategory[] = ['walk', 'meal', 'health', 'diary', 'other'];
  const mainCategory = categoryCycle[input.index % categoryCycle.length];
  const otherSubCategory =
    mainCategory === 'other'
      ? OTHER_SUBCATEGORY_OPTIONS[input.index % OTHER_SUBCATEGORY_OPTIONS.length]?.key ??
        'etc'
      : null;
  const imagePath =
    input.mode === 'image500' && input.sampleImagePath
      ? input.sampleImagePath
      : null;

  return {
    id: `__dev_dummy_memory_${input.mode}_${input.index}`,
    petId: input.petId ?? '__dev_dummy_pet__',
    title: `더미 기록 ${input.index + 1}`,
    content: `타임라인 대량 스크롤 검증용 더미 내용 ${input.index + 1}`,
    emotion: null,
    tags: [`#dummy${(input.index % 8) + 1}`],
    category: mainCategory,
    subCategory: otherSubCategory,
    price: null,
    occurredAt: createdAt.slice(0, 10),
    createdAt,
    imageUrl: null,
    imagePath,
    imagePaths: imagePath ? [imagePath] : [],
  };
}

const ControlsBar = memo(function ControlsBar({
  sortLabel,
  monthLabel,
  mainCategory,
  categoryLabel,
  onToggleSort,
  onOpenMonthModal,
  onPressMainCategory,
  theme,
}: {
  sortLabel: string;
  monthLabel: string;
  mainCategory: MainCategory;
  categoryLabel: string;
  onToggleSort: () => void;
  onOpenMonthModal: () => void;
  onPressMainCategory: (key: MainCategory) => void;
  theme: ReturnType<typeof buildPetThemePalette>;
}) {
  return (
    <View style={styles.controlsWrap}>
      <View style={styles.controlsRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.controlChip,
            { borderColor: theme.border, backgroundColor: theme.tint },
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
            { borderColor: theme.border, backgroundColor: theme.tint },
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
      </View>

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
            const label =
              item.key === 'other' && mainCategory === 'other'
                ? categoryLabel
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
    </View>
  );
});

export default function TimelineScreen() {
  if (__DEV__ && TIMELINE_DIAG_LOG_RENDERS) {
    timelineScreenRenderCount += 1;
    if (timelineScreenRenderCount <= 12 || timelineScreenRenderCount % 10 === 0) {
      console.debug('[TimelineDiag] TimelineScreen render', {
        count: timelineScreenRenderCount,
      });
    }
  }

  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<TimelineMainRoute>();
  const isFocused = useIsFocused();

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const petIdFromParams = route?.params?.petId ?? null;
  const mainCategoryFromParams = route?.params?.mainCategory ?? null;
  const otherSubCategoryFromParams = route?.params?.otherSubCategory ?? null;

  const petId = useMemo(
    () => resolveSelectedPetId(pets, selectedPetId, petIdFromParams),
    [petIdFromParams, pets, selectedPetId],
  );
  const selectedPet = useMemo(
    () => pets.find(item => item.id === petId) ?? null,
    [petId, pets],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  const bootstrap = useRecordStore(s => s.bootstrap);
  const refresh = useRecordStore(s => s.refresh);
  const loadMore = useRecordStore(s => s.loadMore);
  const timelineIds = useRecordStore(s => s.selectTimelineIdsByPetId(petId));
  const timelineStatus = useRecordStore(s => s.selectTimelineStatusByPetId(petId));
  const hasMore = useRecordStore(s => s.selectTimelineHasMoreByPetId(petId));
  useRecordStore(s => s.selectTimelineEntityVersionByPetId(petId));
  const focusedMemoryId = useRecordStore(s =>
    petId ? s.focusedMemoryIdByPet[petId] ?? null : null,
  );
  const clearFocusedMemoryId = useRecordStore(s => s.clearFocusedMemoryId);
  const recordsById = useRecordStore.getState().recordsById;
  const status = normalizeStatus(timelineStatus);
  const refreshing = status === 'refreshing';

  useEffect(() => {
    if (!petId) return;
    bootstrap(petId);
  }, [bootstrap, petId]);

  const [sortMode, setSortMode] = useState<TimelineSortMode>('recent');
  const [diagDisableImages, setDiagDisableImages] = useState(false);
  const [devDummyMode, setDevDummyMode] = useState<DevDummyMode>('off');
  const [ymFilter, setYmFilter] = useState<string | null>(null);
  const [ymModalOpen, setYmModalOpen] = useState(false);
  const [mainCategory, setMainCategory] = useState<MainCategory>('all');
  const [otherSubCategory, setOtherSubCategory] =
    useState<OtherSubCategory | null>(null);
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [pendingJumpYm, setPendingJumpYm] = useState<string | null>(null);
  const [imageWindow, setImageWindow] = useState(TIMELINE_INITIAL_IMAGE_WINDOW);
  const imageWindowRef = useRef(TIMELINE_INITIAL_IMAGE_WINDOW);

  useEffect(() => {
    setSortMode('recent');
    setYmFilter(null);
    setYmModalOpen(false);
    setMainCategory('all');
    setOtherSubCategory(null);
    setOtherModalOpen(false);
    setPendingJumpYm(null);
    setImageWindow(TIMELINE_INITIAL_IMAGE_WINDOW);
    imageWindowRef.current = TIMELINE_INITIAL_IMAGE_WINDOW;
    setDevDummyMode('off');
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

  const devSampleImagePath = useMemo(() => {
    for (const id of timelineIds) {
      const record = recordsById[id];
      const imageRef = record ? getPrimaryMemoryImageRef(record) : null;
      if (imageRef) return imageRef;
    }
    return null;
  }, [recordsById, timelineIds]);

  const devDummyRecords = useMemo(() => {
    if (!__DEV__ || devDummyMode === 'off') return [] as MemoryRecord[];

    return Array.from({ length: 500 }, (_, index) =>
      buildDevDummyRecord({
        index,
        petId,
        sampleImagePath: devSampleImagePath,
        mode: devDummyMode,
      }),
    );
  }, [devDummyMode, devSampleImagePath, petId]);

  const devDummyRecordsById = useMemo(() => {
    if (!__DEV__ || devDummyMode === 'off') {
      return {} as Record<string, MemoryRecord>;
    }
    return Object.fromEntries(devDummyRecords.map(record => [record.id, record]));
  }, [devDummyMode, devDummyRecords]);

  const activeRecordsById = useMemo(() => {
    if (!__DEV__ || devDummyMode === 'off') return recordsById;
    return devDummyRecordsById;
  }, [devDummyMode, devDummyRecordsById, recordsById]);

  const activeTimelineIds = useMemo(() => {
    if (!__DEV__ || devDummyMode === 'off') return timelineIds;
    return devDummyRecords.map(record => record.id);
  }, [devDummyMode, devDummyRecords, timelineIds]);

  const timelineView = useMemo(
    () =>
      buildTimelineView({
        ids: activeTimelineIds,
        recordsById: activeRecordsById,
        filters: {
          ymFilter,
          mainCategory,
          otherSubCategory,
          query: '',
          sortMode,
        },
      }),
    [
      activeRecordsById,
      activeTimelineIds,
      mainCategory,
      otherSubCategory,
      sortMode,
      ymFilter,
    ],
  );
  const availableYmList = timelineView.availableMonthKeys;
  const filteredIds = timelineView.filteredIds;
  const preloadSignatureRef = useRef<string>('');

  const listRef = useRef<FlashListRef<string>>(null);
  const targetLayoutOffsetRef = useRef<number | null>(null);
  const pendingFocusedMemoryIdRef = useRef<string | null>(null);

  const clearPendingFocusedMemory = useCallback(() => {
    targetLayoutOffsetRef.current = null;
    pendingFocusedMemoryIdRef.current = null;
  }, []);

  const finalizeFocusedMemoryScroll = useCallback(
    (targetMemoryId: string) => {
      if (!petId) return false;
      if (pendingFocusedMemoryIdRef.current !== targetMemoryId) return false;

      const offset = targetLayoutOffsetRef.current;
      if (typeof offset !== 'number') return false;

      listRef.current?.scrollToOffset({
        offset: Math.max(0, offset - 12),
        animated: true,
      });
      clearFocusedMemoryId(petId);
      clearPendingFocusedMemory();
      return true;
    },
    [clearFocusedMemoryId, clearPendingFocusedMemory, petId],
  );

  const consumeFocusedMemory = useCallback(() => {
    if (!petId || !focusedMemoryId || !isFocused) return false;
    if (filteredIds.length === 0) return false;

    const index = filteredIds.indexOf(focusedMemoryId);
    if (index < 0) return false;

    pendingFocusedMemoryIdRef.current = focusedMemoryId;
    targetLayoutOffsetRef.current = null;

    if (finalizeFocusedMemoryScroll(focusedMemoryId)) return true;

    if (index === 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      return true;
    }

    listRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.35,
    });
    return true;
  }, [filteredIds, finalizeFocusedMemoryScroll, focusedMemoryId, isFocused, petId]);

  useEffect(() => {
    if (!pendingJumpYm) return;

    if (pendingJumpYm === JUMP_TO_ALL) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
      setPendingJumpYm(null);
      return;
    }

    const idx = timelineView.firstIndexByMonth.get(pendingJumpYm) ?? -1;
    requestAnimationFrame(() => {
      if (idx >= 0) {
        listRef.current?.scrollToIndex({ index: idx, animated: true });
      } else {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      setPendingJumpYm(null);
    });
  }, [pendingJumpYm, timelineView.firstIndexByMonth]);

  useEffect(() => {
    if (focusedMemoryId) return;
    clearPendingFocusedMemory();
  }, [clearPendingFocusedMemory, focusedMemoryId]);

  useEffect(() => {
    consumeFocusedMemory();
  }, [consumeFocusedMemory]);

  const timelinePreloadImageRefs = useMemo(() => {
    if (diagDisableImages) return { immediate: [], deferred: [] };

    const visible = filteredIds
      .slice(imageWindow.start, imageWindow.end + 1)
      .map(id => activeRecordsById[id])
      .filter((item): item is MemoryRecord => Boolean(item))
      .map(record => getPrimaryMemoryImageRef(record))
      .filter((value): value is string => Boolean(value));

    return {
      immediate: visible.slice(0, TIMELINE_PRELOAD_VISIBLE_COUNT),
      deferred: visible.slice(
        TIMELINE_PRELOAD_VISIBLE_COUNT,
        TIMELINE_PRELOAD_VISIBLE_COUNT + TIMELINE_PRELOAD_DEFERRED_COUNT,
      ),
    };
  }, [
    activeRecordsById,
    diagDisableImages,
    filteredIds,
    imageWindow.end,
    imageWindow.start,
  ]);

  useEffect(() => {
    if (diagDisableImages) return;

    const immediateSignature = timelinePreloadImageRefs.immediate.join('|');
    const deferredSignature = timelinePreloadImageRefs.deferred.join('|');
    const nextSignature = `${immediateSignature}__${deferredSignature}`;
    if (!nextSignature || nextSignature === preloadSignatureRef.current) return;
    preloadSignatureRef.current = nextSignature;

    let cancelled = false;
    let deferredTimer: ReturnType<typeof setTimeout> | null = null;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      (async () => {
        const immediateUrls = await getMemoryImageSignedUrlsCached(
          timelinePreloadImageRefs.immediate,
          {
            maxCacheSize: 450,
            refreshBufferMs: 90 * 1000,
            variant: 'timeline-thumb',
          },
        );
        if (cancelled) return;
        preloadOptimizedImages(
          immediateUrls.filter((value): value is string => Boolean(value)),
        );

        if (timelinePreloadImageRefs.deferred.length === 0) return;
        deferredTimer = setTimeout(async () => {
          const deferredUrls = await getMemoryImageSignedUrlsCached(
            timelinePreloadImageRefs.deferred,
            {
              maxCacheSize: 450,
              refreshBufferMs: 90 * 1000,
              variant: 'timeline-thumb',
            },
          );
          if (cancelled) return;
          preloadOptimizedImages(
            deferredUrls.filter((value): value is string => Boolean(value)),
          );
        }, TIMELINE_PRELOAD_DEFER_DELAY_MS);
      })().catch(() => {});
    });

    return () => {
      cancelled = true;
      if (typeof interactionTask.cancel === 'function') {
        interactionTask.cancel();
      }
      if (deferredTimer) clearTimeout(deferredTimer);
    };
  }, [diagDisableImages, timelinePreloadImageRefs]);

  const onPressCreate = useCallback(() => {
    if (!petId) return;
    navigation.navigate('RecordCreateTab', {
      petId,
      returnTo: {
        tab: 'TimelineTab',
        params: {
          screen: 'TimelineMain',
          params: {
            petId,
            mainCategory,
            otherSubCategory:
              mainCategory === 'other' ? otherSubCategory ?? undefined : undefined,
          },
        },
      },
    });
  }, [mainCategory, navigation, otherSubCategory, petId]);

  const onPressItem = useCallback(
    (item: MemoryRecord) => {
      if (__DEV__ && devDummyMode !== 'off') {
        console.debug('[TimelineDiag] dummy item press ignored', {
          itemId: item.id,
          mode: devDummyMode,
        });
        return;
      }
      if (!petId) return;
      navigation.navigate('RecordDetail', { petId, memoryId: item.id });
    },
    [devDummyMode, navigation, petId],
  );

  const onRefresh = useCallback(() => {
    if (__DEV__ && devDummyMode !== 'off') return;
    if (!petId) return;
    refresh(petId);
  }, [devDummyMode, petId, refresh]);

  const onFocusedItemLayout = useCallback(
    (itemId: string, event: LayoutChangeEvent) => {
      targetLayoutOffsetRef.current = event.nativeEvent.layout.y;
      finalizeFocusedMemoryScroll(itemId);
    },
    [finalizeFocusedMemoryScroll],
  );

  const onViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: Array<ViewToken<string>>;
      changed: Array<ViewToken<string>>;
    }) => {
      let topVisibleIndex = Number.POSITIVE_INFINITY;
      let bottomVisibleIndex = -1;

      for (const token of viewableItems) {
        if (!token.isViewable) continue;
        const index = token.index;
        if (typeof index !== 'number') continue;
        if (index < topVisibleIndex) topVisibleIndex = index;
        if (index > bottomVisibleIndex) bottomVisibleIndex = index;
      }

      if (!Number.isFinite(topVisibleIndex)) return;

      const nextWindow = {
        start: Math.max(0, topVisibleIndex - TIMELINE_IMAGE_BUFFER_BEHIND),
        end: Math.max(
          TIMELINE_INITIAL_IMAGE_WINDOW.end,
          bottomVisibleIndex + TIMELINE_IMAGE_BUFFER_AHEAD,
        ),
        eagerUntil: Math.max(
          TIMELINE_INITIAL_IMAGE_WINDOW.eagerUntil,
          bottomVisibleIndex >= 0
            ? Math.min(
                bottomVisibleIndex,
                topVisibleIndex + TIMELINE_EAGER_IMAGE_COUNT - 1,
              )
            : TIMELINE_INITIAL_IMAGE_WINDOW.eagerUntil,
        ),
      };

      const currentWindow = imageWindowRef.current;
      if (
        currentWindow.start === nextWindow.start &&
        currentWindow.end === nextWindow.end &&
        currentWindow.eagerUntil === nextWindow.eagerUntil
      ) {
        return;
      }

      if (__DEV__ && TIMELINE_DIAG_LOG_VIEWABILITY) {
        timelineViewabilityLogCount += 1;
        if (
          timelineViewabilityLogCount <= 20 ||
          timelineViewabilityLogCount % 10 === 0
        ) {
          console.debug('[TimelineDiag] viewability -> imageWindow', {
            count: timelineViewabilityLogCount,
            topVisibleIndex,
            bottomVisibleIndex,
            currentWindow,
            nextWindow,
          });
        }
      }

      imageWindowRef.current = nextWindow;
      setImageWindow(nextWindow);
    },
    [],
  );

  const endReachedLockRef = useRef(0);
  const onEndReached = useCallback(() => {
    if (__DEV__ && devDummyMode !== 'off') return;
    if (!petId || !hasMore || status !== 'ready') return;
    if (ymFilter || mainCategory !== 'all' || otherSubCategory) return;

    const now = Date.now();
    if (now - endReachedLockRef.current < 800) return;
    endReachedLockRef.current = now;

    loadMore(petId).catch(() => {});
  }, [
    devDummyMode,
    hasMore,
    loadMore,
    mainCategory,
    otherSubCategory,
    petId,
    status,
    ymFilter,
  ]);

  const jumpToYm = useCallback((ym: string | null) => {
    setYmModalOpen(false);

    if (!ym) {
      setYmFilter(null);
      setPendingJumpYm(JUMP_TO_ALL);
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

  const sortLabel = useMemo(
    () => (sortMode === 'recent' ? '최신순' : '오래된순'),
    [sortMode],
  );
  const monthLabel = useMemo(
    () => (ymFilter ? humanizeTimelineMonthKey(ymFilter) : '월/전체'),
    [ymFilter],
  );
  const categoryLabel = useMemo(() => {
    if (mainCategory !== 'other') {
      return MAIN_CATEGORY_OPTIONS.find(x => x.key === mainCategory)?.label ?? '전체';
    }
    if (!otherSubCategory) {
      return MAIN_CATEGORY_OPTIONS.find(x => x.key === 'other')?.label ?? '생활';
    }
    return (
      OTHER_SUBCATEGORY_OPTIONS.find(x => x.key === otherSubCategory)?.label ??
      (MAIN_CATEGORY_OPTIONS.find(x => x.key === 'other')?.label ?? '생활')
    );
  }, [mainCategory, otherSubCategory]);

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item, index }) => {
      const record = activeRecordsById[item];
      if (!record) return null;

      const enableImageLoad =
        index >= imageWindow.start && index <= imageWindow.end;
      const shouldDeferImage =
        enableImageLoad && index > imageWindow.eagerUntil;

      return (
        <MemoryCard
          item={record}
          onPress={onPressItem}
          enableImageLoad={diagDisableImages ? false : enableImageLoad}
          deferImageLoad={shouldDeferImage}
          imageVariant="timeline-thumb"
          isFocused={focusedMemoryId === item}
          onFocusedLayout={onFocusedItemLayout}
        />
      );
    },
    [
      diagDisableImages,
      focusedMemoryId,
      imageWindow,
      onFocusedItemLayout,
      onPressItem,
      activeRecordsById,
    ],
  );

  const keyExtractor = useCallback((itemId: string) => itemId, []);
  const getItemType = useCallback(() => 'memory', []);

  const listFooterComponent = useMemo(() => {
    if (activeTimelineIds.length === 0) return null;
    if (__DEV__ && devDummyMode !== 'off') {
      return (
        <View style={styles.footer}>
          <AppText preset="caption" style={styles.footerText}>
            DEV {devDummyMode === 'text500' ? 'TXT500' : 'IMG500'} 데이터
          </AppText>
        </View>
      );
    }

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
  }, [activeTimelineIds.length, devDummyMode, hasMore, status]);

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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.homeBtn}
          onPress={onPressHome}
        >
          <Feather name="home" size={20} color={petTheme.primary} />
        </TouchableOpacity>
        <AppText preset="headline" style={styles.headerTitle}>
          타임라인
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

      {__DEV__ ? (
        <View style={styles.diagBadgeStack}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.diagBadge,
              diagDisableImages ? styles.diagBadgeOff : styles.diagBadgeOn,
            ]}
            onPress={() => {
              setDiagDisableImages(prev => {
                const next = !prev;
                console.debug('[TimelineDiag] toggle images', {
                  disabled: next,
                });
                return next;
              });
            }}
          >
            <AppText preset="caption" style={styles.diagBadgeText}>
              {diagDisableImages ? 'IMG OFF' : 'IMG ON'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.diagBadge,
              devDummyMode === 'off' ? styles.diagBadgeNeutral : styles.diagBadgeWarn,
            ]}
            onPress={() => {
              setDevDummyMode(prev => {
                const next =
                  prev === 'off'
                    ? 'text500'
                    : prev === 'text500'
                      ? 'image500'
                      : 'off';
                console.debug('[TimelineDiag] toggle dummy mode', {
                  mode: next,
                });
                setImageWindow(TIMELINE_INITIAL_IMAGE_WINDOW);
                imageWindowRef.current = TIMELINE_INITIAL_IMAGE_WINDOW;
                return next;
              });
            }}
          >
            <AppText preset="caption" style={styles.diagBadgeText}>
              {devDummyMode === 'off'
                ? 'DUMMY OFF'
                : devDummyMode === 'text500'
                  ? 'TXT500'
                  : 'IMG500'}
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}

      <ControlsBar
        sortLabel={sortLabel}
        monthLabel={monthLabel}
        mainCategory={mainCategory}
        categoryLabel={categoryLabel}
        onToggleSort={() =>
          setSortMode(prev => (prev === 'recent' ? 'oldest' : 'recent'))
        }
        onOpenMonthModal={() => setYmModalOpen(true)}
        onPressMainCategory={onPressMainCategory}
        theme={petTheme}
      />

      <FlashList
        ref={listRef}
        data={filteredIds}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        drawDistance={TIMELINE_ITEM_HEIGHT * TIMELINE_WINDOW_SIZE}
        getItemType={getItemType}
        extraData={{ devDummyMode, imageWindow, focusedMemoryId }}
        contentContainerStyle={
          filteredIds.length ? styles.list : styles.listEmpty
        }
        refreshing={__DEV__ && devDummyMode !== 'off' ? false : refreshing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        onViewableItemsChanged={onViewableItemsChanged}
        ListFooterComponent={listFooterComponent}
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
        removeClippedSubviews
        onContentSizeChange={() => {
          consumeFocusedMemory();
        }}
        keyboardShouldPersistTaps="handled"
      />

      <Modal
        visible={ymModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setYmModalOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setYmModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => {}}
          >
            <AppText
              preset="headline"
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
            >
              월/연도 선택
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.modalItem, { borderColor: theme.colors.border }]}
              onPress={() => jumpToYm(null)}
            >
              <AppText
                preset="body"
                style={[styles.modalItemText, { color: theme.colors.textPrimary }]}
              >
                전체 보기
              </AppText>
            </TouchableOpacity>

            {availableYmList.map(ym => (
              <TouchableOpacity
                key={ym}
                activeOpacity={0.9}
                style={[styles.modalItem, { borderColor: theme.colors.border }]}
                onPress={() => jumpToYm(ym)}
              >
                <AppText
                  preset="body"
                  style={[styles.modalItemText, { color: theme.colors.textPrimary }]}
                >
                  {humanizeTimelineMonthKey(ym)}
                </AppText>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={otherModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOtherModalOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setOtherModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => {}}
          >
            <AppText
              preset="headline"
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
            >
              생활 카테고리
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.modalItem, { borderColor: theme.colors.border }]}
              onPress={clearOtherSub}
            >
              <AppText
                preset="body"
                style={[styles.modalItemText, { color: theme.colors.textPrimary }]}
              >
                전체 보기
              </AppText>
            </TouchableOpacity>

            {OTHER_SUBCATEGORY_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.9}
                style={[styles.modalItem, { borderColor: theme.colors.border }]}
                onPress={() => applyOtherSub(option.key)}
              >
                <AppText
                  preset="body"
                  style={[styles.modalItemText, { color: theme.colors.textPrimary }]}
                >
                  {option.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
