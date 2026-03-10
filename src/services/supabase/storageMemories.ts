// 파일: src/services/supabase/storageMemories.ts
// 목적:
// - memory-images 버킷의 signed URL 생성 + TTL 캐싱(핵심)
// - 동일 imagePath 반복 요청 시 네트워크 재호출 방지
// - 대량 리스트(타임라인) 성능 최적화
// - ✅ memory-images 업로드(uploadMemoryImage) 포함(RecordCreate/RecordEdit에서 사용)
//
// ✅ 캐싱/성능 규칙
// 1) key = imagePath(= storage path)
// 2) TTL 캐시 + 만료 60초 전 갱신(버퍼)
// 3) LRU(maxSize)로 캐시 메모리 상한 고정
// 4) inFlight dedupe: 동일 path 동시 요청은 1번만 네트워크 호출
// 5) prefetch: 상단 N개만, 캐시 히트는 스킵, 실패는 무시
// 6) ✅ prefetch rate-limit(minIntervalMs) + concurrency 제한으로 "잔여 버벅임" 제거

import { Buffer } from 'buffer';
import RNBlobUtil from 'react-native-blob-util';
import { readFileAsBase64 } from '../files/readFileAsBase64';
import { isDirectMemoryImageUri } from '../records/imageSources';
import { supabase } from './client';

type CacheEntry = {
  url: string;
  expiresAtMs: number;
  touchedAtMs: number; // LRU
};

export type MemoryImageVariant = 'original' | 'timeline-thumb';

type MemoryImageTransformOptions = {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  quality?: number;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string>>();

const DEFAULT_EXPIRES_IN_SEC = 60 * 30; // 30분
const REFRESH_BUFFER_MS = 60 * 1000; // 만료 60초 전부터 갱신
const DEFAULT_MAX_CACHE_SIZE = 350;

const PREFETCH_MIN_INTERVAL_MS = 180; // 180ms (220~260 조정 가능)
const PREFETCH_MAX_CONCURRENCY = 2; // 2~3 권장

// ---------------------------------------------------------
// internal helpers
// ---------------------------------------------------------
function nowMs() {
  return Date.now();
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function normalizePath(p: string | null | undefined) {
  return (p ?? '').trim();
}

function resolveVariantTransform(
  variant: MemoryImageVariant | null | undefined,
): MemoryImageTransformOptions | null {
  switch (variant) {
    case 'timeline-thumb':
      return {
        width: 144,
        height: 144,
        resize: 'cover',
        quality: 72,
      };
    default:
      return null;
  }
}

function buildCacheKey(
  path: string,
  variant: MemoryImageVariant | null | undefined,
) {
  const normalizedVariant = variant ?? 'original';
  return `${normalizedVariant}::${path}`;
}

function touch(key: string) {
  const hit = cache.get(key);
  if (!hit) return;
  hit.touchedAtMs = nowMs();
  cache.set(key, hit);
}

function pruneLRU(maxSize = DEFAULT_MAX_CACHE_SIZE) {
  if (cache.size <= maxSize) return;

  const entries = Array.from(cache.entries());
  entries.sort((a, b) => a[1].touchedAtMs - b[1].touchedAtMs);

  const removeCount = cache.size - maxSize;
  for (let i = 0; i < removeCount; i += 1) {
    const k = entries[i]?.[0];
    if (k) cache.delete(k);
  }
}

function isFreshEnough(entry: CacheEntry, bufferMs = REFRESH_BUFFER_MS) {
  return entry.expiresAtMs - nowMs() > bufferMs;
}

function normalizeFileUri(uri: string) {
  return uri.startsWith('file://') ? uri.replace('file://', '') : uri;
}

function inferExtFromMime(mimeType: string | null) {
  const mt = (mimeType ?? '').toLowerCase();
  if (mt.includes('png')) return 'png';
  if (mt.includes('webp')) return 'webp';
  if (mt.includes('heic') || mt.includes('heif')) return 'heic';
  return 'jpg';
}

// ---------------------------------------------------------
// 1) low-level: create signed url
// ---------------------------------------------------------
export async function getMemoryImageSignedUrl(
  imagePath: string,
  options?: {
    expiresInSec?: number;
    variant?: MemoryImageVariant;
  },
): Promise<string> {
  const path = normalizePath(imagePath);
  if (!path) throw new Error('imagePath is required');

  const expiresInSec = options?.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC;
  const transform = resolveVariantTransform(options?.variant);

  const { data, error } = await supabase.storage
    .from('memory-images')
    .createSignedUrl(path, expiresInSec, transform ? { transform } : undefined);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('signedUrl is empty');

  return data.signedUrl;
}

// ---------------------------------------------------------
// 2) cached: TTL + LRU + inFlight dedupe
// ---------------------------------------------------------
export async function getMemoryImageSignedUrlCached(
  imagePath: string | null | undefined,
  options?: {
    expiresInSec?: number;
    maxCacheSize?: number;
    refreshBufferMs?: number;
    variant?: MemoryImageVariant;
  },
): Promise<string | null> {
  const path = normalizePath(imagePath);
  if (!path) return null;
  if (isDirectMemoryImageUri(path)) return path;

  const maxCacheSize = options?.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;
  const refreshBufferMs = options?.refreshBufferMs ?? REFRESH_BUFFER_MS;
  const expiresInSec = options?.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC;
  const cacheKey = buildCacheKey(path, options?.variant);

  // 1) cache hit
  const hit = cache.get(cacheKey);
  if (hit && isFreshEnough(hit, refreshBufferMs)) {
    touch(cacheKey);
    return hit.url;
  }

  // 2) inFlight dedupe
  const inflight = inFlight.get(cacheKey);
  if (inflight) return inflight.then(u => u).catch(() => null);

  // 3) fetch & store
  const promise = (async () => {
    const url = await getMemoryImageSignedUrl(path, {
      expiresInSec,
      variant: options?.variant,
    });

    const t = nowMs();
    cache.set(cacheKey, {
      url,
      expiresAtMs: t + expiresInSec * 1000,
      touchedAtMs: t,
    });

    pruneLRU(maxCacheSize);
    return url;
  })();

  inFlight.set(cacheKey, promise);

  try {
    const url = await promise;
    return url;
  } catch {
    return null;
  } finally {
    inFlight.delete(cacheKey);
  }
}

export async function getMemoryImageSignedUrlsCached(
  imagePaths: Array<string | null | undefined>,
  options?: {
    expiresInSec?: number;
    maxCacheSize?: number;
    refreshBufferMs?: number;
    variant?: MemoryImageVariant;
  },
): Promise<Array<string | null>> {
  const normalizedPaths = (imagePaths ?? []).map(normalizePath);
  if (normalizedPaths.length === 0) return [];

  const storagePaths = Array.from(
    new Set(
      normalizedPaths.filter(
        (path): path is string => Boolean(path) && !isDirectMemoryImageUri(path),
      ),
    ),
  );

  const signedEntries = await Promise.all(
    storagePaths.map(async path => {
      const signedUrl = await getMemoryImageSignedUrlCached(path, options);
      return [path, signedUrl] as const;
    }),
  );
  const signedByPath = new Map(signedEntries);

  return normalizedPaths.map(path => {
    if (!path) return null;
    if (isDirectMemoryImageUri(path)) return path;
    return signedByPath.get(path) ?? null;
  });
}

// ---------------------------------------------------------
// 3) prefetch: rate-limited + concurrency-limited
// ---------------------------------------------------------
export async function prefetchMemorySignedUrls(input: {
  imagePaths: Array<string | null | undefined>;
  max?: number;
  expiresInSec?: number;
  maxCacheSize?: number;
  refreshBufferMs?: number;
  variant?: MemoryImageVariant;

  minIntervalMs?: number;
  maxConcurrency?: number;
}) {
  const max = input.max ?? 10;
  const expiresInSec = input.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC;
  const maxCacheSize = input.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;
  const refreshBufferMs = input.refreshBufferMs ?? REFRESH_BUFFER_MS;

  // ✅ “실제로 쓰는” 구조 (unused 에러 방지)
  const minIntervalMs = input.minIntervalMs ?? PREFETCH_MIN_INTERVAL_MS;
  const effectiveMinIntervalMs = Math.max(60, Math.min(300, minIntervalMs));

  const maxConcurrency = input.maxConcurrency ?? PREFETCH_MAX_CONCURRENCY;
  const effectiveConcurrency = Math.max(1, Math.min(3, maxConcurrency));

  const unique = Array.from(
    new Set((input.imagePaths ?? []).map(normalizePath).filter(Boolean)),
  ).slice(0, max);

  if (unique.length === 0) return;

  const targets = unique.filter(p => {
    const hit = cache.get(buildCacheKey(p, input.variant));
    if (!hit) return true;
    return !isFreshEnough(hit, refreshBufferMs);
  });

  if (targets.length === 0) return;

  let cursor = 0;

  const worker = async () => {
    let lastIssuedAt = 0;

    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= targets.length) break;

      const path = targets[i];
      if (!path) continue;

      const now = nowMs();
      const since = now - lastIssuedAt;
      if (since < effectiveMinIntervalMs) {
        await sleep(effectiveMinIntervalMs - since);
      }
      lastIssuedAt = nowMs();

      await getMemoryImageSignedUrlCached(path, {
        expiresInSec,
        maxCacheSize,
        refreshBufferMs,
        variant: input.variant,
      }).catch(() => null);
    }
  };

  await Promise.all(
    Array.from({ length: effectiveConcurrency }, () => worker()),
  );
}

