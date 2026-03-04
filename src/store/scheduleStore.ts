// 파일: src/store/scheduleStore.ts
// 목적:
// - petId별 이번 주 일정 캐시
// - 홈 "이번 주 일정" 빠른 조회

import { create } from 'zustand';
import type { PetSchedule } from '../services/supabase/schedules';
import { fetchSchedulesByPetRange } from '../services/supabase/schedules';

type Status = 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';

export type PetSchedulesState = {
  items: PetSchedule[];
  status: Status;
  errorMessage: string | null;
  rangeKey: string | null;
  requestSeq: number;
};

type ScheduleStore = {
  byPetId: Record<string, PetSchedulesState>;
  ensurePetState: (petId: string) => void;
  getPetState: (petId: string) => PetSchedulesState;
  bootstrapWeek: (petId: string, from: string, to: string) => Promise<void>;
  refreshWeek: (petId: string, from: string, to: string) => Promise<void>;
  clearPet: (petId: string) => void;
  clearAll: () => void;
};

const createInitialPetState = (): PetSchedulesState => ({
  items: [],
  status: 'idle',
  errorMessage: null,
  rangeKey: null,
  requestSeq: 0,
});

const FALLBACK_PET_STATE: PetSchedulesState = Object.freeze(
  createInitialPetState(),
);

function createRangeKey(from: string, to: string) {
  return `${from}__${to}`;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  byPetId: {},

  ensurePetState: petId => {
    if (!petId) return;
    if (get().byPetId[petId]) return;

    set(state => ({
      byPetId: {
        ...state.byPetId,
        [petId]: createInitialPetState(),
      },
    }));
  },

  getPetState: petId => {
    if (!petId) return FALLBACK_PET_STATE;
    return get().byPetId[petId] ?? FALLBACK_PET_STATE;
  },

  bootstrapWeek: async (petId, from, to) => {
    if (!petId) return;

    get().ensurePetState(petId);
    const current = get().getPetState(petId);
    const rangeKey = createRangeKey(from, to);

    if (current.status === 'ready' && current.rangeKey === rangeKey) return;
    if (current.status === 'loading' || current.status === 'refreshing') return;

    const requestSeq = current.requestSeq + 1;

    set(state => ({
      byPetId: {
        ...state.byPetId,
        [petId]: {
          ...state.byPetId[petId],
          status: 'loading',
          errorMessage: null,
          rangeKey,
          requestSeq,
        },
      },
    }));

    try {
      const items = await fetchSchedulesByPetRange({ petId, from, to });

      set(state => {
        const latest = state.byPetId[petId];
        if (!latest || latest.requestSeq !== requestSeq) return state;

        return {
          byPetId: {
            ...state.byPetId,
            [petId]: {
              ...latest,
              items,
              status: 'ready',
              errorMessage: null,
              rangeKey,
            },
          },
        };
      });
    } catch (error) {
      set(state => {
        const latest = state.byPetId[petId];
        if (!latest || latest.requestSeq !== requestSeq) return state;

        return {
          byPetId: {
            ...state.byPetId,
            [petId]: {
              ...latest,
              status: 'error',
              errorMessage:
                error instanceof Error ? error.message : '일정을 불러오지 못했어요.',
            },
          },
        };
      });
    }
  },

  refreshWeek: async (petId, from, to) => {
    if (!petId) return;

    get().ensurePetState(petId);
    const current = get().getPetState(petId);
    const rangeKey = createRangeKey(from, to);
    const requestSeq = current.requestSeq + 1;

    set(state => ({
      byPetId: {
        ...state.byPetId,
        [petId]: {
          ...state.byPetId[petId],
          status: 'refreshing',
          errorMessage: null,
          rangeKey,
          requestSeq,
        },
      },
    }));

    try {
      const items = await fetchSchedulesByPetRange({ petId, from, to });

      set(state => {
        const latest = state.byPetId[petId];
        if (!latest || latest.requestSeq !== requestSeq) return state;

        return {
          byPetId: {
            ...state.byPetId,
            [petId]: {
              ...latest,
              items,
              status: 'ready',
              errorMessage: null,
              rangeKey,
            },
          },
        };
      });
    } catch (error) {
      set(state => {
        const latest = state.byPetId[petId];
        if (!latest || latest.requestSeq !== requestSeq) return state;

        return {
          byPetId: {
            ...state.byPetId,
            [petId]: {
              ...latest,
              status: 'error',
              errorMessage:
                error instanceof Error ? error.message : '일정을 새로고침하지 못했어요.',
            },
          },
        };
      });
    }
  },

  clearPet: petId => {
    if (!petId) return;

    set(state => {
      const next = { ...state.byPetId };
      delete next[petId];
      return { byPetId: next };
    });
  },

  clearAll: () => set({ byPetId: {} }),
}));
