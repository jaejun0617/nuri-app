import crashlytics from '@react-native-firebase/crashlytics';
import { NativeModules } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { monitoringUserId } from '../monitoring/sanitize';
import { isSecurityQaEnabled } from './config';

type MonitoringFlags = {
  isCrashlyticsCollectionEnabled: boolean;
  isErrorGenerationOnJSCrashEnabled: boolean;
  isCrashlyticsJavascriptExceptionHandlerChainingEnabled: boolean;
};
type ErrorGuard = {
  getGlobalHandler(): (error: Error, fatal: boolean) => void | Promise<void>;
};
type Receipt = Record<string, string | boolean | number>;

export const MONITORING_QA_CANARY = 'NURI_SEC014_PUBLIC_SYNTHETIC_CANARY';
let running = false;

// Invoke the installed automatic handler, never recordError or a replacement
// sanitizer. Store builds cannot enter this compile-time-gated QA operation.
export async function runQaAutomaticMonitoringValidation(): Promise<Receipt> {
  if (!isSecurityQaEnabled || __DEV__) throw new Error('NURI_MONITORING_QA_DISABLED');
  if (running) throw new Error('NURI_MONITORING_QA_RUNNING');
  const flags: MonitoringFlags | undefined = NativeModules.RNFBCrashlyticsModule;
  const guard = (globalThis as typeof globalThis & { ErrorUtils?: ErrorGuard }).ErrorUtils;
  if (!flags?.isCrashlyticsCollectionEnabled || !flags.isErrorGenerationOnJSCrashEnabled ||
    !flags.isCrashlyticsJavascriptExceptionHandlerChainingEnabled || !guard) {
    throw new Error('NURI_MONITORING_QA_HANDLER_UNAVAILABLE');
  }
  running = true;
  const api = crashlytics();
  const runId = `SEC014_${new Date().toISOString().replace(/[^0-9]/g, '')}`;
  const fixture = Object.assign(new Error(MONITORING_QA_CANARY), {
    cause: MONITORING_QA_CANARY,
    publicFixture: MONITORING_QA_CANARY,
  });
  const originalStack = fixture.stack;
  try {
    // This event has no user identity. The original app identity is restored in
    // memory afterward; no session contents or identifier are emitted as evidence.
    await api.setUserId('');
    await api.setAttributes({ userId: '', qa_run: runId, qa_kind: 'automatic_global', qa_fixture: 'SEC014_V1' });
    await api.log(`NURI_SEC014_QA_START ${runId}`);
    console.info('NURI_MONITORING_QA', JSON.stringify({ event: 'AUTOMATIC_HANDLER_STARTED', runId }));
    await guard.getGlobalHandler()(fixture, false);
    const receipt: Receipt = {
      runId, automaticHandlerCompleted: 'PASS', fatalArgument: false,
      nativeCollection: true, nativeJsGeneration: true, nativeChaining: true,
      originalFixtureUnchanged: fixture.message === MONITORING_QA_CANARY && fixture.stack === originalStack,
      sensitiveFixtureValues: 0, receivedPayload: 'PENDING_CONSOLE_VERIFICATION',
    };
    console.info('NURI_MONITORING_QA', JSON.stringify({ event: 'AUTOMATIC_HANDLER_COMPLETE', ...receipt }));
    return receipt;
  } finally {
    try {
      const restoredId = monitoringUserId(useAuthStore.getState().session?.user.id ?? null);
      await api.setUserId(restoredId);
      await api.setAttributes({ userId: restoredId, qa_run: '', qa_kind: '', qa_fixture: '' });
    } finally { running = false; }
  }
}
