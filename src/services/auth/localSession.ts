import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../supabase/config';

export const AUTH_SESSION_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
const LOGOUT_STORAGE_KEY = 'NURI_AUTH_EXPLICIT_LOGOUT_V1';

// Supabase remains the only credential writer. Read its persisted session only
// when a transient failure prevents the SDK from returning that session.
export async function readPersistedAuthSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== 'object') return null;
  if (
    !('access_token' in value) || typeof value.access_token !== 'string' || !value.access_token ||
    !('refresh_token' in value) || typeof value.refresh_token !== 'string' || !value.refresh_token ||
    !('expires_at' in value) || typeof value.expires_at !== 'number' || !Number.isFinite(value.expires_at) ||
    !('user' in value) || !value.user || typeof value.user !== 'object' ||
    !('id' in value.user) || typeof value.user.id !== 'string' || !value.user.id
  ) return null;
  return value as Session;
}

export async function hasExplicitLogout(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOGOUT_STORAGE_KEY)) === 'true';
}

export async function markExplicitLogout(): Promise<void> {
  await AsyncStorage.setItem(LOGOUT_STORAGE_KEY, 'true');
}

export async function clearExplicitLogoutAfterSignIn(): Promise<void> {
  await AsyncStorage.removeItem(LOGOUT_STORAGE_KEY);
}
