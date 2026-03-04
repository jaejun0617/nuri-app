// 파일: src/services/supabase/storagePets.ts
// 목적:
// - pet avatar 업로드
// - (public bucket) public url 발급
//
// bucket:
// - pet-profiles (public)
//
// 업로드:
// - Android content:// 대응을 위해 BlobUtil 기반(base64 -> bytes) 업로드 사용

import { Buffer } from 'buffer';
import { readFileAsBase64 } from '../files/readFileAsBase64';
import { supabase } from './client';

const PET_PROFILE_BUCKET = 'pet-profiles';

// ---------------------------------------------------------
// 1) Public URL
// ---------------------------------------------------------
export function getPetAvatarPublicUrl(path: string): string {
  const safePath = path.replace(/^\/+/, '');
  const { data } = supabase.storage
    .from(PET_PROFILE_BUCKET)
    .getPublicUrl(safePath);
  return data.publicUrl;
}

// ---------------------------------------------------------
// 2) Upload
// ---------------------------------------------------------
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

  const base64 = await readFileAsBase64(input.fileUri);
  const bytes = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from(PET_PROFILE_BUCKET)
    .upload(path, bytes, {
      upsert: false,
      contentType: input.mimeType ?? undefined,
    });

  if (error) throw error;
  return { path };
}
