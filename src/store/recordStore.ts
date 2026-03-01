// 파일: src/store/recordStore.ts
// 목적:
// - petId 별 memories(records) 캐시/상태 관리
// - Home(최근기록) / Timeline(전체) / Detail(상세)에서 동일 데이터 공유
// - pull-to-refresh / pagination(load more) / optimistic update 지원

import { create } from 'zustand';
import type { MemoryRecord } from '../services/supabase/memories';
import { fetchMemoriesByPet } from '../services/supabase/memories';

type PetRecordsState = {
  // ---------------------------------------------------------
  // 1) 데이터
  // ---------------------------------------------------------
  items: MemoryRecord[];

  // ---------------------------------------------------------
  // 2) paging
  // - cursor: 마지막 item의 createdAt (created_at 기준 페이지네이션)
  // ---------------------------------------------------------
  cursor: string | null;
  hasMore: boolean;

  // ---------------------------------------------------------
  // 3) UI 상태
  // ---------------------------------------------------------
  booted: boolean;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  errorMessage: string | null;
};

type RecordStore = {
  // ---------------------------------------------------------
  // 0) petId → state map
  // ---------------------------------------------------------
  byPetId: Record<string, PetRecordsState>;

  // ---------------------------------------------------------
  // 1) selectors/helpers
  // ---------------------------------------------------------
  ensurePetState: (petId: string) => void;
  getPetState: (petId: string) => PetRecordsState;

  // ---------------------------------------------------------
  // 2) actions (읽기)
  // ---------------------------------------------------------
  bootstrap: (petId: string) => Promise<void>;
  refresh: (petId: string) => Promise<void>;
  loadMore: (petId: string) => Promise<void>;

  // ---------------------------------------------------------
  // 3) actions (쓰기/동기화)
  // ---------------------------------------------------------
  replaceAll: (petId: string, items: MemoryRecord[]) => void;
  upsertOneLocal: (petId: string, item: MemoryRecord) => void;
  removeOneLocal: (petId: string, memoryId: string) => void;

  // ---------------------------------------------------------
  // 4) 관리
  // ---------------------------------------------------------
  clearPet: (petId: string) => void;
  clearAll: () => void;
};

// ---------------------------------------------------------
// 0) 초기 state
// ---------------------------------------------------------
const createInitialPetState = (): PetRecordsState => ({
  items: [],
  cursor: null,
  hasMore: true,

  booted: false,
  loading: false,
  refreshing: false,
  loadingMore: false,
  errorMessage: null,
});

