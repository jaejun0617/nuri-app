// 파일: src/services/monitoring/sentry.ts
// 역할:
// - Sentry 초기화/네비게이션 트래킹/에러 캡처 공통 래퍼
// - 화면 코드는 SDK 직접 의존 없이 이 파일만 사용

import type React from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import crashlytics from '@react-native-firebase/crashlytics';
import * as Sentry from '@sentry/react-native';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  CRASHLYTICS_ENABLE_IN_DEV,
  SENTRY_DSN,
  SENTRY_ENABLE_IN_DEV,
  SENTRY_ENVIRONMENT,
  SENTRY_RELEASE,
  SENTRY_TRACES_SAMPLE_RATE,
} from './config';

const sentryEnabled = Boolean(SENTRY_DSN) && (!__DEV__ || SENTRY_ENABLE_IN_DEV);
const crashlyticsEnabled = !__DEV__ || CRASHLYTICS_ENABLE_IN_DEV;

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
  routeChangeTimeoutMs: 1_500,
});

let sentryInitialized = false;
let crashlyticsInitialized = false;

export function initMonitoring(): void {
  if (sentryEnabled && !sentryInitialized) {
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

  if (crashlyticsEnabled && !crashlyticsInitialized) {
    crashlytics().setCrashlyticsCollectionEnabled(true);
    crashlytics().setAttributes({
      environment: SENTRY_ENVIRONMENT,
      release: SENTRY_RELEASE,
    });
    crashlytics().log('[monitoring] crashlytics initialized');
    crashlyticsInitialized = true;
  }
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
  if (sentryEnabled && sentryInitialized) {
    if (!params.id) {
      Sentry.setUser(null);
    } else {
      Sentry.setUser({
        id: params.id,
        email: params.email ?? undefined,
      });
    }
  }

  if (crashlyticsEnabled && crashlyticsInitialized) {
    crashlytics().setUserId(params.id ?? '');
    crashlytics().setAttributes({
      userId: params.id ?? '',
      email: params.email ?? '',
    });
  }
}

export function captureMonitoringException(error: unknown): void {
  if (sentryEnabled && sentryInitialized) {
    Sentry.captureException(error);
  }

  if (crashlyticsEnabled && crashlyticsInitialized) {
    const normalized =
      error instanceof Error ? error : new Error(String(error ?? 'unknown'));
    crashlytics().recordError(normalized);
  }
}

export function captureMonitoringMessage(
  message: string,
  options?: {
    level?: 'info' | 'warning' | 'error';
    tags?: Record<string, string | number | boolean | null | undefined>;
    extras?: Record<string, unknown>;
  },
): void {
  const level = options?.level ?? 'info';

  if (sentryEnabled && sentryInitialized) {
    Sentry.withScope(scope => {
      scope.setLevel(level);

      for (const [key, value] of Object.entries(options?.tags ?? {})) {
        if (value === null || value === undefined) continue;
        scope.setTag(key, String(value));
      }

      for (const [key, value] of Object.entries(options?.extras ?? {})) {
        scope.setExtra(key, value);
      }

      Sentry.captureMessage(message, level);
    });
  }

  if (crashlyticsEnabled && crashlyticsInitialized) {
    const payload =
      options && (options.tags || options.extras)
        ? ` ${JSON.stringify({
            tags: options.tags ?? {},
            extras: options.extras ?? {},
          })}`
        : '';
    crashlytics().log(`${message}${payload}`);
  }
}

export function triggerMonitoringNativeCrash(): void {
  if (sentryEnabled && sentryInitialized) {
    Sentry.nativeCrash();
  }

  if (crashlyticsEnabled && crashlyticsInitialized) {
    crashlytics().crash();
  }
}

export function isMonitoringEnabled(): boolean {
  return (
    (sentryEnabled && sentryInitialized) ||
    (crashlyticsEnabled && crashlyticsInitialized)
  );
}

export function wrapWithSentry<T extends React.ComponentType<any>>(
  component: T,
): T {
  if (!sentryEnabled) return component;
  return Sentry.wrap(component) as T;
}
