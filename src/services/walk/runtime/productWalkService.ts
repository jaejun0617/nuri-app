import { normalizeWalkUuid } from '../domain';
import { WalkServerError, type createWalkServerRepository, type WalkResolution, type WalkServerReceipt } from '../server/repository';
import {
  productFinishPayload, WalkProductError, type ProductAction, type ProductBinding,
  type ProductRequest, type WalkProductCheckpoint, type WalkProductNativePort,
} from './productNative';

export type WalkProductContext = Readonly<{ ownerId: string | null; foreground: boolean; revision: number }>;
type Server = ReturnType<typeof createWalkServerRepository>;
type Scope = Readonly<{ context: WalkProductContext; binding: ProductBinding }>;
type Dependencies = Readonly<{
  native: WalkProductNativePort;
  server: Server;
  context: () => WalkProductContext;
  discoverActive: () => Promise<WalkServerReceipt | null>;
  rpcDeadlineMs?: number;
}>;

// No subscriptions, timers, auth reads or network work at construction/import.
// F wires cached authenticated context + foreground revision and explicit UI.
export function createWalkProductService({ native, server, context, discoverActive, rpcDeadlineMs = 15_000 }: Dependencies) {
  if (!Number.isInteger(rpcDeadlineMs) || rpcDeadlineMs <= 0 || rpcDeadlineMs > 30_000) throw new WalkProductError('WALK_INVALID_RPC_DEADLINE');
  const pending = new Map<string, Promise<WalkProductCheckpoint>>();
  let flushFlight: Readonly<{ key: string; promise: Promise<Readonly<{ pages: number; visited: number; pending: number }>> }> | null = null;
  function check(captured: Scope): void {
    const current = context();
    if (!current.foreground || current.ownerId !== captured.context.ownerId || current.revision !== captured.context.revision)
      throw new WalkProductError('WALK_PRODUCT_CONTEXT_CHANGED');
  }
  async function scope(): Promise<Scope> {
    const current = { ...context() };
    if (!current.ownerId || !current.foreground) throw new WalkProductError('WALK_ACTIVITY_NOT_VISIBLE');
    const binding = await native.binding(normalizeWalkUuid(current.ownerId));
    const s = { context: current, binding }; check(s); return s;
  }
  async function guarded<T>(s: Scope, fn: () => Promise<T>): Promise<T> {
    check(s); const value = await fn(); check(s); return value;
  }
  async function rpc<T>(s: Scope, fn: () => Promise<T>): Promise<T> {
    check(s);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new WalkServerError('WALK_SYNC_UNKNOWN_RETRYABLE', true)), rpcDeadlineMs);
      });
      // The losing response has no Native continuation. It may settle on the
      // server, so the NEXT same-ID reconciliation remains authoritative.
      const result = await Promise.race([fn(), deadline]);
      check(s); return result;
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }
  function once(key: string, fn: () => Promise<WalkProductCheckpoint>): Promise<WalkProductCheckpoint> {
    const c = context(); const full = `${c.ownerId}|${c.revision}|${key}`;
    const old = pending.get(full); if (old) return old;
    const work = fn(); pending.set(full, work);
    work.finally(() => { if (pending.get(full) === work) pending.delete(full); }).catch(() => undefined);
    return work;
  }
  async function apply(s: Scope, c: WalkProductCheckpoint, r: WalkServerReceipt): Promise<WalkProductCheckpoint> {
    // B1 already parses core fields. Native independently validates invariants,
    // owner binding + digest before its encrypted journal can acknowledge them.
    if (r.clientSessionId !== c.clientSessionId || r.petId !== c.petId) throw new WalkProductError('WALK_INVALID_SERVER_RESPONSE');
    return guarded(s, () => native.apply(s.binding, c.clientSessionId, r));
  }
  async function startReserved(s: Scope, c: WalkProductCheckpoint): Promise<WalkProductCheckpoint> {
    if (c.phase === 'RUNNING' && (c.runtimeState === 'WALKING' || c.runtimeState === 'PAUSED')) return c;
    if (!['PREPARED', 'RESERVED', 'START_FAILED'].includes(c.phase) || c.runtimeState !== 'IDLE')
      throw new WalkProductError('WALK_RECOVERY_REQUIRED');
    const reserved = await rpc(s, () => server.reserve(c.clientSessionId, c.petId));
    const current = await apply(s, c, reserved);
    if (reserved.state !== 'ACTIVE') return current;
    const command = await guarded(s, () => native.commandId());
    // Sole route to Native start: still within the explicit user Start call.
    return guarded(s, () => native.start(s.binding, current.clientSessionId, command));
  }
  async function settle(s: Scope, input: WalkProductCheckpoint, known?: WalkResolution): Promise<WalkProductCheckpoint> {
    let c = input;
    try {
      const resolution = known ?? (await rpc(s, () => server.reconcile([c.clientSessionId])))[0];
      if (!resolution || resolution.clientSessionId !== c.clientSessionId)
        throw new WalkServerError('WALK_INVALID_SERVER_RESPONSE', true);
      if (resolution.state !== 'NOT_FOUND') c = await apply(s, c, resolution);
      if (c.sessionDeletePending) return apply(s, c, await rpc(s, () => server.deleteSession(c.clientSessionId, c.petId)));
      if (c.routeDeletePending) return apply(s, c, await rpc(s, () => server.deleteRoute(c.clientSessionId, c.petId)));
      if (c.phase === 'CANCEL_PENDING') return apply(s, c, await rpc(s, () => server.cancel(c.clientSessionId, c.petId)));
      if (c.phase === 'FINISH_PENDING') return apply(s, c, await rpc(s, () => server.finish(productFinishPayload(c))));
      return c; // ACTIVE / NOT_FOUND discovery NEVER starts/resumes collection.
    } catch (error) {
      check(s);
      if (!(error instanceof WalkServerError)) throw error;
      return guarded(s, () => native.noteError(s.binding, c.clientSessionId, error.code));
    }
  }
  async function request(session: string, operation: ProductRequest): Promise<WalkProductCheckpoint> {
    const s = await scope();
    const c = await guarded(s, () => native.request(s.binding, normalizeWalkUuid(session), operation));
    return settle(s, c);
  }
  return {
    start(petId: string, commandId?: string) {
      return once(`start:${normalizeWalkUuid(petId)}`, async () => {
        const s = await scope();
        const command = commandId ?? await guarded(s, () => native.commandId());
        const c = await guarded(s, () => native.prepare(s.binding, petId, command));
        return startReserved(s, c);
      });
    },
    // An unstarted intent discovered after logout/process loss is reusable only
    // via another explicit Start; no reserve/start from scan/reconcile callbacks.
    startPrepared(session: string) {
      return once(`startPrepared:${normalizeWalkUuid(session)}`, async () => {
        const s = await scope();
        return startReserved(s, await guarded(s, () => native.get(s.binding, session)));
      });
    },
    async control(session: string, action: ProductAction, commandId?: string) {
      return once(`control:${normalizeWalkUuid(session)}:${action}`, async () => {
        const s = await scope();
        const c = await guarded(s, () => native.get(s.binding, session));
        const command = commandId ?? await guarded(s, () => native.commandId());
        // Finish is local/durable first. Networking is a separate flush; UI can
        // immediately show FINISHED_LOCAL without waiting for any RPC response.
        return guarded(s, () => native.mutate(s.binding, c, action, command));
      });
    },
    cancel: (session: string) => once(`cancel:${session}`, () => request(session, 'CANCEL')),
    deleteSession: (session: string) => once(`delete:${session}`, () => request(session, 'DELETE_SESSION')),
    deleteRoute: (session: string) => once(`route:${session}`, () => request(session, 'DELETE_ROUTE')),
    async get(session: string) { const s = await scope(); return guarded(s, () => native.get(s.binding, normalizeWalkUuid(session))); },
    async discover() {
      const s = await scope();
      // Server-only discovery may refer to another device. Never synthesize a
      // Native session or apply its receipt to a missing local checkpoint.
      return rpc(s, discoverActive);
    },
    flush() {
      const c = context(); const key = `${c.ownerId}|${c.revision}`;
      if (flushFlight?.key === key) return flushFlight.promise;
      const work = (async () => {
        const s = await scope(); let after = ''; let pages = 0; let visited = 0; let count = 0;
        do {
          const page = await guarded(s, () => native.scan(s.binding, after)); pages++;
          let resolutions: readonly WalkResolution[] = [];
          if (page.entries.length) {
            try { resolutions = await rpc(s, () => server.reconcile(page.entries.map(e => e.clientSessionId))); }
            catch (error) {
              check(s);
              if (!(error instanceof WalkServerError)) throw error;
              for (const entry of page.entries) await guarded(s, () => native.noteError(s.binding, entry.clientSessionId, error.code));
              // Offline/unknown batch is not a reason to hold the caller for
              // one deadline per queued item. All unvisited rows stay durable.
              return { pages, visited, pending: count + page.entries.length };
            }
          }
          // Native scan is a keyset cursor over ALL rows (including empty
          // foreign/legacy pages); never terminate on entries.length === 0.
          for (const [index, entry] of page.entries.entries()) {
            const result = await settle(s, entry, resolutions[index]); visited++;
            if (result.phase !== 'RESOLVED' || result.routeDeletePending || result.sessionDeletePending) count++;
          }
          if (page.nextCursor !== null && page.nextCursor <= after) throw new WalkProductError('WALK_INVALID_PRODUCT_CHECKPOINT');
          after = page.nextCursor ?? '';
        } while (after);
        return { pages, visited, pending: count };
      })();
      flushFlight = { key, promise: work };
      work.finally(() => { if (flushFlight?.promise === work) flushFlight = null; }).catch(() => undefined);
      return work;
    },
    async purgeResolved(session: string) { const s = await scope(); return guarded(s, () => native.purgeResolved(s.binding, normalizeWalkUuid(session))); },
    async purgeAfterFinalDeletion(pet: string | null, confirmation: 'ACCOUNT_FINAL' | 'PET_FINAL') {
      const s = await scope(); let after = ''; let removed = 0;
      do {
        const page = await guarded(s, () => native.purgeFinalScope(s.binding, pet, confirmation, after));
        removed += page.removed; after = page.nextCursor ?? '';
      } while (after);
      return removed;
    },
  };
}
