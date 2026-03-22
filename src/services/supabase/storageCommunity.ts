// 파일: src/services/supabase/storageCommunity.ts
// 파일 목적:
// - community-images 버킷의 업로드/삭제와 signed URL 생성을 담당한다.
// 어디서 쓰이는지:
// - CommunityCreateScreen, 이후 CommunityEditScreen에서 사용된다.
// 수정 시 주의:
// - 업로드는 RNBlobUtil/readFileAsBase64 기반으로만 수행한다.
// - DB에는 signed URL이 아니라 storage path를 저장하는 전제를 유지한다.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import RNBlobUtil from 'react-native-blob-util';

import { readFileAsBase64 } from '../files/readFileAsBase64';
import { supabase } from './client';

const COMMUNITY_BUCKET = 'community-images';
const COMMUNITY_IMAGE_CLEANUP_QUEUE_KEY = 'nuri.community.imageCleanupQueue.v1';

function inferExtFromMime(mimeType: string | null) {
  const mt = (mimeType ?? '').toLowerCase();
  if (mt.includes('png')) return 'png';
  if (mt.includes('webp')) return 'webp';
  if (mt.includes('heic') || mt.includes('heif')) return 'heic';
  return 'jpg';
}

function normalizeFileUri(uri: string) {
  return uri.startsWith('file://') ? uri.replace('file://', '') : uri;
}

type UploadCommunityImageParams = {
  userId: string;
  postId: string;
  fileUri: string;
  mimeType: string | null;
};

export async function uploadCommunityImage(
  params: UploadCommunityImageParams,
): Promise<string> {
  const ext = inferExtFromMime(params.mimeType);
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).slice(2, 10);
  const storagePath = `${params.userId}/${params.postId}/${timestamp}_${nonce}.${ext}`;
  const filePath = normalizeFileUri(params.fileUri);
  const base64 = filePath.startsWith('content://')
    ? await readFileAsBase64(filePath)
    : await RNBlobUtil.fs.readFile(filePath, 'base64');
  const bytes = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from(COMMUNITY_BUCKET)
    .upload(storagePath, bytes, {
      contentType: params.mimeType ?? 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;
  return storagePath;
}

export async function getCommunityImageSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(COMMUNITY_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('signed URL 생성 실패');
  return data.signedUrl;
}

export async function deleteCommunityImage(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(COMMUNITY_BUCKET)
    .remove([storagePath]);
  if (error) throw error;
}

async function readCleanupQueue(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(COMMUNITY_IMAGE_CLEANUP_QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  } catch {
    return [];
  }
}

async function writeCleanupQueue(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    await AsyncStorage.removeItem(COMMUNITY_IMAGE_CLEANUP_QUEUE_KEY).catch(() => {});
    return;
  }

  await AsyncStorage.setItem(
    COMMUNITY_IMAGE_CLEANUP_QUEUE_KEY,
    JSON.stringify(Array.from(new Set(paths))),
  ).catch(() => {});
}

export async function enqueueCommunityImageCleanup(storagePath: string): Promise<void> {
  const normalized = `${storagePath}`.trim();
  if (!normalized) return;

  const queue = await readCleanupQueue();
  if (queue.includes(normalized)) return;
  await writeCleanupQueue([...queue, normalized]);
}

export async function deleteCommunityImageSafely(storagePath: string): Promise<void> {
  const normalized = `${storagePath}`.trim();
  if (!normalized) return;

  try {
    await deleteCommunityImage(normalized);
  } catch {
    await enqueueCommunityImageCleanup(normalized);
  }
}

export async function flushPendingCommunityImageCleanup(): Promise<void> {
  const queue = await readCleanupQueue();
  if (queue.length === 0) return;

  const failed: string[] = [];
  for (const path of queue) {
    try {
      await deleteCommunityImage(path);
    } catch {
      failed.push(path);
    }
  }

  await writeCleanupQueue(failed);
}
