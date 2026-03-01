// ==========================================================
// storage.ts
// 역할:
// - private bucket 업로드
// - signed URL 발급
// - DB에는 full URL 저장하지 않음 (path만 저장)
// ==========================================================

import { supabase } from './client';

// ----------------------------------------------------------
// 1) 바이너리 업로드 (RN 안정 버전)
// - supabase-js storage.upload는 Blob/ArrayBuffer/Uint8Array를 받음
// - RN(Android)에서 Blob 만들기/로컬 fetch가 불안정해서 Uint8Array 업로드를 기본값으로 둠
// ----------------------------------------------------------
export async function uploadBinary(
  bucket: string,
  path: string,
  bytes: Uint8Array,
  contentType?: string,
) {
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    upsert: true,
    contentType,
  });

  if (error) throw error;

  return path;
}

// ----------------------------------------------------------
// 2) Signed URL 생성
// ----------------------------------------------------------
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 60 * 60,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;

  return data.signedUrl;
}

// ----------------------------------------------------------
// 3) 삭제
// ----------------------------------------------------------
export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
