// 앱 전역 서버 상태 캐시의 단일 소유자다.
// 로그아웃과 계정 전환에서는 사용자 범위 데이터가 다음 세션에 남지 않도록 전체 캐시를 폐기한다.

import { QueryClient } from '@tanstack/react-query';

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
  },
});

export function clearAppQueryCache(): void {
  appQueryClient.clear();
}
