// 파일: src/services/supabase/memories.ts
// 역할:
// - memories CRUD
// - pagination cursor(created_at + id) 고정(✅ 타이브레이커 포함)
// - ✅ signed URL 생성은 "리스트 fetch 경로"에서 제거(UI block 방지)
// - ✅ prefetchMemorySignedUrls는 fetch 흐름 밖에서 async 스케줄링(스크롤 버벅임 방지)

import { supabase } from './client';
import { deleteFile } from './storage';
import {
  prefetchMemorySignedUrls,
  type MemoryImageVariant,
} from './storageMemories';
import { captureMonitoringException } from '../monitoring/sentry';
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
  /** ✅ 타임라인 카드가 우선 사용할 대표 이미지 path */
  timelineImagePath?: string | null;
  /** ✅ timelineImagePath 해석 방식 */
  timelineImageVariant?: MemoryImageVariant | null;
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

type MemoryImageRow = {
  memory_id: string;
  sort_order: number;
  original_path: string;
  timeline_thumb_path: string | null;
  status: 'pending' | 'ready' | 'failed';
};

type LegacyMemoryImageState = {
  imageUrl: string | null;
  imageUrls: string[];
  mode: 'multi' | 'single_fallback';
};

function normalizePathValue(value: string | null | undefined) {
  return `${value ?? ''}`.trim();
}

function dedupeOrderedPaths(paths: Array<string | null | undefined>) {
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const value of paths) {
    const normalized = normalizePathValue(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    ordered.push(normalized);
  }

  return ordered;
}

async function fetchMemoryImagesByMemoryIds(memoryIds: string[]) {
  const normalizedIds = Array.from(
    new Set((memoryIds ?? []).map(id => `${id ?? ''}`.trim()).filter(Boolean)),
  );
  if (normalizedIds.length === 0) {
    return new Map<string, MemoryImageRow[]>();
  }

  const { data, error } = await supabase
    .from('memory_images')
    .select(
      'memory_id,sort_order,original_path,timeline_thumb_path,status',
    )
    .in('memory_id', normalizedIds)
    .order('memory_id', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('[memories] memory_images fallback to legacy fields', {
      message: error.message,
    });
    return new Map<string, MemoryImageRow[]>();
  }

  const grouped = new Map<string, MemoryImageRow[]>();
  for (const row of (data ?? []) as MemoryImageRow[]) {
    const memoryId = `${row.memory_id ?? ''}`.trim();
    if (!memoryId) continue;
    const current = grouped.get(memoryId) ?? [];
    current.push(row);
    grouped.set(memoryId, current);
  }

  return grouped;
}

