// 파일: src/services/supabase/storagePets.ts
// 목적:
// - pet avatar 업로드 / signed url 발급
// - bucket: pet-profiles (너의 실제 버킷명)
// - BlobUtil로 base64 읽고 -> Supabase Storage upload

import { Buffer } from 'buffer';
import { readFileAsBase64 } from '../files/readFileAsBase64';
import { supabase } from './client';
import { getSignedUrl } from './storage';

const PET_PROFILE_BUCKET = 'pet-profiles';

export async function getPetAvatarSignedUrl(path: string): Promise<string> {
  return getSignedUrl(PET_PROFILE_BUCKET, path, 60 * 60);
}

export async function uploadPetAvatar(input: {
  userId: string;
  petId: string;
  fileUri: string; // ImagePicker asset.uri
  mimeType: string | null;
}): Promise<{ path: string }> {
  const ext = input.mimeType?.includes('png')
    ? 'png'
    : input.mimeType?.includes('webp')
    ? 'webp'
    : 'jpg';

  const path = `${input.userId}/${input.petId}/avatar_${Date.now()}.${ext}`;

  // ✅ BlobUtil로 base64 읽기 (content:// 대응)
  const base64 = await readFileAsBase64(input.fileUri);

  // ✅ base64 -> bytes
  const bytes = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from(PET_PROFILE_BUCKET)
    .upload(path, bytes, {
      upsert: true,
      contentType: input.mimeType ?? undefined,
    });

  if (error) throw error;
  return { path };
}
