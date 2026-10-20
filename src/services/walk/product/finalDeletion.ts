import { AppState, NativeModules, Platform } from 'react-native';
import { useAuthStore } from '../../../store/authStore';
import { usePetStore } from '../../../store/petStore';
import { normalizeWalkUuid } from '../domain';
import type { AccountDeletionResult } from '../../supabase/auth';
import { purgeWalkProductAfterFinalDeletion } from './invalidation';
import { WalkProductError } from '../runtime/productNative';
import { supabase } from '../../supabase/client';
import { walkFinalDeletionRepository as server } from '../server/supabaseWalkFinalDeletionRepository';
import type {
  WalkFinalDeletionIntent,
  WalkFinalDeletionReceipt,
} from '../server/finalDeletionRepository';

export type WalkFinalDeletionScope = Readonly<{
  ticket: string;
  ownerId: string;
  petId: string | null;
}>;
type Journal = WalkFinalDeletionScope &
  Readonly<{
    version: 1 | 2;
    confirmed: boolean;
    nativeDone: boolean;
    intent?: WalkFinalDeletionIntent;
    proofState?: WalkFinalDeletionReceipt['state'] | null;
    attempt?: string;
    restoreIntent?: Readonly<{ requestId: string; attempt: string }>;
    accountRequestId?: string;
  }>;
type Module = {
  productGetBinding(owner: string): Promise<string>;
  productCommand(
    owner: string,
    epoch: string,
    op: string,
    input: string,
  ): Promise<string>;
  finalCleanupCommand(op: string, ticket: string): Promise<string>;
  finalCleanupProof(op: string, ticket: string, input: string): Promise<string>;
};
function module(): Module | null {
  if (Platform.OS !== 'android') return null;
  const value: unknown = NativeModules.NuriWalk;
  if (!value) return null;
  if (
    typeof value !== 'object' ||
    !['productGetBinding', 'productCommand', 'finalCleanupCommand'].every(
      key => typeof (value as Record<string, unknown>)[key] === 'function',
    )
  )
    throw new WalkProductError('WALK_SERVICE_UNAVAILABLE');
  return value as Module;
}
const invalid = (): never => {
  throw new WalkProductError('WALK_FINAL_CLEANUP_INVALID');
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return invalid();
  return value as Record<string, unknown>;
}
function json(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return invalid();
  }
}
function scope(value: unknown): WalkFinalDeletionScope {
  const v = object(value);
  return {
    ticket: normalizeWalkUuid(v.ticket),
    ownerId: normalizeWalkUuid(v.ownerId),
    petId: v.petId === null ? null : normalizeWalkUuid(v.petId),
  };
}
function journal(value: unknown): Journal {
  const v = object(value),
    captured = scope(v);
  // Old Native PENDING exported only confirmed V1 entries with three fields.
  if (v.version === undefined && Object.keys(v).length === 3)
    return { ...captured, version: 1, confirmed: true, nativeDone: false };
  if (
    (v.version !== 1 && v.version !== 2) ||
    typeof v.confirmed !== 'boolean' ||
    typeof v.nativeDone !== 'boolean'
  )
    return invalid();
  if (v.version === 1)
    return {
      ...captured,
      version: 1,
      confirmed: v.confirmed,
      nativeDone: v.nativeDone,
    };
  const i = object(v.intent);
  const restore =
    v.restoreIntent === undefined ? undefined : object(v.restoreIntent);
  if (
    i.requestId !== captured.ticket ||
    i.petId !== captured.petId ||
    i.purpose !== (captured.petId === null ? 'ACCOUNT_FINAL' : 'PET_FINAL') ||
    typeof i.capability !== 'string' ||
    !/^[0-9a-f]{64}$/.test(i.capability) ||
    (i.resourceBinding !== undefined &&
      (typeof i.resourceBinding !== 'string' ||
        !/^[0-9a-f]{64}$/.test(i.resourceBinding))) ||
    ![null, 'PENDING', 'FINAL', 'ACKNOWLEDGED'].includes(
      v.proofState as string | null,
    ) ||
    typeof v.armed !== 'boolean' ||
    typeof v.attempt !== 'string' ||
    !/^(0|[1-9][0-9]{0,18})$/.test(v.attempt) ||
    ![
      'NOT_STARTED',
      'UNKNOWN',
      'RESTORABLE',
      'RESTORED',
      'ROLLED_BACK',
    ].includes(String(v.outcome)) ||
    (v.proofState !== null && i.resourceBinding === undefined) ||
    (v.confirmed &&
      !['FINAL', 'ACKNOWLEDGED'].includes(String(v.proofState))) ||
    (v.nativeDone && !v.confirmed)
  )
    return invalid();
  if (
    restore &&
    (normalizeWalkUuid(restore.requestId) !== restore.requestId ||
      restore.attempt !== v.attempt ||
      captured.petId !== null)
  )
    return invalid();
  if (
    v.accountRequestId !== undefined &&
    (captured.petId !== null ||
      normalizeWalkUuid(v.accountRequestId) !== v.accountRequestId)
  )
    return invalid();
  return {
    ...captured,
    version: 2,
    confirmed: v.confirmed,
    nativeDone: v.nativeDone,
    proofState: v.proofState as Journal['proofState'],
    attempt: v.attempt,
    ...(v.accountRequestId === undefined
      ? {}
      : { accountRequestId: v.accountRequestId as string }),
    ...(restore
      ? {
          restoreIntent: {
            requestId: restore.requestId as string,
            attempt: restore.attempt as string,
          },
        }
      : {}),
    intent: {
      requestId: captured.ticket,
      petId: captured.petId,
      purpose: captured.petId === null ? 'ACCOUNT_FINAL' : 'PET_FINAL',
      capability: i.capability,
      ...(i.resourceBinding === undefined
        ? {}
        : { resourceBinding: i.resourceBinding as string }),
    },
  };
}
async function read(m: Module, captured: WalkFinalDeletionScope) {
  const v = journal(json(await m.finalCleanupCommand('READ', captured.ticket)));
  if (
    v.ticket !== captured.ticket ||
    v.ownerId !== captured.ownerId ||
    v.petId !== captured.petId
  )
    return invalid();
  return v;
}
async function proofWrite(
  m: Module,
  op: string,
  ticket: string,
  value: unknown,
) {
  if (typeof m.finalCleanupProof !== 'function')
    throw new WalkProductError('WALK_SERVICE_UNAVAILABLE');
  if ((await m.finalCleanupProof(op, ticket, JSON.stringify(value))) !== 'OK')
    return invalid();
}

