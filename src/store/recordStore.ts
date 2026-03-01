// 파일: src/store/recordStore.ts
// 목적:
// - selectedPetId 기준 records(memories) 목록 상태 관리
// - App boot / Screen 진입에서 재사용 가능한 로딩 상태 제공

import { create } from 'zustand';
import type { MemoryRecord } from '../services/supabase/memories';

type RecordState = {
  // ---------------------------------------------------------
  // 1) 상태
  // ---------------------------------------------------------
  records: MemoryRecord[];
  loading: boolean;
  booted: boolean;

  // ---------------------------------------------------------
  // 2) 액션
  // ---------------------------------------------------------
  setRecords: (records: MemoryRecord[]) => void;
  setLoading: (v: boolean) => void;
  setBooted: (v: boolean) => void;
  clear: () => void;
};

export const useRecordStore = create<RecordState>(set => ({
  records: [],
  loading: false,
  booted: false,

  setRecords: records => set({ records }),
  setLoading: v => set({ loading: v }),
  setBooted: v => set({ booted: v }),
  clear: () => set({ records: [], loading: false, booted: false }),
}));
