// 파일: src/services/supabase/memories.ts
// 역할:
// - memories CRUD
// - pagination cursor(created_at + id) 고정(✅ 타이브레이커 포함)
// - ✅ signed URL 생성은 "리스트 fetch 경로"에서 제거(UI block 방지)
// - ✅ prefetchMemorySignedUrls는 fetch 흐름 밖에서 async 스케줄링(스크롤 버벅임 방지)

import { supabase } from './client';
import { deleteFile } from './storage';
import { prefetchMemorySignedUrls } from './storageMemories';

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

  /**
   * ✅ signed url(캐싱 적용)
   * - 리스트 fetch 단계에서 생성하지 않는다(=UI block 제거)
   * - 렌더링 레이어에서 getMemoryImageSignedUrlCached로 채우거나,
   *   prefetch로 캐시를 먼저 데워서 빠르게 얻도록 한다.
   */
  imageUrl?: string | null;

  /** ✅ storage path (DB에 저장된 값) */
  imagePath?: string | null;
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

/**
 * ✅ mapRow는 동기 변환만 수행
 * - signed URL fetch 절대 금지(리스트 fetch 경로에서 JS thread spike 유발)
 */
function mapRow(row: MemoriesRow): MemoryRecord {
  return {
    id: row.id,
    petId: row.pet_id,
    title: row.title,
    content: row.content,
    emotion: row.emotion,
    tags: row.tags ?? [],
    occurredAt: row.occurred_at,
    createdAt: row.created_at,

    // ✅ 리스트 fetch 단계에서는 null로 둔다 (UI block 방지)
    imageUrl: null,
    imagePath: row.image_url,
  };
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
    .select(
      'id,pet_id,image_url,title,content,emotion,tags,occurred_at,created_at',
    )
    .eq('id', memoryId)
    .single();

  if (error) throw error;

  const item = mapRow(data as MemoriesRow);

  // ✅ 단건 캐시 워밍(비동기 / 스크롤 영향 최소)
  if (item.imagePath) {
    const path = item.imagePath;
    scheduleAfterInteractions(() =>
      prefetchMemorySignedUrls({
        imagePaths: [path],
        max: 1,
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
    .map(it => it.imagePath ?? null)
    .filter(Boolean) as string[];

  if (paths.length) {
    const topPaths = [...paths]; // 참조 고정
    scheduleAfterInteractions(() =>
      prefetchMemorySignedUrls({
        imagePaths: topPaths,
        max: prefetchTop,
      }),
    );
  }

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
