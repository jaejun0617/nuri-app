// 파일: src/services/local/onboardingDraft.ts
// 역할:
// - 온보딩 입력 중단 복구용 draft 저장/조회/정리

import AsyncStorage from '@react-native-async-storage/async-storage';

const NICKNAME_DRAFT_KEY = 'nuri.onboarding.nicknameDraft.v1';
const PET_CREATE_DRAFT_KEY = 'nuri.onboarding.petCreateDraft.v1';

export type PetCreateDraft = {
  step: 1 | 2;
  name: string;
  birthDate: string;
  adoptionDate: string;
  deathDate: string;
  breed: string;
  themeColor: string | null;
  gender: 'male' | 'female' | 'unknown';
  neutered: boolean | null;
  memorialChoice: 'together' | 'memorial';
  weightKg: string;
  likes: string[];
  dislikes: string[];
  hobbies: string[];
  tags: string[];
  draftLike: string;
  draftDislike: string;
  draftHobby: string;
  draftTag: string;
  imageUri: string | null;
  imageType: string | null;
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadNicknameDraft(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(NICKNAME_DRAFT_KEY);
  return raw ?? null;
}

export async function saveNicknameDraft(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await AsyncStorage.removeItem(NICKNAME_DRAFT_KEY);
    return;
  }
  await AsyncStorage.setItem(NICKNAME_DRAFT_KEY, value);
}

export async function clearNicknameDraft(): Promise<void> {
  await AsyncStorage.removeItem(NICKNAME_DRAFT_KEY);
}

export async function loadPetCreateDraft(): Promise<PetCreateDraft | null> {
  const raw = await AsyncStorage.getItem(PET_CREATE_DRAFT_KEY);
  const parsed = safeJsonParse<PetCreateDraft>(raw);
  if (!parsed) return null;
  return parsed;
}

export async function savePetCreateDraft(draft: PetCreateDraft): Promise<void> {
  await AsyncStorage.setItem(PET_CREATE_DRAFT_KEY, JSON.stringify(draft));
}

export async function clearPetCreateDraft(): Promise<void> {
  await AsyncStorage.removeItem(PET_CREATE_DRAFT_KEY);
}
