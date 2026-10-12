import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';
import { Buffer } from 'buffer';
import { supabase } from '../src/services/supabase/client';
import { STORAGE_IMAGE_FIXTURES } from '../src/services/securityQa/storageImageFixtures';
import { classifyStorageRejection, qaFailureCode, resumeQaStorageCleanup, runQaStorageValidation } from '../src/services/securityQa/validation';

jest.mock('../src/services/supabase/client', () => ({ supabase: {
  auth: { getUser: jest.fn() }, from: jest.fn(), storage: { from: jest.fn() },
} }));
jest.mock('../src/services/securityQa/config', () => ({ isSecurityQaEnabled: true, createQaImage: jest.fn() }));
jest.mock('react-native-blob-util', () => ({ fetch: jest.fn(), fs: {
  dirs: { CacheDir: '/qa-cache' }, exists: jest.fn(), unlink: jest.fn(), writeFile: jest.fn(), hash: jest.fn(),
} }));

const owner = '00000000-0000-4000-8000-000000000001';
const journal = 'NURI_SECURITY_QA_STORAGE_JOURNAL_V1';
const objects = new Map<string, ArrayBuffer>();
const local = new Map<string, string>();
const files = new Map<string, string>();
const api = { list: jest.fn(), remove: jest.fn(), upload: jest.fn(), createSignedUrl: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks(); objects.clear(); local.clear(); files.clear();
  jest.spyOn(console, 'info').mockImplementation(() => {});
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
    getRandomValues: (bytes: Uint8Array) => { bytes.fill(1); return bytes; },
  } });
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => local.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { local.set(key, value); });
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async key => { local.delete(key); });
  jest.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: owner } }, error: null } as Awaited<ReturnType<typeof supabase.auth.getUser>>);
  jest.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'user', nickname: 'kakaoQA' }, error: null }) }) }) } as unknown as ReturnType<typeof supabase.from>);
  jest.mocked(supabase.storage.from).mockReturnValue(api as unknown as ReturnType<typeof supabase.storage.from>);
  jest.spyOn(Image, 'getSize').mockImplementation((uri, success, failure) => {
    if (!uri.startsWith('file://')) failure?.(new Error('Unsupported uri scheme for encoded image fetch'));
    else success?.(72, 72);
    return Promise.resolve({ width: 72, height: 72 });
  });
  jest.mocked(RNBlobUtil.fs.exists).mockImplementation(async file => files.has(file));
  jest.mocked(RNBlobUtil.fs.unlink).mockImplementation(async file => { files.delete(file); });
  jest.mocked(RNBlobUtil.fs.writeFile).mockImplementation(async (file, data) => { files.set(file, String(data)); });
  jest.mocked(RNBlobUtil.fs.hash).mockImplementation(async file => STORAGE_IMAGE_FIXTURES.find(fixture => fixture.base64 === files.get(file))?.sha256 ?? 'mismatch');
  api.list.mockImplementation(async (prefix: string) => ({ error: null, data: [...objects.keys()].filter(key => key.startsWith(prefix + '/')).map(name => ({ name })) }));
  api.remove.mockImplementation(async (paths: string[]) => { paths.forEach(key => objects.delete(key)); return { error: null }; });
  api.upload.mockImplementation(async (key: string, body: ArrayBuffer) => {
    if (key.endsWith('oversize.png')) return { error: { statusCode: 'EntityTooLarge' } };
    if (key.endsWith('disallowed.txt')) return { error: { statusCode: 'InvalidMimeType' } };
    objects.set(key, body); return { error: null };
  });
  api.createSignedUrl.mockImplementation(async (objectPath: string) => ({ error: null, data: { signedUrl: 'https://public-fixture.invalid/' + objectPath } }));
  jest.mocked(RNBlobUtil.fetch).mockImplementation((_method, url) => Promise.resolve({ info: () => ({ status: 200 }), base64: async () => STORAGE_IMAGE_FIXTURES.find(fixture => url.endsWith('.' + fixture.extension))?.base64 }) as ReturnType<typeof RNBlobUtil.fetch>);
});

afterEach(() => jest.restoreAllMocks());

it('uploads only own isolated objects and deletes every object including a spoofed MIME success', async () => {
  const result = await runQaStorageValidation(jest.fn());
  for (const format of ['JPEG', 'PNG', 'HEIC', 'HEIF']) {
    for (const stage of ['UPLOAD_PASS', 'READ_PASS', 'BYTE_EQUALITY_PASS', 'FILE_HASH_PASS', 'NATIVE_SIZE_PASS', 'NATIVE_DISPLAY_PASS', 'DELETE_PASS', 'ABSENT_PASS', 'TEMP_ABSENT_PASS']) expect(result[`${format}_${stage}`]).toBe('PASS');
  }
  expect(result).toMatchObject({ OVERSIZE: 'DENY', DISALLOWED_MIME: 'DENY', SPOOFED_MIME: 'ALLOW_CONTENT_VALIDATION_RESIDUAL', objectsRemaining: 0, tempFilesRemaining: 0 });
  expect(files.size).toBe(0);
  expect(objects.size).toBe(0); expect(local.has(journal)).toBe(false);
  expect(api.upload.mock.calls.every(([key]) => String(key).startsWith(owner + '/SECURITY_QA_SEC008_'))).toBe(true);
  expect(api.remove.mock.invocationCallOrder[0]).toBeLessThan(api.upload.mock.invocationCallOrder[0]);
});

