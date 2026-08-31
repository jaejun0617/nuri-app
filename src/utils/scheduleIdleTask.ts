// 화면 전환을 막지 않도록 지연 가능한 작업을 예약하고, 화면이 사라질 때 취소한다.
// RN 0.87의 idle scheduling contract에 맞춘 공통 대체 경로로 사용한다.
type GlobalWithIdleCallback = typeof globalThis & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export type IdleTaskHandle = {
  cancel: () => void;
};

export function scheduleIdleTask(
  task: () => void,
  timeout = 180,
): IdleTaskHandle {
  const globalScope = globalThis as GlobalWithIdleCallback;

  if (typeof globalScope.requestIdleCallback === 'function') {
    const handle = globalScope.requestIdleCallback(task, { timeout });

    return {
      cancel: () => {
        globalScope.cancelIdleCallback?.(handle);
      },
    };
  }

  const timer = setTimeout(task, 48);
  return {
    cancel: () => clearTimeout(timer),
  };
}
