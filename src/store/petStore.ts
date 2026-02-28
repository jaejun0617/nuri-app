// 파일: src/store/petStore.ts
// 목적:
// - 전역 pets + selectedPetId 관리
// - 멀티펫 핵심: “선택된 펫”에 따라 홈 데이터만 교체
//
// 운영 원칙:
// - pets 비면 selectedPetId는 null
// - pets 생기면 selectedPetId는 기존 선택 유지 or 첫 번째로 보정
//
// 주의:
// - selectedPet 같은 파생은 화면(useMemo)에서 계산 권장

import { create } from 'zustand';

export type Pet = {
  id: string;
  name: string;
  avatarUrl?: string | null;
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

  // ---------------------------------------------------------
  // 2) 액션
  // ---------------------------------------------------------
  setPets: (pets: Pet[]) => void;
  selectPet: (petId: string) => void;
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

  clear: () => set({ pets: [], selectedPetId: null }),
}));
