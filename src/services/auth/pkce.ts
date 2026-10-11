import { sha256 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';

export function requireS256OAuthUrl(raw: string, supabaseUrl: string): string {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.origin !== new URL(supabaseUrl).origin ||
      url.pathname !== '/auth/v1/authorize' || url.username || url.password || url.hash) {
    throw new Error('oauth_authorize_url_invalid');
  }
  const challenge = url.searchParams.get('code_challenge') ?? '';
  const method = url.searchParams.get('code_challenge_method')?.toLowerCase();
  if (method === 'plain' && /^[A-Za-z0-9._~-]{43,128}$/.test(challenge)) {
    // auth-js keeps the verifier locally. Hermes lacks WebCrypto digest, so
    // hash the SDK's outgoing challenge without changing its stored verifier.
    const digest = sha256(Buffer.from(challenge, 'ascii'));
    url.searchParams.set('code_challenge', Buffer.from(digest).toString('base64')
      .replace(/\+/g, '-').replace(/[/]/g, '_').replace(/[=]+$/, ''));
    url.searchParams.set('code_challenge_method', 's256');
  } else if (method !== 's256' || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
    throw new Error('oauth_pkce_challenge_required');
  }
  return url.toString();
}
