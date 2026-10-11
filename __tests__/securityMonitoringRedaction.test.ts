import {
  monitoringUserId,
  sanitizeMonitoringException,
  sanitizeMonitoringMessage,
  sanitizeMonitoringMetadata,
} from '../src/services/monitoring/sanitize';

describe('monitoring privacy boundary', () => {
  it.each([
    'https://example.invalid/auth/callback?code=synthetic-oauth-code',
    'nuri://oauth/callback#access_token=synthetic-access&refresh_token=synthetic-refresh',
    'https://example.invalid/storage/v1/object/sign/image?token=synthetic-signature',
    'private community body and nickname',
  ])('drops raw URL, callback and body input: %s', input => {
    expect(sanitizeMonitoringMessage(input)).toBe('unclassified_event');
    expect(sanitizeMonitoringException({ message: input, details: input, cause: input }).message).toBe('redacted_exception');
    expect(sanitizeMonitoringMetadata({ url: input, query: input, body: input, extras: { input } })).toEqual({});
  });

  it('drops secrets, content, identifiers and unknown nested metadata', () => {
    const result = sanitizeMonitoringMetadata({
      access_token: 'fixture-access', refresh_token: 'fixture-refresh',
      authorization: 'Bearer fixture', code: 'an-oauth-code',
      email: 'fixture@example.invalid', message: 'private post body',
      url: 'https://example.invalid/photo?token=fixture',
      nested: { password: 'fixture' }, petId: 'private-id',
      count: 2, attempts: 1, mode: 'create', source: 'fetch_one',
      app_code: 'NURI_AUTH_REQUIRED', failedBuckets: ['memory-images', 'private-url'],
    });
    expect(result).toEqual({ count: 2, attempts: 1, mode: 'create', source: 'fetch_one', app_code: 'NURI_AUTH_REQUIRED', failedBuckets: 'memory-images' });
  });

  it('keeps stable codes and frame coordinates without raw exception contents', () => {
    const input = Object.assign(new TypeError('token=fixture-secret email@example.invalid'), { code: 'PGRST202' });
    input.stack = 'TypeError: private content\n at fn (https://example.invalid/bundle?token=secret:19:23)\nprivate body';
    const result = sanitizeMonitoringException(input);
    expect(result.name).toBe('TypeError');
    expect(result.message).toBe('PGRST202');
    expect(result.stack).toBe('TypeError: PGRST202\n    at app (index.android.bundle:19:23)');
    expect(result).not.toBe(input);
    expect(sanitizeMonitoringException({ message: 'secret' }).message).toBe('redacted_exception');
    expect(sanitizeMonitoringException('NURI_PET_ACCESS_DENIED').message).toBe('NURI_PET_ACCESS_DENIED');
  });

  it('only allows known event names, enums and bounded numbers', () => {
    expect(sanitizeMonitoringMessage('memory_upload_queue_recovered')).toBe('memory_upload_queue_recovered');
    expect(sanitizeMonitoringMessage('Bearer private')).toBe('unclassified_event');
    expect(sanitizeMonitoringMetadata({ mode: 'private', count: Infinity, attempts: 9_000_000 })).toEqual({ attempts: 1_000_000 });
  });

  it('uses a stable pseudonymous ID and clears on logout', () => {
    expect(monitoringUserId('fixture-user')).toMatch(/^[a-f0-9]{64}$/);
    expect(monitoringUserId('fixture-user')).toBe(monitoringUserId('fixture-user'));
    expect(monitoringUserId('other-user')).not.toBe(monitoringUserId('fixture-user'));
    expect(monitoringUserId(null)).toBe('');
  });
});
