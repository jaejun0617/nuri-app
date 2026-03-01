// 파일: src/store/petStore.ts
// 목적:
// - 전역 pets + selectedPetId 관리
// - AppProviders 부팅(fetch) 상태를 표현하기 위한 loading/booted 포함
//
// 운영 원칙:
// - pets 비면 selectedPetId는 null
// - pets 생기면 selectedPetId는 기존 선택 유지 or 첫 번째로 보정
// - selectedPet 같은 파생은 화면(useMemo)에서 계산 권장

import { create } from 'zustand';

export type Pet = {
  id: string;
  name: string;
  avatarUrl?: string | null; // signed url (UI용)
  adoptionDate?: string | null; // YYYY-MM-DD
  birthDate?: string | null;
  weightKg?: number | null;
  tags?: string[]; // personality_tags
  deathDate?: string | null;
};

type PetState = {
  // ---------------------------------------------------------
  // 1) 상태
  // ---------------------------------------------------------
  pets: Pet[];
  selectedPetId: string | null;

  // App boot 상태
  loading: boolean; // pets fetch 중
  booted: boolean; // 앱 부팅 시 1회 pets fetch 완료 여부

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

  loading: false,
  booted: false,

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

  setLoading: (v: boolean) => set({ loading: v }),
  setBooted: (v: boolean) => set({ booted: v }),

  clear: () =>
    set({ pets: [], selectedPetId: null, loading: false, booted: false }),
}));
