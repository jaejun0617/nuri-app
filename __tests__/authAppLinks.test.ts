import fs from 'fs';
import path from 'path';
import { AUTH_APP_LINK_CALLBACK, LEGACY_AUTH_CALLBACK, createCallbackDeliveryGuard, getOAuthRedirectTo, normalizeAppLink } from '../src/services/auth/appLinks';

describe('OAuth verified and legacy app links', () => {
  it('switches only Kakao to the first-party verified path', () => {
    expect(getOAuthRedirectTo('kakao')).toBe(AUTH_APP_LINK_CALLBACK);
    expect(getOAuthRedirectTo('google')).toBe(LEGACY_AUTH_CALLBACK);
  });
  it.each([AUTH_APP_LINK_CALLBACK, LEGACY_AUTH_CALLBACK])('normalizes token fragments in %s through one parser', base => {
    expect(normalizeAppLink(`${base}#access_token=qa&refresh_token=test`)).toBe(`${base}?access_token=qa&refresh_token=test`);
    expect(normalizeAppLink(`${base}?code=qa`)).toBe(`${base}?code=qa`);
    expect(normalizeAppLink(`${base}#error=access_denied`)).toBe(`${base}?error=access_denied`);
  });
  it.each([
    'https://attacker.example/auth/callback?code=qa',
    'https://nuri-web-beryl.vercel.app/admin',
    'http://nuri-web-beryl.vercel.app/auth/callback',
    'https://nuri-web-beryl.vercel.app/auth/callback/other',
  ])('rejects unowned routes: %s', url => expect(normalizeAppLink(url)).toBeNull());
  it('preserves reset and walk spot legacy links', () => {
    expect(normalizeAppLink('nuri://auth/reset#code=qa')).toBe('nuri://auth/reset?code=qa');
    expect(normalizeAppLink('nuri://walk-spots')).toBe('nuri://walk-spots');
  });
  it('delivers the same initial and runtime callback once, permits a new callback', () => {
    const deliver = createCallbackDeliveryGuard();
    expect(deliver(`${AUTH_APP_LINK_CALLBACK}?code=one`)).toBe(true);
    expect(deliver(`${AUTH_APP_LINK_CALLBACK}?code=one`)).toBe(false);
    expect(deliver(`${AUTH_APP_LINK_CALLBACK}?code=two`)).toBe(true);
  });
  it('manifest owns exactly the verified HTTPS callback and preserves the legacy fallback', () => {
    const manifest = fs.readFileSync(path.join(__dirname, '../android/app/src/main/AndroidManifest.xml'), 'utf8');
    expect(manifest).toMatch(/autoVerify="true"[\s\S]*?scheme="https"[\s\S]*?host="nuri-web-beryl.vercel.app"[\s\S]*?path="\/auth\/callback"/);
    expect(manifest).toMatch(/scheme="nuri"[\s\S]*?host="auth"[\s\S]*?pathPrefix="\/callback"/);
  });
});
