// 파일: src/services/app/errors.ts
// 역할:
// - 네트워크/일반 에러를 사용자 메시지로 정규화
// - 화면마다 다른 문구로 흩어진 실패 UX를 공용 규칙으로 통일

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '다시 시도해 주세요.';
}

export function isLikelyNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return [
    'network request failed',
    'network error',
    'timeout',
    'timed out',
    'fetch failed',
    'failed to fetch',
    'connection',
    'offline',
    'internet',
    'socket',
  ].some(keyword => message.includes(keyword));
}

export function getRetryableErrorMessage(
  error: unknown,
  fallback = '다시 시도해 주세요.',
): string {
  if (isLikelyNetworkError(error)) {
    return '네트워크가 불안정합니다. 연결을 확인한 뒤 다시 시도해 주세요.';
  }

  return getErrorMessage(error) || fallback;
}
