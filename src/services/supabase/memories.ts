// 파일: src/services/supabase/memories.ts
// 역할:
// - memories CRUD
// - pagination cursor(created_at + id) 고정(✅ 타이브레이커 포함)
// - ✅ signed URL 생성은 "리스트 fetch 경로"에서 제거(UI block 방지)
// - ✅ prefetchMemorySignedUrls는 fetch 흐름 밖에서 async 스케줄링(스크롤 버벅임 방지)

import { supabase } from './client';
import { deleteFile } from './storage';
import { prefetchMemorySignedUrls } from './storageMemories';
import { normalizeMemoryRecord } from '../records/imageSources';

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
  category?: string | null;
  subCategory?: string | null;
  price?: number | null;
  occurredAt?: string | null;
  createdAt: string;

  /**
   * ✅ signed url(캐싱 적용)
   * - 리스트 fetch 단계에서 생성하지 않는다(=UI block 제거)
   * - 렌더링 레이어에서 getMemoryImageSignedUrlCached로 채우거나,
   *   prefetch로 캐시를 먼저 데워서 빠르게 얻도록 한다.
   */
  imageUrl?: string | null;

  /** ✅ storage path (DB에 저장된 값) */
  imagePath?: string | null;
  /** ✅ 다중 이미지 path (첫번째는 imagePath와 동일) */
  imagePaths: string[];
};

type MemoriesRow = {
  id: string;
  pet_id: string;
  image_url: string | null; // storage path
  image_urls?: string[] | null;
  title: string;
  content: string | null;
  emotion: EmotionTag | null;
  tags: string[] | null;
  category?: string | null;
  sub_category?: string | null;
  price?: number | null;
  occurred_at: string | null;
  created_at: string;
};

type InsertedMemoryIdRow = {
  id: string;
};

// ---------------------------------------------------------
// cursor helpers (✅ createdAt + id 고정)
// ---------------------------------------------------------
const CURSOR_SEP = '__';

export function encodeMemoriesCursor(createdAt: string, id: string) {
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

/**
 * ✅ mapRow는 동기 변환만 수행
 * - signed URL fetch 절대 금지(리스트 fetch 경로에서 JS thread spike 유발)
 */
function normalizeImagePaths(row: MemoriesRow) {
  const list = Array.isArray(row.image_urls)
    ? row.image_urls
        .map(path => `${path ?? ''}`.trim())
        .filter(Boolean)
    : [];

  if (list.length) return Array.from(new Set(list));

  const single = `${row.image_url ?? ''}`.trim();
  return single ? [single] : [];
}

function mapRow(row: MemoriesRow): MemoryRecord {
  return normalizeMemoryRecord({
    id: row.id,
    petId: row.pet_id,
    title: row.title,
    content: row.content,
    emotion: row.emotion,
    tags: row.tags ?? [],
    category: row.category ?? null,
    subCategory: row.sub_category ?? null,
    price: typeof row.price === 'number' ? row.price : null,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,

    // ✅ 리스트 fetch 단계에서는 signed url을 넣지 않는다.
    imageUrl: null,
    imagePath: row.image_url,
    imagePaths: normalizeImagePaths(row),
  });
}

export type FetchMemoriesPageResult = {
  items: MemoryRecord[];
  nextCursor: string | null; // ✅ compound cursor: createdAt__id
  hasMore: boolean;
};

// ---------------------------------------------------------
// prefetch scheduler (✅ 스크롤/터치 끝난 뒤 실행)
// ---------------------------------------------------------
function scheduleAfterInteractions(work: () => Promise<void>) {
  const run = () => {
    work().catch(() => null);
  };

  const idleScheduler = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: () => void) => number;
  };

  if (typeof idleScheduler.requestIdleCallback === 'function') {
    idleScheduler.requestIdleCallback(() => run());
    return;
  }

  setTimeout(run, 0);
}

/* ---------------------------------------------------------
 * 0) Read one
 * - 단건도 path만 내려주고
 * - prefetch는 idle 타이밍에 캐시 워밍(옵션)
 * -------------------------------------------------------- */
export async function fetchMemoryById(memoryId: string): Promise<MemoryRecord> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('id', memoryId)
    .single();

  if (error) throw error;

  const item = mapRow(data as MemoriesRow);

  // ✅ 단건 캐시 워밍(비동기 / 스크롤 영향 최소)
  if (item.imagePaths.length > 0) {
    const topPaths = item.imagePaths.slice(0, 3);
    scheduleAfterInteractions(() =>
      prefetchMemorySignedUrls({
        imagePaths: topPaths,
        max: topPaths.length,
      }),
    );
  }

  return item;
}

/* ---------------------------------------------------------
 * 1) List (pagination cursor 최종 확정)
 * - order: created_at desc, id desc
 * - cursor: (created_at < cursorCreatedAt)
 *        OR (created_at = cursorCreatedAt AND id < cursorId)
 *
 * ✅ 성능 포인트
 * - mapRow에서 signed url 생성 제거
 * - prefetch는 fetch 흐름 밖(InteractionManager)에서 async 스케줄링
 * -------------------------------------------------------- */
