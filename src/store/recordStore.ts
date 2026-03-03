// 파일: src/store/recordStore.ts
// 목적:
// - petId 별 records 캐시 관리 (상태머신 기반)
// - memories.ts(fetchMemoriesByPet)와 100% 정합
// - optimistic update 지원 (create/edit/delete 직후 즉시 반영)
//
// 중요(⚠️ Fabric/SyncExternalStore 이슈 방지):
// - selector에서 "없는 상태"를 매번 새 객체로 만들면 snapshot이 흔들려
//   React가 무한 루프 위험으로 판단 → 경고/블랙스크린/렌더 멈춤 발생 가능
// - 따라서 fallback은 "항상 동일 참조"로 유지해야 한다.
//
// ✅ Chapter 5 고정 원칙
// 1) 상태는 boolean 조합이 아니라 "단일 상태(status)"로 고정
// 2) 화면에서는 byPetId[petId] 직접 구독(또는 selector factory)만 사용
// 3) bootstrap은 1회만 수행(ready면 재호출 무시), refresh는 강제 재동기화
// 4) optimistic 작업은 store 내 순수 로컬 write helper로만 처리

import { create } from 'zustand';
import type { MemoryRecord } from '../services/supabase/memories';
import { fetchMemoriesByPet } from '../services/supabase/memories';

/* ---------------------------------------------------------
 * 0) types
 * -------------------------------------------------------- */
export type RecordStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'error';

export type PetRecordsState = {
  status: RecordStatus;
  items: MemoryRecord[];
  errorMessage: string | null;

  // 확장 슬롯(향후 pagination 고정 시 사용)
  cursor: string | null;
  hasMore: boolean;
};

export type RecordStore = {
  byPetId: Record<string, PetRecordsState>;

  // ---------------------------------------------------------
  // selectors (factory)
  // ---------------------------------------------------------
  selectPet: (petId: string | null) => PetRecordsState;

  // ---------------------------------------------------------
  // lifecycle
  // ---------------------------------------------------------
  ensurePetState: (petId: string) => void;
  bootstrap: (petId: string) => Promise<void>;
  refresh: (petId: string) => Promise<void>;

  // ---------------------------------------------------------
  // write helpers (optimistic)
  // ---------------------------------------------------------
  replaceAll: (petId: string, items: MemoryRecord[]) => void;
  upsertOneLocal: (petId: string, item: MemoryRecord) => void;
  removeOneLocal: (petId: string, memoryId: string) => void;

  // ---------------------------------------------------------
  // clear
  // ---------------------------------------------------------
  clearPet: (petId: string) => void;
  clearAll: () => void;
};

/* ---------------------------------------------------------
 * 1) state factories
 * -------------------------------------------------------- */
const createInitialPetState = (): PetRecordsState => ({
  status: 'idle',
  items: [],
  errorMessage: null,

  cursor: null,
  hasMore: false,
});

// ✅ 핵심: fallback은 "항상 같은 객체(같은 참조)"로 고정
const FALLBACK_PET_STATE: PetRecordsState = Object.freeze(
  createInitialPetState(),
);

/* ---------------------------------------------------------
 * 2) selector factory (외부에서도 재사용 가능)
 * -------------------------------------------------------- */
// - 화면에서: useRecordStore(s => selectPetRecords(petId)(s)) 형태로도 가능
export const selectPetRecords =
  (petId: string | null) =>
  (state: Pick<RecordStore, 'byPetId'>): PetRecordsState => {
    if (!petId) return FALLBACK_PET_STATE;
    return state.byPetId[petId] ?? FALLBACK_PET_STATE;
  };

/* ---------------------------------------------------------
 * 3) store
 * -------------------------------------------------------- */
export const useRecordStore = create<RecordStore>((set, get) => ({
  byPetId: {},

  // ---------------------------------------------------------
  // selectors
  // ---------------------------------------------------------
  selectPet: (petId: string | null) => {
    if (!petId) return FALLBACK_PET_STATE;
    return get().byPetId[petId] ?? FALLBACK_PET_STATE;
  },

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

  // ---------------------------------------------------------
  // bootstrap (최초 1회)
  // ---------------------------------------------------------
  bootstrap: async (petId: string) => {
    if (!petId) return;

    get().ensurePetState(petId);

    const st = get().byPetId[petId];
    if (!st) return;

    // ✅ ready면 재호출 금지, loading/refreshing 중이면 중복 방지
    if (
      st.status === 'ready' ||
      st.status === 'loading' ||
      st.status === 'refreshing'
    ) {
      return;
    }

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          status: 'loading',
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
            status: 'ready',
            items,
            errorMessage: null,
            // pagination 슬롯은 추후 loadMore 고정 시 채움
            cursor: null,
            hasMore: false,
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
  // refresh (강제 재동기화)
  // ---------------------------------------------------------
  refresh: async (petId: string) => {
    if (!petId) return;

    get().ensurePetState(petId);

    const st = get().byPetId[petId];
    if (!st) return;

    // ✅ refresh 중복 방지
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
      const items = await fetchMemoriesByPet(petId);

      set(s => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...s.byPetId[petId],
            status: 'ready',
            items,
            errorMessage: null,
            cursor: null,
            hasMore: false,
          },
        },
      }));
    } catch (e: any) {
      // refresh 실패 시에도 기존 items는 유지 (UX 안전)
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
  // write helpers (optimistic)
  // ---------------------------------------------------------
  replaceAll: (petId, items) => {
    if (!petId) return;
    get().ensurePetState(petId);

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          status: 'ready',
          items,
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
            status: 'ready',
            items: next,
            errorMessage: null,
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
          status: 'ready',
          items: s.byPetId[petId].items.filter(it => it.id !== memoryId),
          errorMessage: null,
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
