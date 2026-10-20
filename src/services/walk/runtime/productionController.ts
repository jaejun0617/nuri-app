import type { WalkNativeSnapshot } from './nativeWalk';
import {
  WalkProductError,
  type ProductAction,
  type WalkProductCheckpoint,
  type WalkProductNativePort,
} from './productNative';
import type {
  createWalkProductService,
  WalkProductContext,
} from './productWalkService';
import type { WalkRoutePage } from './distanceProjection';
import { createWalkSessionFeedback } from '../product/feedback';
import type { WalkSessionFeedback } from '../domain';

type State = Readonly<{
  checkpoint: WalkProductCheckpoint | null;
  snapshot: WalkNativeSnapshot | null;
  page: WalkRoutePage | null;
  busy: boolean;
  error: string | null;
  ready: boolean;
}>;
type Dependencies = Readonly<{
  petId: string;
  context: () => WalkProductContext;
  service: ReturnType<typeof createWalkProductService>;
  native: WalkProductNativePort;
  observe: (listener: (snapshot: WalkNativeSnapshot) => void) => () => void;
  changed: () => void;
  feedback?: (items: readonly WalkSessionFeedback[]) => void;
}>;
// Screen-scoped projection only. Native owns collection/time/distance and the
// encrypted journal. Neither opening nor reconciliation can start a session.
export function createWalkProductionController(d: Dependencies) {
  const feedback = createWalkSessionFeedback();
  let value: State = {
    checkpoint: null,
    snapshot: null,
    page: null,
    busy: false,
    error: null,
    ready: false,
  };
  let epoch = 0,
    disposed = false,
    remove: (() => void) | null = null;
  let routeRequest = 0,
    requestedRoute: string | null = null;
  let checkpointRequest = 0,
    appliedCheckpointRequest = 0;
  const publish = (patch: Partial<State>) => {
    if (!disposed) {
      value = { ...value, ...patch };
      d.changed();
    }
  };
  const capture = () => ({ epoch, context: { ...d.context() } });
  const current = (s: ReturnType<typeof capture>) => {
    const c = d.context();
    return (
      !disposed &&
      s.epoch === epoch &&
      !!c.ownerId &&
      c.foreground &&
      c.ownerId === s.context.ownerId &&
      c.revision === s.context.revision
    );
  };
  const errorCode = (e: unknown) => {
    const code = e && typeof e === 'object' && 'code' in e ? e.code : null;
    return typeof code === 'string' && /^WALK_[A-Z0-9_]{1,72}$/.test(code)
      ? code
      : 'WALK_SERVICE_UNAVAILABLE';
  };
  async function acceptSnapshot(
    snapshot: WalkNativeSnapshot,
    s: ReturnType<typeof capture>,
  ) {
    const c = value.checkpoint;
    if (
      !current(s) ||
      !c ||
      snapshot.sessionId !== c.clientSessionId ||
      snapshot.petId !== c.petId ||
      BigInt(snapshot.revision) < BigInt(c.revision) ||
      (value.snapshot &&
        BigInt(snapshot.revision) < BigInt(value.snapshot.revision))
    )
      return;
    publish({ snapshot });
    const crossed = feedback.update(snapshot);
    if (crossed.length) d.feedback?.(crossed);
    const revision = snapshot.distanceSummary?.routeRevision;
    if (
      !revision ||
      revision === requestedRoute ||
      c.routeErased ||
      ['DELETED', 'NOT_ACCEPTED_FINAL'].includes(c.receipt?.state ?? '')
    )
      return;
    requestedRoute = revision;
    const request = ++routeRequest;
    try {
      const binding = await d.native.binding(s.context.ownerId!);
      if (!current(s) || request !== routeRequest) return;
      const page = await d.native.routePage(
        binding,
        c.clientSessionId,
        'TAIL',
        '-1',
        revision,
      );
      if (page.routeRevision !== revision)
        throw new WalkProductError('WALK_ROUTE_REVISION_CONFLICT');
      if (
        current(s) &&
        request === routeRequest &&
        value.checkpoint?.clientSessionId === c.clientSessionId
      )
        publish({ page });
    } catch (e) {
      if (current(s) && request === routeRequest) {
        requestedRoute = null;
        publish({ error: errorCode(e) });
      }
    }
  }
  async function load(
    c: WalkProductCheckpoint,
    s: ReturnType<typeof capture>,
    request: number,
  ) {
    if (!current(s) || request < appliedCheckpointRequest) return;
    const old = value.checkpoint;
    if (
      old?.clientSessionId === c.clientSessionId &&
      (BigInt(c.revision) < BigInt(old.revision) ||
        (old.phase === 'RESOLVED' && c.phase !== 'RESOLVED') ||
        (['DELETED', 'NOT_ACCEPTED_FINAL'].includes(old.receipt?.state ?? '') &&
          c.receipt?.state !== old.receipt?.state) ||
        (old.runtimeState === 'FINISHED_LOCAL' &&
          c.runtimeState !== 'FINISHED_LOCAL'))
    )
      return;
    appliedCheckpointRequest = request;
    if (c.phase === 'RESOLVED' && c.runtimeState === 'IDLE') {
      routeRequest++;
      requestedRoute = null;
      publish({ checkpoint: null, snapshot: null, page: null });
      return;
    }
    if (value.checkpoint?.clientSessionId !== c.clientSessionId) {
      requestedRoute = null;
      routeRequest++;
      publish({ snapshot: null, page: null });
    }
    publish({ checkpoint: c });
    if (
      c.routeErased ||
      ['DELETED', 'NOT_ACCEPTED_FINAL'].includes(c.receipt?.state ?? '')
    ) {
      routeRequest++;
      requestedRoute = null;
      publish({ page: null });
    }
    if (!remove)
      remove = d.observe(snapshot => {
        if (!current(s)) return;
        if (
          snapshot.sessionId === value.checkpoint?.clientSessionId &&
          snapshot.petId === value.checkpoint.petId &&
          snapshot.runtimeState !== value.checkpoint.runtimeState
        ) {
          const nextRequest = ++checkpointRequest;
          d.service
            .get(snapshot.sessionId)
            .then(next => load(next, s, nextRequest))
            .catch(e => {
              if (current(s)) publish({ error: errorCode(e) });
            });
        } else
          acceptSnapshot(snapshot, s).catch(e => {
            if (current(s)) publish({ error: errorCode(e) });
          });
      });
    if (c.runtimeState === 'IDLE') return;
    const b = await d.native.binding(s.context.ownerId!);
    if (!current(s)) return;
    const snapshot = await d.native.snapshot(b, c.clientSessionId);
    if (snapshot) await acceptSnapshot(snapshot, s);
  }
  async function operation(
    fn: (s: ReturnType<typeof capture>) => Promise<void>,
  ) {
    if (disposed || value.busy) return;
    const s = capture();
    if (!current(s)) return;
    publish({ busy: true, error: null });
    try {
      await fn(s);
    } catch (e) {
      if (current(s)) publish({ error: errorCode(e) });
    } finally {
      if (current(s)) publish({ busy: false, ready: true });
    }
  }
  async function find(s: ReturnType<typeof capture>) {
    const b = await d.native.binding(s.context.ownerId!);
    let after = '';
    const request = ++checkpointRequest;
    let chosen: WalkProductCheckpoint | null = null,
      priority = 0;
    while (current(s)) {
      const page = await d.native.scan(b, after);
      if (!current(s)) return;
      // An existing active session has a fixed pet, independent of Home's
      // selected pet. Never manufacture a second intent for a different pet.
      for (const c of page.entries) {
        const score =
          c.phase === 'RESOLVED'
            ? 0
            : c.phase === 'CANCEL_PENDING'
            ? 1
            : [
                'STARTING',
                'WALKING',
                'PAUSED',
                'RECOVERY_REQUIRED',
                'FINISHING',
              ].includes(c.runtimeState)
            ? 3
            : c.runtimeState === 'IDLE' &&
              ['PREPARED', 'RESERVED', 'START_FAILED'].includes(c.phase)
            ? 2
            : c.petId === d.petId &&
              c.runtimeState === 'FINISHED_LOCAL' &&
              ['FINISH_PENDING', 'FINISH_INVALID'].includes(c.phase)
            ? 1
            : 0;
        if (score > priority) {
          chosen = c;
          priority = score;
        }
      }
      if (page.nextCursor === null) break;
      if (page.nextCursor <= after)
        throw new WalkProductError('WALK_INVALID_PRODUCT_CHECKPOINT');
      after = page.nextCursor;
    }
    if (chosen) await load(chosen, s, request);
  }
  const api = {
    attach() {
      disposed = false;
    },
    state: () => value,
    open: () =>
      operation(async s => {
        if (value.checkpoint) {
          const request = ++checkpointRequest;
          await load(
            await d.service.get(value.checkpoint.clientSessionId),
            s,
            request,
          );
        } else await find(s);
      }),
    start: () =>
      operation(async s => {
        try {
          const c = value.checkpoint;
          const request = ++checkpointRequest;
          const started =
            c?.runtimeState === 'IDLE'
              ? await d.service.startPrepared(c.clientSessionId)
              : await d.service.start(d.petId);
          if (current(s)) feedback.begin(started.clientSessionId);
          await load(started, s, request);
        } catch (e) {
          // Unknown reservation may already have a durable intent. Read it, but
          // never reserve/restart as part of recovery or the error handler.
          if (current(s)) await find(s);
          throw e;
        }
      }),
    control: (action: ProductAction) =>
      operation(async s => {
        const c = value.checkpoint;
        if (!c) throw new WalkProductError('WALK_SESSION_NOT_FOUND');
        const request = ++checkpointRequest;
        await load(
          await d.service.control(c.clientSessionId, action),
          s,
          request,
        );
        if (action === 'FINISH' && current(s))
          api.sync().catch(e => {
            if (current(s)) publish({ error: errorCode(e) });
          });
      }),
    cancelStart: () =>
      operation(async s => {
        const c = value.checkpoint;
        if (!c || c.runtimeState !== 'IDLE')
          throw new WalkProductError('WALK_INVALID_STATE_TRANSITION');
        const request = ++checkpointRequest;
        await load(await d.service.cancel(c.clientSessionId), s, request);
      }),
    async sync() {
      const s = capture();
      if (!current(s)) return;
      try {
        await d.service.flush();
        if (!current(s)) return;
        const c = value.checkpoint;
        if (c) {
          const request = ++checkpointRequest;
          await load(await d.service.get(c.clientSessionId), s, request);
        }
      } catch (e) {
        if (current(s)) publish({ error: errorCode(e) });
      }
    },
    invalidate(retainOwned = false) {
      epoch++;
      feedback.suspend();
      routeRequest++;
      requestedRoute = retainOwned ? value.page?.routeRevision ?? null : null;
      remove?.();
      remove = null;
      publish({
        checkpoint: retainOwned ? value.checkpoint : null,
        snapshot: retainOwned ? value.snapshot : null,
        page: retainOwned ? value.page : null,
        busy: false,
        error: null,
        ready: retainOwned && value.ready,
      });
    },
    dispose() {
      api.invalidate();
      disposed = true;
    },
  };
  return api;
}
