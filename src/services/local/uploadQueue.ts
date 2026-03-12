// 파일: src/services/local/uploadQueue.ts
// 역할:
// - memory 이미지 업로드 실패분을 로컬 큐에 적재
// - 앱 시작/포그라운드 복귀 시 재시도해서 기록과 이미지를 나중에 정합화

import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureMonitoringException } from '../monitoring/sentry';
import { fetchMemoryById, updateMemoryImagePaths } from '../supabase/memories';
import {
  deleteMemoryImage,
  uploadMemoryImage,
} from '../supabase/storageMemories';

const MEMORY_UPLOAD_QUEUE_STORAGE_KEY = 'nuri.memory-upload-queue.v1';
const MAX_ATTEMPTS = 5;
let processingPromise: Promise<ProcessPendingMemoryUploadsResult> | null = null;
const claimedTaskIds = new Set<string>();

class SupersededMemoryUploadTaskError extends Error {
  constructor() {
    super('최신 이미지 저장 계획으로 교체되어 기존 업로드 작업을 중단합니다.');
    this.name = 'SupersededMemoryUploadTaskError';
  }
}

export type PendingMemoryUploadImage = {
  key: string;
  uri: string;
  mimeType: string | null;
};

export type PendingMemoryUploadEntry =
  | {
      kind: 'existing';
      path: string;
    }
  | ({
      kind: 'pending';
    } & PendingMemoryUploadImage);

export type PendingMemoryUploadTask = {
  taskId: string;
  userId: string;
  petId: string;
  memoryId: string;
  mode: 'create' | 'edit';
  finalEntries: PendingMemoryUploadEntry[];
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastErrorMessage?: string | null;
};

type ProcessPendingMemoryUploadsResult = {
  processed: number;
  succeeded: number;
  failed: number;
  touchedPetIds: string[];
  succeededTaskIds: string[];
  failedTaskIds: string[];
};

type LegacyPendingMemoryUploadTask = Omit<
  PendingMemoryUploadTask,
  'mode' | 'finalEntries'
> & {
  images?: PendingMemoryUploadImage[];
  finalEntries?: PendingMemoryUploadEntry[];
  mode?: 'create' | 'edit';
};

function normalizeString(value: string | null | undefined) {
  return `${value ?? ''}`.trim();
}

function normalizePendingEntry(
  entry: PendingMemoryUploadEntry | PendingMemoryUploadImage | null | undefined,
): PendingMemoryUploadEntry | null {
  if (!entry || typeof entry !== 'object') return null;

  if ('kind' in entry && entry.kind === 'existing') {
    const path = normalizeString(entry.path);
    if (!path) return null;
    return { kind: 'existing', path };
  }

  const key = normalizeString('key' in entry ? entry.key : '');
  const uri = normalizeString('uri' in entry ? entry.uri : '');
  if (!key || !uri) return null;

  return {
    kind: 'pending',
    key,
    uri,
    mimeType:
      'mimeType' in entry ? normalizeString(entry.mimeType) || null : null,
  };
}

function normalizeTask(
  task: LegacyPendingMemoryUploadTask | null | undefined,
): PendingMemoryUploadTask | null {
  if (!task || typeof task !== 'object') return null;

  const taskId = normalizeString(task.taskId);
  const userId = normalizeString(task.userId);
  const petId = normalizeString(task.petId);
  const memoryId = normalizeString(task.memoryId);
  if (!taskId || !userId || !petId || !memoryId) return null;

  const rawEntries = Array.isArray(task.finalEntries)
    ? task.finalEntries
    : Array.isArray(task.images)
      ? task.images
      : [];
  const finalEntries = rawEntries
    .map(normalizePendingEntry)
    .filter((entry): entry is PendingMemoryUploadEntry => Boolean(entry));

  return {
    taskId,
    userId,
    petId,
    memoryId,
    mode: task.mode === 'edit' ? 'edit' : 'create',
    finalEntries,
    attempts: Math.max(0, Number(task.attempts ?? 0)),
    createdAt: normalizeString(task.createdAt) || new Date().toISOString(),
    updatedAt: normalizeString(task.updatedAt) || new Date().toISOString(),
    lastErrorMessage: normalizeString(task.lastErrorMessage) || null,
  };
}

