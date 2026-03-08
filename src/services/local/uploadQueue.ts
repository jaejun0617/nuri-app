// 파일: src/services/local/uploadQueue.ts
// 역할:
// - memory 이미지 업로드 실패분을 로컬 큐에 적재
// - 앱 시작/포그라운드 복귀 시 재시도해서 기록과 이미지를 나중에 정합화

import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureMonitoringException } from '../monitoring/sentry';
import { fetchMemoryById, updateMemoryImagePaths } from '../supabase/memories';
import { uploadMemoryImage } from '../supabase/storageMemories';

const MEMORY_UPLOAD_QUEUE_STORAGE_KEY = 'nuri.memory-upload-queue.v1';
const MAX_ATTEMPTS = 5;

export type PendingMemoryUploadImage = {
  key: string;
  uri: string;
  mimeType: string | null;
};

export type PendingMemoryUploadTask = {
  taskId: string;
  userId: string;
  petId: string;
  memoryId: string;
  images: PendingMemoryUploadImage[];
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

async function loadQueue(): Promise<PendingMemoryUploadTask[]> {
  const raw = await AsyncStorage.getItem(MEMORY_UPLOAD_QUEUE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as PendingMemoryUploadTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(tasks: PendingMemoryUploadTask[]): Promise<void> {
  await AsyncStorage.setItem(
    MEMORY_UPLOAD_QUEUE_STORAGE_KEY,
    JSON.stringify(tasks),
  );
}

export async function enqueuePendingMemoryUpload(
  input: Omit<PendingMemoryUploadTask, 'taskId' | 'attempts' | 'createdAt' | 'updatedAt'>,
): Promise<void> {
  const current = await loadQueue();
  const now = new Date().toISOString();

  const nextTask: PendingMemoryUploadTask = {
    taskId: `${input.memoryId}:${Date.now()}`,
    userId: input.userId,
    petId: input.petId,
    memoryId: input.memoryId,
    images: input.images,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  await saveQueue([...current, nextTask]);
}

export async function getPendingMemoryUploadCount(): Promise<number> {
  const current = await loadQueue();
  return current.length;
}

export async function processPendingMemoryUploads(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  touchedPetIds: string[];
}> {
  const queue = await loadQueue();
  if (queue.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, touchedPetIds: [] };
  }

  const nextQueue: PendingMemoryUploadTask[] = [];
  const touchedPetIds = new Set<string>();
  let succeeded = 0;
  let failed = 0;

  for (const task of queue) {
    try {
      const currentMemory = await fetchMemoryById(task.memoryId);
      const uploadedPaths: string[] = [];

      for (const image of task.images) {
        const uploaded = await uploadMemoryImage({
          userId: task.userId,
          petId: task.petId,
          memoryId: task.memoryId,
          fileUri: image.uri,
          mimeType: image.mimeType,
        });
        uploadedPaths.push(uploaded.path);
      }

      if (uploadedPaths.length > 0) {
        await updateMemoryImagePaths({
          memoryId: task.memoryId,
          imagePaths: [...(currentMemory.imagePaths ?? []), ...uploadedPaths],
        });
        touchedPetIds.add(task.petId);
      }

      succeeded += 1;
    } catch (error: unknown) {
      captureMonitoringException(error);

      const attempts = task.attempts + 1;
      if (attempts < MAX_ATTEMPTS) {
        nextQueue.push({
          ...task,
          attempts,
          updatedAt: new Date().toISOString(),
        });
      }
      failed += 1;
    }
  }

  await saveQueue(nextQueue);

  return {
    processed: queue.length,
    succeeded,
    failed,
    touchedPetIds: Array.from(touchedPetIds),
  };
}
