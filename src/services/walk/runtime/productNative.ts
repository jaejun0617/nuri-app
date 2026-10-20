import { NativeModules, Platform } from 'react-native';
import {
  canonicalizeWalkFinish, getWalkFinishDigest, normalizeWalkTimestamp,
  normalizeWalkUuid, parseWalkFinishPayload, parseWalkWireInteger, WALK_RUNTIME_STATES,
  type WalkFinishPayloadV1, type WalkRuntimeState,
} from '../domain';
import { decodeWalkReceipt, floorWalkFilteredDistanceM, type WalkServerReceipt } from '../server/repository';
import { decodeWalkSnapshot, type WalkNativeSnapshot } from './nativeWalk';
import { decodeWalkRoutePage, type WalkRoutePage } from './distanceProjection';

export const PRODUCT_PHASES = ['PREPARED', 'RESERVED', 'START_REQUESTED', 'START_FAILED',
  'RUNNING', 'FINISH_PENDING', 'FINISH_INVALID', 'CANCEL_PENDING', 'RESOLVED'] as const;
export type WalkProductCheckpoint = Readonly<{
  productVersion: 1;
  clientSessionId: string;
  petId: string;
  runtimeState: WalkRuntimeState;
  revision: string;
  phase: typeof PRODUCT_PHASES[number];
  startedAt: string | null;
  finishedAt: string | null;
  payloadJson: string | null;
  payloadDigest: string | null;
  filteredDistanceM: string | null;
  receipt: WalkServerReceipt | null;
  routeErased: boolean;
  routeDeletePending: boolean;
  sessionDeletePending: boolean;
  lastErrorCode: string | null;
}>;
export type ProductBinding = Readonly<{ ownerId: string; epoch: string }>;
export type ProductAction = 'PAUSE' | 'RESUME' | 'FINISH' | 'RECOVER_PAUSE' | 'RESUME_RECOVERED';
export type ProductRequest = 'CANCEL' | 'DELETE_ROUTE' | 'DELETE_SESSION';
export type ProductPage = Readonly<{ entries: readonly WalkProductCheckpoint[]; nextCursor: string | null }>;
export class WalkProductError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'WalkProductError'; }
}
const invalid = (): never => { throw new WalkProductError('WALK_INVALID_PRODUCT_CHECKPOINT'); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function json(raw: string): unknown {
  if (typeof raw !== 'string' || raw.length > 4_000_000) return invalid();
  try { return JSON.parse(raw); } catch { return invalid(); }
}
function decimal(v: unknown): string {
  try {
    const parsed = parseWalkWireInteger(v, 'DURATION').toString();
    return parsed === v ? parsed : invalid();
  } catch { return invalid(); }
}
export function decodeWalkProductCheckpoint(value: unknown): WalkProductCheckpoint {
  try {
    const v = object(value);
    const keys = ['productVersion', 'clientSessionId', 'petId', 'runtimeState', 'revision', 'phase',
      'startedAt', 'finishedAt', 'payloadJson', 'payloadDigest', 'filteredDistanceM', 'receipt',
      'routeErased', 'routeDeletePending', 'sessionDeletePending', 'lastErrorCode'];
    if (Object.keys(v).length !== keys.length || keys.some(k => !Object.hasOwn(v, k))
      || v.productVersion !== 1 || !WALK_RUNTIME_STATES.some(s => s === v.runtimeState)
      || !PRODUCT_PHASES.some(p => p === v.phase)
      || ['routeErased', 'routeDeletePending', 'sessionDeletePending'].some(k => typeof v[k] !== 'boolean')
      || !(v.lastErrorCode === null || (typeof v.lastErrorCode === 'string' && /^WALK_[A-Z0-9_]{1,72}$/.test(v.lastErrorCode)))) return invalid();
    const session = normalizeWalkUuid(v.clientSessionId), pet = normalizeWalkUuid(v.petId);
    const started = v.startedAt === null ? null : normalizeWalkTimestamp(v.startedAt);
    const finished = v.finishedAt === null ? null : normalizeWalkTimestamp(v.finishedAt);
    const receipt = v.receipt === null ? null : decodeWalkReceipt(v.receipt);
    if (receipt && (receipt.clientSessionId !== session || receipt.petId !== pet)) return invalid();
    if (v.payloadJson === null) {
      if (v.payloadDigest !== null || v.filteredDistanceM !== null || v.phase === 'FINISH_PENDING') return invalid();
    } else {
      if (typeof v.payloadJson !== 'string' || v.payloadJson.length > 8192
        || typeof v.filteredDistanceM !== 'string' || typeof v.payloadDigest !== 'string') return invalid();
      const payload = parseWalkFinishPayload(json(v.payloadJson));
      if (canonicalizeWalkFinish(payload) !== v.payloadJson || getWalkFinishDigest(payload) !== v.payloadDigest
        || payload.clientSessionId !== session || payload.petId !== pet || payload.startedAt !== started || payload.endedAt !== finished
        || floorWalkFilteredDistanceM(v.filteredDistanceM) !== payload.measuredDistanceM) return invalid();
    }
    if (v.phase === 'RESOLVED' && (!receipt || receipt.state === 'ACTIVE')) return invalid();
    return {
      productVersion: 1, clientSessionId: session, petId: pet, runtimeState: v.runtimeState as WalkRuntimeState,
      revision: decimal(v.revision), phase: v.phase as WalkProductCheckpoint['phase'], startedAt: started, finishedAt: finished,
      payloadJson: v.payloadJson as string | null, payloadDigest: v.payloadDigest as string | null,
      filteredDistanceM: v.filteredDistanceM as string | null, receipt,
      routeErased: v.routeErased as boolean, routeDeletePending: v.routeDeletePending as boolean,
      sessionDeletePending: v.sessionDeletePending as boolean, lastErrorCode: v.lastErrorCode as string | null,
    };
  } catch { return invalid(); }
}
export function productFinishPayload(checkpoint: WalkProductCheckpoint): WalkFinishPayloadV1 {
  const checked = decodeWalkProductCheckpoint(checkpoint);
  if (!checked.payloadJson) return invalid();
  return parseWalkFinishPayload(json(checked.payloadJson));
}
type ProductModule = Readonly<{
  productApiVersion: 1;
  productGetBinding(owner: string): Promise<string>;
  productCommand(owner: string, binding: string, operation: string, input: string): Promise<string>;
  createCommandId(): Promise<string>;
}>;
function moduleRequired(): ProductModule {
  const v: unknown = (NativeModules as Record<string, unknown>).NuriWalk;
  if (Platform.OS !== 'android' || !v || typeof v !== 'object') throw new WalkProductError('WALK_SERVICE_UNAVAILABLE');
  const m = v as Record<string, unknown>;
  if (m.productApiVersion !== 1 || ['productGetBinding', 'productCommand', 'createCommandId'].some(k => typeof m[k] !== 'function'))
    throw new WalkProductError('WALK_SERVICE_UNAVAILABLE');
  // Deliberately independent of qaEnabled. Store builds use the same API.
  return v as ProductModule;
}
async function safe<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? e.code : null;
    throw e instanceof WalkProductError ? e : new WalkProductError(typeof code === 'string' && /^WALK_[A-Z0-9_]{1,72}$/.test(code) ? code : 'WALK_SERVICE_UNAVAILABLE');
  }
}
export interface WalkProductNativePort {
  binding(owner: string): Promise<ProductBinding>;
  commandId(): Promise<string>;
  prepare(binding: ProductBinding, pet: string, command: string): Promise<WalkProductCheckpoint>;
  get(binding: ProductBinding, session: string): Promise<WalkProductCheckpoint>;
  scan(binding: ProductBinding, after: string): Promise<ProductPage>;
  start(binding: ProductBinding, session: string, command: string): Promise<WalkProductCheckpoint>;
  mutate(binding: ProductBinding, checkpoint: WalkProductCheckpoint, action: ProductAction, command: string): Promise<WalkProductCheckpoint>;
  apply(binding: ProductBinding, session: string, receipt: WalkServerReceipt): Promise<WalkProductCheckpoint>;
  request(binding: ProductBinding, session: string, operation: ProductRequest): Promise<WalkProductCheckpoint>;
  noteError(binding: ProductBinding, session: string, code: string): Promise<WalkProductCheckpoint>;
  snapshot(binding: ProductBinding, session: string): Promise<WalkNativeSnapshot | null>;
  routePage(binding: ProductBinding, session: string, direction: 'FIRST' | 'TAIL' | 'BEFORE' | 'AFTER', cursor: string, revision: string): Promise<WalkRoutePage>;
  purgeResolved(binding: ProductBinding, session: string): Promise<void>;
  purgeFinalScope(binding: ProductBinding, pet: string | null, confirmation: 'ACCOUNT_FINAL' | 'PET_FINAL', after: string): Promise<Readonly<{ removed: number; nextCursor: string | null }>>;
}
export function createWalkProductNativePort(): WalkProductNativePort {
  const invoke = (b: ProductBinding, op: string, input: Record<string, unknown>) => safe(() =>
    moduleRequired().productCommand(normalizeWalkUuid(b.ownerId), decimal(b.epoch), op, JSON.stringify(input)));
  const checkpoint = async (b: ProductBinding, op: string, body: Record<string, unknown>, expectedSession?: string) => {
    const result = decodeWalkProductCheckpoint(json(await invoke(b, op, body)));
    if (expectedSession && result.clientSessionId !== expectedSession) return invalid();
    return result;
  };
  const sessionBody = (session: string) => ({ sessionId: normalizeWalkUuid(session) });
  return {
    binding: async owner => ({ ownerId: normalizeWalkUuid(owner), epoch: decimal(await safe(() => moduleRequired().productGetBinding(normalizeWalkUuid(owner)))) }),
    commandId: async () => normalizeWalkUuid(await safe(() => moduleRequired().createCommandId())),
    prepare: async (b, pet, command) => {
      const result = await checkpoint(b, 'PREPARE', { petId: normalizeWalkUuid(pet), commandId: normalizeWalkUuid(command) });
      if (result.petId !== normalizeWalkUuid(pet)) return invalid();
      return result;
    },
    get: (b, session) => checkpoint(b, 'GET', sessionBody(session), session),
    async scan(b, after) {
      if (after) normalizeWalkUuid(after);
      const v = object(json(await invoke(b, 'SCAN', { after })));
      if (Object.keys(v).length !== 2 || !Array.isArray(v.entries) || v.entries.length > 100) return invalid();
      const entries = v.entries.map(decodeWalkProductCheckpoint);
      const cursor = v.nextCursor === null ? null : normalizeWalkUuid(v.nextCursor);
      if ((cursor && cursor <= after) || entries.some((e, i) => e.clientSessionId <= after
        || (i > 0 && e.clientSessionId <= entries[i - 1].clientSessionId) || (cursor && e.clientSessionId > cursor))) return invalid();
      return { entries, nextCursor: cursor };
    },
    start: (b, session, command) => checkpoint(b, 'START', { ...sessionBody(session), commandId: normalizeWalkUuid(command) }, session),
    mutate: (b, c, action, command) => checkpoint(b, 'MUTATE', { ...sessionBody(c.clientSessionId), commandId: normalizeWalkUuid(command), revision: decimal(c.revision), action }, c.clientSessionId),
    apply: (b, session, receipt) => checkpoint(b, 'APPLY_RECEIPT', { ...sessionBody(session), receipt: JSON.stringify(decodeWalkReceipt(receipt)) }, session),
    request: (b, session, operation) => checkpoint(b, 'REQUEST', { ...sessionBody(session), operation }, session),
    noteError: (b, session, code) => checkpoint(b, 'NOTE_ERROR', { ...sessionBody(session), code }, session),
    snapshot: async (b, session) => decodeWalkSnapshot(await invoke(b, 'SNAPSHOT', sessionBody(session))),
    routePage: async (b, session, direction, cursor, revision) => decodeWalkRoutePage(await invoke(b, 'ROUTE_PAGE', { ...sessionBody(session), direction, cursor, routeRevision: revision })),
    async purgeResolved(b, session) { if (await invoke(b, 'PURGE_RESOLVED', sessionBody(session)) !== 'OK') return invalid(); },
    async purgeFinalScope(b, pet, confirmation, after) {
      const v = object(json(await invoke(b, 'PURGE_FINAL_SCOPE', { petId: pet === null ? null : normalizeWalkUuid(pet), confirmation, after })));
      if (Object.keys(v).length !== 2 || typeof v.removed !== 'number' || !Number.isInteger(v.removed) || v.removed < 0 || v.removed > 100) return invalid();
      const nextCursor = v.nextCursor === null ? null : normalizeWalkUuid(v.nextCursor);
      if (nextCursor && nextCursor <= after) return invalid();
      return { removed: v.removed, nextCursor };
    },
  };
}
