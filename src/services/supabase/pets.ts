// 파일: src/services/supabase/pets.ts
// 목적:
// - pets 테이블 CRUD (fetch + create)
// - DB row → 앱 Pet 타입 매핑
// - profile_image_url(path) → (Public bucket) public URL 변환

import type { Pet } from '../../store/petStore';
import {
  normalizePetSpeciesDetailKey,
  normalizePetSpeciesDisplayName,
  normalizePetSpeciesGroup,
  deriveCanonicalPetSpeciesKey,
  type PetSpeciesGroup,
  type PetSpeciesKey,
} from '../pets/species';
import { supabase } from './client';
import {
  cleanupDeletedPetStorage,
  type DeletedPetStorageCleanupResult,
} from './storagePets';

const PET_PROFILE_BUCKET = 'pet-profiles';

type PetsRow = {
  id: string;
  user_id: string;

  name: string;
  species_group: PetSpeciesGroup | null;
  species_key: PetSpeciesKey | null;
  species_detail_key: string | null;
  species_display_name: string | null;
  birth_date: string | null;
  adoption_date: string | null;
  weight_kg: number | string | null;
  default_meal_amount_grams: number | string | null;

  gender: 'male' | 'female' | 'unknown';
  neutered: boolean | null;
  breed: string | null;

  profile_image_url: string | null; // ✅ storage path
  theme_color: string | null;

  likes: string[] | null;
  dislikes: string[] | null;
  hobbies: string[] | null;
  personality_tags: string[] | null;

  death_date: string | null;

  created_at?: string;
  updated_at?: string;
};

type PetDeleteCandidate = Pick<PetsRow, 'id'>;

export type PetDeleteErrorCode =
  | 'INVALID_PET_ID'
  | 'UNAUTHENTICATED'
  | 'PET_NOT_FOUND'
  | 'LAST_PET_REQUIRED'
  | 'DELETE_FAILED';

export class PetDeleteError extends Error {
  readonly code: PetDeleteErrorCode;

  constructor(code: PetDeleteErrorCode, message: string) {
    super(message);
    this.name = 'PetDeleteError';
    this.code = code;
  }
}

export type DeletePetSafelyResult = {
  deletedPetId: string;
  userId: string;
  storageCleanup: DeletedPetStorageCleanupResult;
};

function toPetDeleteCandidates(data: unknown): PetDeleteCandidate[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (entry): entry is PetDeleteCandidate =>
      isRecord(entry) &&
      typeof entry.id === 'string' &&
      entry.id.trim().length > 0,
  );
}

export function getPetDeleteErrorMessage(error: unknown): string {
  if (error instanceof PetDeleteError) return error.message;
  return '아이 프로필을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPetsRow(value: unknown): value is PetsRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.user_id === 'string' &&
    typeof value.name === 'string'
  );
}

function toPetsRows(data: unknown): PetsRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isPetsRow);
}

