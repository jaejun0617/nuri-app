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

type RecordStore = {
  byPetId: Record<string, PetRecordsState>;

  ensurePetState: (petId: string) => void;
  getPetState: (petId: string) => PetRecordsState;

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

// ✅ fallback은 동일 참조 고정
const FALLBACK_PET_STATE: PetRecordsState = Object.freeze(
  createInitialPetState(),
);

function getDisplaySortValue(item: MemoryRecord): number {
  const occurredAt = (item.occurredAt ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) {
    const time = new Date(`${occurredAt}T23:59:59.999`).getTime();
    if (Number.isFinite(time)) return time;
  }

  const createdTime = new Date(item.createdAt).getTime();
  if (Number.isFinite(createdTime)) return createdTime;
  return 0;
}

function sortByDisplayDateDesc(items: MemoryRecord[]) {
  items.sort((a, b) => {
    const diff = getDisplaySortValue(b) - getDisplaySortValue(a);
    if (diff !== 0) return diff;
    return compareTimelineRecords(a, b);
  });
}

function normalizeRecordItems(items: MemoryRecord[]) {
  return items.map(item => normalizeMemoryRecord(item));
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

  ensurePetState: petId => {
    if (!petId) return;
    const cur = get().byPetId[petId];
    if (cur) return;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: createInitialPetState(),
      },
    }));
  },

  getPetState: petId => {
    if (!petId) return FALLBACK_PET_STATE;
    return get().byPetId[petId] ?? FALLBACK_PET_STATE;
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

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              items,
              status: 'ready',
              errorMessage: null,
              cursor: page.nextCursor,
              hasMore: page.hasMore,
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

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              items,
              status: 'ready',
              errorMessage: null,
              cursor: page.nextCursor,
              hasMore: page.hasMore,
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

        const merged = appendPageUniqueById(
          cur.items,
          normalizeRecordItems(page.items),
        );
        const nextItems = [...merged];
        sortByDisplayDateDesc(nextItems);

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              items: nextItems,
              status: 'ready',
              errorMessage: null,
              cursor: page.nextCursor,
              hasMore: page.hasMore,
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
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          items: next,
          status: 'ready',
          errorMessage: null,
          cursor: getNextCursorFromItems(next),
          hasMore: next.length >= PAGE_SIZE,
        },
      },
    }));
  },

  upsertOneLocal: (petId, item) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => {
      const cur = s.byPetId[petId];
      const idx = cur.items.findIndex(it => it.id === item.id);

      const next = [...cur.items];
      const normalizedItem = normalizeMemoryRecord(item);
      if (idx === -1) next.unshift(normalizedItem);
      else next[idx] = normalizedItem;

      sortByDisplayDateDesc(next);

      return {
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...cur,
            items: next,
            status: 'ready',
            cursor: getNextCursorFromItems(next),
          },
        },
      };
    });
  },

  updateOneLocal: (petId, memoryId, patch) => {
    if (!petId || !memoryId) return;
    get().ensurePetState(petId);

    set(s => {
      const cur = s.byPetId[petId];
      if (!cur) return s;

      const idx = cur.items.findIndex(it => it.id === memoryId);
      if (idx === -1) return s;

      const next = [...cur.items];
      next[idx] = normalizeMemoryRecord({
        ...next[idx],
        ...patch,
      });
      sortByDisplayDateDesc(next);

      return {
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...cur,
            items: next,
            status: 'ready',
            cursor: getNextCursorFromItems(next),
          },
        },
      };
    });
  },

  removeOneLocal: (petId, memoryId) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          items: s.byPetId[petId].items.filter(it => it.id !== memoryId),
          status: 'ready',
          cursor: getNextCursorFromItems(
            s.byPetId[petId].items.filter(it => it.id !== memoryId),
          ),
        },
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
      delete next[petId];
      return { byPetId: next };
    });
  },

  clearAll: () => set({ byPetId: {} }),
}));
