// 파일: src/store/petStore.ts
// 목적:
// - 전역 pets + selectedPetId 관리
// - 부팅/페치 상태(booted/loading)까지 같이 관리해서
//   "펫 0마리면 자동 온보딩"을 안전하게 수행한다.

import { create } from 'zustand';

export type Pet = {
  id: string;
  name: string;
  avatarUrl?: string | null; // signed URL (렌더링용)
  adoptionDate?: string | null; // YYYY-MM-DD
  birthDate?: string | null;
  weightKg?: number | null;
  tags?: string[];
  deathDate?: string | null;
};

type PetState = {
  // ---------------------------------------------------------
  // 1) 상태
  // ---------------------------------------------------------
  pets: Pet[];
  selectedPetId: string | null;

  // fetch 제어용
  booted: boolean; // 한번이라도 fetch를 수행했는지
  loading: boolean;

  // ---------------------------------------------------------
  // 2) 액션
  // ---------------------------------------------------------
  setPets: (pets: Pet[]) => void;
  selectPet: (petId: string) => void;

  setLoading: (v: boolean) => void;
  setBooted: (v: boolean) => void;

  clear: () => void;
};

function normalizeSelected(pets: Pet[], selectedPetId: string | null) {
  if (pets.length === 0) return null;
  if (selectedPetId && pets.some(p => p.id === selectedPetId))
    return selectedPetId;
  return pets[0].id;
}

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  selectedPetId: null,

  booted: false,
  loading: false,

  setPets: (pets: Pet[]) => {
    const prevSelected = get().selectedPetId;
    const nextSelected = normalizeSelected(pets, prevSelected);
    set({ pets, selectedPetId: nextSelected });
  },

  selectPet: (petId: string) => {
    const { pets } = get();
    if (!pets.some(p => p.id === petId)) return;
    set({ selectedPetId: petId });
  },

  setLoading: v => set({ loading: v }),
  setBooted: v => set({ booted: v }),

  clear: () =>
    set({
      pets: [],
      selectedPetId: null,
      booted: false,
      loading: false,
    }),
}));
