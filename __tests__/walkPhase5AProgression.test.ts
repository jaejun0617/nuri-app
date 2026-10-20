import {
  getProgressionSnapshot,
  toProgressionWire,
} from '../src/services/walk/domain';
import {
  createWalkProgressionRepository,
  decodePetWalkProgression,
} from '../src/services/walk/server/progressionRepository';
import { type WalkRpcTransport } from '../src/services/walk/server/repository';
const pet = '22222222-2222-4222-8222-222222222222';
const source = '33333333-3333-4333-8333-333333333333';
const wire = (distance: bigint, count = '1') => ({
  ...toProgressionWire(getProgressionSnapshot(distance)),
  petId: pet,
  eligibleSessionCount: distance === 0n ? '0' : count,
  milestones: [],
});
const history = {
  key: '100_KM',
  policyVersion: 1,
  thresholdM: '100000',
  earnedAt: '2026-10-20T00:00:00.000Z',
  sourceSessionId: source,
};
test.each([
  0n,
  999n,
  1000n,
  2999n,
  10000n,
  100000n,
  18446744073709551614n,
  500n * 10n ** 40n * (10n ** 40n - 1n),
])('validates exact server progression at %s', distance => {
  const value = decodePetWalkProgression(wire(distance), pet);
  expect(value.lifetimeDistanceM).toBe(distance.toString());
  expect(value).toEqual(wire(distance));
});
test('fixed threshold values and uncapped level stay decimal strings', () => {
  expect(decodePetWalkProgression(wire(1000n), pet)).toMatchObject({
    level: '2',
    thresholdM: '1000',
    nextThresholdM: '3000',
    distanceToNextLevelM: '2000',
    progress: { numeratorM: '0', denominatorM: '2000' },
  });
  const level = 10n ** 40n;
  expect(
    decodePetWalkProgression(wire(500n * level * (level - 1n)), pet).level,
  ).toBe(level.toString());
});
test('historical milestone remains valid after live distance falls to zero', () => {
  const value = decodePetWalkProgression(
    { ...wire(0n), milestones: [history] },
    pet,
  );
  expect(value.level).toBe('1');
  expect(value.milestones).toEqual([history]);
});
test('nullable source supports final source-row erasure without deleting earned history', () => {
  expect(
    decodePetWalkProgression(
      { ...wire(0n), milestones: [{ ...history, sourceSessionId: null }] },
      pet,
    ).milestones[0].sourceSessionId,
  ).toBeNull();
});
test.each([
  { ...wire(1000n), lifetimeDistanceM: 1000 },
  { ...wire(1000n), lifetimeDistanceM: '01000' },
  { ...wire(1000n), level: '3' },
  { ...wire(1000n), policyVersion: 2 },
  { ...wire(1000n), eligibleSessionCount: '0' },
  { ...wire(1000n), progress: { numeratorM: '1', denominatorM: '2000' } },
  { ...wire(1000n), milestones: [history, history] },
  { ...wire(1000n), milestones: [{ ...history, key: 'RPG_XP' }] },
  { ...wire(1000n), milestones: [{ ...history, thresholdM: '99999' }] },
  { ...wire(1000n), milestones: [{ ...history, earnedAt: 'not-a-date' }] },
  { ...wire(1000n), petId: source },
])('fails closed on malformed or foreign server data', bad => {
  expect(() => decodePetWalkProgression(bad, pet)).toThrow(
    'WALK_INVALID_PROGRESSION_RESPONSE',
  );
});
test('future additive fields are not blindly exposed', () => {
  expect(
    decodePetWalkProgression(
      { ...wire(0n), accountXp: '999', secret: 'extra' },
      pet,
    ),
  ).toEqual(wire(0n));
});
test('repository binds selected pet and uses only canonical progression RPC', async () => {
  const rpc = jest
    .fn<ReturnType<WalkRpcTransport>, Parameters<WalkRpcTransport>>()
    .mockResolvedValue({ data: wire(10000n), error: null });
  await expect(createWalkProgressionRepository(rpc).get(pet)).resolves.toEqual(
    wire(10000n),
  );
  expect(rpc).toHaveBeenCalledWith('get_pet_walk_progression_v1', {
    p_pet_id: pet,
  });
});
test('unknown transport/errors preserve retryability; machine detail controls permanent denial', async () => {
  const rpc = jest
    .fn<ReturnType<WalkRpcTransport>, Parameters<WalkRpcTransport>>()
    .mockRejectedValueOnce(new Error('network'));
  const repository = createWalkProgressionRepository(rpc);
  await expect(repository.get(pet)).rejects.toMatchObject({ retryable: true });
  rpc.mockResolvedValue({
    data: null,
    error: {
      code: 'XX000',
      message: 'WALK_OWNER_MISMATCH',
    },
  });
  await expect(repository.get(pet)).rejects.toMatchObject({
    code: 'WALK_SYNC_UNKNOWN_RETRYABLE',
    retryable: true,
  });
  rpc.mockResolvedValue({
    data: null,
    error: {
      code: '42501',
      message: 'Human wording changed',
      details: JSON.stringify({
        walkErrorVersion: 1,
        walkCode: 'WALK_OWNER_MISMATCH',
      }),
    },
  });
  await expect(repository.get(pet)).rejects.toMatchObject({
    code: 'WALK_OWNER_MISMATCH',
    retryable: false,
  });
});
