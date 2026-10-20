jest.mock(
  '../src/services/walk/server/supabaseWalkFinalDeletionRepository',
  () => ({
    walkFinalDeletionRepository: {
      prepare: jest.fn(),
      recover: jest.fn(),
      ack: jest.fn(),
    },
  }),
);
jest.mock('../src/services/walk/product/invalidation', () => ({
  purgeWalkProductAfterFinalDeletion: jest.fn(async () => undefined),
}));
jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      refreshSession: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));
import { AppState, NativeModules, Platform } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import { usePetStore } from '../src/store/petStore';
import {
  captureWalkFinalDeletion,
  resumeConfirmedWalkFinalDeletions,
  armWalkFinalDeletion,
  disposeWalkFinalDeletion,
  queueConfirmedWalkFinalDeletion,
  releaseWalkFinalDeletion,
  noteRestorableWalkDeletion,
  captureWalkAccountRestoration,
  observeWalkFinalDeletionRecovery,
  bindWalkAccountDeletionRequest,
  type WalkFinalDeletionScope,
} from '../src/services/walk/product/finalDeletion';
import { walkFinalDeletionRepository as server } from '../src/services/walk/server/supabaseWalkFinalDeletionRepository';
import type { WalkFinalDeletionReceipt } from '../src/services/walk/server/finalDeletionRepository';
import { purgeWalkProductAfterFinalDeletion as purge } from '../src/services/walk/product/invalidation';
import { supabase } from '../src/services/supabase/client';
import {
  cancelAccountDeletion,
  type AccountDeletionResult,
} from '../src/services/supabase/auth';

