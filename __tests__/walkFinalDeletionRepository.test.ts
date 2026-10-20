import {
  createWalkFinalDeletionRepository,
  WalkFinalDeletionError,
  type WalkFinalDeletionIntent,
} from '../src/services/walk/server/finalDeletionRepository';

const i: WalkFinalDeletionIntent = {
  requestId: '12345678-1234-4234-8234-123456789abc',
  purpose: 'PET_FINAL',
  petId: '22345678-1234-4234-8234-123456789abc',
  capability: 'a'.repeat(64),
};
const pending = {
  version: 1,
  requestId: i.requestId,
  purpose: i.purpose,
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
const acked = {
  ...final,
  state: 'ACKNOWLEDGED',
  acknowledgedAt: '2026-10-21T03:00:00.000Z',
};
function ports() {
  const auth = jest.fn(async () => ({
    data: pending as unknown,
    error: null as unknown,
  }));
  const proof = jest.fn(async () => ({
    data: final as unknown,
    error: null as unknown,
  }));
  return { auth, proof, repo: createWalkFinalDeletionRepository(auth, proof) };
}
test('prepare uses authenticated owner path, recovery uses only capability transport', async () => {
  const { auth, proof, repo } = ports();
  const signal = new AbortController().signal;
  await repo.prepare(i, signal);
  expect(auth).toHaveBeenCalledWith(
    'prepare_walk_final_deletion_v1',
    expect.objectContaining({ p_pet_id: i.petId }),
    signal,
  );
  expect(proof).not.toHaveBeenCalled();
  await repo.recover(i);
  expect(proof).toHaveBeenCalledWith(
    'recover_walk_final_deletion_v1',
    {
      p_request_id: i.requestId,
      p_purpose: i.purpose,
      p_capability: i.capability,
    },
    undefined,
  );
  expect(auth).toHaveBeenCalledTimes(1);
});
test('fresh process reconstruction needs only durable request/capability, no JWT or prepare repeat', async () => {
  const { proof } = ports();
  const auth = jest.fn();
  const fresh = createWalkFinalDeletionRepository(auth, proof);
  expect(
    (
      await fresh.recover(
        JSON.parse(JSON.stringify(i)) as WalkFinalDeletionIntent,
      )
    ).state,
  ).toBe('FINAL');
  expect(auth).not.toHaveBeenCalled();
});
test.each([
  { ...final, requestId: i.petId },
  { ...final, purpose: 'ACCOUNT_FINAL' },
  { ...final, version: 2 },
  { ...final, confirmedAt: null },
  { ...pending, confirmedAt: final.confirmedAt },
  { ...final, acknowledgedAt: acked.acknowledgedAt },
  { ...acked, acknowledgedAt: null },
  {},
  null,
  [],
  { ...final, resourceBinding: 'wrong' },
])('malformed/cross-scope receipt never becomes proof %#', async data => {
  const { proof, repo } = ports();
  proof.mockResolvedValue({ data, error: null });
  await expect(repo.recover(i)).rejects.toMatchObject({
    code: 'WALK_DELETE_RESPONSE_INVALID',
    preserveIntent: true,
  });
});
test('captured resource generation is bound when available', async () => {
  const { repo } = ports();
  await expect(
    repo.recover({ ...i, resourceBinding: 'c'.repeat(64) }),
  ).rejects.toThrow(WalkFinalDeletionError);
});
test.each(['PENDING', 'ACKNOWLEDGED'])(
  'ACK requires FINAL, not %s',
  async state => {
    const { proof, repo } = ports();
    const r = state === 'PENDING' ? pending : acked;
    expect(() =>
      repo.ack(i, r as Awaited<ReturnType<typeof repo.recover>>, true),
    ).toThrow(WalkFinalDeletionError);
    expect(proof).not.toHaveBeenCalled();
  },
);
test('ACK only after Native local completion, reply is not reusable FINAL proof', async () => {
  const { proof, repo } = ports();
  const r = await repo.recover(i);
  proof.mockResolvedValue({ data: acked, error: null });
  expect((await repo.ack(i, r, true)).state).toBe('ACKNOWLEDGED');
});
test.each([
  { data: null, error: new Error('offline') },
  { data: null, error: { code: '42501', message: 'human copy' } },
])(
  'unknown errors preserve original intent without fallback success %#',
  async value => {
    const { proof, repo } = ports();
    proof.mockResolvedValue(value);
    await expect(repo.recover(i)).rejects.toMatchObject({
      retryable: true,
      preserveIntent: true,
    });
  },
);
test('stable SQL detail maps denial; message text does not authorize anything', async () => {
  const { proof, repo } = ports();
  proof.mockResolvedValue({
    data: null,
    error: {
      code: '42501',
      details: JSON.stringify({
        walkErrorVersion: 1,
        walkCode: 'WALK_DELETE_RECEIPT_UNAVAILABLE',
      }),
    },
  });
  await expect(repo.recover(i)).rejects.toMatchObject({
    code: 'WALK_DELETE_RECEIPT_UNAVAILABLE',
    retryable: false,
    preserveIntent: true,
  });
});
test('invalid local capability cannot make a network request', () => {
  const { proof, repo } = ports();
  expect(() => repo.recover({ ...i, capability: '' })).toThrow(
    WalkFinalDeletionError,
  );
  expect(proof).not.toHaveBeenCalled();
});