async function loadQueue(): Promise<PendingMemoryUploadTask[]> {
  const raw = await AsyncStorage.getItem(MEMORY_UPLOAD_QUEUE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as LegacyPendingMemoryUploadTask[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeTask)
      .filter((task): task is PendingMemoryUploadTask => Boolean(task));
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
  input: Omit<
    PendingMemoryUploadTask,
    'taskId' | 'attempts' | 'createdAt' | 'updatedAt' | 'lastErrorMessage'
  >,
): Promise<PendingMemoryUploadTask> {
  const current = await loadQueue();
  const now = new Date().toISOString();

  const nextTask: PendingMemoryUploadTask = {
    taskId: `${input.memoryId}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    userId: input.userId,
    petId: input.petId,
    memoryId: input.memoryId,
    mode: input.mode,
    finalEntries: input.finalEntries.map(entry => ({ ...entry })),
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    lastErrorMessage: null,
  };

  const nextQueue = current.filter(task => {
    if (task.memoryId !== input.memoryId) return true;
    return claimedTaskIds.has(task.taskId);
  });
  await saveQueue([...nextQueue, nextTask]);
  return nextTask;
}

export async function getPendingMemoryUploadCount(): Promise<number> {
  const current = await loadQueue();
  return current.length;
}

async function removeTask(taskId: string): Promise<void> {
  const current = await loadQueue();
  await saveQueue(current.filter(task => task.taskId !== taskId));
}

async function updateTask(taskId: string, updater: (task: PendingMemoryUploadTask) => PendingMemoryUploadTask | null) {
  const current = await loadQueue();
  let changed = false;
  const next = current.flatMap(task => {
    if (task.taskId !== taskId) return [task];
    changed = true;
    const updated = updater(task);
    return updated ? [updated] : [];
  });
  if (changed) {
    await saveQueue(next);
  }
}

function isMemoryNotFoundError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message ?? '') : '';
  const code = 'code' in error ? String(error.code ?? '') : '';
  const details = 'details' in error ? String(error.details ?? '') : '';
  const joined = `${code} ${message} ${details}`.toLowerCase();
  return (
    joined.includes('pgrst116') ||
    joined.includes('json object requested') ||
    joined.includes('0 rows')
  );
}

function isSupersededTaskError(error: unknown) {
  return error instanceof SupersededMemoryUploadTaskError;
}

function findLatestTaskForMemory(
  queue: PendingMemoryUploadTask[],
  memoryId: string,
) {
  return queue
    .filter(task => task.memoryId === memoryId)
    .sort((a, b) => {
      const updatedDiff = a.updatedAt.localeCompare(b.updatedAt);
      if (updatedDiff !== 0) return updatedDiff;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .at(-1) ?? null;
}

async function assertTaskNotSuperseded(task: PendingMemoryUploadTask) {
  const queue = await loadQueue();
  const latestTask = findLatestTaskForMemory(queue, task.memoryId);
  if (!latestTask) return;
  if (latestTask.taskId === task.taskId) return;
  throw new SupersededMemoryUploadTaskError();
}

async function processTask(task: PendingMemoryUploadTask): Promise<void> {
  await assertTaskNotSuperseded(task);
  await fetchMemoryById(task.memoryId);

  const uploadedPathsByKey = new Map<string, string>();
  const uploadedNewPaths: string[] = [];

  try {
    for (const entry of task.finalEntries) {
      if (entry.kind !== 'pending') continue;
      await assertTaskNotSuperseded(task);

      const uploaded = await uploadMemoryImage({
        userId: task.userId,
        petId: task.petId,
        memoryId: task.memoryId,
        fileUri: entry.uri,
        mimeType: entry.mimeType,
      });
      uploadedPathsByKey.set(entry.key, uploaded.path);
      uploadedNewPaths.push(uploaded.path);
    }
  } catch (error) {
    await Promise.all(
      uploadedNewPaths.map(path => deleteMemoryImage(path).catch(() => null)),
    );
    throw error;
  }

  const finalPaths = task.finalEntries.flatMap(entry => {
    if (entry.kind === 'existing') {
      const path = normalizeString(entry.path);
      return path ? [path] : [];
    }

    const uploadedPath = normalizeString(uploadedPathsByKey.get(entry.key));
    return uploadedPath ? [uploadedPath] : [];
  });

  await assertTaskNotSuperseded(task);
  await updateMemoryImagePaths({
    memoryId: task.memoryId,
    imagePaths: finalPaths,
  });
}

function pickNextTask(queue: PendingMemoryUploadTask[]) {
  return [...queue]
    .filter(task => !claimedTaskIds.has(task.taskId))
    .sort((a, b) => {
      const updatedDiff = b.updatedAt.localeCompare(a.updatedAt);
      if (updatedDiff !== 0) return updatedDiff;
      return b.createdAt.localeCompare(a.createdAt);
    })[0] ?? null;
}

export async function processPendingMemoryUploads(): Promise<ProcessPendingMemoryUploadsResult> {
  if (processingPromise) {
    await processingPromise;
    const remainingQueue = await loadQueue();
    if (pickNextTask(remainingQueue)) {
      return processPendingMemoryUploads();
    }
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      touchedPetIds: [],
      succeededTaskIds: [],
      failedTaskIds: [],
    };
  }

  processingPromise = (async () => {
    const touchedPetIds = new Set<string>();
    const succeededTaskIds: string[] = [];
    const failedTaskIds: string[] = [];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    while (true) {
      const queue = await loadQueue();
      const task = pickNextTask(queue);
      if (!task) break;

      claimedTaskIds.add(task.taskId);
      processed += 1;

      try {
        await processTask(task);
        await removeTask(task.taskId);
        touchedPetIds.add(task.petId);
        succeeded += 1;
        succeededTaskIds.push(task.taskId);
      } catch (error: unknown) {
        if (isSupersededTaskError(error)) {
          await removeTask(task.taskId);
          continue;
        }

        captureMonitoringException(error);

        if (isMemoryNotFoundError(error)) {
          await removeTask(task.taskId);
        } else {
          const attempts = task.attempts + 1;
          if (attempts >= MAX_ATTEMPTS) {
            await removeTask(task.taskId);
          } else {
            await updateTask(task.taskId, currentTask => ({
              ...currentTask,
              attempts,
              updatedAt: new Date().toISOString(),
              lastErrorMessage:
                error instanceof Error && error.message.trim()
                  ? error.message
                  : '이미지 업로드 재시도 대기',
            }));
          }
        }

        failed += 1;
        failedTaskIds.push(task.taskId);
      } finally {
        claimedTaskIds.delete(task.taskId);
      }
    }

    return {
      processed,
      succeeded,
      failed,
      touchedPetIds: Array.from(touchedPetIds),
      succeededTaskIds,
      failedTaskIds,
    };
  })();

  try {
    return await processingPromise;
  } finally {
    processingPromise = null;
  }
}
