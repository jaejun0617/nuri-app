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
// - freeze는 얕게만 고정됨(내부 배열은 수정 가능) → 하지만 fallback은 읽기용으로만 사용
const FALLBACK_PET_STATE: PetRecordsState = Object.freeze(
  createInitialPetState(),
);

// ---------------------------------------------------------
// helpers
// ---------------------------------------------------------
function sortByCreatedAtDesc(items: MemoryRecord[]) {
  items.sort((a, b) => {
    if (a.createdAt === b.createdAt) return 0;
    return a.createdAt > b.createdAt ? -1 : 1;
  });
}

/**
 * ✅ 커서 기반 loadMore 최적화
 * - prev는 최신→오래된 순으로 정렬되어 있다고 가정
 * - nextPage도 그보다 더 오래된 데이터가 온다고 가정(cursor)
 * - 따라서 "정렬" 없이 뒤에 append 하면 됨
 * - overlap(중복 id)만 제거
 *
 * 시간복잡도:
 * - Set(prev ids) O(n)
 * - next filter O(m)
 * - concat O(n+m)
 * - sort 없음 ✅
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

  // ✅ prev reference를 최대한 살리려면 mutate가 맞지만(리렌더 최소),
  // zustand 상태는 immutable 업데이트가 안전.
  return prev.concat(append);
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

        // ✅ 서버가 최신순으로 준다고 가정. 혹시 모를 순서 흔들림 방지(한 번만)
        const items = [...page.items];
        sortByCreatedAtDesc(items);

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

        const items = [...page.items];
        sortByCreatedAtDesc(items);

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
    } catch (e: any) {
      set(s => {
        const cur = s.byPetId[petId];
        if (!cur || cur.requestSeq !== req) return s;

        // ✅ refresh 실패는 이전 items 유지
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
  // 더 불러오기(커서 기반) ✅ 최적화 핵심
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
    ) {
      return;
    }

    // ✅ loadMore는 requestSeq를 올리지 않음 (refresh가 최신이어야 함)
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

        // ✅ out-of-order 방지: refresh/boot가 requestSeq 올렸으면 무시
        if (cur.requestSeq !== req) return s;

        // ✅ 이미 더 최신 loadMore가 반영되어 cursor가 변했을 수 있음
        // cursorSnapshot이 오래된 상태면 덮어쓰기 위험이 있으니, "현재 cursor" 기준으로만 갱신
        const merged = appendPageUniqueById(cur.items, page.items);

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

        // ✅ loadMore 실패는 치명도 낮음: items 유지 + ready 복귀
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
          cursor: next.length ? next[next.length - 1].createdAt : null, // oldest
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