// ---------------------------------------------------------
// 1) store
// ---------------------------------------------------------
export const useRecordStore = create<RecordStore>((set, get) => ({
  byPetId: {},

  // ---------------------------------------------------------
  // 1) internal helpers
  // ---------------------------------------------------------
  ensurePetState: (petId: string) => {
    const cur = get().byPetId[petId];
    if (cur) return;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: createInitialPetState(),
      },
    }));
  },

  getPetState: (petId: string) => {
    const cur = get().byPetId[petId];
    return cur ?? createInitialPetState();
  },

  // ---------------------------------------------------------
  // 2) bootstrap (최초 1회)
  // ---------------------------------------------------------
  bootstrap: async (petId: string) => {
    if (!petId) return;

    get().ensurePetState(petId);

    const st = get().getPetState(petId);
    if (st.booted || st.loading) return;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: { ...s.byPetId[petId], loading: true, errorMessage: null },
      },
    }));

    try {
      const page = await fetchMemoriesByPet(petId, { limit: 20 });

      const cursor = page.items.length
        ? page.items[page.items.length - 1].createdAt
        : null;

      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            items: page.items,
            cursor,
            hasMore: page.hasMore,
            booted: true,
            loading: false,
            errorMessage: null,
          },
        },
      }));
    } catch (e: any) {
      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            loading: false,
            booted: true,
            errorMessage: e?.message ?? '불러오기에 실패했습니다.',
          },
        },
      }));
    }
  },

  // ---------------------------------------------------------
  // 3) refresh (pull-to-refresh)
  // ---------------------------------------------------------
  refresh: async (petId: string) => {
    if (!petId) return;

    get().ensurePetState(petId);

    const st = get().getPetState(petId);
    if (st.refreshing) return;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: { ...s.byPetId[petId], refreshing: true, errorMessage: null },
      },
    }));

    try {
      const page = await fetchMemoriesByPet(petId, { limit: 20 });

      const cursor = page.items.length
        ? page.items[page.items.length - 1].createdAt
        : null;

      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            items: page.items,
            cursor,
            hasMore: page.hasMore,
            booted: true,
            refreshing: false,
            errorMessage: null,
          },
        },
      }));
    } catch (e: any) {
      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            refreshing: false,
            errorMessage: e?.message ?? '새로고침에 실패했습니다.',
          },
        },
      }));
    }
  },

  // ---------------------------------------------------------
  // 4) loadMore (pagination)
  // ---------------------------------------------------------
  loadMore: async (petId: string) => {
    if (!petId) return;

    get().ensurePetState(petId);

    const st = get().getPetState(petId);
    if (!st.booted) return;
    if (!st.hasMore) return;
    if (st.loadingMore) return;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: { ...s.byPetId[petId], loadingMore: true, errorMessage: null },
      },
    }));

    try {
      const page = await fetchMemoriesByPet(petId, {
        limit: 20,
        cursorCreatedAt: st.cursor,
      });

      const nextCursor = page.items.length
        ? page.items[page.items.length - 1].createdAt
        : st.cursor;

      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            items: dedupeById([...s.byPetId[petId].items, ...page.items]),
            cursor: nextCursor,
            hasMore: page.hasMore,
            loadingMore: false,
            errorMessage: null,
          },
        },
      }));
    } catch (e: any) {
      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            loadingMore: false,
            errorMessage: e?.message ?? '더 불러오기에 실패했습니다.',
          },
        },
      }));
    }
  },

  // ---------------------------------------------------------
  // 5) write helpers
  // ---------------------------------------------------------
  replaceAll: (petId: string, items: MemoryRecord[]) => {
    if (!petId) return;
    get().ensurePetState(petId);

    const cursor = items.length ? items[items.length - 1].createdAt : null;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          items,
          cursor,
          booted: true,
          errorMessage: null,
        },
      },
    }));
  },

  upsertOneLocal: (petId: string, item: MemoryRecord) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => {
      const cur = s.byPetId[petId];
      const next = upsertById(cur.items, item);
      const sorted = sortByCreatedAtDesc(next);

      return {
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...cur,
            items: sorted,
            booted: true,
          },
        },
      };
    });
  },

  removeOneLocal: (petId: string, memoryId: string) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => {
      const cur = s.byPetId[petId];
      return {
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...cur,
            items: cur.items.filter(it => it.id !== memoryId),
            booted: true,
          },
        },
      };
    });
  },

  // ---------------------------------------------------------
  // 6) management
  // ---------------------------------------------------------
  clearPet: (petId: string) => {
    if (!petId) return;
    set(s => {
      const next = { ...s.byPetId };
      delete next[petId];
      return { byPetId: next };
    });
  },

  clearAll: () => set({ byPetId: {} }),
}));

// ---------------------------------------------------------
// utils
// ---------------------------------------------------------
function sortByCreatedAtDesc(items: MemoryRecord[]) {
  return [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function upsertById(items: MemoryRecord[], next: MemoryRecord) {
  const idx = items.findIndex(it => it.id === next.id);
  if (idx === -1) return [...items, next];
  const copy = [...items];
  copy[idx] = next;
  return copy;
}

function dedupeById(items: MemoryRecord[]) {
  const map = new Map<string, MemoryRecord>();
  for (const it of items) map.set(it.id, it);
  return Array.from(map.values());
}
