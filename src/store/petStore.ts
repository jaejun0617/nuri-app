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
  tags?: string[];
  deathDate?: string | null;
};

type PetState = {
  // ---------------------------------------------------------
  // 1) 상태
  // ---------------------------------------------------------
  pets: Pet[];
  selectedPetId: string | null;

  loading: boolean;
  booted: boolean;

  // ---------------------------------------------------------
  // 2) 액션
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
  if (!raw) return null;
  return raw;
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

  // ---------------------------------------------------------
  // ✅ 부트에서 1회 호출: selectedPetId 복원
  // ---------------------------------------------------------
  hydrateSelectedPetId: async () => {
    const saved = await loadSelectedPetId();
    set({ selectedPetId: saved ?? null });
  },

  // ---------------------------------------------------------
  // pets 주입 시 선택 보정 + persist
  // ---------------------------------------------------------
  setPets: (pets: Pet[]) => {
    const prevSelected = get().selectedPetId;
    const nextSelected = normalizeSelected(pets, prevSelected);

    set({ pets, selectedPetId: nextSelected });

    // 선택값이 결정되면 저장(비동기 fire-and-forget)
    void saveSelectedPetId(nextSelected);
  },

  // ---------------------------------------------------------
  // 선택 변경 + persist
  // ---------------------------------------------------------
  selectPet: (petId: string) => {
    const { pets } = get();
    if (!pets.some(p => p.id === petId)) return;

    set({ selectedPetId: petId });
    void saveSelectedPetId(petId);
  },

  updatePetAvatarUrl: (petId: string, avatarUrl: string | null) => {
    const { pets } = get();
    const next = pets.map(p => (p.id === petId ? { ...p, avatarUrl } : p));
    set({ pets: next });
  },

  setLoading: (v: boolean) => set({ loading: v }),
  setBooted: (v: boolean) => set({ booted: v }),

  // ---------------------------------------------------------
  // 로그아웃/게스트 전환: 전부 초기화 + persist 제거
  // ---------------------------------------------------------
  clear: () => {
    set({ pets: [], selectedPetId: null, loading: false, booted: false });
    void saveSelectedPetId(null);
  },
}));
