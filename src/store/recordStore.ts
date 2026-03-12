// 파일: src/store/recordStore.ts
// 목적:
// - petId 별 records 캐시(페이지네이션 + 상태머신)
// - cursor(created_at) 고정
// - out-of-order 응답 방지(요청 토큰/requestSeq)
// - signed url은 services(fetchMemoriesByPetPage)에서 캐싱/프리패치 처리
//
// ✅ 성능 최적화(중요):
// - loadMore에서 전체 merge + 전체 sort 금지
// - 커서 기반 페이지네이션은 "다음 page는 항상 더 오래된 항목"이므로
//   기존 리스트 뒤에 append 하되, overlap(중복 id)만 제거하는 방식으로 처리
//
// 중요(⚠️ New Architecture/SyncExternalStore 안전):
// - fallback 객체는 항상 동일 참조(FALLBACK_PET_STATE)
// - selector는 byPetId[petId] 직접 접근(가장 안전)

import { create } from 'zustand';
import { getErrorMessage } from '../services/app/errors';
import { getRecordSortTimestamp } from '../services/records/date';
import { normalizeMemoryRecord } from '../services/records/imageSources';
import { compareTimelineRecords } from '../services/timeline/query';
import type { MemoryRecord } from '../services/supabase/memories';
import {
  encodeMemoriesCursor,
  fetchMemoriesByPetPage,
} from '../services/supabase/memories';

type Status =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'loadingMore'
  | 'error';

export type PetRecordsState = {
  items: MemoryRecord[];
  status: Status;
  errorMessage: string | null;

  cursor: string | null;
  hasMore: boolean;

  requestSeq: number;
};

export type TimelineRecordsState = {
  ids: string[];
  status: Status;
  errorMessage: string | null;
  cursor: string | null;
  hasMore: boolean;
  requestSeq: number;
  entityVersion: number;
};

type RecordStore = {
  byPetId: Record<string, PetRecordsState>;
  recordsById: Record<string, MemoryRecord>;
  timelineByPetId: Record<string, TimelineRecordsState>;
  focusedMemoryIdByPet: Record<string, string | null>;

  ensurePetState: (petId: string) => void;
  getPetState: (petId: string) => PetRecordsState;
  getTimelineState: (petId: string) => TimelineRecordsState;
  selectLegacyPetRecordsState: (
    petId: string | null | undefined,
  ) => PetRecordsState;
  selectRecordById: (memoryId: string | null | undefined) => MemoryRecord | null;
  selectTimelineIdsByPetId: (
    petId: string | null | undefined,
  ) => string[];
  selectTimelineStatusByPetId: (
    petId: string | null | undefined,
  ) => Status;
  selectTimelineHasMoreByPetId: (
    petId: string | null | undefined,
  ) => boolean;
  selectTimelineEntityVersionByPetId: (
    petId: string | null | undefined,
  ) => number;

  bootstrap: (petId: string) => Promise<void>;
  refresh: (petId: string) => Promise<void>;
  loadMore: (petId: string) => Promise<void>;

  replaceAll: (petId: string, items: MemoryRecord[]) => void;
  upsertOneLocal: (petId: string, item: MemoryRecord) => void;

  updateOneLocal: (
    petId: string,
    memoryId: string,
    patch: Partial<MemoryRecord>,
  ) => void;

  removeOneLocal: (petId: string, memoryId: string) => void;
  setFocusedMemoryId: (petId: string, memoryId: string | null) => void;
  clearFocusedMemoryId: (petId: string) => void;

  clearPet: (petId: string) => void;
  clearAll: () => void;
};

const PAGE_SIZE = 20;

const createInitialPetState = (): PetRecordsState => ({
  items: [],
  status: 'idle',
  errorMessage: null,
  cursor: null,
  hasMore: true,
  requestSeq: 0,
});

const createInitialTimelineState = (): TimelineRecordsState => ({
  ids: [],
  status: 'idle',
  errorMessage: null,
  cursor: null,
  hasMore: true,
  requestSeq: 0,
  entityVersion: 0,
});

// ✅ fallback은 동일 참조 고정
const FALLBACK_PET_STATE: PetRecordsState = Object.freeze(
  createInitialPetState(),
);
const FALLBACK_TIMELINE_STATE: TimelineRecordsState = Object.freeze(
  createInitialTimelineState(),
);
const EMPTY_TIMELINE_IDS: string[] = [];
Object.freeze(EMPTY_TIMELINE_IDS);