function captureContext(owner: string, pet: string | null) {
  const abort = new AbortController();
  let alive = true;
  const present = () =>
    pet === null || usePetStore.getState().pets.some(p => p.id === pet);
  const initialPet = present();
  const current = () =>
    alive &&
    !abort.signal.aborted &&
    useAuthStore.getState().session?.user.id === owner &&
    AppState.currentState === 'active' &&
    present() === initialPet;
  const check = () => {
    if (!current()) abort.abort();
  };
  const auth = useAuthStore.subscribe(check),
    pets = usePetStore.subscribe(check);
  const app = AppState.addEventListener('change', next => {
    if (next !== 'active') abort.abort();
  });
  return {
    signal: abort.signal,
    assert() {
      check();
      if (!current())
        throw new WalkProductError('WALK_PRODUCT_CONTEXT_CHANGED');
    },
    dispose() {
      alive = false;
      abort.abort();
      auth();
      pets();
      app.remove();
    },
  };
}
const contexts = new WeakMap<
  WalkFinalDeletionScope,
  ReturnType<typeof captureContext>
>();
// A late restore/rollback may not release a newer explicit deletion attempt.
const attempts = new WeakMap<WalkFinalDeletionScope, string>();
export function assertWalkFinalDeletionCurrent(
  captured: WalkFinalDeletionScope | null,
) {
  if (captured) {
    const c = contexts.get(captured);
    if (!c) return invalid();
    c.assert();
  }
}
export function disposeWalkFinalDeletion(
  captured: WalkFinalDeletionScope | null,
) {
  if (captured) {
    contexts.get(captured)?.dispose();
    contexts.delete(captured);
    attempts.delete(captured);
  }
}

