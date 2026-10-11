import { requireS256OAuthUrl } from '../src/services/auth/pkce';
const origin='https://project.supabase.co';
const base=`${origin}/auth/v1/authorize`;
test('RFC 7636 S256 known vector; never sends a plain verifier to the browser', () => {
  const verifier='dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const result=new URL(requireS256OAuthUrl(`${base}?provider=google&code_challenge_method=plain&code_challenge=${verifier}`,origin));
  expect(result.searchParams.get('code_challenge')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  expect(result.searchParams.get('code_challenge_method')).toBe('s256');
  expect(result.searchParams.get('provider')).toBe('google');
  expect(result.toString()).not.toContain(verifier);
});
test('SDK native S256 challenge remains unchanged', () => {
  const url=`${base}?code_challenge_method=s256&code_challenge=${'A'.repeat(43)}`;
  expect(requireS256OAuthUrl(url,origin)).toBe(url);
});
test.each([
  `${base}?provider=google`,
  `${base}?code_challenge_method=plain&code_challenge=short`,
  `${base}?code_challenge_method=unknown&code_challenge=${'A'.repeat(43)}`,
  `https://attacker.invalid/auth/v1/authorize?code_challenge_method=s256&code_challenge=${'A'.repeat(43)}`,
])('invalid or missing challenge fails closed: %s', url => {
  expect(() => requireS256OAuthUrl(url,origin)).toThrow();
});
