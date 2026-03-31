// 파일: src/services/monitoring/config.ts
// 역할:
// - Sentry 모니터링 기본 설정(안전 기본값)
// - tracked 기본값에는 실제 DSN을 두지 않고, 배포 전 로컬/환경 주입으로 채운다.

export const SENTRY_DSN = '';
export const SENTRY_ENVIRONMENT = __DEV__ ? 'development' : 'production';
export const SENTRY_RELEASE = 'nuri@0.0.1';
// 개발 빌드에서도 수집하려면 true
export const SENTRY_ENABLE_IN_DEV = false;
export const SENTRY_TRACES_SAMPLE_RATE = 0.2;
export const CRASHLYTICS_ENABLE_IN_DEV = false;
