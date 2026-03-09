// 파일: src/store/petStore.ts
// 목적:
// - pets 상태 + selectedPetId persist
// - AppProviders에서 hydrateSelectedPetId 1회 호출

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_SELECTED_KEY = 'nuri.selectedPetId.v1';
const STORAGE_PETS_KEY = 'nuri.pets.cache.v1';

export type Pet = {
  id: string;
  name: string;
  themeColor?: string | null;

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
  selectionHydrated: boolean;

  loading: boolean;
  booted: boolean;
  errorMessage: string | null;

  // ---------------------------------------------------------
  // 2) actions
  // ---------------------------------------------------------
  hydrateSelectedPetId: () => Promise<void>;
  hydratePetsCache: (userId: string | null) => Promise<Pet[]>;

  setPets: (
    pets: Pet[],
    options?: {
      userId?: string | null;
      persist?: boolean;
      preferredPetId?: string | null;
    },
  ) => void;
  upsertPet: (
    pet: Pet,
    options?: {
      userId?: string | null;
      persist?: boolean;
      select?: boolean;
    },
  ) => void;
  selectPet: (petId: string) => void;

  updatePetAvatar: (
    petId: string,
    avatar: {
      avatarPath?: string | null;
      avatarUrl?: string | null;
    },
    options?: {
      userId?: string | null;
      persist?: boolean;
    },
  ) => void;

  setLoading: (v: boolean) => void;
  setBooted: (v: boolean) => void;
  setErrorMessage: (message: string | null) => void;

  clear: () => void;
};

export function resolveSelectedPetId(
  pets: Pet[],
  selectedPetId: string | null,
  preferredPetId?: string | null,
) {
  const nextPreferred = preferredPetId?.trim() ?? null;
  if (nextPreferred && pets.some(p => p.id === nextPreferred)) {
    return nextPreferred;
  }
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

type PersistedPetsCache = {
  userId: string | null;
  pets: Pet[];
};

async function loadPetsCache(): Promise<PersistedPetsCache | null> {
  const raw = await AsyncStorage.getItem(STORAGE_PETS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedPetsCache;
    if (!Array.isArray(parsed?.pets)) return null;
    return {
      userId: parsed?.userId ?? null,
      pets: parsed.pets,
    };
  } catch {
    return null;
  }
}

async function savePetsCache(userId: string | null, pets: Pet[]) {
  const snapshot: PersistedPetsCache = { userId, pets };
  await AsyncStorage.setItem(STORAGE_PETS_KEY, JSON.stringify(snapshot));
}

async function clearPetsCache() {
  await AsyncStorage.removeItem(STORAGE_PETS_KEY);
}

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  selectedPetId: null,
  selectionHydrated: false,

  loading: false,
  booted: false,
  errorMessage: null,

  hydrateSelectedPetId: async () => {
    if (get().selectionHydrated) return;
    const saved = await loadSelectedPetId();
    set({ selectedPetId: saved ?? null, selectionHydrated: true });
  },

  hydratePetsCache: async (userId: string | null) => {
    const snapshot = await loadPetsCache();
    if (!snapshot || !userId || snapshot.userId !== userId) {
      return [];
    }

    const nextSelected = resolveSelectedPetId(snapshot.pets, get().selectedPetId);
    set({
      pets: snapshot.pets,
      selectedPetId: nextSelected,
      errorMessage: null,
    });
    return snapshot.pets;
  },

  setPets: (pets: Pet[], options) => {
    const prevSelected = get().selectedPetId;
    const nextSelected = resolveSelectedPetId(
      pets,
      prevSelected,
      options?.preferredPetId,
    );
    const persist = options?.persist ?? true;
    const userId = options?.userId ?? null;

    set({ pets, selectedPetId: nextSelected, errorMessage: null });
    saveSelectedPetId(nextSelected).catch(() => {
      // ignore selected pet persist errors
    });
    if (persist) {
      savePetsCache(userId, pets).catch(() => {
        // ignore pets cache persist errors
      });
    }
  },

  upsertPet: (pet, options) => {
    const currentPets = get().pets;
    const existingIndex = currentPets.findIndex(item => item.id === pet.id);
    const nextPets =
      existingIndex >= 0
        ? currentPets.map(item => (item.id === pet.id ? { ...item, ...pet } : item))
        : [...currentPets, pet];

    get().setPets(nextPets, {
      userId: options?.userId ?? null,
      persist: options?.persist,
      preferredPetId: options?.select ? pet.id : undefined,
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

  updatePetAvatar: (petId, avatar, options) => {
    const next = get().pets.map(p =>
      p.id === petId
        ? {
            ...p,
            avatarPath:
              avatar.avatarPath !== undefined ? avatar.avatarPath : p.avatarPath,
            avatarUrl:
              avatar.avatarUrl !== undefined ? avatar.avatarUrl : p.avatarUrl,
          }
        : p,
    );

    get().setPets(next, {
      userId: options?.userId ?? null,
      persist: options?.persist,
      preferredPetId: get().selectedPetId,
    });
  },

  setLoading: (v: boolean) => set({ loading: v }),
  setBooted: (v: boolean) => set({ booted: v }),
  setErrorMessage: (message: string | null) => set({ errorMessage: message }),

  clear: () => {
    set({
      pets: [],
      selectedPetId: null,
      selectionHydrated: false,
      loading: false,
      booted: false,
      errorMessage: null,
    });
    saveSelectedPetId(null).catch(() => {
      // ignore selected pet clear errors
    });
    clearPetsCache().catch(() => {
      // ignore pets cache clear errors
    });
  },
}));
