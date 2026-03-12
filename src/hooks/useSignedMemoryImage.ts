// 파일: src/hooks/useSignedMemoryImage.ts
// 역할:
// - memory image storage path를 signed URL로 비동기 변환하는 공용 훅
// - 홈/타임라인/카드에서 동일한 로딩/에러 처리 규칙을 재사용하도록 통일
// - 같은 path에 대한 캐시 함수 호출을 공통화해 중복 effect 코드를 줄임

import { useEffect, useState } from 'react';

import { createLatestRequestController } from '../services/app/async';
import {
  getPrimaryMemoryImageRef,
  isDirectMemoryImageUri,
} from '../services/records/imageSources';
import {
  getMemoryImageSignedUrlCached,
  type MemoryImageVariant,
} from '../services/supabase/storageMemories';

type GlobalWithIdleCallback = typeof globalThis & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const SIGNED_URL_QUEUE_MAX_CONCURRENCY = 2;
const signedUrlMemoryCache = new Map<string, string>();
const signedUrlHighPriorityQueue: Array<QueueTask> = [];
const signedUrlLowPriorityQueue: Array<QueueTask> = [];
let signedUrlActiveCount = 0;

type QueueTask = {
  cancelled: boolean;
  run: () => Promise<void>;
  onCancel?: () => void;
};

function buildSignedUrlMemoryCacheKey(
  path: string | null | undefined,
  variant: MemoryImageVariant | null | undefined,
) {
  const normalized = `${path ?? ''}`.trim();
  if (!normalized) return null;
  return `${variant ?? 'original'}::${normalized}`;
}

function readSignedUrlMemoryCache(
  path: string | null | undefined,
  variant: MemoryImageVariant | null | undefined,
) {
  const key = buildSignedUrlMemoryCacheKey(path, variant);
  if (!key) return null;
  return signedUrlMemoryCache.get(key) ?? null;
}

function writeSignedUrlMemoryCache(
  path: string | null | undefined,
  url: string | null | undefined,
  variant: MemoryImageVariant | null | undefined,
) {
  const key = buildSignedUrlMemoryCacheKey(path, variant);
  const normalizedUrl = `${url ?? ''}`.trim();
  if (!key || !normalizedUrl) return;
  signedUrlMemoryCache.set(key, normalizedUrl);
}

function pumpSignedUrlQueue() {
  while (signedUrlActiveCount < SIGNED_URL_QUEUE_MAX_CONCURRENCY) {
    const task =
      signedUrlHighPriorityQueue.shift() ?? signedUrlLowPriorityQueue.shift();
    if (!task) return;
    if (task.cancelled) continue;

    signedUrlActiveCount += 1;
    task
      .run()
      .catch(() => {})
      .finally(() => {
        signedUrlActiveCount = Math.max(0, signedUrlActiveCount - 1);
        pumpSignedUrlQueue();
      });
  }
}

function enqueueSignedUrlTask(task: QueueTask, lowPriority: boolean) {
  if (lowPriority) {
    signedUrlLowPriorityQueue.push(task);
  } else {
    signedUrlHighPriorityQueue.push(task);
  }
  pumpSignedUrlQueue();
  return () => {
    task.cancelled = true;
    task.onCancel?.();
  };
}

function scheduleIdleTask(task: () => void) {
  const globalScope = globalThis as GlobalWithIdleCallback;

  if (typeof globalScope.requestIdleCallback === 'function') {
    const handle = globalScope.requestIdleCallback(
      () => {
        task();
      },
      { timeout: 180 },
    );

    return () => {
      if (typeof globalScope.cancelIdleCallback === 'function') {
        globalScope.cancelIdleCallback(handle);
      }
    };
  }

  const timer = setTimeout(task, 48);
  return () => clearTimeout(timer);
}

export function useSignedMemoryImage(
  imagePath: string | null | undefined,
  options?: {
    enabled?: boolean;
    defer?: boolean;
    delayMs?: number;
    trackLoading?: boolean;
    variant?: MemoryImageVariant;
  },
) {
  const imageRef = getPrimaryMemoryImageRef({
    imagePath,
    imagePaths: [],
    imageUrl: null,
  });
  const variant = options?.variant ?? 'original';
  const initialSignedUrl =
    isDirectMemoryImageUri(imageRef)
      ? imageRef
      : readSignedUrlMemoryCache(imageRef, variant);
  const [signedUrl, setSignedUrl] = useState<string | null>(initialSignedUrl);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(Boolean(initialSignedUrl));
  const enabled = options?.enabled ?? true;
  const defer = options?.defer ?? false;
  const delayMs = options?.delayMs ?? 0;
  const trackLoading = options?.trackLoading ?? true;

  useEffect(() => {
    const request = createLatestRequestController();
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelIdleTask: (() => void) | null = null;
    let cancelQueueTask: (() => void) | null = null;

    async function run() {
      const requestId = request.begin();
      if (request.isCurrent(requestId)) {
        setResolved(false);
      }

      const path = imageRef?.trim() ?? null;
      if (!path) {
        if (request.isCurrent(requestId)) {
          setSignedUrl(null);
          if (trackLoading) setLoading(false);
          setResolved(true);
        }
        return;
      }

      if (isDirectMemoryImageUri(path)) {
        writeSignedUrlMemoryCache(path, path, variant);
        if (request.isCurrent(requestId)) {
          setSignedUrl(path);
          if (trackLoading) setLoading(false);
          setResolved(true);
        }
        return;
      }

      const cachedUrl = readSignedUrlMemoryCache(path, variant);
      if (cachedUrl) {
        if (request.isCurrent(requestId)) {
          setSignedUrl(cachedUrl);
          if (trackLoading) setLoading(false);
          setResolved(true);
        }
        return;
      }

      try {
        if (request.isCurrent(requestId) && trackLoading) setLoading(true);

        await new Promise<void>(resolve => {
          cancelQueueTask = enqueueSignedUrlTask(
            {
              cancelled: false,
              onCancel: () => resolve(),
              run: async () => {
                const url = await getMemoryImageSignedUrlCached(path, { variant });
                if (url) {
                  writeSignedUrlMemoryCache(path, url, variant);
                }

                if (request.isCurrent(requestId)) {
                  setSignedUrl(url ?? null);
                }

                resolve();
              },
            },
            defer,
          );
        });
      } catch {
        if (request.isCurrent(requestId)) {
          setSignedUrl(null);
        }
      } finally {
        if (request.isCurrent(requestId)) {
          if (trackLoading) setLoading(false);
          setResolved(true);
        }
      }
    }

    if (!enabled) {
      const cachedUrl =
        isDirectMemoryImageUri(imageRef)
          ? imageRef
          : readSignedUrlMemoryCache(imageRef, variant);
      setSignedUrl(cachedUrl);
      if (trackLoading) setLoading(false);
      setResolved(Boolean(cachedUrl));
      return () => {
        request.cancel();
      };
    }

    const scheduleRun = () => {
      if (delayMs > 0) {
        delayTimer = setTimeout(() => {
          run();
        }, delayMs);
        return;
      }
      run();
    };

    if (defer) {
      cancelIdleTask = scheduleIdleTask(() => {
        scheduleRun();
      });
    } else {
      scheduleRun();
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      cancelIdleTask?.();
      cancelQueueTask?.();
      request.cancel();
    };
  }, [delayMs, defer, enabled, imageRef, trackLoading, variant]);

  return { signedUrl, loading, resolved };
}