it('retains per-format progress, separates display failure and still proves delete/absence/negative boundaries', async () => {
  const receipts = jest.fn();
  const preview = jest.fn(async (uri: string | null) => { if (uri?.endsWith('.jpg')) throw new Error('QA_IMAGE_DISPLAY_FAILED'); });
  const result = await runQaStorageValidation(preview, receipts);
  expect(result.JPEG_COMPATIBILITY).toBe('QA_IMAGE_DISPLAY_FAILED');
  expect(result.JPEG_NATIVE_DISPLAY_PASS).toBeUndefined();
  expect(result.JPEG_DELETE_PASS).toBe('PASS');
  expect(result.JPEG_ABSENT_PASS).toBe('PASS');
  expect(result.PNG_NATIVE_DISPLAY_PASS).toBe('PASS');
  expect(result.OVERSIZE).toBe('DENY');
  expect(receipts.mock.calls.some(([receipt]) => receipt.JPEG_BYTE_EQUALITY_PASS === 'PASS')).toBe(true);
  expect(files.size).toBe(0); expect(objects.size).toBe(0);
});

it('does not claim native compatibility if the local byte hash differs', async () => {
  jest.mocked(RNBlobUtil.fs.hash).mockResolvedValueOnce('mismatch');
  const result = await runQaStorageValidation(jest.fn());
  expect(result.JPEG_COMPATIBILITY).toBe('QA_IMAGE_BYTES_MISMATCH');
  expect(result.JPEG_NATIVE_DISPLAY_PASS).toBeUndefined();
  expect(result.JPEG_ABSENT_PASS).toBe('PASS');
  expect(files.size).toBe(0);
});

it('preserves the cleanup journal if local cleanup fails', async () => {
  jest.mocked(RNBlobUtil.fs.unlink).mockRejectedValue(new Error('private filesystem detail'));
  await expect(runQaStorageValidation(jest.fn())).rejects.toThrow();
  expect(local.has(journal)).toBe(true);
  jest.mocked(RNBlobUtil.fs.unlink).mockImplementation(async file => { files.delete(file); });
  await resumeQaStorageCleanup();
  expect(files.size).toBe(0); expect(objects.size).toBe(0);
});

it('uses exact valid fixture bytes and non-secret event receipts', async () => {
  for (const fixture of STORAGE_IMAGE_FIXTURES) {
    expect(Buffer.from(fixture.base64, 'base64').toString('base64')).toBe(fixture.base64);
    expect(fixture.sha256).toMatch(/^[a-f0-9]{64}$/);
  }
  await runQaStorageValidation(jest.fn());
  for (const [tag, json] of jest.mocked(console.info).mock.calls) {
    expect(tag).toBe('NURI_STORAGE_QA');
    expect(String(json)).not.toMatch(/https?:|file:|token|signedUrl|00000000/i);
  }
});

it('creates nothing when the preflight cleanup/list path fails', async () => {
  api.remove.mockResolvedValueOnce({ error: { statusCode: '403' } });
  await expect(runQaStorageValidation(jest.fn())).rejects.toThrow('QA_CLEANUP_FAILED');
  expect(api.upload).not.toHaveBeenCalled(); expect(objects.size).toBe(0);
});

it('cleans up after an image read failure', async () => {
  api.createSignedUrl.mockResolvedValueOnce({ error: { statusCode: '500' }, data: null });
  await expect(runQaStorageValidation(jest.fn())).rejects.toThrow('QA_IMAGE_READ_FAILED');
  expect(objects.size).toBe(0); expect(local.has(journal)).toBe(false);
});

it('keeps an exact-path recovery journal when cleanup fails', async () => {
  api.createSignedUrl.mockResolvedValueOnce({ error: {}, data: null });
  api.remove.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: {} });
  await expect(runQaStorageValidation(jest.fn())).rejects.toThrow('QA_CLEANUP_FAILED');
  expect(local.has(journal)).toBe(true); expect(objects.size).toBe(1);
  expect(await resumeQaStorageCleanup()).toEqual({ cleanup: 'PASS', objectsRemaining: 0 });
  expect(objects.size).toBe(0); expect(local.has(journal)).toBe(false);
});

it('refuses a journal for any other namespace', async () => {
  local.set(journal, owner + '/existing-photo');
  await expect(resumeQaStorageCleanup()).rejects.toThrow('QA_JOURNAL_OWNER_MISMATCH');
  expect(api.remove).not.toHaveBeenCalled();
});

it.each(['401', '403', '500', undefined])('does not mislabel unrelated server or network error %s as policy denial', statusCode => {
  expect(classifyStorageRejection({ statusCode }, 'size')).toBe('UNVERIFIED_ERROR');
  expect(classifyStorageRejection({ statusCode }, 'mime')).toBe('UNVERIFIED_ERROR');
});

it('never reveals arbitrary native or API errors', () => {
  expect(qaFailureCode(new Error('private detail'))).toBe('QA_UNVERIFIED_FAILURE');
  expect(qaFailureCode(new Error('QA_CLEANUP_FAILED'))).toBe('QA_CLEANUP_FAILED');
});