function toNumberOrNull(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toPublicPetAvatarUrl(path: string | null): string | null {
  if (!path) return null;

  const safePath = path.replace(/^\/+/, '');
  const { data } = supabase.storage
    .from(PET_PROFILE_BUCKET)
    .getPublicUrl(safePath);
  return data?.publicUrl ?? null;
}

function mapRowToPet(row: PetsRow): Pet {
  const avatarPath = row.profile_image_url
    ? row.profile_image_url.replace(/^\/+/, '')
    : null;

  const avatarUrl = toPublicPetAvatarUrl(avatarPath);

  return {
    id: row.id,
    name: row.name,
    themeColor: row.theme_color ?? null,
    species: normalizePetSpeciesGroup(row.species_group),
    speciesKey: deriveCanonicalPetSpeciesKey({
      species: row.species_group,
      speciesKey: row.species_key,
      speciesDetailKey: row.species_detail_key,
      speciesDisplayName: row.species_display_name,
      breed: row.breed,
    }),
    speciesDetailKey: normalizePetSpeciesDetailKey(row.species_detail_key),
    speciesDisplayName: normalizePetSpeciesDisplayName(row.species_display_name),

    avatarPath,
    avatarUrl,

    adoptionDate: row.adoption_date,
    birthDate: row.birth_date,
    weightKg: toNumberOrNull(row.weight_kg),
    defaultMealAmountGrams: toNumberOrNull(row.default_meal_amount_grams),

    // ✅ 확장 필드
    breed: row.breed ?? null,
    gender: row.gender ?? 'unknown',
    neutered: row.neutered ?? null,

    likes: row.likes ?? [],
    dislikes: row.dislikes ?? [],
    hobbies: row.hobbies ?? [],
    tags: row.personality_tags ?? [],

    deathDate: row.death_date,
  };
}

/* ---------------------------------------------------------
 * 1) 내 pets 가져오기
 * -------------------------------------------------------- */
export async function fetchMyPets(userIdInput?: string | null): Promise<Pet[]> {
  const userId =
    userIdInput ??
    (await supabase.auth.getUser()).data.user?.id ??
    null;
  if (!userId) return [];

  const columns = [
    'id',
    'user_id',
    'name',
    'species_group',
    'species_key',
    'species_detail_key',
    'species_display_name',
    'birth_date',
    'adoption_date',
    'weight_kg',
    'default_meal_amount_grams',
    'gender',
    'neutered',
    'breed',
    'profile_image_url',
    'theme_color',
    'likes',
    'dislikes',
    'hobbies',
    'personality_tags',
    'death_date',
    'created_at',
    'updated_at',
  ].join(',');

  const { data, error } = await supabase
    .from('pets')
    .select(columns)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // ✅ supabase 타입이 스키마를 모르면 data가 unknown 성격을 띰 → 정석 캐스팅
  const rows = toPetsRows(data);
  const pets = rows.map(mapRowToPet);

  return pets;
}

/* ---------------------------------------------------------
 * 2) pet 생성
 * -------------------------------------------------------- */
export async function createPet(input: {
  name: string;
  species?: PetSpeciesGroup | null;
  speciesKey?: PetSpeciesKey | null;
  speciesDetailKey?: string | null;
  speciesDisplayName?: string | null;
  themeColor?: string | null;
  adoptionDate?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  weightKg?: number | null;
  defaultMealAmountGrams?: number | null;

  gender?: 'male' | 'female' | 'unknown';
  neutered?: boolean | null;
  breed?: string | null;

  likes?: string[];
  dislikes?: string[];
  hobbies?: string[];
  tags?: string[];

  avatarPath?: string | null; // storage path (DB에 저장)
}): Promise<Pet> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const payload = {
    user_id: userId,
    name: input.name,
    species_group: input.species ?? 'other',
    species_key: deriveCanonicalPetSpeciesKey({
      ...input,
      species: input.species ?? 'other',
    }),
    species_detail_key: normalizePetSpeciesDetailKey(input.speciesDetailKey),
    species_display_name: normalizePetSpeciesDisplayName(input.speciesDisplayName),
    theme_color: input.themeColor ?? null,

    adoption_date: input.adoptionDate ?? null,
    birth_date: input.birthDate ?? null,
    death_date: input.deathDate ?? null,
    weight_kg: input.weightKg ?? null,
    default_meal_amount_grams: input.defaultMealAmountGrams ?? null,

    gender: input.gender ?? 'unknown',
    neutered: input.neutered ?? null,
    breed: input.breed ?? null,

    likes: input.likes ?? [],
    dislikes: input.dislikes ?? [],
    hobbies: input.hobbies ?? [],
    personality_tags: input.tags ?? [],

    profile_image_url: input.avatarPath ?? null,
  };

  const columns = [
    'id',
    'user_id',
    'name',
    'species_group',
    'species_key',
    'species_detail_key',
    'species_display_name',
    'birth_date',
    'adoption_date',
    'weight_kg',
    'default_meal_amount_grams',
    'gender',
    'neutered',
    'breed',
    'profile_image_url',
    'theme_color',
    'likes',
    'dislikes',
    'hobbies',
    'personality_tags',
    'death_date',
    'created_at',
    'updated_at',
  ].join(',');

  const { data, error } = await supabase
    .from('pets')
    .insert(payload)
    .select(columns)
    .single();

  if (error) throw error;
  const inserted = isPetsRow(data) ? data : null;
  if (!inserted?.id) {
    throw new Error('아이 프로필 식별자를 확인하지 못했어요.');
  }
  return mapRowToPet(inserted);
}

/* ---------------------------------------------------------
 * 3) pet 수정
 * -------------------------------------------------------- */
