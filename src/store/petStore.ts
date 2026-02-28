// 파일: src/store/petStore.ts
// 목적:
// - 전역 pets + selectedPetId 관리
// - 멀티펫 스와이프/선택 구조의 핵심 스토어
//
// 운영 원칙:
// - pets가 비면 selectedPetId는 null
// - pets가 생기면 selectedPetId는 "기존 선택 유지" 또는 "첫 번째"로 자동 보정
//
// 주의:
// - selectedPet 같은 "파생 값"은 store에 함수로 두지 말고,
//   화면(MainScreen)에서 useMemo로 계산한다. (버그/렌더 꼬임 방지)

import { create } from 'zustand';

export type Pet = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  adoptionDate?: string | null; // YYYY-MM-DD
  birthDate?: string | null;
  weightKg?: number | null;
  tags?: string[];
  deathDate?: string | null; // 추후(추모 UI)
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
  // ---------------------------------------------------------
  // 1) 초기 상태
  // ---------------------------------------------------------
  pets: [],
  selectedPetId: null,

  // ---------------------------------------------------------
  // 2) 액션
  // ---------------------------------------------------------
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
