// 파일: src/services/supabase/storageMemories.ts
// 목적:
// - memories(기록) 이미지 업로드 / signed url 발급
// - bucket: memory-images (private)
// - DB에는 path만 저장 (memories.image_url)
// - Signed URL은 "메모리 캐싱"으로 중복 발급 방지

import { Buffer } from 'buffer';
import { readFileAsBase64 } from '../files/readFileAsBase64';
import { supabase } from './client';
import { getSignedUrl } from './storage';

const MEMORY_IMAGES_BUCKET = 'memory-images';

// ---------------------------------------------------------
// 1) Signed URL 캐싱 (path → url)
// - private bucket에서 createSignedUrl()은 비용이 있으므로 캐시 필수
// ---------------------------------------------------------
type CacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, CacheEntry>();

export async function getMemoryImageSignedUrl(path: string): Promise<string> {
  const now = Date.now();

  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > now + 10_000) {
    // 만료 10초 전까진 캐시 사용
    return cached.url;
  }

  // expiresIn: 1시간
  const expiresIn = 60 * 60;
  const url = await getSignedUrl(MEMORY_IMAGES_BUCKET, path, expiresIn);

  signedUrlCache.set(path, {
    url,
    expiresAt: now + expiresIn * 1000,
  });

  return url;
}

// ---------------------------------------------------------
// 2) 업로드
// - Android content:// 안정화는 이미 readFileAsBase64(BlobUtil 기반)로 해결했다고 가정
// - supabase-js upload에는 bytes(Uint8Array/ArrayBuffer)가 안정적
// ---------------------------------------------------------
export async function uploadMemoryImage(input: {
  userId: string;
  petId: string;
  memoryId: string;
  fileUri: string;
  mimeType: string | null;
}): Promise<{ path: string }> {
  const ext = guessExt(input.mimeType);

  const path = `${input.userId}/${input.petId}/${
    input.memoryId
  }/image_${Date.now()}.${ext}`;

  const base64 = await readFileAsBase64(input.fileUri);
  const bytes = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from(MEMORY_IMAGES_BUCKET)
    .upload(path, bytes, {
      upsert: true,
      contentType: input.mimeType ?? undefined,
    });

  if (error) throw error;

  // 업로드 직후, path의 signed url 캐시가 필요하면 여기서 미리 발급해도 되지만
  // list/detail에서 필요 시 발급하도록 유지 (불필요한 호출 방지)
  return { path };
}

function guessExt(mimeType: string | null) {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}
