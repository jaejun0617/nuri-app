import type { GuideDataSource } from './types';

export function getGuideDataSourceLabel(source: GuideDataSource): string {
  if (source === 'remote') return '운영 데이터';
  if (source === 'local-seed') return '테스트 seed';
  return '원격 빈 상태';
}

export function getGuideDataSourceDescription(input: {
  source: GuideDataSource;
  reason: 'published' | 'empty-success' | 'remote-error';
}): string {
  if (input.source === 'remote') {
    return 'Supabase의 공개 가이드 row를 기준으로 노출 중입니다.';
  }

  if (input.source === 'local-seed') {
    if (input.reason === 'remote-error') {
      return '원격 조회 실패로 로컬 테스트 seed를 대신 보여주고 있습니다.';
    }

    return '공개 row가 0건이라 로컬 테스트 seed를 대신 보여주고 있습니다.';
  }

  return '원격 조회는 성공했지만 공개 조건을 만족한 가이드 row가 0건인 상태입니다.';
}
