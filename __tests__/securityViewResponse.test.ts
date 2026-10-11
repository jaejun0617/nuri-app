jest.mock('../src/services/supabase/client', () => ({
  supabase: { rpc: jest.fn(), auth: { getSession: jest.fn() } },
}));
import { recordCommunityPostView } from '../src/services/supabase/community';
import { supabase } from '../src/services/supabase/client';

it('preserves the bounded view result without retry or aggregate inflation', async () => {
  jest.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
  jest.mocked(supabase.rpc).mockResolvedValue({ data: [{ counted: false, view_count: 101, viewer_type: 'guest', reason: 'view_limited' }], error: null, count: null, status: 200, statusText: 'OK' });
  expect(await recordCommunityPostView('fixture-post')).toEqual({ counted: false, viewCount: 101, viewerType: 'guest', reason: 'view_limited', dedupeWindowStart: null });
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});
