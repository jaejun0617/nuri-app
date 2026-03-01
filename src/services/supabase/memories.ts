// 파일: src/services/supabase/memories.ts
// 목적:
// - memories 테이블 CRUD
// - DB row → 앱 Record 타입 매핑
// - image_url(path) → signed url로 변환(렌더링용)
// - pagination 지원(created_at cursor)

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
  imagePath?: string | null; // DB 저장 path (memories.image_url)
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
  const imagePath = row.image_url;

  // signed url은 캐시 적용되어 같은 path 반복 호출을 줄임
  const imageUrl = imagePath
    ? await getMemoryImageSignedUrl(imagePath).catch(() => null)
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
    imageUrl,
    imagePath,
  };
}

export async function fetchMemoriesByPet(
  petId: string,
  opt?: { limit?: number; cursorCreatedAt?: string | null },
): Promise<{ items: MemoryRecord[]; hasMore: boolean }> {
  const limit = opt?.limit ?? 20;
  const cursor = opt?.cursorCreatedAt ?? null;

  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) return { items: [], hasMore: false };

  // ---------------------------------------------------------
  // paging 전략:
  // - created_at 내림차순
  // - 다음 페이지는 created_at < cursor
  // ---------------------------------------------------------
  let q = supabase
    .from('memories')
    .select(
      'id,user_id,pet_id,image_url,title,content,emotion,tags,occurred_at,created_at',
    )
    .eq('user_id', userId)
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // hasMore 판별용으로 1개 더

  if (cursor) {
    q = q.lt('created_at', cursor);
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = ((data ?? []) as MemoriesRow[]) ?? [];
  const sliced = rows.slice(0, limit);
  const hasMore = rows.length > limit;

  const items = await Promise.all(sliced.map(mapRowToRecord));
  return { items, hasMore };
}

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

export async function deleteMemory(memoryId: string) {
  const { error } = await supabase.from('memories').delete().eq('id', memoryId);
  if (error) throw error;
}
