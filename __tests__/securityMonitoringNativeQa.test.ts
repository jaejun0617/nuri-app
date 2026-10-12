jest.mock('../src/services/securityQa/config', () => ({ isSecurityQaEnabled: true }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: { getState: () => ({ session: { user: { id: 'public-qa-fixture' } } }) } }));
import crashlytics from '@react-native-firebase/crashlytics';
import { NativeModules } from 'react-native';
import { isSecurityQaEnabled } from '../src/services/securityQa/config';
import { monitoringUserId } from '../src/services/monitoring/sanitize';
import { MONITORING_QA_CANARY, runQaAutomaticMonitoringValidation } from '../src/services/securityQa/monitoringValidation';

const globals = globalThis as typeof globalThis & {
  ErrorUtils?: { getGlobalHandler(): (error: Error, fatal: boolean) => void | Promise<void> };
};
const handler = jest.fn<Promise<void>, [Error, boolean]>();
const initialGuard = globals.ErrorUtils;
const initialDev = __DEV__;

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
  Object.defineProperty(NativeModules, 'RNFBCrashlyticsModule', { configurable: true, value: {
    isCrashlyticsCollectionEnabled: true, isErrorGenerationOnJSCrashEnabled: true,
    isCrashlyticsJavascriptExceptionHandlerChainingEnabled: true,
  } });
  globals.ErrorUtils = { getGlobalHandler: () => handler };
  handler.mockResolvedValue(undefined);
});
afterAll(() => {
  globals.ErrorUtils = initialGuard;
  Object.defineProperty(globalThis, '__DEV__', { value: initialDev, configurable: true });
});

test('uses the installed global handler with a public fixture and restores identity without emitting it', async () => {
  const result = await runQaAutomaticMonitoringValidation();
  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler.mock.calls[0][0].message).toBe(MONITORING_QA_CANARY);
  expect(handler.mock.calls[0][1]).toBe(false);
  expect(crashlytics().recordError).not.toHaveBeenCalled();
  expect(result.receivedPayload).toBe('PENDING_CONSOLE_VERIFICATION');
  expect(result.originalFixtureUnchanged).toBe(true);
  expect(result.runId).toMatch(/^SEC014_\d+$/);
  expect(JSON.stringify(result)).not.toContain('public-qa-fixture');
  const restored = monitoringUserId('public-qa-fixture');
  expect(crashlytics().setUserId).toHaveBeenNthCalledWith(1, '');
  expect(crashlytics().setUserId).toHaveBeenLastCalledWith(restored);
  expect(crashlytics().setAttributes).toHaveBeenLastCalledWith({ userId: restored, qa_run: '', qa_kind: '', qa_fixture: '' });
});

test.each(['isCrashlyticsCollectionEnabled', 'isErrorGenerationOnJSCrashEnabled', 'isCrashlyticsJavascriptExceptionHandlerChainingEnabled'])('fails closed when %s is unavailable', async flag => {
  NativeModules.RNFBCrashlyticsModule[flag] = false;
  await expect(runQaAutomaticMonitoringValidation()).rejects.toThrow('NURI_MONITORING_QA_HANDLER_UNAVAILABLE');
  expect(handler).not.toHaveBeenCalled();
  expect(crashlytics().setUserId).not.toHaveBeenCalled();
});

test('restores monitoring metadata when the handler fails and leaves the runner reusable', async () => {
  handler.mockRejectedValueOnce(new Error('PUBLIC_QA_HANDLER_FAILURE'));
  await expect(runQaAutomaticMonitoringValidation()).rejects.toThrow('PUBLIC_QA_HANDLER_FAILURE');
  expect(crashlytics().setAttributes).toHaveBeenLastCalledWith({ userId: monitoringUserId('public-qa-fixture'), qa_run: '', qa_kind: '', qa_fixture: '' });
  await expect(runQaAutomaticMonitoringValidation()).resolves.toHaveProperty('automaticHandlerCompleted', 'PASS');
});

test('does not allow development builds or overlapping runs', async () => {
  Object.defineProperty(globalThis, '__DEV__', { value: true, configurable: true });
  await expect(runQaAutomaticMonitoringValidation()).rejects.toThrow('NURI_MONITORING_QA_DISABLED');
  Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
  let finish: (() => void) | undefined;
  handler.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const first = runQaAutomaticMonitoringValidation();
  await expect(runQaAutomaticMonitoringValidation()).rejects.toThrow('NURI_MONITORING_QA_RUNNING');
  for (let index = 0; index < 10 && !finish; index += 1) await Promise.resolve();
  expect(finish).toBeDefined();
  finish?.();
  await first;
});

test('does not enter the operation in Store mode', async () => {
  const config = require('../src/services/securityQa/config') as { isSecurityQaEnabled: boolean };
  expect(isSecurityQaEnabled).toBe(true);
  config.isSecurityQaEnabled = false;
  try {
    await expect(runQaAutomaticMonitoringValidation()).rejects.toThrow('NURI_MONITORING_QA_DISABLED');
    expect(handler).not.toHaveBeenCalled();
  } finally { config.isSecurityQaEnabled = true; }
});
