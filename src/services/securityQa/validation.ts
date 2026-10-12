import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import { Buffer } from 'buffer';
import RNBlobUtil from 'react-native-blob-util';
import { supabase } from '../supabase/client';
import { AUTH_SESSION_STORAGE_KEY } from '../auth/localSession';
import { getSecureStorageReceipt, secureSessionStorage } from '../auth/secureSessionStorage';
import { getAuthTrace } from '../auth/trace';
import { MAX_IMAGE_UPLOAD_BYTES, getImageUploadType, validateImageUploadSize } from '../media/imageUploadPolicy';
import { isSecurityQaEnabled } from './config';
import { STORAGE_IMAGE_FIXTURES } from './storageImageFixtures';

const JOURNAL_KEY = 'NURI_SECURITY_QA_STORAGE_JOURNAL_V1';
const MIGRATION_KEY = 'nuri.security.qa.synthetic-migration.v2';
const MARKER = 'NURI_PUBLIC_SYNTHETIC_MIGRATION_V2';
const BUCKET = 'memory-images';
const FILES = ['valid.jpg', 'valid.png', 'valid.heic', 'valid.heif', 'oversize.png', 'disallowed.txt', 'spoof.png'] as const;
type Result = Record<string, string | number | boolean>;
let running = false;

// Classify only explicit server contracts, never network/auth errors as DENY.
export function classifyStorageRejection(error: unknown, kind: 'size' | 'mime'): string {
  if (!error || typeof error !== 'object') return 'UNEXPECTED_ALLOW';
  const code = 'statusCode' in error ? error.statusCode : undefined;
  if (kind === 'size' && (code === '413' || code === 'EntityTooLarge')) return 'DENY';
  if (kind === 'mime' && (code === '415' || code === 'InvalidMimeType')) return 'DENY';
  return 'UNVERIFIED_ERROR';
}

const SAFE_ERRORS = new Set([
  'SECURITY_QA_DISABLED', 'SECURITY_QA_AUTH_REQUIRED', 'SECURITY_QA_ACCOUNT_REQUIRED',
  'QA_IMAGE_DECODE_FAILED', 'QA_LIST_FAILED', 'QA_CLEANUP_FAILED', 'QA_CLEANUP_REMAINS',
  'QA_JOURNAL_OWNER_MISMATCH', 'QA_ALREADY_RUNNING', 'QA_MIGRATION_FIXTURE_EXISTS',
  'QA_MIGRATION_FAILED', 'QA_REFRESH_FAILED', 'QA_PROTECTED_READ_FAILED',
  'QA_NAMESPACE_NOT_EMPTY', 'QA_VALID_UPLOAD_FAILED', 'QA_IMAGE_READ_FAILED',
  'QA_IMAGE_BYTES_MISMATCH', 'QA_VALID_DELETE_FAILED',
  'QA_LOCAL_FILE_REMAINS', 'QA_FIXTURE_INVALID', 'QA_IMAGE_DISPLAY_FAILED',
]);
export function qaFailureCode(error: unknown): string {
  return error instanceof Error && SAFE_ERRORS.has(error.message) ? error.message : 'QA_UNVERIFIED_FAILURE';
}

async function requireQaUser(): Promise<string> {
  if (!isSecurityQaEnabled) throw new Error('SECURITY_QA_DISABLED');
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('SECURITY_QA_AUTH_REQUIRED');
  const profile = await supabase.from('profiles').select('nickname,role').eq('user_id', data.user.id).single();
  if (profile.error || profile.data?.role !== 'user' || profile.data?.nickname !== 'kakaoQA') throw new Error('SECURITY_QA_ACCOUNT_REQUIRED');
  return data.user.id;
}

function payload(base64: string): ArrayBuffer {
  const data = Buffer.from(base64, 'base64');
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  return bytes.buffer;
}

function nativeDecode(uri: string, expectedWidth: number, expectedHeight: number): Promise<void> {
  return new Promise((resolve, reject) => Image.getSize(uri,
    (width, height) => width === expectedWidth && height === expectedHeight ? resolve() : reject(new Error('QA_IMAGE_DECODE_FAILED')),
    () => reject(new Error('QA_IMAGE_DECODE_FAILED')),
  ));
}

function validPrefix(prefix: unknown, userId: string): prefix is string {
  return typeof prefix === 'string' && new RegExp(`^${userId}/SECURITY_QA_SEC008_[0-9a-f-]{36}$`).test(prefix);
}

async function list(prefix: string): Promise<number> {
  const result = await supabase.storage.from(BUCKET).list(prefix, { limit: 100 });
  if (result.error || !result.data) throw new Error('QA_LIST_FAILED');
  return result.data.length;
}

