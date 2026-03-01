// 파일: src/services/supabase/storageMemories.ts
// 목적:
// - memories(기록) 이미지 업로드 / signed url 발급
// - bucket: memory-images (private)
// - DB에는 path만 저장 (memories.image_url)
// - Android content:// 안정화를 위해 BlobUtil로 읽고 bytes 업로드

import { Buffer } from 'buffer';
import { readFileAsBase64 } from '../files/readFileAsBase64';
import { supabase } from './client';
import { getSignedUrl } from './storage';

const MEMORY_IMAGES_BUCKET = 'memory-images';

// ---------------------------------------------------------
// 1) signed url (UI용)
// ---------------------------------------------------------
export async function getMemoryImageSignedUrl(path: string): Promise<string> {
  return getSignedUrl(MEMORY_IMAGES_BUCKET, path, 60 * 60);
}

// ---------------------------------------------------------
// 2) 업로드 (BlobUtil 기반)
// ---------------------------------------------------------
export async function uploadMemoryImage(input: {
  userId: string;
  petId: string;
  memoryId: string;
  fileUri: string;
  mimeType: string | null;
}): Promise<{ path: string }> {
  const ext = input.mimeType?.includes('png')
    ? 'png'
    : input.mimeType?.includes('webp')
    ? 'webp'
    : 'jpg';

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

  return { path };
}