export function clearMemorySignedUrlCache() {
  cache.clear();
  inFlight.clear();
}

export function getMemorySignedUrlCacheSize() {
  return cache.size;
}

// ---------------------------------------------------------
// 4) upload: memory-images 업로드
// ---------------------------------------------------------
// 파일: src/services/supabase/storageMemories.ts

type UploadMemoryImageParams = {
  userId: string;
  petId: string;
  memoryId: string;
  fileUri: string;
  mimeType: string | null;
};

export async function uploadMemoryImage({
  userId,
  petId,
  memoryId,
  fileUri,
  mimeType,
}: UploadMemoryImageParams): Promise<{ path: string }> {
  const ext = inferExtFromMime(mimeType);

  // ✅ 핵심: 매번 새로운 path (타임스탬프 + 랜덤)로 충돌 방지
  const version = Date.now();
  const nonce = Math.random().toString(36).slice(2, 10);
  const path = `${userId}/${petId}/${memoryId}_${version}_${nonce}.${ext}`;

  const filePath = normalizeFileUri(fileUri);
  const base64 = filePath.startsWith('content://')
    ? await readFileAsBase64(filePath)
    : await RNBlobUtil.fs.readFile(filePath, 'base64');
  const bytes = Buffer.from(base64, 'base64');

  // ✅ upsert=false (같은 path를 덮어쓰지 않음)
  const { error } = await supabase.storage
    .from('memory-images')
    .upload(path, bytes, {
      contentType: mimeType ?? 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  return { path };
}

// ---------------------------------------------------------
// 5) delete: memory-images 파일 삭제 (+ 캐시 정리)
// ---------------------------------------------------------
export async function deleteMemoryImage(imagePath: string) {
  const path = normalizePath(imagePath);
  if (!path) return;

  const { error } = await supabase.storage.from('memory-images').remove([path]);
  if (error) throw error;

  cache.delete(path);
  inFlight.delete(path);
}
