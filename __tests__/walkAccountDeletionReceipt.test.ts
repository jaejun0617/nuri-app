jest.mock('../src/services/supabase/client', () => ({
  supabase: { rpc: jest.fn(), auth: {} },
}));
import { deleteMyAccount } from '../src/services/supabase/auth';
const raw = (status: string) => ({
  request_id: 'synthetic-request',
  status,
  actual_status: status,
  can_restore: status === 'pending_grace_period',
});
const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    rpc: jest.Mock<
      Promise<{ data: unknown; error: unknown }>,
      [string, Record<string, unknown>?]
    >;
  };
};
const rpc = supabase.rpc;
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());
test('created account request must be durably bound before the destructive RPC; local bind failure never dispatches it', async () => {
  rpc.mockResolvedValueOnce({ data: raw('requested'), error: null });
  const bind = jest.fn(async () => {
    throw { code: 'WALK_FINAL_CLEANUP_PENDING' };
  });
  await expect(deleteMyAccount({ onRequest: bind })).rejects.toMatchObject({
    code: 'WALK_FINAL_CLEANUP_PENDING',
  });
  expect(bind).toHaveBeenCalledWith(
    expect.objectContaining({ requestId: 'synthetic-request' }),
  );
  expect(rpc.mock.calls.map(c => c[0])).toEqual([
    'create_account_deletion_request',
  ]);
});
test('authoritative final receipt is returned even if scoped cleanup never resolves or throws', async () => {
  for (const cleanup of [
    jest.fn(() => new Promise<boolean>(() => undefined)),
    jest.fn(async () => {
      throw Error('local disk failure');
    }),
  ]) {
    rpc
      .mockResolvedValueOnce({ data: raw('requested'), error: null })
      .mockResolvedValueOnce({ data: raw('completed'), error: null });
    const result = await deleteMyAccount({ onResult: cleanup, timeoutMs: 100 });
    expect(result).toMatchObject({
      status: 'completed',
      actualStatus: 'completed',
      walkCleanupPending: true,
    });
    expect(cleanup).toHaveBeenCalledTimes(1);
  }
});
test('restorable grace is not a final purge and has no cleanup-pending warning', async () => {
  rpc
    .mockResolvedValueOnce({ data: raw('requested'), error: null })
    .mockResolvedValueOnce({ data: raw('pending_grace_period'), error: null });
  const cleanup = jest.fn(async () => true);
  const result = await deleteMyAccount({ onResult: cleanup });
  expect(result.status).toBe('pending_grace_period');
  expect(result.walkCleanupPending).toBeUndefined();
  expect(cleanup).not.toHaveBeenCalled();
});
test('compatibility completed with actual grace remains restorable and never dispatches final cleanup', async () => {
  rpc
    .mockResolvedValueOnce({ data: raw('requested'), error: null })
    .mockResolvedValueOnce({
      data: {
        ...raw('completed'),
        actual_status: 'pending_grace_period',
        can_restore: true,
      },
      error: null,
    });
  const cleanup = jest.fn(async () => true);
  const restorable = jest.fn(async () => undefined);
  const result = await deleteMyAccount({
    onResult: cleanup,
    onNonFinalResult: restorable,
  });
  expect(result).toMatchObject({
    status: 'completed',
    actualStatus: 'pending_grace_period',
    canRestore: true,
  });
  expect(result.walkCleanupPending).toBeUndefined();
  expect(cleanup).not.toHaveBeenCalled();
  expect(restorable).toHaveBeenCalledWith(
    expect.objectContaining({
      actualStatus: 'pending_grace_period',
      canRestore: true,
    }),
  );
});
test('late authoritative final receipt after unknown deadline still reaches captured scoped hook, not lookup inference', async () => {
  let resolve!: (value: { data: unknown; error: null }) => void;
  rpc
    .mockResolvedValueOnce({ data: raw('requested'), error: null })
    .mockReturnValueOnce(
      new Promise(r => {
        resolve = r;
      }),
    );
  const cleanup = jest.fn(async () => true);
  const pending = deleteMyAccount({ onResult: cleanup, timeoutMs: 100 });
  await jest.advanceTimersByTimeAsync(101);
  expect((await pending).status).toBe('unknown_pending_confirmation');
  expect(cleanup).not.toHaveBeenCalled();
  resolve({ data: raw('completed'), error: null });
  await Promise.resolve();
  await Promise.resolve();
  expect(cleanup).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'completed' }),
  );
});
