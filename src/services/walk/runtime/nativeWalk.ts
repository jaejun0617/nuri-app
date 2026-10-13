import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import {
  WALK_ERROR_CODES,
  WALK_RUNTIME_STATES,
  type WalkRuntimeState,
} from '../domain';
import { captureMonitoringException } from '../../monitoring/sentry';
import { decodeWalkDistanceSummary, type WalkDistanceSummary } from './distanceProjection';

export type WalkNativeSnapshot = Readonly<{
  sessionId: string;
  petId: string;
  runtimeState: WalkRuntimeState;
  revision: string;
  startedAt: string;
  elapsedActiveMs: string;
  elapsedPausedMs: string;
  fixCount: string;
  encryptedChunkCount: string;
  segmentCount: string;
  lastFixAgeMs: string | null;
  serviceRunning: boolean;
  subscriptionActive: boolean;
  recoverable: boolean;
  locationAvailable: boolean;
  permissionState: 'PRECISE_GRANTED' | 'APPROXIMATE_ONLY' | 'LOCATION_DENIED';
  notificationPermissionState:
    | 'GRANTED'
    | 'NOTIFICATION_PERMISSION_DENIED_LIMITED_VISIBILITY';
  distanceStatus: 'NOT_AVAILABLE_PHASE_2' | 'LOCAL_CANDIDATE';
  distanceSummary?: WalkDistanceSummary | null;
  syncState: 'SYNC_PENDING' | null;
  lastErrorCode: string | null;
}>;
type Mutation = (
  session: string,
  commandId: string,
  revision: string,
) => Promise<string>;
type WalkNativeModule = Readonly<{
  qaEnabled: boolean;
  runtimeVersion: number;
  setOwner: (owner: string | null) => Promise<string>;
  createCommandId: () => Promise<string>;
  startWalk: (
    pet: string,
    commandId: string,
    revision: string,
  ) => Promise<string>;
  pauseWalk: Mutation;
  resumeWalk: Mutation;
  finishWalk: Mutation;
  recoverPause: Mutation;
  resumeRecoveredWalk: Mutation;
  discardRecoverableWalk: Mutation;
  getSnapshot: () => Promise<string>;
  getRecoverableSession: () => Promise<string>;
  stopForLogout: (commandId: string, revision: string) => Promise<string>;
  addListener: (name: string) => void;
  removeListeners: (count: number) => void;
}>;

function nativeModule(): WalkNativeModule | null {
  if (Platform.OS !== 'android') return null;
  const value: unknown = (NativeModules as Record<string, unknown>).NuriWalk;
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const methods = [
    'setOwner',
    'createCommandId',
    'startWalk',
    'pauseWalk',
    'resumeWalk',
    'finishWalk',
    'recoverPause',
    'resumeRecoveredWalk',
    'discardRecoverableWalk',
    'getSnapshot',
    'getRecoverableSession',
    'stopForLogout',
    'addListener',
    'removeListeners',
  ];
  if (
    record.runtimeVersion !== 1 ||
    typeof record.qaEnabled !== 'boolean' ||
    methods.some(name => typeof record[name] !== 'function')
  )
    return null;
  return value as WalkNativeModule;
}
function requiredModule(): WalkNativeModule {
  const module = nativeModule();
  if (!module) throw new Error('WALK_SERVICE_UNAVAILABLE');
  return module;
}

export function decodeWalkSnapshot(raw: string): WalkNativeSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('WALK_INVALID_NATIVE_SNAPSHOT');
  }
  if (parsed === null) return null;
  if (typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('WALK_INVALID_NATIVE_SNAPSHOT');
  const v = parsed as Record<string, unknown>;
  const strings = [
    'sessionId',
    'petId',
    'runtimeState',
    'revision',
    'startedAt',
    'elapsedActiveMs',
    'elapsedPausedMs',
    'fixCount',
    'encryptedChunkCount',
    'segmentCount',
    'permissionState',
    'notificationPermissionState',
    'distanceStatus',
  ];
  const bools = [
    'serviceRunning',
    'subscriptionActive',
    'recoverable',
    'locationAvailable',
  ];
  const keys = [
    ...strings,
    ...bools,
    'lastFixAgeMs',
    'syncState',
    'lastErrorCode',
    ...(Object.hasOwn(v, 'distanceSummary') ? ['distanceSummary'] : []),
  ];
  let distanceValid = v.distanceStatus === 'NOT_AVAILABLE_PHASE_2' && (v.distanceSummary === undefined || v.distanceSummary === null);
  if (v.distanceStatus === 'LOCAL_CANDIDATE') {
    try { decodeWalkDistanceSummary(v.distanceSummary); distanceValid = true; } catch { distanceValid = false; }
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (
    Object.keys(v).length !== keys.length ||
    Object.keys(v).some(key => !keys.includes(key)) ||
    strings.some(key => typeof v[key] !== 'string') ||
    bools.some(key => typeof v[key] !== 'boolean') ||
    !WALK_RUNTIME_STATES.some(state => state === v.runtimeState) ||
    ![
      'revision',
      'elapsedActiveMs',
      'elapsedPausedMs',
      'fixCount',
      'encryptedChunkCount',
      'segmentCount',
    ].every(key => /^(0|[1-9][0-9]*)$/.test(String(v[key]))) ||
    !(
      v.lastFixAgeMs === null ||
      (typeof v.lastFixAgeMs === 'string' &&
        /^(0|[1-9][0-9]*)$/.test(v.lastFixAgeMs))
    ) ||
    !['PRECISE_GRANTED', 'APPROXIMATE_ONLY', 'LOCATION_DENIED'].includes(
      String(v.permissionState),
    ) ||
    !['GRANTED', 'NOTIFICATION_PERMISSION_DENIED_LIMITED_VISIBILITY'].includes(
      String(v.notificationPermissionState),
    ) ||
    !uuid.test(String(v.sessionId)) ||
    !uuid.test(String(v.petId)) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      String(v.startedAt),
    ) ||
    !Number.isFinite(Date.parse(String(v.startedAt))) ||
    v.recoverable !== (v.runtimeState === 'RECOVERY_REQUIRED') ||
    !distanceValid ||
    v.syncState !==
      (v.runtimeState === 'FINISHED_LOCAL' ? 'SYNC_PENDING' : null) ||
    !(
      v.lastErrorCode === null ||
      (typeof v.lastErrorCode === 'string' &&
        [...WALK_ERROR_CODES, ...WALK_NATIVE_ERROR_CODES].some(
          code => code === v.lastErrorCode,
        ))
    )
  ) {
    throw new Error('WALK_INVALID_NATIVE_SNAPSHOT');
  }
  return v as WalkNativeSnapshot;
}

