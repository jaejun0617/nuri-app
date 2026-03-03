// 파일: src/store/recordStore.ts
// 목적:
// - petId 별 records 캐시(페이지네이션 + 상태머신)
// - cursor(created_at) 고정
// - out-of-order 응답 방지(요청 토큰/requestSeq)
// - signed url은 services(fetchMemoriesByPetPage)에서 캐싱/프리패치 처리
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
  cursor: string | null; // createdAt cursor (server 기준: "다음 페이지 시작점")
  hasMore: boolean;

  // ✅ out-of-order 방지용
  requestSeq: number; // 상태 업데이트를 허용할 "최신 요청 번호"
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

const PAGE_SIZE = 20;

const createInitialPetState = (): PetRecordsState => ({
  items: [],
  status: 'idle',
  errorMessage: null,

  cursor: null,
  hasMore: true,

  requestSeq: 0,
});

// ✅ 핵심: fallback은 "항상 같은 객체"여야 함 (New Architecture 안전)
const FALLBACK_PET_STATE: PetRecordsState = Object.freeze(
  createInitialPetState(),
);

function sortByCreatedAtDesc(items: MemoryRecord[]) {
  items.sort((a, b) => {
    if (a.createdAt === b.createdAt) return 0;
    return a.createdAt > b.createdAt ? -1 : 1;
  });
}

function mergeUniqueById(prev: MemoryRecord[], next: MemoryRecord[]) {
  const map = new Map<string, MemoryRecord>();
  for (const it of prev) map.set(it.id, it);
  for (const it of next) map.set(it.id, it);
  const merged = Array.from(map.values());
  sortByCreatedAtDesc(merged);
  return merged;
}

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

    // 이미 데이터가 있으면 부트스트랩 스킵(홈/타임라인 중복 호출 방지)
    if (st.status === 'ready' && st.items.length > 0) return;

    // 진행 중이면 스킵
    if (
      st.status === 'loading' ||
      st.status === 'refreshing' ||
      st.status === 'loadingMore'
    ) {
      return;
    }

    // ✅ requestSeq 발급(이 요청만 최신이면 반영)
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
        // ✅ out-of-order 방지
        if (!cur || cur.requestSeq !== req) return s;

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              items: page.items,
              status: 'ready',
              errorMessage: null,
              cursor: page.nextCursor,
              hasMore: page.hasMore,
            },
          },
        };
      });
    } catch (e: any) {
      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              status: 'error',
              errorMessage: e?.message ?? '불러오기 실패',
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

    // ✅ requestSeq 발급 (이 refresh가 최신 상태가 됨)
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

        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              items: page.items,
              status: 'ready',
              errorMessage: null,
              cursor: page.nextCursor,
              hasMore: page.hasMore,
            },
          },
        };
      });
    } catch (e: any) {
      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        // ✅ refresh 실패는 이전 items는 유지한 채 에러만 표시
        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              status: 'error',
              errorMessage: e?.message ?? '새로고침 실패',
            },
          },
        };
      });
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

    // 진행 중이면 스킵
    if (
      st.status === 'loading' ||
      st.status === 'refreshing' ||
      st.status === 'loadingMore'
    ) {
      return;
    }

    // ✅ loadMore는 refresh처럼 requestSeq를 "갱신"하지 않음
    // - 이유: loadMore 도중 refresh가 들어오면 refresh가 최신이 되어야 함
    // - 그래서 loadMore는 "현재 requestSeq"를 스냅샷으로 들고간 뒤, 같을 때만 반영
    const req = st.requestSeq;

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
        if (!cur) return s;

        // ✅ out-of-order 방지: refresh/boot가 requestSeq를 올렸으면 이 loadMore는 무시
        if (cur.requestSeq !== req) return s;

        const merged = mergeUniqueById(cur.items, page.items);

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
      set(s => {
        const cur = s.byPetId[petId];
        if (!cur) return s;

        // ✅ loadMore 실패는 치명도 낮음: items 유지 + status ready로 복귀
        // (에러 메시지만 남겨서 토스트/배너로 알릴 수 있게)
        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...cur,
              status: 'ready',
              errorMessage: e?.message ?? '더 불러오기 실패',
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

    const next = [...items];
    sortByCreatedAtDesc(next);

    set(s => ({
      byPetId: {
        ...s.byPetId,
        [petId]: {
          ...s.byPetId[petId],
          items: next,
          status: 'ready',
          errorMessage: null,
          cursor: next.length ? next[next.length - 1].createdAt : null,
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

      sortByCreatedAtDesc(next);

      return {
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...cur,
            items: next,
            status: 'ready',
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
