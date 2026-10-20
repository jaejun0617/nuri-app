import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeWalkUuid } from '../domain';
import {
  WalkRecordError,
  walkRecordDraftScope,
  type WalkMemoryDraft,
} from '../server/recordRepository';
import type { PickedRecordImage } from '../../records/form';
import type { EmotionTag } from '../../supabase/memories';

export type WalkDraftScope = Readonly<{
  ownerId: string;
  petId: string;
  clientSessionId: string;
}>;
export type WalkDraftFields = Readonly<{
  title: string;
  content: string;
  emotion: EmotionTag | null;
  tags: readonly string[];
  photos: readonly PickedRecordImage[];
}>;
export type WalkSubmission = Readonly<{
  memoryId: string;
  requestId: string;
  fields: WalkDraftFields;
}>;
export type WalkDraft = Readonly<{
  version: 1;
  revision: number;
  fields: WalkDraftFields;
  submission: WalkSubmission | null;
}>;
const prefix = 'nuri.walk-record.';
const queues = new Map<string, Promise<unknown>>();
const finalScopes = new Set<string>();
function fencePrefix(owner: string, pet: string | null): string {
  return `${prefix}walk-record-v1:${normalizeWalkUuid(owner)}:${
    pet ? normalizeWalkUuid(pet) + ':' : ''
  }`;
}
function assertNotDeleted(key: string): void {
  if ([...finalScopes].some(scope => key.startsWith(scope)))
    throw new Error('WALK_FINAL_SCOPE_DELETED');
}
export function fenceWalkDraftFinalDeletion(
  owner: string,
  pet: string | null,
): void {
  finalScopes.add(fencePrefix(owner, pet));
}
export const walkDraftKey = (s: WalkDraftScope) =>
  prefix + walkRecordDraftScope(s.ownerId, s.petId, s.clientSessionId);
export const sameWalkFields = (a: WalkDraftFields, b: WalkDraftFields) =>
  JSON.stringify(a) === JSON.stringify(b);
export function walkDraftPayload(fields: WalkDraftFields): WalkMemoryDraft {
  if (
    !fields.title.trim() ||
    fields.title.length > 100 ||
    fields.content.length > 5000 ||
    fields.tags.length > 20 ||
    fields.tags.some(t => t.length > 100) ||
    fields.photos.length > 10
  )
    throw new WalkRecordError('WALK_INVALID_RECORD_INPUT', false);
  return {
    title: fields.title.trim(),
    content: fields.content || null,
    emotion: fields.emotion,
    tags: [...fields.tags],
  };
}
function serial<T>(key: string, work: () => Promise<T>): Promise<T> {
  const next = (queues.get(key) ?? Promise.resolve())
    .catch(() => undefined)
    .then(work);
  queues.set(key, next);
  next
    .finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    })
    .catch(() => undefined);
  return next;
}
function isWalkDraftFields(value: unknown): value is WalkDraftFields {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === 'string' &&
    typeof v.content === 'string' &&
    (v.emotion === null ||
      [
        'happy',
        'calm',
        'excited',
        'neutral',
        'sad',
        'anxious',
        'angry',
        'tired',
      ].includes(String(v.emotion))) &&
    Array.isArray(v.tags) &&
    v.tags.every(t => typeof t === 'string') &&
    Array.isArray(v.photos) &&
    v.photos.every(
      p =>
        p &&
        typeof p === 'object' &&
        typeof p.key === 'string' &&
        typeof p.uri === 'string' &&
        typeof p.mimeType === 'string',
    )
  );
}
async function read(key: string): Promise<WalkDraft | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  const v: unknown = JSON.parse(raw);
  if (!v || typeof v !== 'object') throw new Error('WALK_DRAFT_INVALID');
  const d = v as Record<string, unknown>;
  if (
    d.version !== 1 ||
    !Number.isSafeInteger(d.revision) ||
    !isWalkDraftFields(d.fields)
  )
    throw new Error('WALK_DRAFT_INVALID');
  if (d.submission !== null) {
    if (!d.submission || typeof d.submission !== 'object')
      throw new Error('WALK_DRAFT_INVALID');
    const s = d.submission as Record<string, unknown>;
    normalizeWalkUuid(s.memoryId);
    normalizeWalkUuid(s.requestId);
    if (!isWalkDraftFields(s.fields)) throw new Error('WALK_DRAFT_INVALID');
  }
  return v as WalkDraft;
}
export const loadWalkDraft = (s: WalkDraftScope) =>
  serial(walkDraftKey(s), () => read(walkDraftKey(s)));
export function saveWalkDraft(
  s: WalkDraftScope,
  value: WalkDraftFields,
): Promise<WalkDraft> {
  const key = walkDraftKey(s);
  return serial(key, async () => {
    assertNotDeleted(key);
    const old = await read(key);
    const next: WalkDraft = {
      version: 1,
      revision: (old?.revision ?? 0) + 1,
      fields: value,
      submission: old?.submission ?? null,
    };
    assertNotDeleted(key);
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
  });
}
export function prepareWalkSubmission(
  s: WalkDraftScope,
  value: WalkDraftFields,
  identity: () => string,
): Promise<WalkDraft & { submission: WalkSubmission }> {
  const key = walkDraftKey(s);
  return serial(key, async () => {
    assertNotDeleted(key);
    const old = await read(key);
    const next = {
      version: 1 as const,
      revision: (old?.revision ?? 0) + 1,
      fields: value,
      submission: old?.submission ?? {
        memoryId: normalizeWalkUuid(identity()),
        requestId: normalizeWalkUuid(identity()),
        fields: value,
      },
    };
    walkDraftPayload(next.submission.fields);
    assertNotDeleted(key);
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
  });
}
// Compare-and-delete inside the storage queue: an older response never clears
// a newer edit, another session, another pet, or another owner's draft.
export function clearCommittedWalkDraft(
  s: WalkDraftScope,
  expected: WalkDraft,
): Promise<boolean> {
  const key = walkDraftKey(s);
  return serial(key, async () => {
    const current = await read(key);
    if (
      !current ||
      current.revision !== expected.revision ||
      JSON.stringify(current.submission) !==
        JSON.stringify(expected.submission) ||
      !sameWalkFields(current.fields, expected.fields)
    )
      return false;
    await AsyncStorage.removeItem(key);
    return true;
  });
}
export async function purgeWalkDraftsAfterFinalDeletion(
  owner: string,
  pet: string | null,
  confirmation: 'ACCOUNT_FINAL' | 'PET_FINAL',
): Promise<void> {
  const ownerId = normalizeWalkUuid(owner);
  if ((confirmation === 'PET_FINAL') !== (pet !== null))
    throw new Error('WALK_INVALID_DELETE_SCOPE');
  const scopePrefix = fencePrefix(ownerId, pet);
  // Fence synchronously before enumeration. Drain writes that have already
  // crossed setItem; queued/new-key saves recheck the fence and cannot revive it.
  fenceWalkDraftFinalDeletion(ownerId, pet);
  const inflight = [...queues.entries()].filter(([key]) =>
    key.startsWith(scopePrefix),
  );
  await Promise.allSettled(inflight.map(([, task]) => task));
  const keys = [
    ...new Set([
      ...(await AsyncStorage.getAllKeys()).filter(k =>
        k.startsWith(scopePrefix),
      ),
      ...inflight.map(([key]) => key),
    ]),
  ];
  await Promise.all(keys.map(k => serial(k, () => AsyncStorage.removeItem(k))));
}
