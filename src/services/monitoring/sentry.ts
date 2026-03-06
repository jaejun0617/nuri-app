// 파일: src/services/monitoring/sentry.ts
// 역할:
// - Sentry 초기화/네비게이션 트래킹/에러 캡처 공통 래퍼
// - 화면 코드는 SDK 직접 의존 없이 이 파일만 사용

import type React from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  SENTRY_DSN,
  SENTRY_ENABLE_IN_DEV,
  SENTRY_ENVIRONMENT,
  SENTRY_RELEASE,
  SENTRY_TRACES_SAMPLE_RATE,
} from './config';

const sentryEnabled = Boolean(SENTRY_DSN) && (!__DEV__ || SENTRY_ENABLE_IN_DEV);

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
  routeChangeTimeoutMs: 1_500,
});

let sentryInitialized = false;

export function initMonitoring(): void {
  if (!sentryEnabled || sentryInitialized) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    integrations: [
      Sentry.reactNativeTracingIntegration(),
      navigationIntegration,
    ],
    enableNativeFramesTracking: true,
    debug: __DEV__,
  });

  sentryInitialized = true;
}

export function registerSentryNavigation(
  navigationRef: NavigationContainerRef<RootStackParamList>,
): void {
  if (!sentryEnabled || !sentryInitialized) return;
  navigationIntegration.registerNavigationContainer(navigationRef);
}

export function setMonitoringUser(params: {
  id: string | null;
  email?: string | null;
}): void {
  if (!sentryEnabled || !sentryInitialized) return;

  if (!params.id) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: params.id,
    email: params.email ?? undefined,
  });
}

export function captureMonitoringException(error: unknown): void {
  if (!sentryEnabled || !sentryInitialized) return;
  Sentry.captureException(error);
}

export function captureMonitoringMessage(message: string): void {
  if (!sentryEnabled || !sentryInitialized) return;
  Sentry.captureMessage(message, 'info');
}

export function triggerMonitoringNativeCrash(): void {
  if (!sentryEnabled || !sentryInitialized) return;
  Sentry.nativeCrash();
}

export function isMonitoringEnabled(): boolean {
  return sentryEnabled && sentryInitialized;
}

export function wrapWithSentry<T extends React.ComponentType<any>>(
  component: T,
): T {
  if (!sentryEnabled) return component;
  return Sentry.wrap(component) as T;
}
