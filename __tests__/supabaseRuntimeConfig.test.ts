import { Buffer } from 'buffer';
import { validateSupabaseRuntimeConfig } from '../src/services/supabase/runtimeConfig';

const ref = 'abcdefghijklmnopqrst';
const url = `https://${ref}.supabase.co`;
const key = (role: string, project = ref) =>
  `e30.${Buffer.from(JSON.stringify({ role, ref: project })).toString(
    'base64url',
  )}.signature`;

describe('Supabase public runtime input contract', () => {
  it('accepts the current public anon format without changing auth values', () => {
    expect(validateSupabaseRuntimeConfig(url, key('anon'))).toEqual({
      url,
      clientKey: key('anon'),
    });
  });
  it('accepts a publishable client key', () => {
    expect(
      validateSupabaseRuntimeConfig(
        url,
        'sb_publishable_abcdefghijklmnopqrstuvwxyz',
      ).url,
    ).toBe(url);
  });
  it.each([undefined, null, ''])('fails closed on missing input %p', value => {
    expect(() => validateSupabaseRuntimeConfig(url, value)).toThrow(
      'NURI_CONFIG_MISSING',
    );
  });
  it.each(['http://localhost:54321', 'https://example.com', `${url}/auth`])(
    'rejects invalid URL %s',
    value => {
      expect(() => validateSupabaseRuntimeConfig(value, key('anon'))).toThrow(
        'NURI_CONFIG_URL_INVALID',
      );
    },
  );
  it.each([
    key('service_role'),
    key('supabase_admin'),
    'sb_secret_never_log_this',
  ])('rejects server-only keys', value => {
    expect(() => validateSupabaseRuntimeConfig(url, value)).toThrow(
      'NURI_CONFIG_SERVER_KEY_FORBIDDEN',
    );
  });
  it.each(['broken', key('authenticated'), 'e30.bm90LWpzb24.signature'])(
    'rejects malformed client keys',
    value => {
      expect(() => validateSupabaseRuntimeConfig(url, value)).toThrow(
        'NURI_CONFIG_CLIENT_KEY_INVALID',
      );
    },
  );
  it('rejects a key from a different project', () => {
    expect(() =>
      validateSupabaseRuntimeConfig(url, key('anon', 'other')),
    ).toThrow('NURI_CONFIG_PROJECT_MISMATCH');
  });
});
