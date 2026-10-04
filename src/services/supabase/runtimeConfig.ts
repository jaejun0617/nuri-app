import { Buffer } from 'buffer';

export type SupabaseRuntimeConfig = Readonly<{
  url: string;
  clientKey: string;
}>;

export type RuntimeConfigErrorCode =
  | 'NURI_CONFIG_MISSING'
  | 'NURI_CONFIG_URL_INVALID'
  | 'NURI_CONFIG_CLIENT_KEY_INVALID'
  | 'NURI_CONFIG_SERVER_KEY_FORBIDDEN'
  | 'NURI_CONFIG_PROJECT_MISMATCH';

function reject(code: RuntimeConfigErrorCode): never {
  // Never include deployment values in an error, crash report, or build log.
  throw new Error(code);
}

export function validateSupabaseRuntimeConfig(
  url: unknown,
  clientKey: unknown,
): SupabaseRuntimeConfig {
  if (
    typeof url !== 'string' ||
    typeof clientKey !== 'string' ||
    !url ||
    !clientKey
  ) {
    return reject('NURI_CONFIG_MISSING');
  }
  const project = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/.exec(url);
  if (!project) {
    return reject('NURI_CONFIG_URL_INVALID');
  }
  if (clientKey.startsWith('sb_secret_')) {
    return reject('NURI_CONFIG_SERVER_KEY_FORBIDDEN');
  }
  if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(clientKey)) {
    return Object.freeze({ url: url.replace(/\/$/, ''), clientKey });
  }
  const parts = clientKey.split('.');
  if (
    parts.length !== 3 ||
    parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))
  ) {
    return reject('NURI_CONFIG_CLIENT_KEY_INVALID');
  }
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  } catch {
    return reject('NURI_CONFIG_CLIENT_KEY_INVALID');
  }
  if (!claims || typeof claims !== 'object' || !('role' in claims)) {
    return reject('NURI_CONFIG_CLIENT_KEY_INVALID');
  }
  if (claims.role === 'service_role' || claims.role === 'supabase_admin') {
    return reject('NURI_CONFIG_SERVER_KEY_FORBIDDEN');
  }
  if (claims.role !== 'anon') {
    return reject('NURI_CONFIG_CLIENT_KEY_INVALID');
  }
  if (!('ref' in claims) || claims.ref !== project[1]) {
    return reject('NURI_CONFIG_PROJECT_MISMATCH');
  }
  return Object.freeze({ url: url.replace(/\/$/, ''), clientKey });
}
