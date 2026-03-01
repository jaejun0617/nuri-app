// 파일: src/store/recordStore.ts
// 목적:
// - petId 별 records 캐시 관리 (단순 배열 기반)
// - memories.ts(fetchMemoriesByPet) 구조와 100% 정합
// - optimistic update 지원
//
// 중요(⚠️ Fabric/SyncExternalStore 이슈 방지):
// - getPetState에서 "없는 상태"를 매번 새 객체로 만들면 snapshot이 매번 달라져
//   React가 무한 루프 위험으로 판단 → 경고/블랙스크린/렌더 멈춤이 발생할 수 있음
// - 따라서 fallback은 "항상 동일 참조"로 유지해야 한다.

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

// ✅ 핵심: fallback은 "항상 같은 객체"여야 함 (new architecture 안전)
const FALLBACK_PET_STATE: PetRecordsState = createInitialPetState();

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

  // ⚠️ 여기서 매번 createInitialPetState() 만들면 snapshot 흔들림 발생
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
    if (st.booted || st.loading) return;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          loading: true,
          errorMessage: null,
        },
      },
    }));

    try {
      const items = await fetchMemoriesByPet(petId);

      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            items,
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
  // 새로고침
  // ---------------------------------------------------------
  refresh: async (petId: string) => {
    if (!petId) return;

    get().ensurePetState(petId);

    const st = get().getPetState(petId);
    if (st.refreshing) return;

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          refreshing: true,
          errorMessage: null,
        },
      },
    }));

    try {
      const items = await fetchMemoriesByPet(petId);

      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            items,
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
            booted: true,
            errorMessage: e?.message ?? '새로고침 실패',
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
            items: next,
            booted: true,
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
          booted: true,
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
