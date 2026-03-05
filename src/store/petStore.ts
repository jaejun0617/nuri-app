// 파일: src/store/petStore.ts
// 목적:
// - pets 상태 + selectedPetId persist
// - AppProviders에서 hydrateSelectedPetId 1회 호출

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_SELECTED_KEY = 'nuri.selectedPetId.v1';

export type Pet = {
  id: string;
  name: string;

  avatarPath?: string | null;
  avatarUrl?: string | null;

  adoptionDate?: string | null;
  birthDate?: string | null;
  weightKg?: number | null;

  // ✅ 확장 필드(향후 사용)
  breed?: string | null;
  gender?: 'male' | 'female' | 'unknown' | null;
  neutered?: boolean | null;

  likes?: string[];
  dislikes?: string[];
  hobbies?: string[];
  tags?: string[]; // personality_tags
  deathDate?: string | null;
};

export type PetState = {
  // ---------------------------------------------------------
  // 1) state
  // ---------------------------------------------------------
  pets: Pet[];
  selectedPetId: string | null;

  loading: boolean;
  booted: boolean;

  // ---------------------------------------------------------
  // 2) actions
  // ---------------------------------------------------------
  hydrateSelectedPetId: () => Promise<void>;

  setPets: (pets: Pet[]) => void;
  selectPet: (petId: string) => void;

  updatePetAvatarUrl: (petId: string, avatarUrl: string | null) => void;

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

async function loadSelectedPetId(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(STORAGE_SELECTED_KEY);
  return raw ?? null;
}

async function saveSelectedPetId(petId: string | null) {
  if (!petId) {
    await AsyncStorage.removeItem(STORAGE_SELECTED_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_SELECTED_KEY, petId);
}

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  selectedPetId: null,

  loading: false,
  booted: false,

  hydrateSelectedPetId: async () => {
    const saved = await loadSelectedPetId();
    set({ selectedPetId: saved ?? null });
  },

  setPets: (pets: Pet[]) => {
    const prevSelected = get().selectedPetId;
    const nextSelected = normalizeSelected(pets, prevSelected);

    set({ pets, selectedPetId: nextSelected });
    saveSelectedPetId(nextSelected).catch(() => {
      // ignore selected pet persist errors
    });
  },

  selectPet: (petId: string) => {
    const { pets } = get();
    if (!pets.some(p => p.id === petId)) return;

    set({ selectedPetId: petId });
    saveSelectedPetId(petId).catch(() => {
      // ignore selected pet persist errors
    });
  },

  updatePetAvatarUrl: (petId: string, avatarUrl: string | null) => {
    const next = get().pets.map(p =>
      p.id === petId ? { ...p, avatarUrl } : p,
    );
    set({ pets: next });
  },

  setLoading: (v: boolean) => set({ loading: v }),
  setBooted: (v: boolean) => set({ booted: v }),

  clear: () => {
    set({ pets: [], selectedPetId: null, loading: false, booted: false });
    saveSelectedPetId(null).catch(() => {
      // ignore selected pet clear errors
    });
  },
}));
