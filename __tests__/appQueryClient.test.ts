import {
  appQueryClient,
  clearAppQueryCache,
} from '../src/services/query/appQueryClient';

describe('app query cache session isolation', () => {
  afterEach(() => {
    clearAppQueryCache();
  });

  it('로그아웃과 계정 전환 시 사용자 범위 query를 모두 제거한다', () => {
    appQueryClient.setQueryData(['private-letters', 'pet-a'], ['private']);
    appQueryClient.setQueryData(['health-report', 'pet-a'], { weight: 4.2 });

    clearAppQueryCache();

    expect(appQueryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
