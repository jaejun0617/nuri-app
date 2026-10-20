import { createWalkProductionController } from '../src/services/walk/runtime/productionController';
import type {
  WalkProductCheckpoint,
  WalkProductNativePort,
} from '../src/services/walk/runtime/productNative';
import type {
  createWalkProductService,
  WalkProductContext,
} from '../src/services/walk/runtime/productWalkService';
import type { WalkNativeSnapshot } from '../src/services/walk/runtime/nativeWalk';

const pet = '22222222-2222-4222-8222-222222222222',
  owner = '11111111-1111-4111-8111-111111111111',
  id = '44444444-4444-4444-8444-444444444444';
const cp = (
  runtimeState: WalkProductCheckpoint['runtimeState'] = 'WALKING',
): WalkProductCheckpoint => ({
  productVersion: 1,
  clientSessionId: id,
  petId: pet,
  runtimeState,
  revision: '2',
  phase: runtimeState === 'FINISHED_LOCAL' ? 'FINISH_PENDING' : 'RUNNING',
  startedAt: null,
  finishedAt: null,
  payloadJson: null,
  payloadDigest: null,
  filteredDistanceM: null,
  receipt: null,
  routeErased: false,
  routeDeletePending: false,
  sessionDeletePending: false,
  lastErrorCode: null,
});
const snapshot = (revision = '2') =>
  ({
    sessionId: id,
    petId: pet,
    runtimeState: 'WALKING',
    revision,
    distanceSummary: { routeRevision: revision },
  } as WalkNativeSnapshot);