// Native-generated identity/capability is encrypted and read back BEFORE the
// first RPC. Explicit retry recovers first and never creates a new secret.
export async function captureWalkFinalDeletion(
  owner: string,
  pet: string | null,
): Promise<WalkFinalDeletionScope | null> {
  const m = module();
  if (!m) return null;
  const ownerId = normalizeWalkUuid(owner),
    petId = pet === null ? null : normalizeWalkUuid(pet);
  const c = captureContext(ownerId, petId);
  try {
    c.assert();
    const epoch = await m.productGetBinding(ownerId);
    c.assert();
    const ticket = normalizeWalkUuid(
      await m.productCommand(
        ownerId,
        epoch,
        'CAPTURE_FINAL_CLEANUP',
        JSON.stringify({ petId }),
      ),
    );
    c.assert();
    const captured = { ticket, ownerId, petId };
    const v = await read(m, captured);
    c.assert();
    if (v.version !== 2 || !v.intent) return invalid();
    let proof: WalkFinalDeletionReceipt;
    try {
      proof = await server.recover(v.intent);
    } catch (error) {
      c.assert();
      if (
        !error ||
        typeof error !== 'object' ||
        !('code' in error) ||
        error.code !== 'WALK_DELETE_RECEIPT_UNAVAILABLE' ||
        v.intent.resourceBinding !== undefined
      )
        throw error;
      proof = await server.prepare(v.intent, c.signal);
    }
    c.assert();
    await proofWrite(m, 'REGISTER', ticket, proof);
    c.assert();
    const persisted = await read(m, captured);
    c.assert();
    if (persisted.intent?.resourceBinding !== proof.resourceBinding)
      return invalid();
    if (proof.state !== 'PENDING') {
      await reconcile(captured);
      throw new WalkProductError('WALK_SESSION_DELETED');
    }
    contexts.set(captured, c);
    if (!persisted.attempt) return invalid();
    attempts.set(captured, persisted.attempt);
    return captured;
  } catch (error) {
    c.dispose();
    throw error;
  }
}
export async function armWalkFinalDeletion(
  captured: WalkFinalDeletionScope | null,
) {
  const m = module();
  if (!m || !captured) return;
  assertWalkFinalDeletionCurrent(captured);
  if ((await m.finalCleanupCommand('ARM', captured.ticket)) !== 'OK')
    return invalid();
  const v = await read(m, captured);
  if (v.version !== 2 || !v.attempt) return invalid();
  attempts.set(captured, v.attempt);
  assertWalkFinalDeletionCurrent(captured);
}
export async function releaseWalkFinalDeletion(
  captured: WalkFinalDeletionScope | null,
  evidence: Readonly<Record<string, unknown>>,
) {
  const m = module();
  if (!m || !captured) return;
  const attempt =
    attempts.get(captured) ??
    ('attempt' in captured ? captured.attempt : undefined);
  if (typeof attempt !== 'string') return invalid();
  const v = await read(m, captured);
  if (v.version !== 2 || !v.intent) return invalid();
  const proof = await server.recover(v.intent);
  if (proof.state !== 'PENDING') {
    await reconcile(captured);
    return;
  }
  await proofWrite(m, 'RELEASE', captured.ticket, { ...evidence, attempt });
}

export async function bindWalkAccountDeletionRequest(
  captured: WalkFinalDeletionScope | null,
  result: AccountDeletionResult,
) {
  const m = module();
  if (!m || !captured) return;
  assertWalkFinalDeletionCurrent(captured);
  const attempt = attempts.get(captured);
  if (captured.petId !== null || !attempt) return invalid();
  await proofWrite(m, 'ACCOUNT_REQUEST', captured.ticket, {
    requestId: normalizeWalkUuid(result.requestId),
    attempt,
  });
  assertWalkFinalDeletionCurrent(captured);
}

// Only the explicit existing cancel RPC may release a reconstructed UNKNOWN
// account command. PENDING alone never releases it. Capture before that RPC,
// then fence owner/foreground/attempt across every asynchronous completion.
export async function captureWalkAccountRestoration(
  requestId: string | null | undefined,
) {
  const m = module(),
    owner = useAuthStore.getState().session?.user.id;
  if (!m || !owner || !requestId) return null;
  const ownerId = normalizeWalkUuid(owner),
    c = captureContext(ownerId, null);
  try {
    c.assert();
    const raw: unknown = json(await m.finalCleanupCommand('PENDING', ''));
    c.assert();
    if (!Array.isArray(raw) || raw.length > 256) return invalid();
    const captured = raw
      .map(journal)
      .filter(
        v =>
          v.version === 2 &&
          v.ownerId === ownerId &&
          v.petId === null &&
          !v.confirmed,
      );
    for (const v of captured) {
      c.assert();
      await proofWrite(m, 'RESTORE_INTENT', v.ticket, {
        requestId: normalizeWalkUuid(requestId),
        attempt: v.attempt,
      });
      c.assert();
    }
    return {
      async complete(result: AccountDeletionResult) {
        c.assert();
        if (
          result.requestId !== requestId ||
          result.actualStatus !== 'cancelled' ||
          !['cancelled', 'completed'].includes(result.status)
        )
          return;
        for (const v of captured) {
          c.assert();
          if (!v.intent || !v.attempt) return invalid();
          const proof = await server.recover(v.intent);
          c.assert();
          if (proof.state === 'PENDING') {
            await proofWrite(m, 'RELEASE', v.ticket, {
              outcome: 'RESTORED',
              status: result.status,
              actualStatus: result.actualStatus,
              attempt: v.attempt,
              requestId,
            });
            c.assert();
          } else await reconcile(v);
        }
      },
      dispose: c.dispose,
    };
  } catch (error) {
    c.dispose();
    throw error;
  }
}