// Synthetic protocol constants only; never a runtime capability or real identity.
const owner = '11111111-1111-4111-8111-111111111111';
const pet = '22222222-2222-4222-8222-222222222222';
const ticket = '33333333-3333-4333-8333-333333333333';
const accountRequest = '55555555-5555-4555-8555-555555555555';
const intent = {
  requestId: ticket,
  purpose: 'PET_FINAL' as const,
  petId: pet,
  capability: 'a'.repeat(64),
};
const proof = {
  version: 1 as const,
  requestId: ticket,
  purpose: 'PET_FINAL' as const,
  resourceBinding: 'b'.repeat(64),
  state: 'PENDING' as const,
  registeredAt: '2026-10-21T00:00:00.000Z',
  confirmedAt: null,
  acknowledgedAt: null,
};
let row: Record<string, unknown>;
let command: jest.Mock;
let proofCommand: jest.Mock;
let registered: WalkFinalDeletionReceipt | null;
let removed: boolean;
let restorationQuery: Record<string, jest.Mock>;
const captures: WalkFinalDeletionScope[] = [];
async function capture(targetPet: string | null = pet) {
  const v = await captureWalkFinalDeletion(owner, targetPet);
  if (!v) throw Error('fixture required');
  captures.push(v);
  return v;
}
function finalProof(): WalkFinalDeletionReceipt {
  if (!registered) throw Error('fixture requires registration');
  return {
    ...registered,
    state: 'FINAL',
    confirmedAt: '2026-10-20T23:59:00.000Z',
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    value: 'active',
    writable: true,
  });
  useAuthStore.setState({
    session: { user: { id: owner } } as NonNullable<
      ReturnType<typeof useAuthStore.getState>['session']
    >,
  });
  usePetStore.setState({ pets: [{ id: pet, name: 'synthetic' }] });
  row = {
    version: 2,
    ticket,
    ownerId: owner,
    petId: pet,
    intent,
    confirmed: false,
    armed: false,
    proofState: null,
    nativeDone: false,
    outcome: 'NOT_STARTED',
    attempt: '0',
  };
  registered = null;
  removed = false;
  restorationQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    abortSignal: jest.fn(),
    maybeSingle: jest.fn(async () => ({ data: null, error: null })),
  };
  for (const name of ['select', 'eq', 'abortSignal'])
    restorationQuery[name].mockReturnValue(restorationQuery);
  (supabase.from as unknown as jest.Mock).mockReturnValue(restorationQuery);
  command = jest.fn(async (op: string) => {
    if (op === 'PENDING') return JSON.stringify(removed ? [] : [row]);
    if (op === 'READ') return JSON.stringify(row);
    if (op === 'ARM') {
      delete row.restoreIntent;
      delete row.accountRequestId;
      row = {
        ...row,
        armed: true,
        outcome: 'UNKNOWN',
        attempt: String(Number(row.attempt) + 1),
      };
    }
    if (op === 'STEP') {
      row = { ...row, nativeDone: true };
      return 'DONE';
    }
    if (op === 'ACK') removed = true;
    return 'OK';
  });
  proofCommand = jest.fn(async (op: string, _id: string, input: string) => {
    const data = JSON.parse(input);
    if (op === 'RELEASE') {
      if (data.attempt !== row.attempt)
        throw { code: 'WALK_FINAL_CLEANUP_INVALID' };
      delete row.restoreIntent;
      row = { ...row, armed: false, outcome: data.outcome };
    } else if (op === 'RESTORE_INTENT') {
      if (row.accountRequestId && row.accountRequestId !== data.requestId)
        throw { code: 'WALK_FINAL_CLEANUP_INVALID' };
      row = { ...row, restoreIntent: data };
    } else if (op === 'ACCOUNT_REQUEST')
      row = { ...row, accountRequestId: data.requestId };
    else
      row = {
        ...row,
        intent: {
          ...(row.intent as typeof intent),
          resourceBinding: data.resourceBinding,
        },
        proofState: data.state,
        confirmed: op === 'CONFIRM' || row.confirmed,
      };
    return 'OK';
  });
  NativeModules.NuriWalk = {
    productGetBinding: jest.fn(async () => '1'),
    productCommand: jest.fn(async () => ticket),
    finalCleanupCommand: command,
    finalCleanupProof: proofCommand,
  };
  jest.mocked(server.recover).mockImplementation(async () => {
    if (!registered) throw { code: 'WALK_DELETE_RECEIPT_UNAVAILABLE' };
    return registered;
  });
  jest.mocked(server.prepare).mockImplementation(async () => {
    registered = proof;
    return proof;
  });
  jest.mocked(server.ack).mockImplementation(async (_input, p) => {
    registered = {
      ...p,
      state: 'ACKNOWLEDGED',
      acknowledgedAt: '2026-10-20T23:58:00.000Z',
    };
    return registered;
  });
});
afterEach(() => {
  for (const c of captures.splice(0)) disposeWalkFinalDeletion(c);
  delete NativeModules.NuriWalk;
});
test('explicit capture persists registration before returning permission for a destructive call', async () => {
  await capture();
  expect(server.prepare).toHaveBeenCalledTimes(1);
  expect(command.mock.calls.some(call => call[0] === 'READ')).toBe(true);
});
test('restart reconciles an unconfirmed registered identity without Auth or destructive retry', async () => {
  row = {
    ...row,
    intent: { ...intent, resourceBinding: proof.resourceBinding },
    proofState: 'PENDING',
  };
  registered = proof;
  useAuthStore.setState({ session: null });
  usePetStore.setState({
    pets: [{ id: '44444444-4444-4444-8444-444444444444', name: 'other' }],
    selectedPetId: '44444444-4444-4444-8444-444444444444',
  });
  await resumeConfirmedWalkFinalDeletions();
  expect(server.recover).toHaveBeenCalledTimes(1);
  const recovered = jest.mocked(server.recover).mock.calls[0][0];
  expect(
    recovered.requestId === ticket &&
      recovered.petId === pet &&
      recovered.capability === intent.capability &&
      recovered.purpose === intent.purpose &&
      recovered.resourceBinding === proof.resourceBinding,
  ).toBe(true);
  expect(server.prepare).not.toHaveBeenCalled();
  expect(supabase.auth.getUser).not.toHaveBeenCalled();
  expect(supabase.auth.getSession).not.toHaveBeenCalled();
  expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  expect(purge).not.toHaveBeenCalled();
  expect(command.mock.calls.some(c => c[0] === 'ARM')).toBe(false);
});
test('remote success + lost response + reconstructed pending journal recovers FINAL without JWT and cleans exact A while B remains signed in', async () => {
  const c = await capture();
  await armWalkFinalDeletion(c);
  row = JSON.parse(JSON.stringify(row));
  registered = finalProof();
  const b = {
    user: { id: '44444444-4444-4444-8444-444444444444' },
  } as NonNullable<ReturnType<typeof useAuthStore.getState>['session']>;
  useAuthStore.setState({ session: b });
  usePetStore.setState({ pets: [], selectedPetId: null });
  await resumeConfirmedWalkFinalDeletions();
  expect(purge).toHaveBeenCalledWith(owner, pet, 'PET_FINAL');
  expect(useAuthStore.getState().session).toBe(b);
  expect(removed).toBe(true);
  expect(supabase.auth.getUser).not.toHaveBeenCalled();
  expect(command.mock.calls.filter(call => call[0] === 'ARM')).toHaveLength(1);
  expect(server.prepare).toHaveBeenCalledTimes(1);
});
test('PENDING/grace/empty state never erases or promotes proof; explicit authoritative rollback releases only the fence', async () => {
  const c = await capture();
  await armWalkFinalDeletion(c);
  expect(await queueConfirmedWalkFinalDeletion(c)).toBe(false);
  expect(row.armed).toBe(true);
  expect(purge).not.toHaveBeenCalled();
  await releaseWalkFinalDeletion(c, { outcome: 'ROLLED_BACK', code: '23503' });
  expect(row.armed).toBe(false);
  expect(row.confirmed).toBe(false);
  expect(removed).toBe(false);
  await armWalkFinalDeletion(c);
  expect(row.armed).toBe(true);
});
test('registration response loss retries same Native identity/capability via recover, never a replacement prepare', async () => {
  jest.mocked(server.prepare).mockImplementationOnce(async () => {
    registered = proof;
    throw { code: 'WALK_DELETE_UNKNOWN_RETRYABLE' };
  });
  await expect(capture()).rejects.toMatchObject({
    code: 'WALK_DELETE_UNKNOWN_RETRYABLE',
  });
  const original = JSON.stringify(row.intent);
  await capture();
  expect(JSON.stringify(row.intent).startsWith(original.slice(0, -1))).toBe(
    true,
  );
  expect(server.prepare).toHaveBeenCalledTimes(1);
});
test('owner ABA aborts pending prepare and fences late success before registration/arming/destructive continuation', async () => {
  let resolve!: (p: WalkFinalDeletionReceipt) => void;
  jest.mocked(server.prepare).mockReturnValueOnce(
    new Promise(r => {
      resolve = r;
    }),
  );
  const work = capture();
  const observed = work.catch(e => e);
  await new Promise<void>(r => setImmediate(r));
  const a = useAuthStore.getState().session;
  useAuthStore.setState({ session: null });
  useAuthStore.setState({ session: a });
  const signal = jest.mocked(server.prepare).mock.calls[0][1];
  expect(signal.aborted).toBe(true);
  resolve(proof);
  expect((await observed).code).toBe('WALK_PRODUCT_CONTEXT_CHANGED');
  expect(proofCommand).not.toHaveBeenCalled();
  expect(command.mock.calls.some(call => call[0] === 'ARM')).toBe(false);
});
test('confirmation IO failure retains proof watch and prevents JS erasure or ACK', async () => {
  const c = await capture();
  registered = finalProof();
  proofCommand
    .mockImplementationOnce(async () => 'OK')
    .mockRejectedValueOnce({ code: 'WALK_FINAL_CLEANUP_PENDING' });
  expect(await queueConfirmedWalkFinalDeletion(c)).toBe(false);
  expect(purge).not.toHaveBeenCalled();
  expect(server.ack).not.toHaveBeenCalled();
  expect(removed).toBe(false);
});
test('ACK response loss replays ACKNOWLEDGED after durable local completion without an invalid second server ack', async () => {
  const c = await capture();
  registered = finalProof();
  jest.mocked(server.ack).mockImplementationOnce(async (_input, p) => {
    registered = {
      ...p,
      state: 'ACKNOWLEDGED',
      acknowledgedAt: '2026-10-20T23:58:00.000Z',
    };
    throw { code: 'WALK_DELETE_UNKNOWN_RETRYABLE' };
  });
  expect(await queueConfirmedWalkFinalDeletion(c)).toBe(false);
  expect(row.nativeDone).toBe(true);
  expect(removed).toBe(false);
  await resumeConfirmedWalkFinalDeletions();
  expect(server.ack).toHaveBeenCalledTimes(1);
  expect(removed).toBe(true);
});
test('empty and legacy unregistered journals cause zero network/Auth and retain unknown data', async () => {
  command.mockImplementation(async op =>
    op === 'PENDING'
      ? JSON.stringify([
          {
            version: 1,
            ticket,
            ownerId: owner,
            petId: pet,
            confirmed: false,
            nativeDone: false,
          },
        ])
      : 'OK',
  );
  await resumeConfirmedWalkFinalDeletions();
  command.mockResolvedValue('[]');
  await resumeConfirmedWalkFinalDeletions();
  expect(server.recover).not.toHaveBeenCalled();
  expect(server.prepare).not.toHaveBeenCalled();
  expect(purge).not.toHaveBeenCalled();
});
test('known account grace releases only collection fencing, retaining the same watch through logout/restore and a later explicit attempt', async () => {
  row = {
    ...row,
    petId: null,
    intent: { ...intent, petId: null, purpose: 'ACCOUNT_FINAL' },
  };
  const accountProof = { ...proof, purpose: 'ACCOUNT_FINAL' as const };
  jest.mocked(server.prepare).mockImplementationOnce(async () => {
    registered = accountProof;
    return accountProof;
  });
  const c = await capture(null);
  await armWalkFinalDeletion(c);
  await noteRestorableWalkDeletion(c, {
    status: 'completed',
    actualStatus: 'pending_grace_period',
    canRestore: true,
  } as AccountDeletionResult);
  expect(row.armed).toBe(false);
  expect(row.outcome).toBe('RESTORABLE');
  expect(row.confirmed).toBe(false);
  expect(removed).toBe(false);
  expect(purge).not.toHaveBeenCalled();
  disposeWalkFinalDeletion(c);
  useAuthStore.setState({ session: null });
  await resumeConfirmedWalkFinalDeletions();
  expect(row.armed).toBe(false);
  expect(purge).not.toHaveBeenCalled();
  useAuthStore.setState({
    session: { user: { id: owner } } as NonNullable<
      ReturnType<typeof useAuthStore.getState>['session']
    >,
  });
  const retry = await capture(null);
  await armWalkFinalDeletion(retry);
  expect(retry.ticket === c.ticket).toBe(true);
  expect(server.prepare).toHaveBeenCalledTimes(1);
});
test('background during prepare and explicit disposal fence a late continuation without destructive arming', async () => {
  let resolve!: (p: WalkFinalDeletionReceipt) => void;
  jest.mocked(server.prepare).mockReturnValueOnce(
    new Promise(r => {
      resolve = r;
    }),
  );
  const pending = capture().catch(e => e);
  await new Promise<void>(r => setImmediate(r));
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'background',
  });
  resolve(proof);
  expect((await pending).code).toBe('WALK_PRODUCT_CONTEXT_CHANGED');
  expect(proofCommand).not.toHaveBeenCalled();
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'active',
  });
  const c = await capture();
  disposeWalkFinalDeletion(c);
  await expect(armWalkFinalDeletion(c)).rejects.toMatchObject({
    code: 'WALK_FINAL_CLEANUP_INVALID',
  });
  expect(row.armed).toBe(false);
});
test('registration readback failure prevents destructive continuation and retains same durable identity', async () => {
  proofCommand.mockRejectedValueOnce({ code: 'WALK_FINAL_CLEANUP_PENDING' });
  await expect(capture()).rejects.toMatchObject({
    code: 'WALK_FINAL_CLEANUP_PENDING',
  });
  expect(row.armed).toBe(false);
  expect(purge).not.toHaveBeenCalled();
  await capture();
  expect(server.prepare).toHaveBeenCalledTimes(1);
});
test('malformed Native JSON maps to a stable code without reflecting journal/capability bytes', async () => {
  command.mockResolvedValueOnce('not-json-sensitive-fixture');
  await expect(capture()).rejects.toMatchObject({
    code: 'WALK_FINAL_CLEANUP_INVALID',
    message: 'WALK_FINAL_CLEANUP_INVALID',
  });
  expect(server.recover).not.toHaveBeenCalled();
  expect(server.prepare).not.toHaveBeenCalled();
});
test('process death BEFORE grace release: existing explicit cancel receipt releases reconstructed exact account attempt, never erases or starts GPS', async () => {
  row = {
    ...row,
    petId: null,
    intent: { ...intent, petId: null, purpose: 'ACCOUNT_FINAL' },
  };
  jest.mocked(server.prepare).mockImplementationOnce(async () => {
    registered = { ...proof, purpose: 'ACCOUNT_FINAL' };
    return registered;
  });
  const c = await capture(null);
  await armWalkFinalDeletion(c);
  disposeWalkFinalDeletion(c);
  row = JSON.parse(JSON.stringify(row));
  useAuthStore.setState({ session: null });
  await resumeConfirmedWalkFinalDeletions();
  expect(row.armed).toBe(true);
  expect(row.outcome).toBe('UNKNOWN');
  useAuthStore.setState({
    session: { user: { id: owner } } as NonNullable<
      ReturnType<typeof useAuthStore.getState>['session']
    >,
  });
  jest.mocked(supabase.rpc).mockResolvedValueOnce({
    count: null,
    status: 200,
    statusText: 'OK',
    data: {
      request_id: accountRequest,
      status: 'cancelled',
      actual_status: 'cancelled',
      can_restore: false,
    },
    error: null,
  });
  const result = await cancelAccountDeletion(accountRequest);
  expect(result.actualStatus).toBe('cancelled');
  expect(row.armed).toBe(false);
  expect(row.outcome).toBe('RESTORED');
  expect(row.confirmed).toBe(false);
  expect(purge).not.toHaveBeenCalled();
  expect(removed).toBe(false);
  const retry = await capture(null);
  await armWalkFinalDeletion(retry);
  expect(row.armed).toBe(true);
  expect(row.attempt).toBe('2');
  expect(supabase.auth.getUser).not.toHaveBeenCalled();
});
test('late restore cannot release a newer deletion attempt or touch owner B after an ABA', async () => {
  row = {
    ...row,
    petId: null,
    intent: { ...intent, petId: null, purpose: 'ACCOUNT_FINAL' },
  };
  jest.mocked(server.prepare).mockImplementationOnce(async () => {
    registered = { ...proof, purpose: 'ACCOUNT_FINAL' };
    return registered;
  });
  const c = await capture(null);
  await armWalkFinalDeletion(c);
  const restore = await captureWalkAccountRestoration(accountRequest);
  if (!restore) throw Error('fixture required');
  await armWalkFinalDeletion(c);
  const result = {
    requestId: accountRequest,
    status: 'cancelled',
    actualStatus: 'cancelled',
    canRestore: false,
  } as AccountDeletionResult;
  await expect(restore.complete(result)).rejects.toMatchObject({
    code: 'WALK_FINAL_CLEANUP_INVALID',
  });
  expect(row.armed).toBe(true);
  expect(row.attempt).toBe('2');
  const b = {
    user: { id: '44444444-4444-4444-8444-444444444444' },
  } as NonNullable<ReturnType<typeof useAuthStore.getState>['session']>;
  useAuthStore.setState({ session: b });
  await expect(restore.complete(result)).rejects.toMatchObject({
    code: 'WALK_PRODUCT_CONTEXT_CHANGED',
  });
  expect(useAuthStore.getState().session).toBe(b);
  expect(purge).not.toHaveBeenCalled();
  restore.dispose();
});

