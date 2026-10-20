import { WalkServerError } from '../server/repository';

export type WalkUiScope = Readonly<{
  ownerId: string;
  petId: string;
  current: () => boolean;
}>;

export function assertWalkScope(scope: WalkUiScope): void {
  if (!scope.current())
    throw new WalkServerError('WALK_PRODUCT_CONTEXT_CHANGED', true);
}

// A timeout is an unknown outcome. The losing RPC cannot run a UI continuation;
// callers reconcile the same durable submission identity on the next attempt.
export async function walkRequest<T>(
  scope: WalkUiScope,
  operation: () => Promise<T>,
  signal?: AbortSignal,
  timeoutMs = 15_000,
): Promise<T> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000)
    throw new WalkServerError('WALK_INVALID_RPC_DEADLINE', false);
  assertWalkScope(scope);
  if (signal?.aborted)
    throw new WalkServerError('WALK_PRODUCT_CONTEXT_CHANGED', true);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    const stopped = new Promise<never>((_, reject) => {
      abort = () =>
        reject(new WalkServerError('WALK_PRODUCT_CONTEXT_CHANGED', true));
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(
        () => reject(new WalkServerError('WALK_SYNC_UNKNOWN_RETRYABLE', true)),
        timeoutMs,
      );
    });
    const result = await Promise.race([operation(), stopped]);
    assertWalkScope(scope);
    if (signal?.aborted)
      throw new WalkServerError('WALK_PRODUCT_CONTEXT_CHANGED', true);
    return result;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (abort) signal?.removeEventListener('abort', abort);
  }
}

export function walkErrorCopy(error: unknown): string {
  const code =
    error instanceof WalkServerError
      ? error.code
      : 'WALK_SYNC_UNKNOWN_RETRYABLE';
  if (code === 'WALK_RECORD_RECREATE_FORBIDDEN')
    return '삭제한 산책 기록은 다시 만들 수 없어요.';
  if (code === 'WALK_SESSION_DELETED')
    return '삭제된 산책이에요. 작성 중인 내용은 보관했어요.';
  if (code === 'WALK_OWNER_MISMATCH' || code === 'WALK_PRODUCT_CONTEXT_CHANGED')
    return '선택한 아이와 로그인 상태를 다시 확인해 주세요.';
  if (code === 'WALK_INVALID_RECORD_INPUT')
    return '제목과 입력 길이를 확인해 주세요.';
  return '연결을 확인한 뒤 다시 시도해 주세요. 작성 중인 내용은 보관했어요.';
}
