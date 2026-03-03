// 파일: src/store/recordStore.ts
// 목적:
// - petId 별 records 캐시(페이지네이션 + 상태머신)
// - cursor(created_at) 고정
// - signed url은 services에서 캐싱/프리패치 처리
//
// 중요(⚠️ New Architecture/SyncExternalStore 안전):
// - fallback 객체는 항상 동일 참조(FALLBACK_PET_STATE)
// - selector는 byPetId[petId] 직접 접근(가장 안전)

import { create } from 'zustand';
import type { MemoryRecord } from '../services/supabase/memories';
import { fetchMemoriesByPetPage } from '../services/supabase/memories';

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

  // pagination
  cursor: string | null; // createdAt
  hasMore: boolean;
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
  removeOneLocal: (petId: string, memoryId: string) => void;

  clearPet: (petId: string) => void;
  clearAll: () => void;
};

const createInitialPetState = (): PetRecordsState => ({
  items: [],
  status: 'idle',
  errorMessage: null,

  cursor: null,
  hasMore: true,
});

const FALLBACK_PET_STATE: PetRecordsState = Object.freeze(
  createInitialPetState(),
);

const PAGE_SIZE = 20;

export const useRecordStore = create<RecordStore>((set, get) => ({
  byPetId: {},

  // ---------------------------------------------------------
  // helpers
  // ---------------------------------------------------------
  ensurePetState: (petId: string) => {
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

  getPetState: (petId: string) => {
    if (!petId) return FALLBACK_PET_STATE;
    return get().byPetId[petId] ?? FALLBACK_PET_STATE;
  },

  // ---------------------------------------------------------
  // 최초 로딩
  // ---------------------------------------------------------
  bootstrap: async (petId: string) => {
    if (!petId) return;

    get().ensurePetState(petId);
    const st = get().getPetState(petId);
    if (
      st.status === 'loading' ||
      st.status === 'refreshing' ||
      st.status === 'loadingMore'
    )
      return;
    if (st.status === 'ready' && st.items.length > 0) return;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: { ...s.byPetId[petId], status: 'loading', errorMessage: null },
      },
    }));

    try {
      const page = await fetchMemoriesByPetPage({
        petId,
        limit: PAGE_SIZE,
        cursor: null,
        prefetchTop: 10,
      });

      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            items: page.items,
            status: 'ready',
            errorMessage: null,
            cursor: page.nextCursor,
            hasMore: page.hasMore,
          },
        },
      }));
    } catch (e: any) {
      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            status: 'error',
            errorMessage: e?.message ?? '불러오기 실패',
          },
        },
      }));
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

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          status: 'refreshing',
          errorMessage: null,
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

      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            items: page.items,
            status: 'ready',
            errorMessage: null,
            cursor: page.nextCursor,
            hasMore: page.hasMore,
          },
        },
      }));
    } catch (e: any) {
      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            status: 'error',
            errorMessage: e?.message ?? '새로고침 실패',
          },
        },
      }));
    }
  },

  // ---------------------------------------------------------
  // 더 불러오기(커서 기반)
  // ---------------------------------------------------------
  loadMore: async (petId: string) => {
    if (!petId) return;

    get().ensurePetState(petId);
    const st = get().getPetState(petId);

    if (!st.hasMore) return;
    if (
      st.status === 'loading' ||
      st.status === 'refreshing' ||
      st.status === 'loadingMore'
    )
      return;

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
        cursor: st.cursor,
        prefetchTop: 10,
      });

      set(s => {
        const cur = s.byPetId[petId];

        // ✅ 중복 방지(안전): id 기준 유니크 병합
        const map = new Map<string, MemoryRecord>();
        cur.items.forEach(it => map.set(it.id, it));
        page.items.forEach(it => map.set(it.id, it));
        const merged = Array.from(map.values());

        // createdAt desc 유지(서버도 desc지만 merge 후 보장)
        merged.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              items: merged,
              status: 'ready',
              errorMessage: null,
              cursor: page.nextCursor,
              hasMore: page.hasMore,
            },
          },
        };
      });
    } catch (e: any) {
      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            status: 'error',
            errorMessage: e?.message ?? '더 불러오기 실패',
          },
        },
      }));
    }
  },

  // ---------------------------------------------------------
  // write helpers
  // ---------------------------------------------------------
  replaceAll: (petId, items) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          items,
          status: 'ready',
          errorMessage: null,
          cursor: items.length ? items[items.length - 1].createdAt : null,
          hasMore: true,
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
      if (idx === -1) next.unshift(item);
      else next[idx] = item;

      // 정렬 유지
      next.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

      return {
        byPetId: {
          ...s.byPetId,
          [petId]: { ...cur, items: next, status: 'ready' },
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
