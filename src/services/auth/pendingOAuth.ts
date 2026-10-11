import AsyncStorage from '@react-native-async-storage/async-storage';

export const PENDING_OAUTH_KEY = 'nuri.auth.pending-oauth.v1';
const FLOW_TTL_MS = 15 * 60 * 1000;
type Provider = 'google' | 'kakao';

// Only non-secret flow metadata lives here. Supabase owns the PKCE verifier.
export async function beginPendingOAuth(provider: Provider): Promise<void> {
  await AsyncStorage.setItem(
    PENDING_OAUTH_KEY,
    JSON.stringify({ version: 1, provider, startedAt: Date.now() }),
  );
}

export async function clearPendingOAuth(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_OAUTH_KEY);
}

export async function consumePendingOAuth(
  provider: Provider | null,
): Promise<Provider | null> {
  const raw = await AsyncStorage.getItem(PENDING_OAUTH_KEY);
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    await clearPendingOAuth();
    return null;
  }
  if (
    typeof value !== 'object' || value === null ||
    !('version' in value) || value.version !== 1 ||
    !('provider' in value) || (value.provider !== 'google' && value.provider !== 'kakao') ||
    !('startedAt' in value) || typeof value.startedAt !== 'number' ||
    !Number.isFinite(value.startedAt) || value.startedAt > Date.now() ||
    Date.now() - value.startedAt > FLOW_TTL_MS
  ) {
    await clearPendingOAuth();
    return null;
  }
  if (provider !== null && provider !== value.provider) return null;
  // Claim before exchanging: a cold restart or different code cannot consume it twice.
  await clearPendingOAuth();
  return value.provider;
}
