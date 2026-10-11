import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const USERNAME = 'nuri-auth';
const options = (key: string): Keychain.SetOptions => ({
  service: `nuri.auth.v1.${encodeURIComponent(key)}`,
  storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
});

// Serialize migration, SDK refresh and logout, including the PKCE verifier key.
// A rejected operation must not poison the queue or expose native error details.
let pending: Promise<unknown> = Promise.resolve();
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation).catch(() => {
    throw new Error('SECURE_SESSION_STORAGE_FAILED');
  });
  pending = result.catch(() => undefined);
  return result;
}

async function writeVerified(key: string, value: string): Promise<void> {
  const result = await Keychain.setGenericPassword(USERNAME, value, options(key));
  if (!result) throw new Error('SECURE_SESSION_STORAGE_FAILED');
  const stored = await Keychain.getGenericPassword(options(key));
  if (!stored || stored.username !== USERNAME || stored.password !== value) {
    throw new Error('SECURE_SESSION_STORAGE_FAILED');
  }
}

// The only persistent credential store used by both Supabase and boot recovery.
// Legacy plaintext is never returned unless secure migration has succeeded.
export const secureSessionStorage = {
  getItem(key: string): Promise<string | null> {
    return serialized(async () => {
      const stored = await Keychain.getGenericPassword(options(key));
      if (stored) {
        if (stored.username !== USERNAME) throw new Error('SECURE_SESSION_STORAGE_FAILED');
        await AsyncStorage.removeItem(key);
        return stored.password;
      }
      const legacy = await AsyncStorage.getItem(key);
      if (legacy === null) return null;
      await writeVerified(key, legacy);
      await AsyncStorage.removeItem(key);
      return legacy;
    });
  },
  setItem(key: string, value: string): Promise<void> {
    return serialized(async () => {
      await writeVerified(key, value);
      await AsyncStorage.removeItem(key);
    });
  },
  removeItem(key: string): Promise<void> {
    return serialized(async () => {
      // Remove legacy first so a restart cannot migrate an old logged-out session.
      await AsyncStorage.removeItem(key);
      const removed = await Keychain.resetGenericPassword(options(key));
      if (!removed && await Keychain.getGenericPassword(options(key))) {
        throw new Error('SECURE_SESSION_STORAGE_FAILED');
      }
    });
  },
};
