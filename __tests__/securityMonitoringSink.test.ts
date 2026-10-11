jest.mock('../src/services/monitoring/config', () => ({
  CRASHLYTICS_ENABLE_IN_DEV: true,
  SENTRY_DSN: '', SENTRY_ENVIRONMENT: 'test',
  SENTRY_RELEASE: 'fixture', SENTRY_TRACES_SAMPLE_RATE: 0,
}));
import crashlytics from '@react-native-firebase/crashlytics';
import * as Sentry from '@sentry/react-native';
import {
  captureMonitoringException, captureMonitoringMessage, initMonitoring, setMonitoringUser,
} from '../src/services/monitoring/sentry';

it('only delivers sanitized data to the enabled SDK and preserves the disabled Sentry gate', () => {
  initMonitoring();
  jest.clearAllMocks();
  captureMonitoringException(new Error('Bearer fixture-secret private body'));
  captureMonitoringMessage('memory_images_read_fallback', {
    tags: { reason: 'runtime_read_failure', token: 'fixture-secret' },
    extras: { count: 3, message: 'private body', email: 'fixture@example.invalid' },
  });
  setMonitoringUser({ id: 'fixture-user' });
  const api = crashlytics();
  const error = jest.mocked(api.recordError).mock.calls[0][0];
  expect(error.message).toBe('redacted_exception');
  expect(api.log).toHaveBeenCalledWith('memory_images_read_fallback {"tags":{"reason":"runtime_read_failure"},"extras":{"count":3}}');
  expect(jest.mocked(api.setUserId).mock.calls[0][0]).toMatch(/^[a-f0-9]{64}$/);
  expect(Sentry.captureException).not.toHaveBeenCalled();
  expect(Sentry.captureMessage).not.toHaveBeenCalled();
});
