jest.mock('../src/services/supabase/client', () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));
import { createCommunityReport } from '../src/services/supabase/community';
const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: { rpc: jest.Mock; from: jest.Mock };
};
const params = { targetType: 'post' as const, targetId: 'post', reasonCategory: 'spam' as const, reason: ' reason ' };
beforeEach(() => jest.clearAllMocks());
test('server owns reporter identity and trusted trace', async () => {
  supabase.rpc.mockResolvedValue({ data: { status: 'created' }, error: null });
  expect(await createCommunityReport(params, 'client-supplied-id')).toBe('created');
  expect(supabase.rpc).toHaveBeenCalledWith('community_submit_report_v1', {
    p_target_type: 'post', p_target_id: 'post', p_reason_category: 'spam', p_reason: 'reason',
  });
  expect(supabase.from).not.toHaveBeenCalled();
});
test('duplicates preserve existing contract', async () => {
  supabase.rpc.mockResolvedValue({ data: { status: 'duplicate' }, error: null });
  expect(await createCommunityReport(params, 'actor')).toBe('duplicate');
});
test('rate limit uses stable code without public mutator follow-up', async () => {
  supabase.rpc.mockResolvedValue({ data: { status: 'rate_limited', code: 'COMMUNITY_REPORT_RATE_LIMITED' }, error: null });
  await expect(createCommunityReport(params, 'actor')).rejects.toMatchObject({ code: 'COMMUNITY_REPORT_RATE_LIMITED' });
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});
test('malformed responses are not false success', async () => {
  supabase.rpc.mockResolvedValue({ data: null, error: null });
  await expect(createCommunityReport(params, 'actor')).rejects.toMatchObject({ code: 'COMMUNITY_REPORT_INVALID_RESPONSE' });
});
test('unavailable target has one stable failure without a follow-up query', async () => {
  const error = {
    code: 'PGR02',
    message: '현재 신고할 수 없는 대상이에요.',
    details: '{"app_code":"community_report_target_unavailable"}',
  };
  supabase.rpc.mockResolvedValue({ data: null, error });
  await expect(createCommunityReport(params, 'actor')).rejects.toBe(error);
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  expect(supabase.from).not.toHaveBeenCalled();
});
