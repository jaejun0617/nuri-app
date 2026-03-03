// 파일: src/services/supabase/memories.ts
// 역할:
// - memories CRUD
// - pagination cursor(created_at + id) 고정(✅ 타이브레이커 포함)
// - signed URL 캐싱(getMemoryImageSignedUrlCached) 적용
// - prefetch 지원

import { supabase } from './client';
import { deleteFile } from './storage';
import {
  getMemoryImageSignedUrlCached,
  prefetchMemorySignedUrls,
} from './storageMemories';

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
  imageUrl?: string | null; // ✅ signed url(캐싱 적용)
  imagePath?: string | null; // ✅ storage path
};

type MemoriesRow = {
  id: string;
  pet_id: string;
  image_url: string | null; // storage path
  title: string;
  content: string | null;
  emotion: EmotionTag | null;
  tags: string[] | null;
  occurred_at: string | null;
  created_at: string;
};

// ---------------------------------------------------------
// cursor helpers (✅ createdAt + id 고정)
// ---------------------------------------------------------
const CURSOR_SEP = '__';

function encodeCursor(createdAt: string, id: string) {
  return `${createdAt}${CURSOR_SEP}${id}`;
}

function decodeCursor(cursor: string) {
  const raw = (cursor ?? '').trim();
  const idx = raw.lastIndexOf(CURSOR_SEP);
  if (idx <= 0) return null;

  const createdAt = raw.slice(0, idx).trim();
  const id = raw.slice(idx + CURSOR_SEP.length).trim();
  if (!createdAt || !id) return null;

  return { createdAt, id };
}

async function mapRow(row: MemoriesRow): Promise<MemoryRecord> {
  const signed = row.image_url
    ? await getMemoryImageSignedUrlCached(row.image_url).catch(() => null)
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

export type FetchMemoriesPageResult = {
  items: MemoryRecord[];
  nextCursor: string | null; // ✅ compound cursor: createdAt__id
  hasMore: boolean;
};

/* ---------------------------------------------------------
 * 0) Read one
 * -------------------------------------------------------- */
export async function fetchMemoryById(memoryId: string): Promise<MemoryRecord> {
  const { data, error } = await supabase
    .from('memories')
    .select(
      'id,pet_id,image_url,title,content,emotion,tags,occurred_at,created_at',
    )
    .eq('id', memoryId)
    .single();

  if (error) throw error;
  return mapRow(data as MemoriesRow);
}

/* ---------------------------------------------------------
 * 1) List (pagination cursor 최종 확정)
 * - order: created_at desc, id desc
 * - cursor: (created_at < cursorCreatedAt)
 *        OR (created_at = cursorCreatedAt AND id < cursorId)
 * -------------------------------------------------------- */
export async function fetchMemoriesByPetPage(input: {
  petId: string;
  limit?: number;
  cursor?: string | null; // ✅ compound cursor
  prefetchTop?: number; // default 10
}): Promise<FetchMemoriesPageResult> {
  const limit = input.limit ?? 20;
  const prefetchTop = input.prefetchTop ?? 10;

  let q = supabase
    .from('memories')
    .select(
      'id,pet_id,image_url,title,content,emotion,tags,occurred_at,created_at',
    )
    .eq('pet_id', input.petId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (input.cursor) {
    const c = decodeCursor(input.cursor);
    if (c) {
      // ✅ (created_at < c.createdAt) OR (created_at = c.createdAt AND id < c.id)
      q = q.or(
        `created_at.lt.${c.createdAt},and(created_at.eq.${c.createdAt},id.lt.${c.id})`,
      );
    }
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as MemoriesRow[];
  const items = await Promise.all(rows.map(r => mapRow(r)));

  // ✅ 프리패치(상단 N개)
  await prefetchMemorySignedUrls({
    imagePaths: items.map(it => it.imagePath ?? null),
    max: prefetchTop,
  }).catch(() => null);

  const hasMore = items.length === limit;

  const last = items[items.length - 1] ?? null;
  const nextCursor = last ? encodeCursor(last.createdAt, last.id) : null;

  return { items, hasMore, nextCursor };
}

/* ---------------------------------------------------------
 * 2) Create
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
  return (data as any).id as string;
}

/* ---------------------------------------------------------
 * 3) Update fields
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
 * 5) Delete (Storage 정리 포함)
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