async function recoverRestoration(m: Module, v: Journal) {
  const restore = v.restoreIntent;
  if (
    !restore ||
    !v.intent ||
    v.ownerId !== useAuthStore.getState().session?.user.id ||
    AppState.currentState !== 'active'
  )
    return;
  const c = captureContext(v.ownerId, null),
    deadline = new AbortController();
  const abort = () => deadline.abort();
  c.signal.addEventListener('abort', abort);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    c.assert();
    const request = supabase
      .from('account_deletion_requests')
      .select('id, status')
      .eq('id', restore.requestId)
      .eq('user_id', v.ownerId)
      .abortSignal(deadline.signal)
      .maybeSingle();
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        deadline.abort();
        reject(new WalkProductError('WALK_FINAL_CLEANUP_PENDING'));
      }, 15000);
    });
    const { data, error } = await Promise.race([request, timeout]);
    if (timer !== undefined) clearTimeout(timer);
    c.assert();
    if (
      error ||
      !data ||
      data.id !== restore.requestId ||
      data.status !== 'cancelled'
    )
      return;
    const proof = await server.recover(v.intent);
    c.assert();
    if (proof.state !== 'PENDING') {
      // Already inside this ticket's drain: never await our own single-flight.
      await proofWrite(m, 'REGISTER', v.ticket, proof);
      await proofWrite(m, 'CONFIRM', v.ticket, proof);
      return;
    }
    await proofWrite(m, 'RELEASE', v.ticket, {
      outcome: 'RESTORED',
      status: 'cancelled',
      actualStatus: 'cancelled',
      attempt: restore.attempt,
      requestId: restore.requestId,
    });
    c.assert();
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    c.signal.removeEventListener('abort', abort);
    deadline.abort();
    c.dispose();
  }
}
export function isConfirmedFinalAccountDeletion(
  result: AccountDeletionResult,
): boolean {
  const final = [
    'db_deleted',
    'cleanup_pending',
    'completed',
    'completed_with_cleanup_pending',
  ];
  return (
    final.includes(result.status) &&
    result.actualStatus !== null &&
    final.includes(result.actualStatus) &&
    !result.canRestore
  );
}
export async function noteRestorableWalkDeletion(
  captured: WalkFinalDeletionScope | null,
  result: AccountDeletionResult,
) {
  if (
    result.canRestore &&
    ['pending_grace_period', 'cancelled'].includes(result.actualStatus ?? '')
  )
    await releaseWalkFinalDeletion(captured, {
      outcome: 'RESTORABLE',
      status: result.status,
      actualStatus: result.actualStatus,
      canRestore: true,
    });
}