function sortByDisplayDateDesc(items: MemoryRecord[]) {
  items.sort((a, b) => {
    const diff = getRecordSortTimestamp(b) - getRecordSortTimestamp(a);
    if (diff !== 0) return diff;
    return compareTimelineRecords(a, b);
  });
}

function normalizeRecordItems(items: MemoryRecord[]) {
  return items.map(item => normalizeMemoryRecord(item));
}

function hasOwnKey<T extends object>(value: T, key: keyof MemoryRecord) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function deriveTimelineImageFields(
  input: Partial<MemoryRecord>,
): Pick<MemoryRecord, 'timelineImagePath' | 'timelineImageVariant'> {
  const primaryStoragePath =
    input.imagePaths?.find(path => `${path ?? ''}`.trim()) ??
    `${input.imagePath ?? ''}`.trim() ??
    null;
  const directImageUrl = `${input.imageUrl ?? ''}`.trim();

  if (directImageUrl) {
    return {
      timelineImagePath: null,
      timelineImageVariant: null,
    };
  }

  return {
    timelineImagePath: primaryStoragePath || null,
    timelineImageVariant: primaryStoragePath ? 'timeline-thumb' : null,
  };
}

function withNormalizedTimelineFields<T extends Partial<MemoryRecord>>(input: T): T {
  const hasTimelineFields =
    hasOwnKey(input, 'timelineImagePath') || hasOwnKey(input, 'timelineImageVariant');
  if (hasTimelineFields) return input;

  const hasImageFields =
    hasOwnKey(input, 'imagePath') ||
    hasOwnKey(input, 'imagePaths') ||
    hasOwnKey(input, 'imageUrl');
  if (!hasImageFields) return input;

  return {
    ...input,
    ...deriveTimelineImageFields(input),
  };
}

function upsertRecordEntities(
  prev: Record<string, MemoryRecord>,
  items: MemoryRecord[],
) {
  if (items.length === 0) return prev;

  const next = { ...prev };
  for (const item of items) {
    next[item.id] = item;
  }
  return next;
}

function toTimelineState(petState: PetRecordsState): TimelineRecordsState {
  return {
    ids: petState.items.map(item => item.id),
    status: petState.status,
    errorMessage: petState.errorMessage,
    cursor: petState.cursor,
    hasMore: petState.hasMore,
    requestSeq: petState.requestSeq,
    entityVersion: 0,
  };
}

function buildPetStateFromTimeline(
  timelineState: TimelineRecordsState,
  recordsById: Record<string, MemoryRecord>,
): PetRecordsState {
  return {
    items: timelineState.ids
      .map(id => recordsById[id])
      .filter((item): item is MemoryRecord => Boolean(item)),
    status: timelineState.status,
    errorMessage: timelineState.errorMessage,
    cursor: timelineState.cursor,
    hasMore: timelineState.hasMore,
    requestSeq: timelineState.requestSeq,
  };
}

function sortTimelineIdsByDisplayDateDesc(
  ids: string[],
  recordsById: Record<string, MemoryRecord>,
) {
  ids.sort((a, b) => {
    const left = recordsById[a];
    const right = recordsById[b];
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;

    const diff = getRecordSortTimestamp(right) - getRecordSortTimestamp(left);
    if (diff !== 0) return diff;
    return compareTimelineRecords(left, right);
  });
}

function getNextCursorFromTimelineIds(
  ids: string[],
  recordsById: Record<string, MemoryRecord>,
) {
  const items = ids
    .map(id => recordsById[id])
    .filter((item): item is MemoryRecord => Boolean(item));
  return getNextCursorFromItems(items);
}

function removeRecordEntityById(
  prev: Record<string, MemoryRecord>,
  memoryId: string,
) {
  if (!memoryId || !prev[memoryId]) return prev;
  const next = { ...prev };
  delete next[memoryId];
  return next;
}

function getNextCursorFromItems(items: MemoryRecord[]): string | null {
  if (items.length === 0) return null;
  const last = items[items.length - 1] ?? null;
  if (!last) return null;
  return encodeMemoriesCursor(last.createdAt, last.id);
}

/**
 * ✅ 커서 기반 loadMore 최적화
 * - prev: 최신→오래된
 * - nextPage: 더 오래된
 * - 정렬 없이 append, 중복 id만 제거
 */
function appendPageUniqueById(prev: MemoryRecord[], nextPage: MemoryRecord[]) {
  if (nextPage.length === 0) return prev;

  const seen = new Set<string>();
  for (const it of prev) seen.add(it.id);

  const append: MemoryRecord[] = [];
  for (const it of nextPage) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    append.push(it);
  }

  if (append.length === 0) return prev;
  return prev.concat(append);
}