async function accountWatch() {
  row = {
    ...row,
    petId: null,
    intent: { ...intent, petId: null, purpose: 'ACCOUNT_FINAL' },
  };
  jest.mocked(server.prepare).mockImplementationOnce(async () => {
    registered = { ...proof, purpose: 'ACCOUNT_FINAL' };
    return registered;
  });
  const c = await capture(null);
  await armWalkFinalDeletion(c);
  await bindWalkAccountDeletionRequest(c, {
    requestId: accountRequest,
  } as AccountDeletionResult);
  return c;
}
test('remote cancel success lost BEFORE durable RELEASE recovers exact durable restoration intent after UI gate clears, without replaying cancel', async () => {
  await accountWatch();
  const restore = await captureWalkAccountRestoration(accountRequest);
  expect(row.restoreIntent).toEqual({
    requestId: accountRequest,
    attempt: '1',
  });
  restore?.dispose();
  row = JSON.parse(JSON.stringify(row));
  useAuthStore.setState({ accountDeletionGate: null });
  restorationQuery.maybeSingle.mockResolvedValue({
    data: { id: accountRequest, status: 'cancelled' },
    error: null,
  });
  await resumeConfirmedWalkFinalDeletions();
  expect(restorationQuery.eq).toHaveBeenCalledWith('id', accountRequest);
  expect(restorationQuery.eq).toHaveBeenCalledWith('user_id', owner);
  expect(row.armed).toBe(false);
  expect(row.outcome).toBe('RESTORED');
  expect(row.restoreIntent).toBeUndefined();
  expect(row.confirmed).toBe(false);
  expect(purge).not.toHaveBeenCalled();
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(supabase.auth.getUser).not.toHaveBeenCalled();
  expect(supabase.auth.getSession).not.toHaveBeenCalled();
});
test('missing/pending/denied restoration rows never infer restore, and owner B does not query A authority', async () => {
  await accountWatch();
  (await captureWalkAccountRestoration(accountRequest))?.dispose();
  for (const result of [
    { data: null, error: null },
    {
      data: { id: accountRequest, status: 'pending_grace_period' },
      error: null,
    },
    { data: null, error: { code: '42501' } },
  ]) {
    restorationQuery.maybeSingle.mockResolvedValueOnce(result);
    await resumeConfirmedWalkFinalDeletions();
    expect(row.armed).toBe(true);
  }
  restorationQuery.maybeSingle.mockClear();
  useAuthStore.setState({
    session: {
      user: { id: '44444444-4444-4444-8444-444444444444' },
    } as NonNullable<ReturnType<typeof useAuthStore.getState>['session']>,
  });
  await resumeConfirmedWalkFinalDeletions();
  expect(restorationQuery.maybeSingle).not.toHaveBeenCalled();
  expect(purge).not.toHaveBeenCalled();
});
test('restoration-intent promotion failure blocks cancel BEFORE remote call, preserving retry identity', async () => {
  await accountWatch();
  proofCommand.mockRejectedValueOnce({ code: 'WALK_FINAL_CLEANUP_PENDING' });
  await expect(cancelAccountDeletion(accountRequest)).rejects.toMatchObject({
    code: 'WALK_FINAL_CLEANUP_PENDING',
  });
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(row.armed).toBe(true);
  expect(removed).toBe(false);
});
test('a stale global restore request cannot be bound to a different active account deletion request', async () => {
  await accountWatch();
  await expect(
    captureWalkAccountRestoration('66666666-6666-4666-8666-666666666666'),
  ).rejects.toMatchObject({ code: 'WALK_FINAL_CLEANUP_INVALID' });
  expect(row.armed).toBe(true);
  expect(row.accountRequestId).toBe(accountRequest);
  expect(supabase.rpc).not.toHaveBeenCalled();
});
test('restoration RLS read has a bounded deadline and late/ABA completions cannot release a newer context', async () => {
  await accountWatch();
  (await captureWalkAccountRestoration(accountRequest))?.dispose();
  jest.useFakeTimers();
  let resolve!: (value: unknown) => void;
  restorationQuery.maybeSingle.mockReturnValueOnce(
    new Promise(r => {
      resolve = r;
    }),
  );
  try {
    const flight = resumeConfirmedWalkFinalDeletions();
    const observed = flight.catch(e => e);
    await jest.advanceTimersByTimeAsync(15001);
    expect((await observed).code).toBe('WALK_FINAL_CLEANUP_PENDING');
    expect(row.armed).toBe(true);
    resolve({ data: { id: accountRequest, status: 'cancelled' }, error: null });
    await Promise.resolve();
    expect(row.armed).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});
test('mount without Auth then owner-ready in same foreground retries exact restoration; observer cleanup adds no later work', async () => {
  await accountWatch();
  (await captureWalkAccountRestoration(accountRequest))?.dispose();
  useAuthStore.setState({ session: null });
  restorationQuery.maybeSingle.mockResolvedValue({
    data: { id: accountRequest, status: 'cancelled' },
    error: null,
  });
  const stop = observeWalkFinalDeletionRecovery(jest.fn());
  await new Promise<void>(r => setImmediate(r));
  expect(restorationQuery.maybeSingle).not.toHaveBeenCalled();
  useAuthStore.setState({
    session: { user: { id: owner } } as NonNullable<
      ReturnType<typeof useAuthStore.getState>['session']
    >,
  });
  await new Promise<void>(r => setImmediate(r));
  expect(row.armed).toBe(false);
  expect(row.outcome).toBe('RESTORED');
  expect(server.prepare).toHaveBeenCalledTimes(1);
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(supabase.auth.getSession).not.toHaveBeenCalled();
  stop();
  const reads = restorationQuery.maybeSingle.mock.calls.length;
  useAuthStore.setState({ session: null });
  useAuthStore.setState({
    session: { user: { id: owner } } as NonNullable<
      ReturnType<typeof useAuthStore.getState>['session']
    >,
  });
  await new Promise<void>(r => setImmediate(r));
  expect(restorationQuery.maybeSingle).toHaveBeenCalledTimes(reads);
});
test('owner B/late A restoration read is fenced while foreground remains active', async () => {
  await accountWatch();
  (await captureWalkAccountRestoration(accountRequest))?.dispose();
  let resolve!: (value: unknown) => void;
  restorationQuery.maybeSingle.mockReturnValueOnce(
    new Promise(r => {
      resolve = r;
    }),
  );
  const stop = observeWalkFinalDeletionRecovery(jest.fn());
  await new Promise<void>(r => setImmediate(r));
  const b = {
    user: { id: '44444444-4444-4444-8444-444444444444' },
  } as NonNullable<ReturnType<typeof useAuthStore.getState>['session']>;
  useAuthStore.setState({ session: b });
  resolve({ data: { id: accountRequest, status: 'cancelled' }, error: null });
  await new Promise<void>(r => setImmediate(r));
  expect(row.armed).toBe(true);
  expect(useAuthStore.getState().session).toBe(b);
  expect(purge).not.toHaveBeenCalled();
  stop();
});
