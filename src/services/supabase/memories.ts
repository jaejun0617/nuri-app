// 파일: src/services/supabase/memories.ts
// 역할:
// - memories CRUD
// - signed URL 변환
// - Edit 지원
// - Delete 시 Storage 파일 정리(완전체)
// - image_url 컬럼에는 "path"만 저장 (bucket은 storageMemories가 알고 있음)

import { supabase } from './client';
import { deleteFile } from './storage';
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
  occurredAt?: string | null;
  createdAt: string;
  imageUrl?: string | null; // signed url (렌더용)
  imagePath?: string | null; // storage path (삭제/재발급용)
};

type MemoriesRow = {
  id: string;
  pet_id: string;
  image_url: string | null; // 실제로는 "path"
  title: string;
  content: string | null;
  emotion: EmotionTag | null;
  tags: string[] | null;
  occurred_at: string | null;
  created_at: string;
};

async function mapRow(row: MemoriesRow): Promise<MemoryRecord> {
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
 * 1) List
 * -------------------------------------------------------- */
export async function fetchMemoriesByPet(
  petId: string,
): Promise<MemoryRecord[]> {
  const { data, error } = await supabase
    .from('memories')
    .select(
      'id,pet_id,image_url,title,content,emotion,tags,occurred_at,created_at',
    )
    .eq('pet_id', petId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Promise.all((data ?? []).map(mapRow));
}

/* ---------------------------------------------------------
 * 2) Create
 * - imagePath는 생성 시점에는 보통 null
 * -------------------------------------------------------- */
export async function createMemory(input: {
  petId: string;
  title: string;
  content?: string | null;
  emotion?: EmotionTag | null;
  tags?: string[];
  occurredAt?: string | null;
  imagePath?: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from('memories')
    .insert({
      pet_id: input.petId,
      title: input.title,
      content: input.content ?? null,
      emotion: input.emotion ?? null,
      tags: input.tags ?? [],
      occurred_at: input.occurredAt ?? null,
      image_url: input.imagePath ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/* ---------------------------------------------------------
 * 3) Update fields (Edit)
 * -------------------------------------------------------- */
export async function updateMemoryFields(input: {
  memoryId: string;
  title: string;
  content?: string | null;
  emotion?: EmotionTag | null;
  tags?: string[];
  occurredAt?: string | null;
}) {
  const { error } = await supabase
    .from('memories')
    .update({
      title: input.title,
      content: input.content ?? null,
      emotion: input.emotion ?? null,
      tags: input.tags ?? [],
      occurred_at: input.occurredAt ?? null,
    })
    .eq('id', input.memoryId);

  if (error) throw error;
}

/* ---------------------------------------------------------
 * 4) Update image path (after upload)
 * -------------------------------------------------------- */
export async function updateMemoryImagePath(input: {
  memoryId: string;
  imagePath: string | null;
}) {
  const { error } = await supabase
    .from('memories')
    .update({ image_url: input.imagePath })
    .eq('id', input.memoryId);

  if (error) throw error;
}

/* ---------------------------------------------------------
 * 5) Delete (Storage 정리 포함) - 완전체
 * -------------------------------------------------------- */
export async function deleteMemoryWithFile(input: {
  memoryId: string;
  imagePath?: string | null;
}) {
  if (input.imagePath) {
    await deleteFile('memory-images', input.imagePath);
  }

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', input.memoryId);

  if (error) throw error;
}
