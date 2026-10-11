import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { getSecureStorageReceipt, secureSessionStorage as storage } from '../src/services/auth/secureSessionStorage';

const encrypted = new Map<string, string>();
const legacy = new Map<string, string>();
const key = 'sb-qa-auth-token';
const service = `nuri.auth.v1.${key}`;

beforeEach(() => {
  jest.resetAllMocks();
  encrypted.clear();
  legacy.clear();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async name => legacy.get(name) ?? null);
  jest.mocked(AsyncStorage.getAllKeys).mockImplementation(async () => [...legacy.keys()]);
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async name => { legacy.delete(name); });
  jest.mocked(Keychain.getGenericPassword).mockImplementation(async opts => {
    const password = encrypted.get(opts?.service ?? '');
    return password === undefined ? false : {
      username: 'nuri-auth', password, service: opts?.service ?? '',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    };
  });
  jest.mocked(Keychain.setGenericPassword).mockImplementation(async (_name, value, opts) => {
    encrypted.set(opts?.service ?? '', value);
    return { service: opts?.service ?? '', storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH };
  });
  jest.mocked(Keychain.resetGenericPassword).mockImplementation(async opts => {
    encrypted.delete(opts?.service ?? '');
    return true;
  });
});

it('migrates an existing session only after secure readback and keeps cold start working', async () => {
  legacy.set(key, 'synthetic-session-a');
  expect(await storage.getItem(key)).toBe('synthetic-session-a');
  expect(legacy.has(key)).toBe(false);
  expect(await storage.getItem(key)).toBe('synthetic-session-a');
  expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(1);
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith('nuri-auth', 'synthetic-session-a', {
    service, storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(getSecureStorageReceipt(key)).toEqual({
    version: 2, secureWrite: true, readback: true, legacyAbsent: true, migrated: true,
  });
});

it('refreshes and switches accounts without leaving a stale plaintext session', async () => {
  await storage.setItem(key, 'synthetic-a');
  await storage.setItem(key, 'synthetic-a-refreshed');
  expect(await storage.getItem(key)).toBe('synthetic-a-refreshed');
  await storage.removeItem(key);
  expect(await storage.getItem(key)).toBeNull();
  await storage.setItem(key, 'synthetic-b');
  expect(await storage.getItem(key)).toBe('synthetic-b');
});

it('prefers the secure refreshed value over a leftover legacy copy', async () => {
  encrypted.set(service, 'new'); legacy.set(key, 'old');
  expect(await storage.getItem(key)).toBe('new');
  expect(legacy.has(key)).toBe(false);
});

it('does not erase or expose legacy data when secure migration fails', async () => {
  legacy.set(key, 'synthetic-legacy');
  jest.mocked(Keychain.setGenericPassword).mockResolvedValueOnce(false);
  await expect(storage.getItem(key)).rejects.toThrow('SECURE_SESSION_STORAGE_FAILED');
  expect(legacy.get(key)).toBe('synthetic-legacy');
  expect(await storage.getItem(key)).toBe('synthetic-legacy');
});

it('does not remove legacy data before verifying the new secure copy', async () => {
  legacy.set(key, 'synthetic-legacy');
  jest.mocked(Keychain.getGenericPassword).mockResolvedValue(false);
  await expect(storage.getItem(key)).rejects.toThrow('SECURE_SESSION_STORAGE_FAILED');
  expect(legacy.has(key)).toBe(true);
});

it('propagates a sanitized storage error without plaintext fallback or deleting the session', async () => {
  legacy.set(key, 'synthetic-legacy');
  jest.mocked(Keychain.getGenericPassword).mockRejectedValueOnce(new Error('native private details'));
  await expect(storage.getItem(key)).rejects.toThrow(/^SECURE_SESSION_STORAGE_FAILED$/);
  expect(legacy.has(key)).toBe(true);
});

it('serializes concurrent migration and logout so the session cannot resurrect', async () => {
  legacy.set(key, 'synthetic-legacy');
  const migration = storage.getItem(key);
  const logout = storage.removeItem(key);
  await migration; await logout;
  expect(await storage.getItem(key)).toBeNull();
  expect(encrypted.size).toBe(0);
  expect(legacy.size).toBe(0);
});

it('removes only the requested key and also secures PKCE verifier storage', async () => {
  await storage.setItem(`${key}-code-verifier`, 'synthetic-verifier');
  await storage.setItem(key, 'synthetic-session');
  await storage.removeItem(key);
  expect(await storage.getItem(`${key}-code-verifier`)).toBe('synthetic-verifier');
});

it('reports failed native deletion instead of claiming logout persistence succeeded', async () => {
  await storage.setItem(key, 'synthetic-session');
  jest.mocked(Keychain.resetGenericPassword).mockResolvedValueOnce(false);
  await expect(storage.removeItem(key)).rejects.toThrow('SECURE_SESSION_STORAGE_FAILED');
});

it('never issues a completed receipt if legacy removal did not take effect', async () => {
  legacy.set(key, 'public-synthetic-fixture');
  jest.mocked(AsyncStorage.removeItem).mockResolvedValueOnce();
  await expect(storage.getItem(key)).rejects.toThrow('SECURE_SESSION_STORAGE_FAILED');
  expect(getSecureStorageReceipt(key)).toEqual({
    version: 2, secureWrite: true, readback: true, legacyAbsent: false, migrated: false,
  });
});

it('does not reuse a successful receipt for a later failed write', async () => {
  await storage.setItem(key, 'public-synthetic-fixture');
  jest.mocked(Keychain.setGenericPassword).mockResolvedValueOnce(false);
  await expect(storage.setItem(key, 'public-new-fixture')).rejects.toThrow('SECURE_SESSION_STORAGE_FAILED');
  expect(getSecureStorageReceipt(key)).toEqual({
    version: 2, secureWrite: false, readback: false, legacyAbsent: false, migrated: false,
  });
});
