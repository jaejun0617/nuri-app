jest.mock('../src/services/supabase/client', () => ({
  supabase: { rpc: jest.fn(), from: jest.fn() },
}));
import { supabase } from '../src/services/supabase/client';
import { fetchActiveWalkReceipt } from '../src/services/walk/server/supabaseWalkRepository';
const session = '11111111-1111-4111-8111-111111111111';
const pet = '22222222-2222-4222-8222-222222222222';
const rpc = supabase.rpc as jest.Mock;
const from = supabase.from as jest.Mock;
beforeEach(() => jest.clearAllMocks());
function lookup(data: unknown, error: unknown = null) {
  const query = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  };
  from.mockReturnValue(query);
  return query;
}
test('second-device discovery is bounded, owner RLS applies, and no Native action starts', async () => {
  const query = lookup({ client_session_id: session });
  rpc.mockResolvedValue({ data: [{
    clientSessionId: session, petId: pet, state: 'ACTIVE', payloadDigest: null,
    deletedAt: null, recordClaimExists: false, summary: null, rejectionCode: null,
  }], error: null });
  await expect(fetchActiveWalkReceipt()).resolves.toMatchObject({ clientSessionId: session, state: 'ACTIVE' });
  expect(from).toHaveBeenCalledWith('walk_sessions');
  expect(query.select).toHaveBeenCalledWith('client_session_id');
  expect(query.eq).toHaveBeenCalledWith('state', 'ACTIVE');
  expect(query.limit).toHaveBeenCalledWith(1);
  expect(rpc).toHaveBeenCalledWith('get_walk_sessions_v1', { p_client_session_ids: [session] });
});
test('no active reservation returns null without a follow-up RPC', async () => {
  lookup(null);
  await expect(fetchActiveWalkReceipt()).resolves.toBeNull();
  expect(rpc).not.toHaveBeenCalled();
});
test('lost lookup remains retryable and never exposes backend message', async () => {
  lookup(null, { message: 'private detail' });
  await expect(fetchActiveWalkReceipt()).rejects.toMatchObject({ code: 'WALK_SYNC_UNKNOWN_RETRYABLE' });
});
test('cancellation racing discovery returns the authoritative final receipt', async () => {
  lookup({ client_session_id: session });
  rpc.mockResolvedValue({ data: [{
    clientSessionId: session, petId: pet, state: 'NOT_ACCEPTED_FINAL', payloadDigest: null,
    deletedAt: '2026-10-20T00:00:00.000Z', recordClaimExists: false, summary: null, rejectionCode: null,
  }], error: null });
  await expect(fetchActiveWalkReceipt()).resolves.toMatchObject({ state: 'NOT_ACCEPTED_FINAL' });
});
