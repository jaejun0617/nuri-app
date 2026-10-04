export const AUTH_APP_LINK_ORIGIN = 'https://nuri-web-beryl.vercel.app';
export const AUTH_APP_LINK_CALLBACK = `${AUTH_APP_LINK_ORIGIN}/auth/callback`;
export const LEGACY_AUTH_CALLBACK = 'nuri://auth/callback';

export function getOAuthRedirectTo(provider: 'google' | 'kakao'): string {
  return provider === 'kakao' ? AUTH_APP_LINK_CALLBACK : LEGACY_AUTH_CALLBACK;
}

export function normalizeAppLink(url: string): string | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol === 'https:') {
    if (parsed.origin !== AUTH_APP_LINK_ORIGIN || parsed.pathname !== '/auth/callback' || parsed.username || parsed.password) return null;
  } else if (parsed.protocol !== 'nuri:') {
    return null;
  }
  const [base, fragment] = url.split('#', 2);
  if (!fragment) return url;
  const normalized = fragment.startsWith('/') ? fragment.slice(1) : fragment;
  return normalized.includes('=') ? `${base}${base.includes('?') ? '&' : '?'}${normalized}` : url;
}

// Retain only one callback in volatile memory for a bounded delivery window.
// Neither the URL nor OAuth credentials are logged or written to storage.
export function createCallbackDeliveryGuard() {
  let last: { url: string; expires: number } | null = null;
  return (url: string): boolean => {
    const base = url.split('?', 1)[0];
    if (base !== AUTH_APP_LINK_CALLBACK && base !== LEGACY_AUTH_CALLBACK) return true;
    if (last?.url === url && last.expires > Date.now()) return false;
    last = { url, expires: Date.now() + 60_000 };
    return true;
  };
}