async function localCleanup(m: Module, captured: WalkFinalDeletionScope) {
  await purgeWalkProductAfterFinalDeletion(
    captured.ownerId,
    captured.petId,
    captured.petId === null ? 'ACCOUNT_FINAL' : 'PET_FINAL',
  );
  let result: string;
  do {
    result = await m.finalCleanupCommand('STEP', captured.ticket);
    if (!['MORE', 'DONE'].includes(result)) return invalid();
  } while (result === 'MORE');
}
async function drain(captured: WalkFinalDeletionScope): Promise<boolean> {
  const m = module();
  if (!m) return true;
  let v = await read(m, captured);
  if (v.version === 1) {
    if (!v.confirmed) return false; // Legacy UNKNOWN has no retrospective proof.
    await localCleanup(m, captured);
    if ((await m.finalCleanupCommand('ACK', captured.ticket)) !== 'OK')
      return invalid();
    return true;
  }
  if (!v.intent) return invalid();
  let proof: WalkFinalDeletionReceipt | undefined;
  if (!v.confirmed) {
    proof = await server.recover(v.intent);
    await proofWrite(m, 'REGISTER', captured.ticket, proof);
    if (proof.state === 'PENDING') {
      await recoverRestoration(m, v);
      return false;
    }
    await proofWrite(m, 'CONFIRM', captured.ticket, proof);
    v = await read(m, captured);
    if (!v.confirmed) return invalid();
  }
  await localCleanup(m, captured);
  v = await read(m, captured);
  if (!v.nativeDone || !v.intent) return invalid();
  if (v.proofState !== 'ACKNOWLEDGED') {
    proof = proof ?? (await server.recover(v.intent));
    if (proof.state === 'PENDING') return invalid();
    const ack =
      proof.state === 'ACKNOWLEDGED'
        ? proof
        : await server.ack(v.intent, proof, true);
    if (ack.state !== 'ACKNOWLEDGED') return invalid();
    await proofWrite(m, 'REGISTER', captured.ticket, ack);
  }
  if ((await m.finalCleanupCommand('ACK', captured.ticket)) !== 'OK')
    return invalid();
  return true;
}
const flights = new Map<string, Promise<boolean>>();
function reconcile(captured: WalkFinalDeletionScope) {
  const old = flights.get(captured.ticket);
  if (old) return old;
  const work = drain(captured);
  flights.set(captured.ticket, work);
  work
    .finally(() => {
      if (flights.get(captured.ticket) === work)
        flights.delete(captured.ticket);
    })
    .catch(() => undefined);
  return work;
}
export async function confirmWalkFinalDeletion(
  captured: WalkFinalDeletionScope | null,
): Promise<void> {
  if (captured && !(await reconcile(scope(captured))))
    throw new WalkProductError('WALK_FINAL_CLEANUP_PENDING');
}
export async function queueConfirmedWalkFinalDeletion(
  captured: WalkFinalDeletionScope | null,
): Promise<boolean> {
  if (!captured) return true;
  try {
    return await reconcile(scope(captured));
  } catch {
    return false;
  }
}
let replay: Promise<void> | null = null;
export function resumeConfirmedWalkFinalDeletions(): Promise<void> {
  if (replay) return replay;
  replay = (async () => {
    const m = module();
    if (!m) return;
    const raw: unknown = json(await m.finalCleanupCommand('PENDING', ''));
    if (!Array.isArray(raw) || raw.length > 256) return invalid();
    let pendingFailure = false;
    for (const entry of raw) {
      try {
        const v = journal(entry);
        if (v.version === 1 && !v.confirmed) continue;
        await reconcile(v);
      } catch {
        pendingFailure = true;
      }
    }
    if (pendingFailure)
      throw new WalkProductError('WALK_FINAL_CLEANUP_PENDING');
  })();
  replay
    .finally(() => {
      replay = null;
    })
    .catch(() => undefined);
  return replay;
}

// Event-only retry: no Auth fetch, polling or normal Home boot queue. A cached
// owner becoming ready must get one catch-up even if the mount drain was still
// finishing under null/another owner. Each catch-up has its own ABA fence.
export function observeWalkFinalDeletionRecovery(
  onPending: () => void,
): () => void {
  let alive = true;
  const waiting = new Set<ReturnType<typeof captureContext>>();
  const retry = (ownerReady = false) => {
    if (!alive || AppState.currentState !== 'active') return;
    if (!ownerReady) {
      resumeConfirmedWalkFinalDeletions().catch(onPending);
      return;
    }
    const owner = useAuthStore.getState().session?.user.id;
    if (!owner) return;
    const c = captureContext(owner, null),
      prior = replay;
    waiting.add(c);
    (async () => {
      if (prior) await prior.catch(() => undefined);
      c.assert();
      if (alive) await resumeConfirmedWalkFinalDeletions();
    })()
      .catch(() => {
        if (alive && !c.signal.aborted) onPending();
      })
      .finally(() => {
        waiting.delete(c);
        c.dispose();
      });
  };
  const auth = useAuthStore.subscribe((next, previous) => {
    if (
      next.session?.user.id &&
      next.session.user.id !== previous.session?.user.id
    )
      retry(true);
  });
  const app = AppState.addEventListener('change', state => {
    if (state === 'active') retry();
  });
  retry();
  return () => {
    alive = false;
    auth();
    app.remove();
    for (const c of waiting) c.dispose();
    waiting.clear();
  };
}
