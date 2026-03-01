// ==========================================================
// storage.ts
// 역할:
// - private bucket 업로드
// - signed URL 발급
// - DB에는 full URL 저장하지 않음 (path만 저장)
// ==========================================================

import { supabase } from './client';

// ----------------------------------------------------------
// 1) 파일 업로드
// ----------------------------------------------------------
export async function uploadFile(
  bucket: string,
  path: string,
  file: Blob,
  contentType?: string,
) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType,
  });

  if (error) throw error;

  return path; // DB에 저장할 값
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
