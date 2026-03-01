// 파일: src/services/supabase/storagePets.ts
// 목적:
// - pet avatar 업로드 / signed url 발급
// - bucket은 private 전제
// - DB에는 path만 저장 (pets.profile_image_url)
// - UI에서는 signedUrl로 렌더링

import { getSignedUrl, uploadFile } from './storage';

const PET_AVATAR_BUCKET = 'pet-avatars';

// ---------------------------------------------------------
// 1) signed url (UI용)
// ---------------------------------------------------------
export async function getPetAvatarSignedUrl(path: string): Promise<string> {
  // 1시간 유효 (원하면 더 늘려도 됨)
  return getSignedUrl(PET_AVATAR_BUCKET, path, 60 * 60);
}

// ---------------------------------------------------------
// 2) 업로드
// ---------------------------------------------------------
export async function uploadPetAvatar(input: {
  userId: string;
  petId: string;
  fileUri: string;
  mimeType: string | null;
}): Promise<{ path: string }> {
  const blob = await (await fetch(input.fileUri)).blob();

  // 확장자 최소 보정
  const ext = input.mimeType?.includes('png')
    ? 'png'
    : input.mimeType?.includes('webp')
    ? 'webp'
    : 'jpg';

  // path 규칙: userId/petId/avatar_xxx.jpg
  const path = `${input.userId}/${input.petId}/avatar_${Date.now()}.${ext}`;

  await uploadFile(PET_AVATAR_BUCKET, path, blob, input.mimeType ?? undefined);

  return { path };
}
