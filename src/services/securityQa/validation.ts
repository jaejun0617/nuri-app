import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import { Buffer } from 'buffer';
import RNBlobUtil from 'react-native-blob-util';
import { supabase } from '../supabase/client';
import { AUTH_SESSION_STORAGE_KEY } from '../auth/localSession';
import { getSecureStorageReceipt, secureSessionStorage } from '../auth/secureSessionStorage';
import { getAuthTrace } from '../auth/trace';
import { MAX_IMAGE_UPLOAD_BYTES, getImageUploadType, validateImageUploadSize } from '../media/imageUploadPolicy';
import { createQaImage, isSecurityQaEnabled } from './config';
import { PUBLIC_HEIC_FIXTURE } from './publicHeicFixture';

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

function nativeDecode(uri: string): Promise<void> {
  return new Promise((resolve, reject) => Image.getSize(uri,
    (width, height) => width > 0 && height > 0 ? resolve() : reject(new Error('QA_IMAGE_DECODE_FAILED')),
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
  const result = await supabase.storage.from(BUCKET).remove(FILES.map(file => `${prefix}/${file}`));
  if (result.error) throw new Error('QA_CLEANUP_FAILED');
  if (await list(prefix) !== 0) throw new Error('QA_CLEANUP_REMAINS');
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

export async function runQaStorageValidation(preview: (uri: string) => void): Promise<Result> {
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
    try {
      for (const mime of ['image/jpeg', 'image/png', 'image/heic', 'image/heif'] as const) {
        const base64 = mime === 'image/heic' || mime === 'image/heif' ? PUBLIC_HEIC_FIXTURE : await createQaImage(mime);
        const body = payload(base64);
        validateImageUploadSize(body.byteLength);
        const type = getImageUploadType(mime);
        const objectPath = `${prefix}/valid.${type.extension}`;
        const upload = await supabase.storage.from(BUCKET).upload(objectPath, body, { contentType: mime, upsert: false });
        if (upload.error) throw new Error('QA_VALID_UPLOAD_FAILED');
        const signed = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 60);
        if (signed.error || !signed.data?.signedUrl) throw new Error('QA_IMAGE_READ_FAILED');
        const response = await RNBlobUtil.fetch('GET', signed.data.signedUrl);
        if (response.info().status !== 200) throw new Error('QA_IMAGE_READ_FAILED');
        const downloaded = await response.base64();
        if (downloaded !== base64) throw new Error('QA_IMAGE_BYTES_MISMATCH');
        const uri = `data:${mime};base64,${downloaded}`;
        await nativeDecode(uri);
        preview(uri);
        const removed = await supabase.storage.from(BUCKET).remove([objectPath]);
        if (removed.error || await list(prefix) !== 0) throw new Error('QA_VALID_DELETE_FAILED');
        result[`${type.extension}UploadReadDecodeDeleteAbsent`] = 'PASS';
      }
      // Bypass local preflight only in this compile-time gated isolated QA path.
      const oversized = await supabase.storage.from(BUCKET).upload(`${prefix}/oversize.png`, new Uint8Array(MAX_IMAGE_UPLOAD_BYTES + 1).buffer, { contentType: 'image/png', upsert: false });
      result.oversize = await list(prefix) === 0 ? classifyStorageRejection(oversized.error, 'size') : 'UNEXPECTED_OBJECT';
      await removeExact(prefix);
      const disallowed = await supabase.storage.from(BUCKET).upload(`${prefix}/disallowed.txt`, payload(Buffer.from('PUBLIC QA TEXT').toString('base64')), { contentType: 'text/plain', upsert: false });
      result.disallowedMime = await list(prefix) === 0 ? classifyStorageRejection(disallowed.error, 'mime') : 'UNEXPECTED_OBJECT';
      await removeExact(prefix);
      const spoof = await supabase.storage.from(BUCKET).upload(`${prefix}/spoof.png`, payload(Buffer.from('PUBLIC QA NON IMAGE').toString('base64')), { contentType: 'image/png', upsert: false });
      result.spoofedMime = spoof.error ? 'REJECTED_UNCLASSIFIED' : 'ALLOW_CONTENT_VALIDATION_RESIDUAL';
    } finally {
      await removeExact(prefix);
      await AsyncStorage.removeItem(JOURNAL_KEY);
    }
    return { ...result, cleanup: 'PASS', objectsRemaining: 0, syntheticRowsRemaining: 0 };
  } finally { running = false; }
}
