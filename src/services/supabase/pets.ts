// 파일: src/services/supabase/pets.ts
// 목적:
// - pets 테이블 CRUD (MVP: fetch + create)
// - DB row → 앱 Pet 타입 매핑
//
// DB 스키마(너 MASTER SETUP 기준):
// - pets.name
// - pets.birth_date
// - pets.adoption_date
// - pets.weight_kg
// - pets.personality_tags (text[])
// - pets.profile_image_url (text)  ← Storage path(or url)
// - pets.death_date

import type { Pet } from '../../store/petStore';
import { supabase } from './client';
import { getPetAvatarSignedUrl } from './storagePets';

type PetsRow = {
  id: string;
  user_id: string;
  name: string;
  birth_date: string | null;
  adoption_date: string | null;
  weight_kg: number | string | null;
  personality_tags: string[] | null;
  profile_image_url: string | null;
  death_date: string | null;
};

function toNumberOrNull(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function mapRowToPet(row: PetsRow): Promise<Pet> {
  const signedUrl = row.profile_image_url
    ? await getPetAvatarSignedUrl(row.profile_image_url).catch(() => null)
    : null;

  return {
    id: row.id,
    name: row.name,
    avatarUrl: signedUrl,
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
      'id,user_id,name,birth_date,adoption_date,weight_kg,personality_tags,profile_image_url,death_date',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as PetsRow[];
  const mapped = await Promise.all(rows.map(mapRowToPet));
  return mapped;
}

/* ---------------------------------------------------------
 * 2) pet 생성 (avatarPath는 DB에 path로 저장)
 * -------------------------------------------------------- */
export async function createPet(input: {
  name: string;
  adoptionDate?: string | null;
  birthDate?: string | null;
  weightKg?: number | null;
  tags?: string[];
  avatarPath?: string | null; // storage path
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
