// 파일: src/services/monitoring/config.example.ts
// 역할:
// - Sentry 모니터링 설정 예시
// - 실제 값은 config.ts(로컬)에서 관리

export const SENTRY_DSN = '';
export const SENTRY_ENVIRONMENT = 'development';
export const SENTRY_RELEASE = 'nuri@0.0.1';
// 개발 빌드에서도 수집하려면 true
export const SENTRY_ENABLE_IN_DEV = false;
export const SENTRY_TRACES_SAMPLE_RATE = 0.2;
export const CRASHLYTICS_ENABLE_IN_DEV = false;
