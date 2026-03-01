// 파일: src/store/recordStore.ts
// 목적:
// - petId 별 records 캐시 관리 (단순 배열 기반)
// - pagination 제거 (현재 memories.ts 구조와 100% 정합)
// - optimistic update 지원

import { create } from 'zustand';
import type { MemoryRecord } from '../services/supabase/memories';
import { fetchMemoriesByPet } from '../services/supabase/memories';

type PetRecordsState = {
  items: MemoryRecord[];
  loading: boolean;
  refreshing: boolean;
  booted: boolean;
  errorMessage: string | null;
};

type RecordStore = {
  byPetId: Record<string, PetRecordsState>;

  ensurePetState: (petId: string) => void;
  getPetState: (petId: string) => PetRecordsState;

  bootstrap: (petId: string) => Promise<void>;
  refresh: (petId: string) => Promise<void>;

  replaceAll: (petId: string, items: MemoryRecord[]) => void;
  upsertOneLocal: (petId: string, item: MemoryRecord) => void;
  removeOneLocal: (petId: string, memoryId: string) => void;

  clearPet: (petId: string) => void;
  clearAll: () => void;
};

const createInitialPetState = (): PetRecordsState => ({
  items: [],
  loading: false,
  refreshing: false,
  booted: false,
  errorMessage: null,
});

export const useRecordStore = create<RecordStore>((set, get) => ({
  byPetId: {},

  // ---------------------------------------------------------
  // 1) helpers
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
    return get().byPetId[petId] ?? createInitialPetState();
  },

  // ---------------------------------------------------------
  // 2) 최초 로딩
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
      const items = await fetchMemoriesByPet(petId);

      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            items: sortByCreatedAtDesc(items),
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
            errorMessage: e?.message ?? '불러오기 실패',
          },
        },
      }));
    }
  },

  // ---------------------------------------------------------
  // 3) 새로고침
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
      const items = await fetchMemoriesByPet(petId);

      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            items: sortByCreatedAtDesc(items),
            refreshing: false,
            booted: true,
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
            errorMessage: e?.message ?? '새로고침 실패',
          },
        },
      }));
    }
  },

  // ---------------------------------------------------------
  // 4) write helpers
  // ---------------------------------------------------------
  replaceAll: (petId, items) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          items: sortByCreatedAtDesc(items),
          booted: true,
          errorMessage: null,
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

      return {
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...cur,
            items: sortByCreatedAtDesc(next),
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
        },
      },
    }));
  },

  // ---------------------------------------------------------
  // 5) clear
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

function sortByCreatedAtDesc(items: MemoryRecord[]) {
  return [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
