import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { recordAuthEvent } from './trace';

type StorageReceipt = { version: 2; secureWrite: boolean; readback: boolean; legacyAbsent: boolean; migrated: boolean };
const receipts = new Map<string, StorageReceipt>();
function receipt(key: string): StorageReceipt {
  const existing = receipts.get(key);
  if (existing) return existing;
  const initial: StorageReceipt = { version: 2, secureWrite: false, readback: false, legacyAbsent: false, migrated: false };
  receipts.set(key, initial);
  return initial;
}
export function getSecureStorageReceipt(key: string): Readonly<StorageReceipt> {
  return { ...receipt(key) };
}

async function removeLegacyVerified(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
  if ((await AsyncStorage.getAllKeys()).includes(key)) throw new Error('SECURE_SESSION_STORAGE_FAILED');
  receipt(key).legacyAbsent = true;
  recordAuthEvent('LEGACY_REMOVE_CONFIRMED');
}

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
  // A failed new write must not inherit a previous operation's success receipt.
  receipts.delete(key);
  const result = await Keychain.setGenericPassword(USERNAME, value, options(key));
  if (!result) throw new Error('SECURE_SESSION_STORAGE_FAILED');
  receipt(key).secureWrite = true;
  recordAuthEvent('SECURE_WRITE_CONFIRMED');
  const stored = await Keychain.getGenericPassword(options(key));
  if (!stored || stored.username !== USERNAME || stored.password !== value) {
    throw new Error('SECURE_SESSION_STORAGE_FAILED');
  }
  receipt(key).readback = true;
  recordAuthEvent('SECURE_READBACK_CONFIRMED');
}

// The only persistent credential store used by both Supabase and boot recovery.
// Legacy plaintext is never returned unless secure migration has succeeded.
export const secureSessionStorage = {
  getItem(key: string): Promise<string | null> {
    return serialized(async () => {
      const stored = await Keychain.getGenericPassword(options(key));
      if (stored) {
        if (stored.username !== USERNAME) throw new Error('SECURE_SESSION_STORAGE_FAILED');
        await removeLegacyVerified(key);
        return stored.password;
      }
      const legacy = await AsyncStorage.getItem(key);
      if (legacy === null) return null;
      await writeVerified(key, legacy);
      await removeLegacyVerified(key);
      receipt(key).migrated = true;
      return legacy;
    });
  },
  setItem(key: string, value: string): Promise<void> {
    return serialized(async () => {
      await writeVerified(key, value);
      await removeLegacyVerified(key);
    });
  },
  removeItem(key: string): Promise<void> {
    return serialized(async () => {
      // Remove legacy first so a restart cannot migrate an old logged-out session.
      await removeLegacyVerified(key);
      const removed = await Keychain.resetGenericPassword(options(key));
      if (!removed && await Keychain.getGenericPassword(options(key))) {
        throw new Error('SECURE_SESSION_STORAGE_FAILED');
      }
      receipts.delete(key);
    });
  },
};
