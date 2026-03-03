// 파일: src/services/supabase/storageMemories.ts
// 목적:
// - memory-images 버킷의 signed URL 생성 + TTL 캐싱(핵심)
// - 동일 imagePath 반복 요청 시 네트워크 재호출 방지
// - New Architecture 안정성 + 대량 리스트(타임라인) 성능 최적화
//
// ✅ 캐싱/성능 규칙 (Chapter 6 확정)
// 1) key = imagePath(= storage path)
// 2) TTL 캐시 + 만료 60초 전 갱신(버퍼)
// 3) LRU(maxSize)로 캐시 메모리 상한 고정
// 4) inFlight dedupe: 동일 path 동시 요청은 1번만 네트워크 호출
// 5) prefetch: 상단 N개만, 캐시 히트는 스킵, 실패는 무시(UX 안전)

import { supabase } from './client';

type CacheEntry = {
  url: string;
  expiresAtMs: number;
  touchedAtMs: number; // LRU
};

const cache = new Map<string, CacheEntry>();

// ✅ 동시 요청 dedupe
const inFlight = new Map<string, Promise<string>>();

// ✅ Signed URL 기본 만료(초)
const DEFAULT_EXPIRES_IN_SEC = 60 * 30; // 30분
const REFRESH_BUFFER_MS = 60 * 1000; // 만료 60초 전부터 갱신

// ✅ 캐시 크기 상한 (리스트/스크롤 많아질수록 중요)
const DEFAULT_MAX_CACHE_SIZE = 350;

// ---------------------------------------------------------
// 0) internal: LRU helpers
// ---------------------------------------------------------
function nowMs() {
  return Date.now();
}

function touch(key: string) {
  const hit = cache.get(key);
  if (!hit) return;
  hit.touchedAtMs = nowMs();
  cache.set(key, hit);
}

function pruneLRU(maxSize = DEFAULT_MAX_CACHE_SIZE) {
  if (cache.size <= maxSize) return;

  // 가장 오래된 touchedAtMs부터 제거
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

function normalizePath(p: string | null | undefined) {
  return (p ?? '').trim();
}

// ---------------------------------------------------------
// 1) low-level: create signed url
// ---------------------------------------------------------
export async function getMemoryImageSignedUrl(
  imagePath: string,
  options?: { expiresInSec?: number },
): Promise<string> {
  const path = normalizePath(imagePath);
  if (!path) throw new Error('imagePath is required');

  const expiresInSec = options?.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC;

  const { data, error } = await supabase.storage
    .from('memory-images')
    .createSignedUrl(path, expiresInSec);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('signedUrl is empty');

  return data.signedUrl;
}

// ---------------------------------------------------------
// 2) cached: get signed url with TTL + LRU + dedupe
// ---------------------------------------------------------
export async function getMemoryImageSignedUrlCached(
  imagePath: string | null | undefined,
  options?: {
    expiresInSec?: number;
    maxCacheSize?: number;
    refreshBufferMs?: number;
  },
): Promise<string | null> {
  const path = normalizePath(imagePath);
  if (!path) return null;

  const maxCacheSize = options?.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;
  const refreshBufferMs = options?.refreshBufferMs ?? REFRESH_BUFFER_MS;
  const expiresInSec = options?.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC;

  // 1) cache hit
  const hit = cache.get(path);
  if (hit && isFreshEnough(hit, refreshBufferMs)) {
    touch(path);
    return hit.url;
  }

  // 2) inFlight dedupe
  const inflight = inFlight.get(path);
  if (inflight) {
    return inflight.then(u => u).catch(() => null);
  }

  // 3) fetch & store
  const promise = (async () => {
    const url = await getMemoryImageSignedUrl(path, { expiresInSec });

    const t = nowMs();
    cache.set(path, {
      url,
      expiresAtMs: t + expiresInSec * 1000,
      touchedAtMs: t,
    });

    pruneLRU(maxCacheSize);
    return url;
  })();

  inFlight.set(path, promise);

  try {
    const url = await promise;
    return url;
  } catch {
    return null;
  } finally {
    inFlight.delete(path);
  }
}

// ---------------------------------------------------------
// 3) prefetch: fill cache for top N
// - 캐시에 이미 fresh한 건 스킵
// - 실패는 무시
// ---------------------------------------------------------
export async function prefetchMemorySignedUrls(input: {
  imagePaths: Array<string | null | undefined>;
  max?: number;
  expiresInSec?: number;
  maxCacheSize?: number;
  refreshBufferMs?: number;
}) {
  const max = input.max ?? 10;
  const expiresInSec = input.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC;
  const maxCacheSize = input.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;
  const refreshBufferMs = input.refreshBufferMs ?? REFRESH_BUFFER_MS;

  const unique = Array.from(
    new Set((input.imagePaths ?? []).map(normalizePath).filter(Boolean)),
  ).slice(0, max);

  if (unique.length === 0) return;

  // ✅ 캐시 fresh hit은 네트워크 스킵
  const targets = unique.filter(p => {
    const hit = cache.get(p);
    if (!hit) return true;
    return !isFreshEnough(hit, refreshBufferMs);
  });

  if (targets.length === 0) return;

  await Promise.all(
    targets.map(p =>
      getMemoryImageSignedUrlCached(p, {
        expiresInSec,
        maxCacheSize,
        refreshBufferMs,
      }).catch(() => null),
    ),
  );
}

export function clearMemorySignedUrlCache() {
  cache.clear();
  inFlight.clear();
}

// 디버그/운영 지표용(필요 시)
export function getMemorySignedUrlCacheSize() {
  return cache.size;
}