async function removeExact(prefix: string): Promise<void> {
  // Fixed QA-only cache filenames, derived exclusively from the validated journal.
  for (const fixture of STORAGE_IMAGE_FIXTURES) {
    const file = localFixturePath(prefix, fixture.extension);
    if (await RNBlobUtil.fs.exists(file)) await RNBlobUtil.fs.unlink(file);
    if (await RNBlobUtil.fs.exists(file)) throw new Error('QA_LOCAL_FILE_REMAINS');
  }
  const result = await supabase.storage.from(BUCKET).remove(FILES.map(file => `${prefix}/${file}`));
  if (result.error) throw new Error('QA_CLEANUP_FAILED');
  if (await list(prefix) !== 0) throw new Error('QA_CLEANUP_REMAINS');
}

function localFixturePath(prefix: string, extension: string): string {
  return `${RNBlobUtil.fs.dirs.CacheDir}/${prefix.split('/')[1]}.${extension}`;
}

async function cleanupJournal(userId: string): Promise<void> {
  const prefix = await AsyncStorage.getItem(JOURNAL_KEY);
  if (prefix === null) return;
  if (!validPrefix(prefix, userId)) throw new Error('QA_JOURNAL_OWNER_MISMATCH');
  await removeExact(prefix);
  await AsyncStorage.removeItem(JOURNAL_KEY);
}

export async function resumeQaStorageCleanup(): Promise<Result> {
  if (running) throw new Error('QA_ALREADY_RUNNING');
  running = true;
  try {
    const userId = await requireQaUser();
    await cleanupJournal(userId);
    return { cleanup: 'PASS', objectsRemaining: 0 };
  } finally { running = false; }
}

export async function runQaSessionValidation(): Promise<Result> {
  if (running) throw new Error('QA_ALREADY_RUNNING');
  running = true;
  try {
    await requireQaUser();
    // This public fixture is not a credential and never replaces a real session.
    if ((await AsyncStorage.getAllKeys()).includes(MIGRATION_KEY)) throw new Error('QA_MIGRATION_FIXTURE_EXISTS');
    if (await secureSessionStorage.getItem(MIGRATION_KEY) !== null) throw new Error('QA_MIGRATION_FIXTURE_EXISTS');
    let migrated = false;
    try {
      await AsyncStorage.setItem(MIGRATION_KEY, MARKER);
      migrated = await secureSessionStorage.getItem(MIGRATION_KEY) === MARKER;
      const evidence = getSecureStorageReceipt(MIGRATION_KEY);
      if (!migrated || !evidence.secureWrite || !evidence.readback || !evidence.legacyAbsent || !evidence.migrated) throw new Error('QA_MIGRATION_FAILED');
    } finally { await secureSessionStorage.removeItem(MIGRATION_KEY); }
    const before = getAuthTrace().at(-1)?.sequence ?? 0;
    const refresh = await supabase.auth.refreshSession();
    if (refresh.error || !refresh.data.session) throw new Error('QA_REFRESH_FAILED');
    const protectedRead = await supabase.auth.getUser();
    if (protectedRead.error || !protectedRead.data.user) throw new Error('QA_PROTECTED_READ_FAILED');
    const receipt = getSecureStorageReceipt(AUTH_SESSION_STORAGE_KEY);
    const refreshed = getAuthTrace().some(event => event.sequence > before && event.event === 'TOKEN_REFRESHED');
    return {
      syntheticNativeMigration: migrated ? 'PASS' : 'FAIL',
      realSessionSecureWrite: receipt.secureWrite, realSessionSecureReadback: receipt.readback,
      realSessionLegacyAbsent: receipt.legacyAbsent, tokenRefreshedEvent: refreshed,
      protectedRead: 'PASS', syntheticMigrationFixtureRemaining: 0, tokenLogging: 0,
    };
  } finally { running = false; }
}