export const isWalkQaEnabled = () => nativeModule()?.qaEnabled === true;
export const createWalkCommandId = () => requiredModule().createCommandId();
export const getWalkSnapshot = async () =>
  decodeWalkSnapshot(await requiredModule().getSnapshot());
export const getRecoverableWalk = async () => {
  const snapshot = decodeWalkSnapshot(
    await requiredModule().getRecoverableSession(),
  );
  return snapshot?.recoverable ? snapshot : null;
};
export async function startNativeWalk(
  petId: string,
  commandId: string,
): Promise<WalkNativeSnapshot> {
  const result = decodeWalkSnapshot(
    await requiredModule().startWalk(petId, commandId, '0'),
  );
  if (!result) throw new Error('WALK_INVALID_NATIVE_SNAPSHOT');
  return result;
}
export type WalkNativeAction =
  | 'pauseWalk'
  | 'resumeWalk'
  | 'finishWalk'
  | 'recoverPause'
  | 'resumeRecoveredWalk'
  | 'discardRecoverableWalk';
export async function mutateNativeWalk(
  action: WalkNativeAction,
  snapshot: WalkNativeSnapshot,
  commandId: string,
) {
  const result = decodeWalkSnapshot(
    await requiredModule()[action](
      snapshot.sessionId,
      commandId,
      snapshot.revision,
    ),
  );
  if (!result) throw new Error('WALK_INVALID_NATIVE_SNAPSHOT');
  return result;
}
export function observeNativeWalk(
  listener: (snapshot: WalkNativeSnapshot) => void,
): () => void {
  const subscription = new NativeEventEmitter(requiredModule()).addListener(
    'NuriWalkSnapshot',
    (raw: unknown) => {
      if (typeof raw !== 'string') return;
      try {
        const snapshot = decodeWalkSnapshot(raw);
        if (snapshot) listener(snapshot);
      } catch {
        /* Never forward a malformed/private payload to monitoring. */
      }
    },
  );
  return () => subscription.remove();
}

// An absent module is an older binary/iOS with NO Walk collection. Avoid new
// async turns in existing auth tests/builds. A present native runtime halts GPS
// before disk work; only sealed-checkpoint acknowledgement has a bounded wait.
export function stopWalkForLogout(): Promise<void> | void {
  const module = nativeModule();
  if (!module) return;
  return boundedAuthBoundary(
    () => module.stopForLogout('', '0'),
    'WALK_LOCAL_PERSISTENCE_REVIEW_REQUIRED',
  );
}
function boundedAuthBoundary(
  operation: () => Promise<string>,
  reviewCode: string,
): Promise<void> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (review: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (review) captureMonitoringException(new Error(reviewCode));
      resolve();
    };
    const timer = setTimeout(() => finish(true), 2000);
    try {
      operation().then(
        () => finish(false),
        () => finish(true),
      );
    } catch {
      finish(true);
    }
  });
}
export function bindWalkAuthenticatedOwner(
  ownerId: string | null,
): Promise<void> | void {
  const module = nativeModule();
  if (!module) return;
  return boundedAuthBoundary(
    () => module.setOwner(ownerId),
    'WALK_OWNER_BINDING_REVIEW_REQUIRED',
  );
}

export const WALK_NATIVE_ERROR_CODES = Object.freeze([
  'WALK_LOCATION_PERMISSION_REQUIRED',
  'WALK_PRECISE_LOCATION_REQUIRED',
  'WALK_LOCATION_SERVICES_DISABLED',
  'WALK_ACTIVITY_NOT_VISIBLE',
  'WALK_FGS_START_NOT_ALLOWED',
  'WALK_NOTIFICATION_SETUP_FAILED',
  'WALK_LOCAL_DATABASE_ERROR',
  'WALK_LOCAL_ENCRYPTION_ERROR',
  'WALK_LOCAL_KEY_INVALIDATED',
  'WALK_ACTIVE_SESSION_OWNER_MISMATCH',
  'WALK_SERVICE_UNAVAILABLE',
  'WALK_COMMAND_REVISION_CONFLICT',
  'WALK_RECOVERY_REQUIRED',
  'WALK_CLOCK_DISCONTINUITY',
  'WALK_COMMAND_LIMIT_REACHED',
  'WALK_COMMAND_PENDING',
  'WALK_DISTANCE_CHECKPOINT_INVALID',
  'WALK_DISTANCE_CAPACITY_EXCEEDED',
  'WALK_DISTANCE_NOT_AVAILABLE',
  'WALK_ROUTE_REVISION_CONFLICT',
  'WALK_ROUTE_PAGE_INVALID',
  'WALK_QA_DISABLED',
  'WALK_QA_PROTOCOL_INVALID',
  'WALK_QA_CLEANUP_REQUIRED',
] as const);
