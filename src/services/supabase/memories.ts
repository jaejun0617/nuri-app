// 파일: src/services/supabase/memories.ts
// 목적:
// - memories 테이블 CRUD (MVP: list/create/delete)
// - DB row → 앱 Record 타입 매핑
// - image_url(path) → signed url로 변환(렌더링용)

import { supabase } from './client';
import { getMemoryImageSignedUrl } from './storageMemories';

export type EmotionTag =
  | 'happy'
  | 'calm'
  | 'excited'
  | 'neutral'
  | 'sad'
  | 'anxious'
  | 'angry'
  | 'tired';

export type MemoryRecord = {
  id: string;
  petId: string;
  title: string;
  content?: string | null;
  emotion?: EmotionTag | null;
  tags: string[];
  occurredAt?: string | null; // YYYY-MM-DD
  createdAt: string;

  // UI용
  imageUrl?: string | null; // signed url
  imagePath?: string | null; // DB 저장 path
};

type MemoriesRow = {
  id: string;
  user_id: string;
  pet_id: string;
  image_url: string | null;
  title: string;
  content: string | null;
  emotion: EmotionTag | null;
  tags: string[] | null;
  occurred_at: string | null;
  created_at: string;
};

async function mapRowToRecord(row: MemoriesRow): Promise<MemoryRecord> {
  const signed = row.image_url
    ? await getMemoryImageSignedUrl(row.image_url).catch(() => null)
    : null;

  return {
    id: row.id,
    petId: row.pet_id,
    title: row.title,
    content: row.content,
    emotion: row.emotion,
    tags: row.tags ?? [],
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    imageUrl: signed,
    imagePath: row.image_url,
  };
}

/* ---------------------------------------------------------
 * 1) 특정 pet의 memories 가져오기 (최신순)
 * -------------------------------------------------------- */
export async function fetchMemoriesByPet(
  petId: string,
): Promise<MemoryRecord[]> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('memories')
    .select(
      'id,user_id,pet_id,image_url,title,content,emotion,tags,occurred_at,created_at',
    )
    .eq('user_id', userId)
    .eq('pet_id', petId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as MemoriesRow[];
  return Promise.all(rows.map(mapRowToRecord));
}

/* ---------------------------------------------------------
 * 2) memory 생성 (이미지는 나중에 업데이트 가능)
 * -------------------------------------------------------- */
export async function createMemory(input: {
  petId: string;
  title: string;
  content?: string | null;
  emotion?: EmotionTag | null;
  tags?: string[];
  occurredAt?: string | null; // YYYY-MM-DD
  imagePath?: string | null; // storage path
}): Promise<string> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) throw new Error('로그인 정보가 없습니다.');

  const payload = {
    user_id: userId,
    pet_id: input.petId,
    title: input.title,
    content: input.content ?? null,
    emotion: input.emotion ?? null,
    tags: input.tags ?? [],
    occurred_at: input.occurredAt ?? null,
    image_url: input.imagePath ?? null,
  };

  const { data, error } = await supabase
    .from('memories')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return (data as any).id as string;
}

/* ---------------------------------------------------------
 * 3) memory 이미지 path 업데이트
 * -------------------------------------------------------- */
export async function updateMemoryImagePath(input: {
  memoryId: string;
  imagePath: string;
}) {
  const { error } = await supabase
    .from('memories')
    .update({ image_url: input.imagePath })
    .eq('id', input.memoryId);

  if (error) throw error;
}

/* ---------------------------------------------------------
 * 4) memory 삭제
 * -------------------------------------------------------- */
export async function deleteMemory(memoryId: string) {
  const { error } = await supabase.from('memories').delete().eq('id', memoryId);
  if (error) throw error;
}
