// 파일: src/services/supabase/storageMemories.ts
// 목적:
// - memory-images 버킷의 signed URL 생성 + TTL 캐싱(핵심)
// - 동일 imagePath 반복 요청 시 네트워크 재호출 방지
//
// 캐싱 규칙:
// - key = imagePath(= storage path)
// - value = { url, expiresAtMs }
// - 만료 60초 전이면 갱신(안전 버퍼)

import { supabase } from './client';

type CacheEntry = {
  url: string;
  expiresAtMs: number;
};

const cache = new Map<string, CacheEntry>();

// ✅ Signed URL 기본 만료(초) - 프로젝트 상황에 맞게 조절 가능
const DEFAULT_EXPIRES_IN = 60 * 30; // 30분
const REFRESH_BUFFER_MS = 60 * 1000; // 60초 전부터 갱신

export async function getMemoryImageSignedUrl(
  imagePath: string,
  options?: { expiresIn?: number },
): Promise<string> {
  const path = (imagePath ?? '').trim();
  if (!path) throw new Error('imagePath is required');

  const expiresIn = options?.expiresIn ?? DEFAULT_EXPIRES_IN;

  const { data, error } = await supabase.storage
    .from('memory-images')
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('signedUrl is empty');

  return data.signedUrl;
}

export async function getMemoryImageSignedUrlCached(
  imagePath: string | null | undefined,
  options?: { expiresIn?: number },
): Promise<string | null> {
  const path = (imagePath ?? '').trim();
  if (!path) return null;

  const now = Date.now();
  const hit = cache.get(path);

  if (hit && hit.expiresAtMs - now > REFRESH_BUFFER_MS) {
    return hit.url;
  }

  const expiresIn = options?.expiresIn ?? DEFAULT_EXPIRES_IN;

  const url = await getMemoryImageSignedUrl(path, { expiresIn });
  cache.set(path, { url, expiresAtMs: now + expiresIn * 1000 });

  return url;
}

// ✅ 리스트 프리패치: 상단 N개 정도만 미리 캐시 채우기
export async function prefetchMemorySignedUrls(input: {
  imagePaths: Array<string | null | undefined>;
  max?: number;
  expiresIn?: number;
}) {
  const max = input.max ?? 10;
  const expiresIn = input.expiresIn ?? DEFAULT_EXPIRES_IN;

  const unique = Array.from(
    new Set(
      (input.imagePaths ?? []).map(p => (p ?? '').trim()).filter(Boolean),
    ),
  ).slice(0, max);

  if (unique.length === 0) return;

  // ✅ 병렬 프리패치(실패는 무시: UX 안전)
  await Promise.all(
    unique.map(p =>
      getMemoryImageSignedUrlCached(p, { expiresIn }).catch(() => null),
    ),
  );
}

export function clearMemorySignedUrlCache() {
  cache.clear();
}
