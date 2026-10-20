import { walkRequest } from '../src/services/walk/product/requests';
import { createWalkContextFence } from '../src/services/walk/product/context';
import {
  walkDistance,
  walkDuration,
  walkProgressPercent,
  walkSourceCopy,
  walkResultStatusCopy,
} from '../src/services/walk/product/presentation';

const scope = { ownerId: 'owner', petId: 'pet', current: () => true };
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
};
describe('Walk scoped bounded requests', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('pre-aborted mutation has zero operation calls', async () => {
    const controller = new AbortController();
    controller.abort();
    const call = jest.fn();
    await expect(
      walkRequest(scope, call, controller.signal),
    ).rejects.toMatchObject({ code: 'WALK_PRODUCT_CONTEXT_CHANGED' });
    expect(call).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
  it.each([0, -1, 30001, 1.5])(
    'rejects invalid deadline %s before calling transport',
    async timeout => {
      const call = jest.fn();
      await expect(
        walkRequest(scope, call, undefined, timeout),
      ).rejects.toMatchObject({ code: 'WALK_INVALID_RPC_DEADLINE' });
      expect(call).not.toHaveBeenCalled();
    },
  );
  it('timeout discards late response and cleans timer/listener', async () => {
    const d = deferred<string>(),
      c = new AbortController();
    const remove = jest.spyOn(c.signal, 'removeEventListener');
    const continuation = jest.fn();
    const result = walkRequest(scope, () => d.promise, c.signal, 20).then(
      continuation,
      error => error,
    );
    jest.advanceTimersByTime(20);
    await expect(result).resolves.toMatchObject({
      code: 'WALK_SYNC_UNKNOWN_RETRYABLE',
    });
    d.resolve('late');
    await Promise.resolve();
    expect(continuation).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(jest.getTimerCount()).toBe(0);
  });
  it('successful response cleans timer and checks captured scope after await', async () => {
    const d = deferred<string>();
    let current = true;
    const result = walkRequest(
      { ...scope, current: () => current },
      () => d.promise,
    );
    current = false;
    d.resolve('wrong owner');
    await expect(result).rejects.toMatchObject({
      code: 'WALK_PRODUCT_CONTEXT_CHANGED',
    });
    expect(jest.getTimerCount()).toBe(0);
  });
  it('abort during read cancels UI continuation', async () => {
    const c = new AbortController(),
      d = deferred<string>();
    const result = walkRequest(scope, () => d.promise, c.signal);
    c.abort();
    await expect(result).rejects.toMatchObject({
      code: 'WALK_PRODUCT_CONTEXT_CHANGED',
    });
    d.resolve('late');
    expect(jest.getTimerCount()).toBe(0);
  });
});
describe('Walk selected and pinned lifecycle fencing', () => {
  const base = {
    ownerId: 'owner-a',
    selectedPetId: 'pet-a',
    petIds: ['pet-a', 'pet-b'],
    foreground: true,
  };
  it('same owner token refresh and unrelated pet object updates preserve reads', () => {
    const f = createWalkContextFence(base),
      a = f.capture('pet-a', 'SELECTED')!;
    expect(f.update({ ...base, petIds: [...base.petIds] })).toBe(false);
    expect(a.current()).toBe(true);
  });
  it('selected A→B→A discards old A and provides new A generation', () => {
    const f = createWalkContextFence(base),
      old = f.capture('pet-a', 'SELECTED')!;
    f.update({ ...base, selectedPetId: 'pet-b' });
    f.update(base);
    expect(old.current()).toBe(false);
    const fresh = f.capture('pet-a', 'SELECTED')!;
    expect(fresh.generation).not.toBe(old.generation);
    expect(fresh.current()).toBe(true);
  });
  it('pinned owned session A remains A when selection B', () => {
    const f = createWalkContextFence(base),
      pinned = f.capture('pet-a', 'PINNED')!;
    f.update({ ...base, selectedPetId: 'pet-b' });
    expect(pinned.current()).toBe(true);
    expect(pinned.petId).toBe('pet-a');
  });
  it('owner logout/relogin ABA, removal and background invalidate pinned reads', () => {
    for (const next of [
      { ...base, ownerId: null },
      { ...base, petIds: ['pet-b'] },
      { ...base, foreground: false },
    ]) {
      const f = createWalkContextFence(base),
        a = f.capture('pet-a', 'PINNED')!;
      f.update(next);
      f.update(base);
      expect(a.current()).toBe(false);
    }
  });
});
describe('exact Walk display', () => {
  it('does not narrow unbounded lifetime/level quantities to number', () => {
    expect(walkDistance('18446744073709551614')).toBe('18446744073709551.6 km');
    expect(walkDistance('0')).toBe('0 m');
    expect(walkDuration('3660000')).toBe('1시간 1분');
    expect(
      walkProgressPercent({
        numeratorM: '333333333333333333333',
        denominatorM: '1000000000000000000000',
      }),
    ).toBe(33.33);
  });
  it('session deletion removes verified measurement copy', () => {
    expect(
      walkSourceCopy({
        version: 1,
        source: 'GPS_TRACKED',
        clientSessionId: 'session',
        petId: 'pet',
        sessionDeleted: true,
        summary: null,
        memoryId: 'memory',
        recordState: 'RECORDED',
      }),
    ).not.toMatch(/km|분/);
  });
  it('pending/rejected copy does not confirm reward or distance', () => {
    expect(walkResultStatusCopy('SYNC_PENDING')).toContain('연결 후 다시 확인');
    expect(walkResultStatusCopy('SYNC_PENDING')).not.toContain('연결되면');
    expect(walkResultStatusCopy('REJECTED_SERVER')).toContain('적립되지');
  });
});