function fixture() {
  let context: WalkProductContext = {
    ownerId: owner,
    foreground: true,
    revision: 1,
  };
  let listener: ((s: WalkNativeSnapshot) => void) | null = null;
  let checkpoint = cp();
  const service = {
    start: jest.fn(async () => checkpoint),
    startPrepared: jest.fn(async () => checkpoint),
    get: jest.fn(async () => checkpoint),
    control: jest.fn(async (_: string, action: string) => {
      checkpoint = cp(
        action === 'FINISH'
          ? 'FINISHED_LOCAL'
          : action === 'PAUSE'
          ? 'PAUSED'
          : 'WALKING',
      );
      return checkpoint;
    }),
    flush: jest.fn(async () => ({ pages: 1, visited: 0, pending: 0 })),
  };
  const native = {
    binding: jest.fn(async () => ({ ownerId: owner, epoch: '1' })),
    scan: jest.fn(
      async (): Promise<{
        entries: WalkProductCheckpoint[];
        nextCursor: string | null;
      }> => ({ entries: [], nextCursor: null }),
    ),
    snapshot: jest.fn(async () => snapshot()),
    routePage: jest.fn(async () => ({
      routeRevision: '2',
      current: null,
      segments: [],
      hasEarlier: false,
      hasLater: false,
      filteredPointCount: '0',
      startCursor: '-1',
      endCursor: '-1',
    })),
  };
  const remove = jest.fn();
  const feedback = jest.fn();
  const states: ReturnType<typeof controller.state>[] = [];
  const controller = createWalkProductionController({
    petId: pet,
    context: () => context,
    service: service as unknown as ReturnType<typeof createWalkProductService>,
    native: native as unknown as WalkProductNativePort,
    observe: cb => {
      listener = cb;
      return remove;
    },
    changed: () => states.push(controller.state()),
    feedback,
  });
  return {
    controller,
    native,
    service,
    remove,
    feedback,
    states,
    emit: (s = snapshot()) => listener?.(s),
    context: (v: WalkProductContext) => {
      context = v;
      controller.invalidate();
    },
  };
}
test('enter/discover reads product checkpoints only; no permission, reserve, GPS start or automatic resume', async () => {
  const f = fixture();
  await f.controller.open();
  expect(f.service.start).not.toHaveBeenCalled();
  expect(f.service.control).not.toHaveBeenCalled();
  f.native.scan.mockResolvedValueOnce({
    entries: [cp('RECOVERY_REQUIRED')],
    nextCursor: null,
  });
  await f.controller.open();
  expect(f.controller.state().checkpoint?.runtimeState).toBe(
    'RECOVERY_REQUIRED',
  );
  expect(f.service.control).not.toHaveBeenCalled();
});
test('explicit start fixes pet/session; duplicate tap is one operation; read-only observer is cleaned', async () => {
  const f = fixture();
  await f.controller.open();
  await Promise.all([f.controller.start(), f.controller.start()]);
  expect(f.service.start).toHaveBeenCalledTimes(1);
  expect(f.service.start).toHaveBeenCalledWith(pet);
  expect(f.controller.state().checkpoint?.petId).toBe(pet);
  f.controller.dispose();
  expect(f.remove).toHaveBeenCalledTimes(1);
  f.emit();
  expect(f.controller.state().snapshot).toBeNull();
});
test('scalar updates reuse accepted route geometry; foreign and older session events are ignored', async () => {
  const f = fixture();
  await f.controller.start();
  const page = f.controller.state().page;
  expect(page).not.toBeNull();
  expect(f.native.routePage).toHaveBeenCalledTimes(1);
  const calls = f.native.routePage.mock.calls.length;
  f.emit();
  f.emit({ ...snapshot(), petId: owner });
  f.emit({ ...snapshot(), sessionId: owner });
  await Promise.resolve();
  expect(f.native.routePage).toHaveBeenCalledTimes(calls);
  expect(f.controller.state().page).toBe(page);
});
test('confirmed route erasure drops the cached projection and cannot reload it from a scalar snapshot', async () => {
  const f = fixture();
  await f.controller.start();
  expect(f.controller.state().page).not.toBeNull();
  f.service.get.mockResolvedValue({
    ...cp('FINISHED_LOCAL'),
    routeErased: true,
  });
  await f.controller.sync();
  expect(f.controller.state().page).toBeNull();
  f.emit();
  await Promise.resolve();
  expect(f.native.routePage).toHaveBeenCalledTimes(1);
});
test('finish publishes durable local result before an unresolved network flush; no automatic Memory/XP', async () => {
  const f = fixture();
  await f.controller.start();
  f.service.flush.mockReturnValue(new Promise(() => undefined));
  await f.controller.control('FINISH');
  expect(f.controller.state().checkpoint?.runtimeState).toBe('FINISHED_LOCAL');
  expect(f.controller.state().busy).toBe(false);
});
test('production Native scalar observer invokes ephemeral threshold policy once, not diagnostic distance', async () => {
  const f = fixture();
  await f.controller.start();
  const event = (distance: string) =>
    ({
      ...snapshot(),
      elapsedActiveMs: '1000',
      distanceSummary: {
        ...snapshot().distanceSummary!,
        acceptedDistanceM: distance,
        measuredDistanceM: '99999',
      },
    } as WalkNativeSnapshot);
  f.emit(event('499.9'));
  expect(f.feedback).not.toHaveBeenCalled();
  f.emit(event('500.1'));
  f.emit(event('500.1'));
  expect(f.feedback.mock.calls).toEqual([[['SESSION_500_M']]]);
});
test('pause/resume and recovery use explicit product controls, not legacy/QA mutation', async () => {
  const f = fixture();
  await f.controller.start();
  await f.controller.control('PAUSE');
  await f.controller.control('RESUME');
  await f.controller.control('RESUME_RECOVERED');
  expect(f.service.control.mock.calls.map(c => c[1])).toEqual([
    'PAUSE',
    'RESUME',
    'RESUME_RECOVERED',
  ]);
});
test('owner ABA/background invalidates late continuations and observer; next foreground explicitly reads again', async () => {
  const f = fixture();
  let resolve!: (c: WalkProductCheckpoint) => void;
  f.service.start.mockReturnValue(
    new Promise(r => {
      resolve = r;
    }),
  );
  const pending = f.controller.start();
  f.context({ ownerId: owner, foreground: false, revision: 2 });
  f.context({ ownerId: owner, foreground: true, revision: 3 });
  resolve(cp());
  await pending;
  expect(f.controller.state().checkpoint).toBeNull();
  expect(f.native.snapshot).not.toHaveBeenCalled();
});
test('all pages are classified globally: later active other-pet beats old resolved and pending finish history', async () => {
  const f = fixture();
  const old = Array.from({ length: 100 }, () => ({
    ...cp('FINISHED_LOCAL'),
    phase: 'RESOLVED' as const,
  }));
  f.native.scan
    .mockResolvedValueOnce({ entries: old, nextCursor: id })
    .mockResolvedValueOnce({
      entries: [{ ...cp('RECOVERY_REQUIRED'), petId: owner }],
      nextCursor: null,
    });
  await f.controller.open();
  expect(f.native.scan).toHaveBeenCalledTimes(2);
  expect(f.controller.state().checkpoint).toMatchObject({
    petId: owner,
    runtimeState: 'RECOVERY_REQUIRED',
  });
  expect(f.service.start).not.toHaveBeenCalled();
});
test('only cancelled/resolved finished history returns prestart, never traps a new start in the old result', async () => {
  const f = fixture();
  f.native.scan.mockResolvedValue({
    entries: [
      { ...cp('IDLE'), phase: 'RESOLVED' },
      { ...cp('FINISHED_LOCAL'), phase: 'RESOLVED' },
    ],
    nextCursor: null,
  });
  await f.controller.open();
  expect(f.controller.state().checkpoint).toBeNull();
  await f.controller.start();
  expect(f.service.start).toHaveBeenCalledWith(pet);
});
test('late older GET cannot undo a newer local finish and same-context accepted receipt', async () => {
  const f = fixture();
  await f.controller.start();
  let resolve!: (c: WalkProductCheckpoint) => void;
  f.service.get.mockReturnValueOnce(
    new Promise(r => {
      resolve = r;
    }),
  );
  const sync = f.controller.sync();
  await new Promise<void>(r => setImmediate(r));
  await f.controller.control('FINISH');
  resolve({ ...cp(), revision: '1' });
  await sync;
  expect(f.controller.state().checkpoint?.runtimeState).toBe('FINISHED_LOCAL');
});
test('offline finished session is discoverable after reopening and same-ID sync updates its result without auto start/Memory', async () => {
  const f = fixture();
  f.native.scan.mockResolvedValueOnce({
    entries: [cp('FINISHED_LOCAL')],
    nextCursor: null,
  });
  await f.controller.open();
  expect(f.controller.state().checkpoint).toMatchObject({
    clientSessionId: id,
    phase: 'FINISH_PENDING',
  });
  const settled = { ...cp('FINISHED_LOCAL'), phase: 'RESOLVED' as const };
  f.service.get.mockResolvedValueOnce(settled);
  await f.controller.sync();
  expect(f.service.get).toHaveBeenCalledWith(id);
  expect(f.controller.state().checkpoint).toBe(settled);
  expect(f.service.start).not.toHaveBeenCalled();
  expect(f.service.control).not.toHaveBeenCalled();
});
test('same-owner foreground cycle retains exact projection/snapshot; true boundary clears it and old observer is fenced', async () => {
  const f = fixture();
  await f.controller.start();
  const page = f.controller.state().page,
    snapshotBefore = f.controller.state().snapshot;
  f.controller.invalidate(true);
  expect(f.controller.state().page).toBe(page);
  expect(f.controller.state().snapshot).toBe(snapshotBefore);
  await f.controller.open();
  expect(f.controller.state().page).toBe(page);
  f.controller.invalidate();
  expect(f.controller.state().page).toBeNull();
  f.emit();
  expect(f.controller.state().snapshot).toBeNull();
});
test('stable typed code is used, unexpected plain message never becomes a product branch', async () => {
  const f = fixture();
  f.service.start.mockRejectedValueOnce(
    new Error('WALK_LOCATION_PERMISSION_REQUIRED'),
  );
  await f.controller.start();
  expect(f.controller.state().error).toBe('WALK_SERVICE_UNAVAILABLE');
  f.service.start.mockRejectedValueOnce({
    code: 'WALK_LOCATION_PERMISSION_REQUIRED',
    message: 'private server detail',
  });
  await f.controller.start();
  expect(f.controller.state().error).toBe('WALK_LOCATION_PERMISSION_REQUIRED');
});