export async function fetchMemoriesByPetPage(input: {
  petId: string;
  limit?: number;
  cursor?: string | null; // ✅ compound cursor
  prefetchTop?: number; // default 10
}): Promise<FetchMemoriesPageResult> {
  // ✅ RN 카드 리스트 체감 최적(16~18 권장). 필요 시 호출부에서 override 가능.
  const limit = input.limit ?? 18;
  const prefetchTop = input.prefetchTop ?? 10;

  let q = supabase
    .from('memories')
    .select('*')
    .eq('pet_id', input.petId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (input.cursor) {
    const c = decodeCursor(input.cursor);
    if (c) {
      // ✅ (created_at < c.createdAt) OR (created_at = c.createdAt AND id < c.id)
      // Supabase OR 문법: a,b 형태(콤마=OR). and(...)는 내부 AND
      q = q.or(
        `created_at.lt.${c.createdAt},and(created_at.eq.${c.createdAt},id.lt.${c.id})`,
      );
    }
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as MemoriesRow[];

  // ✅ signed url 없이 row → item 변환(즉시 반환 가능)
  const items = rows.map(mapRow);

  // ✅ 프리패치: fetch 완료 직후 "idle 타이밍"으로 미룸
  const paths = items
    .slice(0, prefetchTop)
    .flatMap(it => it.imagePaths.slice(0, 1));

  if (paths.length) {
    const topPaths = [...paths]; // 참조 고정
    scheduleAfterInteractions(() =>
      prefetchMemorySignedUrls({
        imagePaths: topPaths,
        max: prefetchTop,
        variant: 'timeline-thumb',
      }),
    );
  }

  const hasMore = items.length === limit;
  const last = items[items.length - 1] ?? null;
  const nextCursor = last
    ? encodeMemoriesCursor(last.createdAt, last.id)
    : null;

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
  category?: string | null;
  subCategory?: string | null;
  price?: number | null;
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
      category: input.category ?? null,
      sub_category: input.subCategory ?? null,
      price: input.price ?? null,
      occurred_at: input.occurredAt ?? null,
      image_url: input.imagePath ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  const inserted = data as InsertedMemoryIdRow | null;
  if (!inserted?.id) {
    throw new Error('기록 식별자를 확인하지 못했어요.');
  }
  return inserted.id;
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
  category?: string | null;
  subCategory?: string | null;
  price?: number | null;
  occurredAt?: string | null;
}) {
  const { error } = await supabase
    .from('memories')
    .update({
      title: input.title,
      content: input.content ?? null,
      emotion: input.emotion ?? null,
      tags: input.tags ?? [],
      category: input.category ?? null,
      sub_category: input.subCategory ?? null,
      price: input.price ?? null,
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

function isMissingImageUrlsColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message ?? '') : '';
  const details = 'details' in error ? String(error.details ?? '') : '';
  const code = 'code' in error ? String(error.code ?? '') : '';
  const joined = `${code} ${message} ${details}`.toLowerCase();
  return (
    joined.includes('image_urls') &&
    (joined.includes('column') ||
      joined.includes('schema cache') ||
      joined.includes('pgrst'))
  );
}

/* ---------------------------------------------------------
 * 4-1) Update image paths (multi-image)
 * - image_urls 컬럼이 없는 DB면 image_url 단일 저장으로 폴백
 * -------------------------------------------------------- */
export async function updateMemoryImagePaths(input: {
  memoryId: string;
  imagePaths: string[];
}): Promise<{ mode: 'multi' | 'single_fallback'; savedPaths: string[] }> {
  const nextPaths = Array.from(
    new Set(
      (input.imagePaths ?? [])
        .map(path => `${path ?? ''}`.trim())
        .filter(Boolean),
    ),
  );
  const first = nextPaths[0] ?? null;
  const updatePayload = {
    image_url: first,
    image_urls: nextPaths,
  };

  const { error } = await supabase
    .from('memories')
    .update(updatePayload)
    .eq('id', input.memoryId);

  if (!error) {
    return { mode: 'multi', savedPaths: nextPaths };
  }
  if (!isMissingImageUrlsColumnError(error)) throw error;

  await updateMemoryImagePath({
    memoryId: input.memoryId,
    imagePath: first,
  });

  return { mode: 'single_fallback', savedPaths: first ? [first] : [] };
}

/* ---------------------------------------------------------
 * 5) Delete (Storage 정리 포함)
 * -------------------------------------------------------- */
export async function deleteMemoryWithFile(input: {
  memoryId: string;
  imagePath?: string | null;
  imagePaths?: string[];
}) {
  const paths = Array.from(
    new Set([
      ...((input.imagePaths ?? []).filter(Boolean) as string[]),
      input.imagePath ?? '',
    ]),
  ).filter(Boolean);

  if (paths.length > 0) {
    await Promise.all(paths.map(path => deleteFile('memory-images', path)));
  }

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', input.memoryId);

  if (error) throw error;
}

/* ---------------------------------------------------------
 * 6) Read imagePath only (for replace flow)
 * - 기존 이미지 삭제를 위해 server truth로 가져옴
 * -------------------------------------------------------- */
export async function fetchMemoryImagePath(
  memoryId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('memories')
    .select('image_url')
    .eq('id', memoryId)
    .single();

  if (error) throw error;

  const row = data as { image_url: string | null };
  return row?.image_url ?? null;
}
