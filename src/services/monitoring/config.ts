// 파일: src/services/monitoring/config.ts
// 역할:
// - Sentry 모니터링 설정(로컬)
// - 배포 시 DSN/릴리즈를 환경별로 분리 권장

export const SENTRY_DSN =
  'https://b459f4f4cd111ef642013a59a3d2cc40@o4510993455382528.ingest.us.sentry.io/4510993459183616';
export const SENTRY_ENVIRONMENT = __DEV__ ? 'development' : 'production';
export const SENTRY_RELEASE = 'nuri@0.0.1';
// 개발 빌드에서도 수집하려면 true
export const SENTRY_ENABLE_IN_DEV = true;
export const SENTRY_TRACES_SAMPLE_RATE = 0.2;
