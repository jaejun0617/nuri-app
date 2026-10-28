import { fetchMemoriesByPetPage } from '../src/services/supabase/memories';

const mockCalls: { name: string; args: unknown[] }[] = [];
const mockBuilder = {
  select: (...args: unknown[]) => chain('select', args),
  eq: (...args: unknown[]) => chain('eq', args),
  order: (...args: unknown[]) => chain('order', args),
  limit: (...args: unknown[]) => chain('limit', args),
  not: (...args: unknown[]) => chain('not', args),
  gte: (...args: unknown[]) => chain('gte', args),
  lt: (...args: unknown[]) => chain('lt', args),
  or: (...args: unknown[]) => chain('or', args),
  then: (resolve: (value: { data: never[]; error: null }) => unknown) => Promise.resolve(resolve({ data: [], error: null })),
};
function chain(name: string, args: unknown[]) { mockCalls.push({ name, args }); return mockBuilder; }
jest.mock('../src/services/supabase/client', () => ({ supabase: { from: () => mockBuilder } }));
beforeEach(() => { mockCalls.length = 0; });
it('sends the original owner, pet and exclusive occurrence dates to the server and excludes only existing recap fixture flags', async () => {
  await fetchMemoriesByPetPage({ petId: 'pet', prefetchTop: 0, recap: { ownerId: 'owner', period: { startDate: '2026-10-19', endDate: '2026-10-26' } } });
  expect(mockCalls).toEqual(expect.arrayContaining([
    { name: 'eq', args: ['pet_id', 'pet'] }, { name: 'eq', args: ['user_id', 'owner'] },
    { name: 'gte', args: ['occurred_at', '2026-10-19'] }, { name: 'lt', args: ['occurred_at', '2026-10-26'] },
    { name: 'not', args: ['metadata', 'cs', '{"qaFixture":true}'] }, { name: 'not', args: ['metadata', 'cs', '{"isQaFixture":true}'] },
    { name: 'not', args: ['metadata', 'cs', '{"draft":true}'] }, { name: 'not', args: ['metadata', 'cs', '{"invalidated":true}'] },
  ]));
  expect(mockCalls.filter(call => ['gte', 'lt'].includes(call.name))).toHaveLength(2);
});
it('clearing the period keeps the owner/pet boundary and the existing compound cursor without date conditions', async () => {
  await fetchMemoriesByPetPage({ petId: 'pet', prefetchTop: 0, recap: { ownerId: 'owner' } });
  expect(mockCalls).toContainEqual({ name: 'eq', args: ['user_id', 'owner'] });
  expect(mockCalls).toContainEqual({ name: 'eq', args: ['pet_id', 'pet'] });
  expect(mockCalls.filter(call => ['gte', 'lt'].includes(call.name))).toEqual([]);
  expect(mockCalls).toContainEqual({ name: 'order', args: ['created_at', { ascending: false }] });
  expect(mockCalls).toContainEqual({ name: 'order', args: ['id', { ascending: false }] });
});
it('does not change the ordinary timeline query or apply a recap filter to unrelated screens', async () => {
  await fetchMemoriesByPetPage({ petId: 'pet', prefetchTop: 0 });
  expect(mockCalls.filter(call => ['not', 'gte', 'lt'].includes(call.name))).toEqual([]);
});
