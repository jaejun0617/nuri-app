// 파일: src/services/supabase/storagePets.ts
// 목적:
// - Pet 아바타 업로드 / signed URL 생성
//
// 운영 원칙(권장):
// - bucket은 private
// - DB(pets.profile_image_url)에는 "storage path"를 저장
// - 화면에서는 signed URL로 렌더링(만료시간 짧게)

import { supabase } from './client';

export const PET_AVATAR_BUCKET = 'pet-profiles'; // ✅ 여기 bucket명만 프로젝트에 맞게 정리

type UploadInput = {
  userId: string;
  petId: string;
  fileUri: string;
  mimeType?: string | null;
};

function getFileExtFromUri(uri: string) {
  const q = uri.split('?')[0];
  const parts = q.split('.');
  if (parts.length < 2) return 'jpg';
  return (parts[parts.length - 1] || 'jpg').toLowerCase();
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('이미지 파일을 읽을 수 없습니다.');
  return await res.arrayBuffer();
}

/* ---------------------------------------------------------
 * 1) 업로드 (path 반환)
 * -------------------------------------------------------- */
export async function uploadPetAvatar({
  userId,
  petId,
  fileUri,
  mimeType,
}: UploadInput): Promise<{ path: string }> {
  const ext = getFileExtFromUri(fileUri);
  const path = `${userId}/${petId}/avatar.${ext}`;

  const body = await uriToArrayBuffer(fileUri);

  const { error } = await supabase.storage
    .from(PET_AVATAR_BUCKET)
    .upload(path, body, {
      contentType: mimeType ?? 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  return { path };
}

/* ---------------------------------------------------------
 * 2) signed URL 생성
 * -------------------------------------------------------- */
export async function getPetAvatarSignedUrl(
  path: string,
  expiresInSec = 60 * 60, // 1h
): Promise<string | null> {
  // 이미 완전 URL이면 그대로 사용
  if (/^https?:\/\//i.test(path)) return path;

  const { data, error } = await supabase.storage
    .from(PET_AVATAR_BUCKET)
    .createSignedUrl(path, expiresInSec);

  if (error) return null;
  return data?.signedUrl ?? null;
}
