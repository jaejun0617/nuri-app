// 파일: src/services/supabase/pets.ts
// 목적:
// - pets 테이블 CRUD (fetch + create)
// - DB row → 앱 Pet 타입 매핑
// - profile_image_url(path) → (Public bucket) public URL 변환

import type { Pet } from '../../store/petStore';
import { supabase } from './client';

const PET_PROFILE_BUCKET = 'pet-profiles';

type PetsRow = {
  id: string;
  user_id: string;

  name: string;
  birth_date: string | null;
  adoption_date: string | null;
  weight_kg: number | string | null;

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

    avatarPath,
    avatarUrl,

    adoptionDate: row.adoption_date,
    birthDate: row.birth_date,
    weightKg: toNumberOrNull(row.weight_kg),

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
    'birth_date',
    'adoption_date',
    'weight_kg',
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
  const rows = (Array.isArray(data) ? data : []) as unknown as PetsRow[];
  const pets = rows.map(mapRowToPet);

  return pets;
}

/* ---------------------------------------------------------
 * 2) pet 생성
 * -------------------------------------------------------- */
export async function createPet(input: {
  name: string;
  themeColor?: string | null;
  adoptionDate?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  weightKg?: number | null;

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
  };

  const columns = [
    'id',
    'user_id',
    'name',
    'birth_date',
    'adoption_date',
    'weight_kg',
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
  const inserted = data as unknown as PetsRow | null;
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
  themeColor?: string | null;
  adoptionDate?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  weightKg?: number | null;
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
  };

  const { error } = await supabase
    .from('pets')
    .update(payload)
    .eq('id', input.petId)
    .eq('user_id', userId);

  if (error) throw error;
}
