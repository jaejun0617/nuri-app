import { walkFinalDeletionRepository } from '../src/services/walk/server/supabaseWalkFinalDeletionRepository';

const mockRpc = jest.fn();
jest.mock('../src/services/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock('../src/services/supabase/config', () => ({
  SUPABASE_URL: 'https://grmekesqoydylqmyvfke.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_aaaaaaaaaaaaaaaaaaaaaaaa',
}));
const intent = {
  requestId: '12345678-1234-4234-8234-123456789abc',
  purpose: 'PET_FINAL' as const,
  petId: '22345678-1234-4234-8234-123456789abc',
  capability: 'a'.repeat(64),
};
const pending = {
  version: 1,
  requestId: intent.requestId,
  purpose: intent.purpose,
  resourceBinding: 'b'.repeat(64),
  state: 'PENDING',
  registeredAt: '2026-10-21T01:00:00.000Z',
  confirmedAt: null,
  acknowledgedAt: null,
};
const final = {
  ...pending,
  state: 'FINAL',
  confirmedAt: '2026-10-21T02:00:00.000Z',
};
const originalFetch = global.fetch;
let fetchMock: jest.Mock;
beforeEach(() => {
  jest.useFakeTimers();
  mockRpc.mockReset();
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});
afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});
test('production recover/ACK use actual fetch with no Authorization/session client', async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: true, json: async () => final })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...final,
        state: 'ACKNOWLEDGED',
        acknowledgedAt: '2026-10-21T03:00:00.000Z',
      }),
    });
  const proof = await walkFinalDeletionRepository.recover(intent);
  await walkFinalDeletionRepository.ack(intent, proof, true);
  expect(mockRpc).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  for (const [, options] of fetchMock.mock.calls) {
    expect(options.headers).toEqual({
      apikey: 'sb_publishable_aaaaaaaaaaaaaaaaaaaaaaaa',
      'Content-Type': 'application/json',
    });
    expect(options.credentials).toBe('omit');
    expect(options.cache).toBe('no-store');
    expect(options.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(options.body)).toEqual({
      p_request_id: intent.requestId,
      p_purpose: intent.purpose,
      p_capability: intent.capability,
    });
  }
  expect(jest.getTimerCount()).toBe(0);
});
test('prepare deadline aborts and a retry keeps the exact durable identity/capability', async () => {
  const signals: AbortSignal[] = [];
  mockRpc.mockImplementation(() => ({
    abortSignal: (s: AbortSignal) => {
      signals.push(s);
      return new Promise(() => undefined);
    },
  }));
  const request = walkFinalDeletionRepository.prepare(
    intent,
    new AbortController().signal,
  );
  const failure = request.then(
    () => 'unexpected_success',
    (error: unknown) => error,
  );
  await jest.advanceTimersByTimeAsync(15000);
  expect(await failure).toMatchObject({
    code: 'WALK_DELETE_UNKNOWN_RETRYABLE',
    preserveIntent: true,
  });
  expect(signals[0].aborted).toBe(true);
  const parameters = mockRpc.mock.calls[0][1];
  mockRpc.mockImplementation(() => ({
    abortSignal: () => Promise.resolve({ data: pending, error: null }),
  }));
  await walkFinalDeletionRepository.prepare(
    intent,
    new AbortController().signal,
  );
  expect(mockRpc.mock.calls[1][1]).toEqual(parameters);
  expect(jest.getTimerCount()).toBe(0);
});
test('owner/context abort rejects late prepare; pre-abort performs zero calls', async () => {
  let finish: (r: { data: unknown; error: null }) => void = () => undefined;
  mockRpc.mockImplementation(() => ({
    abortSignal: () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  }));
  const c = new AbortController();
  const request = walkFinalDeletionRepository.prepare(intent, c.signal);
  const failure = request.then(
    () => 'unexpected_success',
    (error: unknown) => error,
  );
  c.abort();
  expect(await failure).toMatchObject({ preserveIntent: true });
  finish({ data: pending, error: null });
  await Promise.resolve();
  const before = mockRpc.mock.calls.length;
  await expect(
    walkFinalDeletionRepository.prepare(intent, c.signal),
  ).rejects.toMatchObject({ preserveIntent: true });
  expect(mockRpc).toHaveBeenCalledTimes(before);
  expect(jest.getTimerCount()).toBe(0);
});
test('capability timeout preserves params on retry and cannot fall back to authenticated RPC', async () => {
  fetchMock.mockImplementation(() => new Promise(() => undefined));
  const request = walkFinalDeletionRepository.recover(intent);
  const failure = request.then(
    () => 'unexpected_success',
    (error: unknown) => error,
  );
  await jest.advanceTimersByTimeAsync(15000);
  expect(await failure).toMatchObject({
    preserveIntent: true,
    retryable: true,
  });
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  const body = fetchMock.mock.calls[0][1].body;
  fetchMock.mockResolvedValue({ ok: true, json: async () => final });
  await walkFinalDeletionRepository.recover(intent);
  expect(fetchMock.mock.calls[1][1].body).toBe(body);
  expect(mockRpc).not.toHaveBeenCalled();
});