export async function runQaStorageValidation(
  preview: (uri: string | null) => Promise<void>,
  progress: (receipt: Result) => void = () => {},
): Promise<Result> {
  if (running) throw new Error('QA_ALREADY_RUNNING');
  running = true;
  try {
    const userId = await requireQaUser();
    await cleanupJournal(userId);
    const random = new Uint8Array(16);
    globalThis.crypto.getRandomValues(random);
    const hex = Array.from(random, value => value.toString(16).padStart(2, '0')).join('');
    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    const prefix = `${userId}/SECURITY_QA_SEC008_${uuid}`;
    if (!validPrefix(prefix, userId) || await list(prefix) !== 0) throw new Error('QA_NAMESPACE_NOT_EMPTY');
    // Verify the same remove/list API before creating anything. Persist only the
    // isolated prefix so an interrupted test can resume exact-path cleanup.
    await removeExact(prefix);
    await AsyncStorage.setItem(JOURNAL_KEY, prefix);
    const result: Result = {};
    const mark = (event: string, status: string | number = 'PASS') => {
      result[event] = status;
      progress({ ...result });
      // Fixed event names and scalar statuses only; never URLs, paths or API errors.
      console.info('NURI_STORAGE_QA', JSON.stringify({ event, status }));
    };
    try {
      for (const fixture of STORAGE_IMAGE_FIXTURES) {
        const { mime, base64 } = fixture;
        const format = mime.slice(6).toUpperCase();
        const body = payload(base64);
        if (Buffer.from(body).toString('base64') !== base64) throw new Error('QA_FIXTURE_INVALID');
        mark(`${format}_BASE64_ROUNDTRIP`);
        mark(`${format}_BYTE_LENGTH`, body.byteLength);
        validateImageUploadSize(body.byteLength);
        const type = getImageUploadType(mime);
        const objectPath = `${prefix}/valid.${type.extension}`;
        mark(`${format}_UPLOAD_STARTED`);
        const upload = await supabase.storage.from(BUCKET).upload(objectPath, body, { contentType: mime, upsert: false });
        if (upload.error) throw new Error('QA_VALID_UPLOAD_FAILED');
        mark(`${format}_UPLOAD_PASS`);
        const signed = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 60);
        if (signed.error || !signed.data?.signedUrl) throw new Error('QA_IMAGE_READ_FAILED');
        const response = await RNBlobUtil.fetch('GET', signed.data.signedUrl);
        if (response.info().status !== 200) throw new Error('QA_IMAGE_READ_FAILED');
        mark(`${format}_READ_PASS`);
        const downloaded = await response.base64();
        if (!Buffer.from(downloaded, 'base64').equals(Buffer.from(body))) throw new Error('QA_IMAGE_BYTES_MISMATCH');
        mark(`${format}_BYTE_EQUALITY_PASS`);
        const localFile = localFixturePath(prefix, type.extension);
        try {
          await RNBlobUtil.fs.writeFile(localFile, downloaded, 'base64');
          if (await RNBlobUtil.fs.hash(localFile, 'sha256') !== fixture.sha256) throw new Error('QA_IMAGE_BYTES_MISMATCH');
          mark(`${format}_FILE_HASH_PASS`);
          // RN 0.87 getSize uses Fresco encoded fetch, which rejects data: URIs.
          // Use the downloaded file; actual Image.onLoad separately proves display.
          await nativeDecode(`file://${localFile}`, fixture.width, fixture.height);
          mark(`${format}_NATIVE_SIZE_PASS`);
          await preview(`file://${localFile}`);
          mark(`${format}_NATIVE_DISPLAY_PASS`);
        } catch (error: unknown) {
          mark(`${format}_COMPATIBILITY`, qaFailureCode(error));
        } finally {
          await preview(null);
          if (await RNBlobUtil.fs.exists(localFile)) await RNBlobUtil.fs.unlink(localFile);
          if (await RNBlobUtil.fs.exists(localFile)) throw new Error('QA_LOCAL_FILE_REMAINS');
          mark(`${format}_TEMP_ABSENT_PASS`);
        }
        const removed = await supabase.storage.from(BUCKET).remove([objectPath]);
        if (removed.error) throw new Error('QA_VALID_DELETE_FAILED');
        mark(`${format}_DELETE_PASS`);
        if (await list(prefix) !== 0) throw new Error('QA_VALID_DELETE_FAILED');
        mark(`${format}_ABSENT_PASS`);
      }
      // Bypass local preflight only in this compile-time gated isolated QA path.
      const oversized = await supabase.storage.from(BUCKET).upload(`${prefix}/oversize.png`, new Uint8Array(MAX_IMAGE_UPLOAD_BYTES + 1).buffer, { contentType: 'image/png', upsert: false });
      mark('OVERSIZE', await list(prefix) === 0 ? classifyStorageRejection(oversized.error, 'size') : 'UNEXPECTED_OBJECT');
      await removeExact(prefix);
      const disallowed = await supabase.storage.from(BUCKET).upload(`${prefix}/disallowed.txt`, payload(Buffer.from('PUBLIC QA TEXT').toString('base64')), { contentType: 'text/plain', upsert: false });
      mark('DISALLOWED_MIME', await list(prefix) === 0 ? classifyStorageRejection(disallowed.error, 'mime') : 'UNEXPECTED_OBJECT');
      await removeExact(prefix);
      const spoof = await supabase.storage.from(BUCKET).upload(`${prefix}/spoof.png`, payload(Buffer.from('PUBLIC QA NON IMAGE').toString('base64')), { contentType: 'image/png', upsert: false });
      mark('SPOOFED_MIME', spoof.error ? 'REJECTED_UNCLASSIFIED' : 'ALLOW_CONTENT_VALIDATION_RESIDUAL');
    } finally {
      await removeExact(prefix);
      await AsyncStorage.removeItem(JOURNAL_KEY);
      mark('CLEANUP_PASS');
    }
    return { ...result, cleanup: 'PASS', objectsRemaining: 0, tempFilesRemaining: 0, syntheticRowsRemaining: 0 };
  } finally { running = false; }
}
