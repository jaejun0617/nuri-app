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
import { clearMemorySignedUrlCache } from './storageMemories';
import { supabase } from './client';

const PET_PROFILE_BUCKET = 'pet-profiles';
const MEMORY_IMAGE_BUCKET = 'memory-images';
const STORAGE_LIST_PAGE_SIZE = 100;

type StorageListEntry = {
  id?: string | null;
  name?: string | null;
};

export type DeletedPetStorageCleanupResult = {
  failedBuckets: Array<typeof PET_PROFILE_BUCKET | typeof MEMORY_IMAGE_BUCKET>;
};

function isStorageFile(
  entry: unknown,
): entry is StorageListEntry & { name: string } {
  if (typeof entry !== 'object' || entry === null) return false;
  const candidate = entry as StorageListEntry;
  return (
    Boolean(candidate.id) &&
    typeof candidate.name === 'string' &&
    candidate.name.length > 0
  );
}

async function listStorageFolderFiles(bucket: string, folder: string) {
  let offset = 0;
  const paths: string[] = [];

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: STORAGE_LIST_PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) throw error;

    const entries = Array.isArray(data) ? data : [];
    paths.push(
      ...entries.filter(isStorageFile).map(entry => `${folder}/${entry.name}`),
    );

    if (entries.length < STORAGE_LIST_PAGE_SIZE) return paths;
    offset += entries.length;
  }
}

async function removeStorageFolderFiles(bucket: string, folder: string) {
  const paths = await listStorageFolderFiles(bucket, folder);

  for (let index = 0; index < paths.length; index += STORAGE_LIST_PAGE_SIZE) {
    const batch = paths.slice(index, index + STORAGE_LIST_PAGE_SIZE);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) throw error;
  }
}

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

/**
 * DB 삭제가 확정된 펫의 사용자 소유 폴더만 정리한다.
 * 삭제 실패는 DB 결과를 되돌릴 수 없으므로 호출부가 후처리 상태로 안내한다.
 */
export async function cleanupDeletedPetStorage(input: {
  userId: string;
  petId: string;
}): Promise<DeletedPetStorageCleanupResult> {
  const userId = input.userId.trim();
  const petId = input.petId.trim();
  if (!userId || !petId) {
    return {
      failedBuckets: [PET_PROFILE_BUCKET, MEMORY_IMAGE_BUCKET],
    };
  }

  const folder = `${userId}/${petId}`;
  const buckets = [PET_PROFILE_BUCKET, MEMORY_IMAGE_BUCKET] as const;
  const results = await Promise.allSettled(
    buckets.map(bucket => removeStorageFolderFiles(bucket, folder)),
  );

  clearMemorySignedUrlCache();

  return {
    failedBuckets: buckets.filter(
      (_, index) => results[index]?.status === 'rejected',
    ),
  };
}
