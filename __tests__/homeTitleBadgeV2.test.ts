import { fetchHomePetTitleBadgeIdentity } from '../src/services/activity/homeTitleBadge';

const mockRpc = jest.fn<Promise<{data: unknown; error: Error | null}>, [string, unknown]>();
jest.mock('../src/services/supabase/client', () => ({ supabase: {
  rpc: (name: string, args: unknown) => mockRpc(name, args),
} }));

beforeEach(() => { mockRpc.mockReset(); });

it('uses the authenticated pet-scoped v2 endpoint and canonical identity', async () => {
  mockRpc.mockResolvedValue({data: {titleKey: 'WK01', titleName: '꼬마 산책친구'}, error: null});
  await expect(fetchHomePetTitleBadgeIdentity('pet')).resolves.toEqual({titleKey: 'WK01', titleName: '꼬마 산책친구'});
  expect(mockRpc).toHaveBeenCalledWith('get_nuri_home_title_v2', {p_pet_id: 'pet'});
});
it('preserves genuine empty results and does not query without a pet', async () => {
  await expect(fetchHomePetTitleBadgeIdentity(null)).resolves.toBeNull();
  expect(mockRpc).not.toHaveBeenCalled();
  mockRpc.mockResolvedValue({data: null, error: null});
  await expect(fetchHomePetTitleBadgeIdentity('pet')).resolves.toBeNull();
});
it('does not replace remote errors with invented badges', async () => {
  mockRpc.mockResolvedValue({data: null, error: new Error('unavailable')});
  await expect(fetchHomePetTitleBadgeIdentity('pet')).rejects.toThrow('unavailable');
});
it.each([
  {titleKey: 'unapproved', titleName: 'unknown'},
  {titleKey: 'WK01', titleName: 'incorrect name'},
  {titleKey: 'first_walk_friend', titleName: '첫 산책 친구'},
  {titleKey: '', titleName: ''},
])('rejects invalid v2 identity %j', async data => {
  mockRpc.mockResolvedValue({data, error: null});
  await expect(fetchHomePetTitleBadgeIdentity('pet')).rejects.toThrow('TITLE_VAULT_RESPONSE_INVALID');
});
