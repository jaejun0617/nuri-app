// 파일: src/store/scheduleStore.ts
// 파일 목적:
// - 펫별 일정 목록 캐시를 전역에서 관리해 홈과 일정 화면이 같은 데이터를 재사용하게 한다.
// 어디서 쓰이는지:
// - AppProviders 로그아웃 정리, 홈, 일정 목록/상세/수정 화면에서 사용된다.
// 핵심 역할:
// - petId별 일정 리스트, 로딩 상태, 에러 상태, 요청 순서를 저장한다.
// - bootstrap/refresh/clear 계열 액션으로 일정 도메인의 기본 상태머신을 제공한다.
// 데이터·상태 흐름:
// - 실제 CRUD는 `services/supabase/schedules.ts`가 담당하고, 이 store는 화면 공통 캐시와 갱신 타이밍을 관리한다.
// - 홈 요약과 일정 상세 화면은 같은 petId 캐시를 공유한다.
// 수정 시 주의:
// - requestSeq와 fallback state 규칙을 바꾸면 오래된 응답이 최신 상태를 덮는 문제가 생길 수 있다.
// - 기록/펫 전환과 함께 clear 타이밍이 맞물리므로 로그아웃/계정 전환 시나리오를 같이 봐야 한다.

import { create } from 'zustand';
import { getErrorMessage } from '../services/app/errors';
import type { PetSchedule } from '../services/supabase/schedules';
import { fetchSchedulesByPet } from '../services/supabase/schedules';

type Status = 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';

export type PetSchedulesState = {
  items: PetSchedule[];
  status: Status;
  errorMessage: string | null;
  requestSeq: number;
};

type ScheduleStore = {
  byPetId: Record<string, PetSchedulesState>;
  ensurePetState: (petId: string) => void;
  getPetState: (petId: string) => PetSchedulesState;
  bootstrap: (petId: string) => Promise<void>;
  refresh: (petId: string) => Promise<void>;
  clearPet: (petId: string) => void;
  clearAll: () => void;
};

const createInitialPetState = (): PetSchedulesState => ({
  items: [],
  status: 'idle',
  errorMessage: null,
  requestSeq: 0,
});

const FALLBACK_PET_STATE: PetSchedulesState = Object.freeze(
  createInitialPetState(),
);

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

  bootstrap: async petId => {
    if (!petId) return;

    get().ensurePetState(petId);
    const current = get().getPetState(petId);

    if (current.status === 'ready') return;
    if (current.status === 'loading' || current.status === 'refreshing') return;

    const requestSeq = current.requestSeq + 1;

    set(state => ({
      byPetId: {
        ...state.byPetId,
        [petId]: {
          ...state.byPetId[petId],
          status: 'loading',
          errorMessage: null,
          requestSeq,
        },
      },
    }));

    try {
      const items = await fetchSchedulesByPet({ petId });

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
            },
          },
        };
      });
    } catch (error: unknown) {
      set(state => {
        const latest = state.byPetId[petId];
        if (!latest || latest.requestSeq !== requestSeq) return state;

        return {
          byPetId: {
            ...state.byPetId,
            [petId]: {
              ...latest,
              status: 'error',
              errorMessage: getErrorMessage(error),
            },
          },
        };
      });
    }
  },

  refresh: async petId => {
    if (!petId) return;

    get().ensurePetState(petId);
    const current = get().getPetState(petId);
    const requestSeq = current.requestSeq + 1;

    set(state => ({
      byPetId: {
        ...state.byPetId,
        [petId]: {
          ...state.byPetId[petId],
          status: 'refreshing',
          errorMessage: null,
          requestSeq,
        },
      },
    }));

    try {
      const items = await fetchSchedulesByPet({ petId });

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
            },
          },
        };
      });
    } catch (error: unknown) {
      set(state => {
        const latest = state.byPetId[petId];
        if (!latest || latest.requestSeq !== requestSeq) return state;

        return {
          byPetId: {
            ...state.byPetId,
            [petId]: {
              ...latest,
              status: 'error',
              errorMessage: getErrorMessage(error),
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