async function fetchMemoryImagesSnapshot(memoryId: string) {
  const { data, error } = await supabase
    .from('memory_images')
    .select(
      'memory_id,sort_order,original_path,timeline_thumb_path,status',
    )
    .eq('memory_id', memoryId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MemoryImageRow[];
}

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

function resolveRecordImages(
  row: MemoriesRow,
  memoryImages?: MemoryImageRow[],
) {
  const legacyPaths = normalizeImagePaths(row);
  const orderedMemoryImages = (memoryImages ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const originalPaths = dedupeOrderedPaths(
    orderedMemoryImages.map(image => image.original_path),
  );
  const resolvedOriginalPaths =
    originalPaths.length > 0 ? originalPaths : legacyPaths;
  const primaryOriginalPath = resolvedOriginalPaths[0] ?? null;
  const readyThumbPath =
    orderedMemoryImages
      .filter(image => image.status === 'ready')
      .map(image => normalizePathValue(image.timeline_thumb_path))
      .find(Boolean) ?? null;

  const timelineImagePath = readyThumbPath ?? primaryOriginalPath;
  const timelineImageVariant: MemoryImageVariant | null = readyThumbPath
    ? 'original'
    : timelineImagePath
      ? 'timeline-thumb'
      : null;

  return {
    imagePath: primaryOriginalPath,
    imagePaths: resolvedOriginalPaths,
    timelineImagePath,
    timelineImageVariant,
  };
}

function mapRow(row: MemoriesRow, memoryImages?: MemoryImageRow[]): MemoryRecord {
  const imageState = resolveRecordImages(row, memoryImages);
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
    imagePath: imageState.imagePath,
    imagePaths: imageState.imagePaths,
    timelineImagePath: imageState.timelineImagePath,
    timelineImageVariant: imageState.timelineImageVariant,
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
  const [{ data, error }, memoryImagesByMemoryId] = await Promise.all([
    supabase
      .from('memories')
      .select('*')
      .eq('id', memoryId)
      .single(),
    fetchMemoryImagesByMemoryIds([memoryId]),
  ]);

  if (error) throw error;

  const item = mapRow(
    data as MemoriesRow,
    memoryImagesByMemoryId.get(memoryId) ?? [],
  );

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
  const memoryImagesByMemoryId = await fetchMemoryImagesByMemoryIds(
    rows.map(row => row.id),
  );

  // ✅ signed url 없이 row → item 변환(즉시 반환 가능)
  const items = rows.map(row => mapRow(row, memoryImagesByMemoryId.get(row.id) ?? []));

  // ✅ 프리패치: fetch 완료 직후 "idle 타이밍"으로 미룸
  const timelineThumbPaths = items
    .slice(0, prefetchTop)
    .map(item => ({
      path: normalizePathValue(item.timelineImagePath),
      variant: item.timelineImageVariant ?? 'original',
    }))
    .filter((item): item is { path: string; variant: MemoryImageVariant } => Boolean(item.path));

  if (timelineThumbPaths.length) {
    const pathsByVariant = timelineThumbPaths.reduce<
      Record<MemoryImageVariant, string[]>
    >(
      (acc, item) => {
        acc[item.variant].push(item.path);
        return acc;
      },
      { original: [], 'timeline-thumb': [] },
    );
    scheduleAfterInteractions(() =>
      Promise.all(
        (Object.entries(pathsByVariant) as Array<
          [MemoryImageVariant, string[]]
        >)
          .filter(([, imagePaths]) => imagePaths.length > 0)
          .map(([variant, imagePaths]) =>
            prefetchMemorySignedUrls({
              imagePaths,
              max: prefetchTop,
              variant,
            }),
          ),
      ).then(() => undefined),
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

async function syncMemoryImages(input: {
  memoryId: string;
  imagePaths: string[];
}) {
  const nextPaths = dedupeOrderedPaths(input.imagePaths);

  const { data, error } = await supabase
    .from('memory_images')
    .select('id,original_path,timeline_thumb_path,status')
    .eq('memory_id', input.memoryId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const existingRows = (data ?? []) as Array<{
    id: string;
    original_path: string;
    timeline_thumb_path: string | null;
    status: 'pending' | 'ready' | 'failed';
  }>;
  const existingByPath = new Map(
    existingRows.map(row => [normalizePathValue(row.original_path), row] as const),
  );

  if (nextPaths.length > 0) {
    const payload = nextPaths.map((path, index) => {
      const existing = existingByPath.get(path);
      return {
        memory_id: input.memoryId,
        sort_order: index,
        original_path: path,
        timeline_thumb_path: existing?.timeline_thumb_path ?? null,
        status: existing?.status ?? ('pending' as const),
      };
    });

    const { error: upsertError } = await supabase
      .from('memory_images')
      .upsert(payload, { onConflict: 'memory_id,original_path' });

    if (upsertError) throw upsertError;
  }

  const nextPathSet = new Set(nextPaths);
  const removedRows = existingRows.filter(
    row => !nextPathSet.has(normalizePathValue(row.original_path)),
  );

  if (removedRows.length > 0) {
    const { error: deleteError } = await supabase
      .from('memory_images')
      .delete()
      .in(
        'id',
        removedRows.map(row => row.id),
      );

    if (deleteError) throw deleteError;
  }

  return {
    removedThumbPaths: removedRows
      .map(row => normalizePathValue(row.timeline_thumb_path))
      .filter(Boolean),
  };
}

async function restoreMemoryImagesSnapshot(input: {
  memoryId: string;
  rows: MemoryImageRow[];
}) {
  const snapshotRows = [...input.rows].sort((a, b) => a.sort_order - b.sort_order);
  const snapshotPaths = new Set(
    snapshotRows
      .map(row => normalizePathValue(row.original_path))
      .filter(Boolean),
  );

  if (snapshotRows.length > 0) {
    const payload = snapshotRows.map(row => ({
      memory_id: input.memoryId,
      sort_order: row.sort_order,
      original_path: normalizePathValue(row.original_path),
      timeline_thumb_path: normalizePathValue(row.timeline_thumb_path) || null,
      status: row.status,
    }));

    const { error: restoreError } = await supabase
      .from('memory_images')
      .upsert(payload, { onConflict: 'memory_id,original_path' });

    if (restoreError) throw restoreError;
  }

  const currentRows = await fetchMemoryImagesSnapshot(input.memoryId);
  const extraPaths = currentRows
    .map(row => normalizePathValue(row.original_path))
    .filter(path => path && !snapshotPaths.has(path));

  if (extraPaths.length > 0) {
    const { error: deleteError } = await supabase
      .from('memory_images')
      .delete()
      .eq('memory_id', input.memoryId)
      .in('original_path', extraPaths);

    if (deleteError) throw deleteError;
  }
}

async function cleanupMemoryThumbPaths(paths: string[]) {
  const targets = dedupeOrderedPaths(paths);
  if (targets.length === 0) return;

  await Promise.all(
    targets.map(async path => {
      await deleteFile('memory-images', path).catch(error => {
        captureMonitoringException(error);
      });
    }),
  );
}

async function persistLegacyMemoryImageState(input: {
  memoryId: string;
  nextPaths: string[];
  preferredMode?: LegacyMemoryImageState['mode'];
}): Promise<LegacyMemoryImageState['mode']> {
  const nextPaths = dedupeOrderedPaths(input.nextPaths);
  const first = nextPaths[0] ?? null;
  const updatePayload = {
    image_url: first,
    image_urls: nextPaths,
  };

  if (input.preferredMode !== 'single_fallback') {
    const { error } = await supabase
      .from('memories')
      .update(updatePayload)
      .eq('id', input.memoryId);

    if (!error) return 'multi';
    if (!isMissingImageUrlsColumnError(error)) throw error;
  }

  await updateMemoryImagePath({
    memoryId: input.memoryId,
    imagePath: first,
  });
  return 'single_fallback';
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

async function fetchLegacyMemoryImageState(
  memoryId: string,
): Promise<LegacyMemoryImageState> {
  const multiSelect = await supabase
    .from('memories')
    .select('image_url,image_urls')
    .eq('id', memoryId)
    .single();

  if (!multiSelect.error) {
    const row = multiSelect.data as {
      image_url: string | null;
      image_urls?: string[] | null;
    } | null;
    return {
      imageUrl: row?.image_url ?? null,
      imageUrls: Array.isArray(row?.image_urls) ? row.image_urls : [],
      mode: 'multi',
    };
  }

  if (!isMissingImageUrlsColumnError(multiSelect.error)) {
    throw multiSelect.error;
  }

  const singleSelect = await supabase
    .from('memories')
    .select('image_url')
    .eq('id', memoryId)
    .single();
  if (singleSelect.error) throw singleSelect.error;

  const row = singleSelect.data as { image_url: string | null } | null;
  const imageUrl = row?.image_url ?? null;
  return {
    imageUrl,
    imageUrls: imageUrl ? [imageUrl] : [],
    mode: 'single_fallback',
  };
}

/* ---------------------------------------------------------
 * 4-1) Update image paths (multi-image)
 * - image_urls 컬럼이 없는 DB면 image_url 단일 저장으로 폴백
 * -------------------------------------------------------- */
export async function updateMemoryImagePaths(input: {
  memoryId: string;
  imagePaths: string[];
}): Promise<{ mode: 'multi' | 'single_fallback'; savedPaths: string[] }> {
  const nextPaths = dedupeOrderedPaths(input.imagePaths);
  const [legacySnapshot, memoryImagesSnapshot] = await Promise.all([
    fetchLegacyMemoryImageState(input.memoryId),
    fetchMemoryImagesSnapshot(input.memoryId),
  ]);

  const syncResult = await syncMemoryImages({
    memoryId: input.memoryId,
    imagePaths: nextPaths,
  });

  try {
    const mode = await persistLegacyMemoryImageState({
      memoryId: input.memoryId,
      nextPaths,
      preferredMode: legacySnapshot.mode,
    });

    await cleanupMemoryThumbPaths(syncResult.removedThumbPaths);
    return { mode, savedPaths: nextPaths };
  } catch (error) {
    await restoreMemoryImagesSnapshot({
      memoryId: input.memoryId,
      rows: memoryImagesSnapshot,
    }).catch(restoreError => {
      captureMonitoringException(restoreError);
    });

    await persistLegacyMemoryImageState({
      memoryId: input.memoryId,
      nextPaths:
        legacySnapshot.imageUrls.length > 0
          ? legacySnapshot.imageUrls
          : legacySnapshot.imageUrl
            ? [legacySnapshot.imageUrl]
            : [],
      preferredMode: legacySnapshot.mode,
    }).catch(restoreError => {
      captureMonitoringException(restoreError);
    });

    throw error;
  }
}

/* ---------------------------------------------------------
 * 5) Delete (Storage 정리 포함)
 * -------------------------------------------------------- */
export async function deleteMemoryWithFile(input: {
  memoryId: string;
  imagePath?: string | null;
  imagePaths?: string[];
}) {
  const basePaths = Array.from(
    new Set([
      ...((input.imagePaths ?? []).filter(Boolean) as string[]),
      input.imagePath ?? '',
    ]),
  ).filter(Boolean);
  let memoryImageRows: Array<{
    original_path: string | null;
    timeline_thumb_path: string | null;
  }> = [];
  try {
    const { data } = await supabase
      .from('memory_images')
      .select('original_path,timeline_thumb_path')
      .eq('memory_id', input.memoryId)
      .throwOnError();
    memoryImageRows = (data ?? []) as Array<{
      original_path: string | null;
      timeline_thumb_path: string | null;
    }>;
  } catch {
    memoryImageRows = [];
  }
  const memoryImagePaths = ((memoryImageRows ?? []) as Array<{
    original_path: string | null;
    timeline_thumb_path: string | null;
  }>).flatMap(row => [row.original_path ?? '', row.timeline_thumb_path ?? '']);
  const paths = Array.from(new Set([...basePaths, ...memoryImagePaths])).filter(Boolean);

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', input.memoryId);

  if (error) throw error;

  try {
    await supabase
      .from('memory_images')
      .delete()
      .eq('memory_id', input.memoryId)
      .throwOnError();
  } catch (deleteError) {
    captureMonitoringException(deleteError);
  }

  if (paths.length > 0) {
    await Promise.all(
      paths.map(async path => {
        await deleteFile('memory-images', path).catch(deleteError => {
          captureMonitoringException(deleteError);
        });
      }),
    );
  }
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
