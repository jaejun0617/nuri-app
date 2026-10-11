jest.mock('npm:@supabase/supabase-js@2.97.0', () => ({ createClient: jest.fn() }), { virtual: true });
import { processDemandTargets } from '../supabase/functions/_shared/place-enrichment';
const target = { domain: 'hospital', placeId: 'isolated', name: 'QA', address: 'QA', requestedFields: ['phone'] };
function context(leaseOwner = 'server-lease') {
  const query = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  return {
    hardCap: 6000, googleApiKey: null, provider: 'google-places',
    supabase: {
      from: jest.fn(() => query),
      rpc: jest.fn().mockResolvedValueOnce({ data: [{ job_id: 'job', claim_granted: true, lease_owner: leaseOwner, requested_fields: ['phone'] }], error: null })
        .mockResolvedValue({ data: {}, error: null }),
    },
  };
}
test('only forwards the server-issued lease when completing a job', async () => {
  const input = context();
  await processDemandTargets(input, [target]);
  expect(input.supabase.rpc).toHaveBeenNthCalledWith(1, 'claim_nuri_place_enrichment_job_v2', expect.not.objectContaining({ p_worker_id: expect.anything() }));
  expect(input.supabase.rpc).toHaveBeenNthCalledWith(2, 'complete_nuri_place_enrichment_job_v2', expect.objectContaining({ p_job_id: 'job', p_lease_owner: 'server-lease', p_status: 'failed' }));
});
test('missing lease fails before provider work or completion', async () => {
  const input = context(null);
  await expect(processDemandTargets(input, [target])).rejects.toThrow('missing lease');
  expect(input.supabase.rpc).toHaveBeenCalledTimes(1);
});
test('existing disabled-provider policy does no job or budget work', async () => {
  const input = context(); input.hardCap = 0;
  const result = await processDemandTargets(input, [target]);
  expect(result.providerRuntimeDisabled).toBe(true);
  expect(input.supabase.rpc).not.toHaveBeenCalled();
});