export const useRecordStore = create<RecordStore>((set, get) => ({
  byPetId: {},
  recordsById: {},
  timelineByPetId: {},
  focusedMemoryIdByPet: {},

  ensurePetState: petId => {
    if (!petId) return;
    const cur = get().byPetId[petId];
    if (cur) return;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: createInitialPetState(),
      },
      timelineByPetId: {
        ...s.timelineByPetId,
        [petId]: createInitialTimelineState(),
      },
    }));
  },

  getPetState: petId => {
    if (!petId) return FALLBACK_PET_STATE;
    return get().byPetId[petId] ?? FALLBACK_PET_STATE;
  },

  getTimelineState: petId => {
    if (!petId) return FALLBACK_TIMELINE_STATE;
    return get().timelineByPetId[petId] ?? FALLBACK_TIMELINE_STATE;
  },

  selectLegacyPetRecordsState: petId => {
    if (!petId) return FALLBACK_PET_STATE;
    return get().byPetId[petId] ?? FALLBACK_PET_STATE;
  },

  selectRecordById: memoryId => {
    if (!memoryId) return null;

    const state = get();
    const entity = state.recordsById[memoryId];
    if (entity) return entity;

    for (const petState of Object.values(state.byPetId)) {
      const hit = petState.items.find(item => item.id === memoryId);
      if (hit) return hit;
    }

    return null;
  },

  selectTimelineIdsByPetId: petId => {
    if (!petId) return EMPTY_TIMELINE_IDS;

    const state = get();
    const timelineIds = state.timelineByPetId[petId]?.ids;
    if (timelineIds) return timelineIds;
    return state.byPetId[petId]?.items.map(item => item.id) ?? EMPTY_TIMELINE_IDS;
  },

  selectTimelineStatusByPetId: petId => {
    if (!petId) return 'idle';
    return get().timelineByPetId[petId]?.status ?? get().byPetId[petId]?.status ?? 'idle';
  },

  selectTimelineHasMoreByPetId: petId => {
    if (!petId) return false;
    return get().timelineByPetId[petId]?.hasMore ?? get().byPetId[petId]?.hasMore ?? false;
  },

  selectTimelineEntityVersionByPetId: petId => {
    if (!petId) return 0;
    return get().timelineByPetId[petId]?.entityVersion ?? 0;
  },

  // ---------------------------------------------------------
  // 최초 로딩
  // ---------------------------------------------------------
  bootstrap: async petId => {
    if (!petId) return;

    get().ensurePetState(petId);
    const st = get().getPetState(petId);

    if (st.status === 'ready' && st.items.length > 0) return;

    if (
      st.status === 'loading' ||
      st.status === 'refreshing' ||
      st.status === 'loadingMore'
    ) {
      return;
    }

    const req = st.requestSeq + 1;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          status: 'loading',
          errorMessage: null,
          requestSeq: req,
        },
      },
    }));

    try {
      const page = await fetchMemoriesByPetPage({
        petId,
        limit: PAGE_SIZE,
        cursor: null,
        prefetchTop: 10,
      });

      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        const items = normalizeRecordItems([...page.items]);
        sortByDisplayDateDesc(items);
        const nextPetState: PetRecordsState = {
          ...cur,
          items,
          status: 'ready',
          errorMessage: null,
          cursor: page.nextCursor,
          hasMore: page.hasMore,
        };

        return {
          recordsById: upsertRecordEntities(s.recordsById, items),
          byPetId: {
            ...s.byPetId,
            [petId]: nextPetState,
          },
          timelineByPetId: {
            ...s.timelineByPetId,
            [petId]: {
              ...toTimelineState(nextPetState),
              entityVersion:
                (s.timelineByPetId[petId]?.entityVersion ?? 0) + 1,
            },
          },
        };
      });
    } catch (error: unknown) {
      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              status: 'error',
              errorMessage: getErrorMessage(error) || '불러오기 실패',
            },
          },
        };
      });
    }
  },

  // ---------------------------------------------------------
  // 새로고침(커서 리셋)
  // ---------------------------------------------------------
  refresh: async (petId: string) => {
    if (!petId) return;

    get().ensurePetState(petId);
    const st = get().getPetState(petId);

    if (st.status === 'refreshing') return;

    const req = st.requestSeq + 1;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          status: 'refreshing',
          errorMessage: null,
          requestSeq: req,
        },
      },
    }));

    try {
      const page = await fetchMemoriesByPetPage({
        petId,
        limit: PAGE_SIZE,
        cursor: null,
        prefetchTop: 10,
      });

      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        const items = normalizeRecordItems([...page.items]);
        sortByDisplayDateDesc(items);
        const nextPetState: PetRecordsState = {
          ...cur,
          items,
          status: 'ready',
          errorMessage: null,
          cursor: page.nextCursor,
          hasMore: page.hasMore,
        };

        return {
          recordsById: upsertRecordEntities(s.recordsById, items),
          byPetId: {
            ...s.byPetId,
            [petId]: nextPetState,
          },
          timelineByPetId: {
            ...s.timelineByPetId,
            [petId]: {
              ...toTimelineState(nextPetState),
              entityVersion:
                (s.timelineByPetId[petId]?.entityVersion ?? 0) + 1,
            },
          },
        };
      });
    } catch (error: unknown) {
      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              status: 'error',
              errorMessage: getErrorMessage(error) || '새로고침 실패',
            },
          },
        };
      });
    }
  },

  // ---------------------------------------------------------
  // 더 불러오기(커서 기반) ✅ 최적화
  // ---------------------------------------------------------
  loadMore: async petId => {
    if (!petId) return;

    get().ensurePetState(petId);
    const st = get().getPetState(petId);

    if (!st.hasMore) return;

    if (
      st.status === 'loading' ||
      st.status === 'refreshing' ||
      st.status === 'loadingMore'
    ) {
      return;
    }

    const req = st.requestSeq;
    const cursorSnapshot = st.cursor;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          status: 'loadingMore',
          errorMessage: null,
        },
      },
    }));

    try {
      const page = await fetchMemoriesByPetPage({
        petId,
        limit: PAGE_SIZE,
        cursor: cursorSnapshot,
        prefetchTop: 10,
      });

      set(s => {
        const cur = s.byPetId[petId];
        if (!cur) return s;
        if (cur.requestSeq !== req) return s;

        const nextPage = normalizeRecordItems(page.items);
        sortByDisplayDateDesc(nextPage);
        const nextItems = appendPageUniqueById(cur.items, nextPage);
        const nextPetState: PetRecordsState = {
          ...cur,
          items: nextItems,
          status: 'ready',
          errorMessage: null,
          cursor: page.nextCursor,
          hasMore: page.hasMore,
        };

        return {
          recordsById: upsertRecordEntities(s.recordsById, nextItems),
          byPetId: {
            ...s.byPetId,
            [petId]: nextPetState,
          },
          timelineByPetId: {
            ...s.timelineByPetId,
            [petId]: {
              ...toTimelineState(nextPetState),
              entityVersion:
                (s.timelineByPetId[petId]?.entityVersion ?? 0) + 1,
            },
          },
        };
      });
    } catch (error: unknown) {
      set(s => {
        const cur = s.byPetId[petId];
        if (!cur) return s;

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              status: 'ready',
              errorMessage: getErrorMessage(error) || '더 불러오기 실패',
            },
          },
        };
      });
    }
  },

  // ---------------------------------------------------------
  // write helpers
  // ---------------------------------------------------------
  replaceAll: (petId, items) => {
    if (!petId) return;
    get().ensurePetState(petId);

    const next = normalizeRecordItems([...items]);
    sortByDisplayDateDesc(next);

    set(s => ({
      recordsById: upsertRecordEntities(s.recordsById, next),
      byPetId: {
        ...s.byPetId,
        [petId]: {
          items: next,
          status: 'ready',
          errorMessage: null,
          cursor: getNextCursorFromItems(next),
          hasMore: next.length >= PAGE_SIZE,
          requestSeq: s.byPetId[petId]?.requestSeq ?? 0,
        },
      },
      timelineByPetId: {
        ...s.timelineByPetId,
        [petId]: {
          ids: next.map(item => item.id),
          status: 'ready',
          errorMessage: null,
          cursor: getNextCursorFromItems(next),
          hasMore: next.length >= PAGE_SIZE,
          requestSeq: s.timelineByPetId[petId]?.requestSeq ?? 0,
          entityVersion: (s.timelineByPetId[petId]?.entityVersion ?? 0) + 1,
        },
      },
    }));
  },

  upsertOneLocal: (petId, item) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => {
      const normalizedItem = normalizeMemoryRecord(
        withNormalizedTimelineFields(item),
      );
      const nextRecordsById = upsertRecordEntities(s.recordsById, [normalizedItem]);
      const curTimeline =
        s.timelineByPetId[petId] ?? createInitialTimelineState();
      const nextIds = curTimeline.ids.filter(id => id !== normalizedItem.id);
      nextIds.unshift(normalizedItem.id);
      sortTimelineIdsByDisplayDateDesc(nextIds, nextRecordsById);

      const nextTimelineState: TimelineRecordsState = {
        ...curTimeline,
        ids: nextIds,
        status: 'ready',
        cursor: getNextCursorFromTimelineIds(nextIds, nextRecordsById),
        entityVersion: curTimeline.entityVersion + 1,
      };
      const nextPetState = buildPetStateFromTimeline(
        nextTimelineState,
        nextRecordsById,
      );

      return {
        recordsById: nextRecordsById,
        byPetId: {
          ...s.byPetId,
          [petId]: nextPetState,
        },
        timelineByPetId: {
          ...s.timelineByPetId,
          [petId]: nextTimelineState,
        },
      };
    });
  },

  updateOneLocal: (petId, memoryId, patch) => {
    if (!petId || !memoryId) return;
    get().ensurePetState(petId);

    set(s => {
      const current =
        s.recordsById[memoryId] ??
        s.byPetId[petId]?.items.find(item => item.id === memoryId);
      if (!current) return s;

      const nextRecord = normalizeMemoryRecord({
        ...current,
        ...patch,
        ...withNormalizedTimelineFields(patch),
      });
      const nextRecordsById = upsertRecordEntities(s.recordsById, [nextRecord]);
      const curTimeline =
        s.timelineByPetId[petId] ?? createInitialTimelineState();
      const nextIds = curTimeline.ids.includes(memoryId)
        ? [...curTimeline.ids]
        : [memoryId, ...curTimeline.ids];
      sortTimelineIdsByDisplayDateDesc(nextIds, nextRecordsById);

      const nextTimelineState: TimelineRecordsState = {
        ...curTimeline,
        ids: nextIds,
        status: 'ready',
        cursor: getNextCursorFromTimelineIds(nextIds, nextRecordsById),
        entityVersion: curTimeline.entityVersion + 1,
      };
      const nextPetState = buildPetStateFromTimeline(
        nextTimelineState,
        nextRecordsById,
      );

      return {
        recordsById: nextRecordsById,
        byPetId: {
          ...s.byPetId,
          [petId]: nextPetState,
        },
        timelineByPetId: {
          ...s.timelineByPetId,
          [petId]: nextTimelineState,
        },
      };
    });
  },

  removeOneLocal: (petId, memoryId) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => {
      const nextRecordsById = removeRecordEntityById(s.recordsById, memoryId);
      const curTimeline =
        s.timelineByPetId[petId] ?? createInitialTimelineState();
      const nextIds = curTimeline.ids.filter(id => id !== memoryId);
      const nextTimelineState: TimelineRecordsState = {
        ...curTimeline,
        ids: nextIds,
        status: 'ready',
        cursor: getNextCursorFromTimelineIds(nextIds, nextRecordsById),
        entityVersion: curTimeline.entityVersion + 1,
      };
      const nextPetState = buildPetStateFromTimeline(
        nextTimelineState,
        nextRecordsById,
      );

      return {
        recordsById: nextRecordsById,
        byPetId: {
          ...s.byPetId,
          [petId]: nextPetState,
        },
        timelineByPetId: {
          ...s.timelineByPetId,
          [petId]: nextTimelineState,
        },
      };
    });
  },

  setFocusedMemoryId: (petId, memoryId) => {
    if (!petId) return;
    set(s => ({
      focusedMemoryIdByPet: {
        ...s.focusedMemoryIdByPet,
        [petId]: memoryId,
      },
    }));
  },

  clearFocusedMemoryId: petId => {
    if (!petId) return;
    set(s => ({
      focusedMemoryIdByPet: {
        ...s.focusedMemoryIdByPet,
        [petId]: null,
      },
    }));
  },

  // ---------------------------------------------------------
  // clear
  // ---------------------------------------------------------
  clearPet: petId => {
    if (!petId) return;
    set(s => {
      const next = { ...s.byPetId };
      const nextTimeline = { ...s.timelineByPetId };
      const nextFocused = { ...s.focusedMemoryIdByPet };
      delete next[petId];
      delete nextTimeline[petId];
      delete nextFocused[petId];
      return {
        byPetId: next,
        timelineByPetId: nextTimeline,
        focusedMemoryIdByPet: nextFocused,
      };
    });
  },

  clearAll: () =>
    set({
      byPetId: {},
      recordsById: {},
      timelineByPetId: {},
      focusedMemoryIdByPet: {},
    }),
}));
