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

function toPublicUrlOrNull(path: string | null): string | null {
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

  const avatarUrl = toPublicUrlOrNull(avatarPath);

  return {
    id: row.id,
    name: row.name,

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
export async function fetchMyPets(): Promise<Pet[]> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
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

  if (__DEV__) {
    console.log(
      '[fetchMyPets] mapped:',
      pets.map(p => ({
        id: p.id,
        name: p.name,
        avatarPath: p.avatarPath,
        avatarUrl: p.avatarUrl,
      })),
    );
  }

  return pets;
}

/* ---------------------------------------------------------
 * 2) pet 생성
 * -------------------------------------------------------- */
export async function createPet(input: {
  name: string;
  adoptionDate?: string | null;
  birthDate?: string | null;
  weightKg?: number | null;

  gender?: 'male' | 'female' | 'unknown';
  neutered?: boolean | null;
  breed?: string | null;

  likes?: string[];
  dislikes?: string[];
  hobbies?: string[];
  tags?: string[];

  avatarPath?: string | null; // storage path (DB에 저장)
}): Promise<string> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const payload = {
    user_id: userId,
    name: input.name,

    adoption_date: input.adoptionDate ?? null,
    birth_date: input.birthDate ?? null,
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

  const { data, error } = await supabase
    .from('pets')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return (data as any).id as string;
}