export async function updatePet(input: {
  petId: string;
  name: string;
  species?: PetSpeciesGroup | null;
  speciesKey?: PetSpeciesKey | null;
  speciesDetailKey?: string | null;
  speciesDisplayName?: string | null;
  themeColor?: string | null;
  adoptionDate?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  weightKg?: number | null;
  defaultMealAmountGrams?: number | null;
  gender?: 'male' | 'female' | 'unknown';
  neutered?: boolean | null;
  breed?: string | null;
  likes?: string[];
  dislikes?: string[];
  hobbies?: string[];
  tags?: string[];
  avatarPath?: string | null;
}): Promise<void> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const payload = {
    name: input.name,
    species_group: input.species ?? 'other',
    ...(input.speciesKey !== undefined
      ? { species_key: input.speciesKey }
      : {}),
    species_detail_key: normalizePetSpeciesDetailKey(input.speciesDetailKey),
    species_display_name: normalizePetSpeciesDisplayName(input.speciesDisplayName),
    theme_color: input.themeColor ?? null,
    adoption_date: input.adoptionDate ?? null,
    birth_date: input.birthDate ?? null,
    death_date: input.deathDate ?? null,
    weight_kg: input.weightKg ?? null,
    gender: input.gender ?? 'unknown',
    neutered: input.neutered ?? null,
    breed: input.breed ?? null,
    likes: input.likes ?? [],
    dislikes: input.dislikes ?? [],
    hobbies: input.hobbies ?? [],
    personality_tags: input.tags ?? [],
    profile_image_url: input.avatarPath ?? null,
    ...(input.defaultMealAmountGrams !== undefined
      ? {
          default_meal_amount_grams: input.defaultMealAmountGrams,
        }
      : {}),
  };

  const { error } = await supabase
    .from('pets')
    .update(payload)
    .eq('id', input.petId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function updatePetDefaultMealAmount(input: {
  petId: string;
  amountGrams: number | null;
}): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const { error } = await supabase
    .from('pets')
    .update({ default_meal_amount_grams: input.amountGrams })
    .eq('id', input.petId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * 마지막 펫을 남기는 현재 앱 계약을 지키면서 인증 사용자의 펫 하나만 삭제한다.
 * DB가 삭제된 뒤에는 해당 펫의 사용자 소유 Storage 폴더를 별도 정리한다.
 */
export async function deletePetSafely(
  petIdInput: string,
): Promise<DeletePetSafelyResult> {
  const petId = petIdInput.trim();
  if (!petId) {
    throw new PetDeleteError(
      'INVALID_PET_ID',
      '삭제할 아이 프로필을 확인하지 못했어요.',
    );
  }

  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  if (!userId) {
    throw new PetDeleteError(
      'UNAUTHENTICATED',
      '로그인이 잠시 끊어졌어요. 다시 로그인한 뒤 시도해 주세요.',
    );
  }

  const { data: ownedPetData, error: ownedPetError } = await supabase
    .from('pets')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (ownedPetError) {
    throw new PetDeleteError(
      'DELETE_FAILED',
      '아이 프로필 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  }

  const ownedPets = toPetDeleteCandidates(ownedPetData);
  if (!ownedPets.some(candidate => candidate.id === petId)) {
    throw new PetDeleteError(
      'PET_NOT_FOUND',
      '삭제할 아이 프로필을 찾을 수 없어요.',
    );
  }
  if (ownedPets.length <= 1) {
    throw new PetDeleteError(
      'LAST_PET_REQUIRED',
      '최소 1개의 아이 프로필은 필요해요.',
    );
  }

  const { data: deletedData, error: deleteError } = await supabase
    .from('pets')
    .delete()
    .eq('id', petId)
    .eq('user_id', userId)
    .select('id');

  if (deleteError) {
    throw new PetDeleteError(
      'DELETE_FAILED',
      '아이 프로필을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  }

  const deletedPets = toPetDeleteCandidates(deletedData);
  if (!deletedPets.some(candidate => candidate.id === petId)) {
    throw new PetDeleteError(
      'PET_NOT_FOUND',
      '삭제할 아이 프로필을 찾을 수 없어요.',
    );
  }

  const storageCleanup = await cleanupDeletedPetStorage({ userId, petId });
  return { deletedPetId: petId, userId, storageCleanup };
}
