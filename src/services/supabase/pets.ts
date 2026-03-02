// 파일: src/services/supabase/pets.ts
// 목적:
// - pets 테이블 CRUD (MVP: fetch + create)
// - DB row → 앱 Pet 타입 매핑
// - profile_image_url(path) → (Public bucket) public URL 변환
//
// Public bucket 운영:
// - pet-profiles bucket이 public이면 signed URL이 필요 없다
// - supabase.storage.from(bucket).getPublicUrl(path) 사용

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
  personality_tags: string[] | null;
  profile_image_url: string | null; // ✅ storage path
  death_date: string | null;
  created_at?: string;
};

function toNumberOrNull(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toPublicUrlOrNull(path: string | null): string | null {
  if (!path) return null;

  // getPublicUrl은 내부에서 URL을 만들어주지만,
  // path에 특수문자/공백이 섞이면 깨질 수 있어서 한번 normalize 해줌.
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
    avatarPath, // ✅ path 유지
    avatarUrl, // ✅ public url
    adoptionDate: row.adoption_date,
    birthDate: row.birth_date,
    weightKg: toNumberOrNull(row.weight_kg),
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

  const { data, error } = await supabase
    .from('pets')
    .select(
      'id,user_id,name,birth_date,adoption_date,weight_kg,personality_tags,profile_image_url,death_date,created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as PetsRow[];
  const pets = rows.map(mapRowToPet);

  // ✅ 디버그: 썸네일이 안 보일 때 원인 확정용 (개발에서만)
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
