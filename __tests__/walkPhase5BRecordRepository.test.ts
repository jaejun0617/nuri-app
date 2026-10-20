import {
  createWalkRecordRepository,
  decodeWalkRecordCommit,
  decodeWalkRecordView,
  walkRecordDraftScope,
} from '../src/services/walk/server/recordRepository';
import type { WalkRpcTransport } from '../src/services/walk/server/repository';
const pet = '22222222-2222-4222-8222-222222222222',
  session = '33333333-3333-4333-8333-333333333333';
const server = '44444444-4444-4444-8444-444444444444',
  memory = '55555555-5555-4555-8555-555555555555';
const request = '66666666-6666-4666-8666-666666666666',
  ledger = '77777777-7777-4777-8777-777777777777';
const other = '88888888-8888-4888-8888-888888888888';
const summary = () => ({
  sessionId: server,
  startedAt: '2026-10-20T14:30:00.000Z',
  endedAt: '2026-10-20T15:30:00.000Z',
  acceptedAt: '2026-10-21T15:00:00.123Z',
  measuredDurationMs: '3600000',
  activeDurationMs: '3500000',
  measuredDistanceM: '6000',
  acceptedDistanceM: '6000',
  eligibility: 'PROGRESSION_ELIGIBLE',
});
const view = () => ({
  version: 1,
  source: 'GPS_TRACKED',
  clientSessionId: session,
  petId: pet,
  sessionDeleted: false,
  recordState: 'RECORDED',
  summary: summary(),
  claim: {
    sessionId: server,
    originalMemoryId: memory,
    requestId: request,
    claimedAt: '2026-10-22T15:00:00.000Z',
    settledAt: '2026-10-22T15:00:00.000Z',
    activityDateKst: '2026-10-23',
    settlementOutcome: 'XP_AWARDED',
    xpLedgerReference: ledger,
  },
  memory: {
    id: memory,
    petId: pet,
    title: '함께 걸은 날',
    content: 'memo',
    emotion: null,
    tags: ['산책'],
    category: 'walk',
    occurredAt: '2026-10-20',
    createdAt: '2026-10-22T15:00:00.000Z',
    updatedAt: '2026-10-22T15:00:00.000Z',
    imagePath: null,
    imagePaths: [],
  },
});
const commit = () => ({
  record: view(),
  replayed: false,
  activity: {
    current_streak: 1,
    best_streak: 1,
    today_completed: true,
    inserted: true,
    show_celebration: true,
    activity_date_kst: '2026-10-23',
  },
  reward: {
    awarded: true,
    xp_awarded: 39,
    total_xp: 39,
    level: 1,
    leveled_up: false,
  },
});
const pending = () => ({
  ...view(),
  recordState: 'RECORD_PENDING',
  claim: null,
  memory: null,
});
const pendingReference = () => ({
  version: 1,
  source: 'GPS_TRACKED',
  clientSessionId: session,
  petId: pet,
  sessionDeleted: false,
  recordState: 'RECORD_PENDING',
  summary: summary(),
  originalMemoryId: null,
});
const batchSource = () => ({
  version: 1,
  source: 'GPS_TRACKED',
  clientSessionId: session,
  petId: pet,
  sessionDeleted: false,
  recordState: 'RECORDED',
  summary: summary(),
  memoryId: memory,
});
const input = {
  clientSessionId: session,
  petId: pet,
  memoryId: memory,
  requestId: request,
  record: { title: '함께 걸은 날', content: 'memo', tags: ['산책'] },
};
const mock = () =>
  jest.fn<ReturnType<WalkRpcTransport>, Parameters<WalkRpcTransport>>();

test('positive canonical Memory/claim/XP receipt is strictly bound', () => {
  const r = decodeWalkRecordCommit(commit(), session, pet, memory, request);
  expect(r.reward?.xpAwarded).toBe(39);
  expect(r.record.memory?.occurredAt).toBe('2026-10-20');
  expect(r.activity?.activityDateKst).toBe('2026-10-23');
});
test('normal zero consumes claim without a fake ledger', () => {
  const base = commit();
  const r = {
    ...base,
    record: {
      ...base.record,
      claim: {
        ...base.record.claim,
        settlementOutcome: 'ZERO_XP_VALID',
        xpLedgerReference: null,
      },
    },
    reward: { ...base.reward, awarded: false, xp_awarded: 0, total_xp: 0 },
  };
  expect(
    decodeWalkRecordCommit(r, session, pet, memory, request).record.claim
      ?.xpLedgerReference,
  ).toBeNull();
});
test('replay returns original ID and cannot emit fresh reward/celebration', () => {
  const r = { record: view(), replayed: true, activity: null, reward: null };
  expect(decodeWalkRecordCommit(r, session, pet, other, other)).toMatchObject({
    replayed: true,
    activity: null,
    reward: null,
    record: { memory: { id: memory } },
  });
});
test('deleted session retains Memory/claim but no distance/time summary', () => {
  const r = decodeWalkRecordView(
    { ...view(), sessionDeleted: true, summary: null },
    pet,
    session,
  );
  expect(r.recordState).toBe('RECORDED');
  expect(r.memory?.content).toBe('memo');
  expect(r.summary).toBeNull();
});
test('deleted Memory retains claim; deleted unclaimed session has no record action', () => {
  expect(
    decodeWalkRecordView(
      { ...view(), recordState: 'RECORD_DELETED', memory: null },
      pet,
    ).claim?.originalMemoryId,
  ).toBe(memory);
  expect(
    decodeWalkRecordView(
      { ...pending(), sessionDeleted: true, recordState: null, summary: null },
      pet,
    ).recordState,
  ).toBeNull();
});
test.each([
  { ...view(), petId: other },
  { ...view(), recordState: 'RECORDED', claim: null, memory: null },
  { ...view(), sessionDeleted: true },
  { ...view(), claim: { ...view().claim, sessionId: other } },
  { ...view(), claim: { ...view().claim, xpLedgerReference: null } },
  { ...view(), memory: { ...view().memory, category: 'daily' } },
  { ...view(), memory: { ...view().memory, occurredAt: '2026-10-21' } },
  { ...view(), memory: { ...view().memory, id: other } },
  { ...view(), claim: { ...view().claim, activityDateKst: '2026-10-22' } },
  { ...view(), summary: { ...summary(), acceptedDistanceM: '6001' } },
  { ...view(), summary: { ...summary(), activeDurationMs: '3600001' } },
  { ...view(), summary: { ...summary(), measuredDistanceM: 6000 } },
  { ...pending(), summary: null },
])(
  'malformed/foreign/inconsistent read stays retryable and preserves draft',
  v => {
    expect(() => decodeWalkRecordView(v, pet, session)).toThrow(
      expect.objectContaining({ retryable: true, preserveDraft: true }),
    );
  },
);
test.each([
  { ...commit(), reward: null },
  { ...commit(), activity: null },
  { ...commit(), reward: { ...commit().reward, awarded: false } },
  { ...commit(), reward: { ...commit().reward, total_xp: -1 } },
  { ...commit(), activity: { ...commit().activity, inserted: false } },
  {
    ...commit(),
    record: { ...view(), claim: { ...view().claim, requestId: other } },
  },
  {
    ...commit(),
    record: {
      ...view(),
      claim: {
        ...view().claim,
        settlementOutcome: 'RECORD_CREATED_NO_XP_BY_POLICY',
        xpLedgerReference: null,
      },
    },
  },
  { ...commit(), replayed: true },
])('unknown/malformed commit is never converted into successful zero', v => {
  expect(() =>
    decodeWalkRecordCommit(v, session, pet, memory, request),
  ).toThrow(expect.objectContaining({ retryable: true, preserveDraft: true }));
});
test('no editable metadata, route or source additions leak into decoded projection', () => {
  const raw = {
    ...view(),
    metadata: { verified: true },
    route: 'secret',
    summary: { ...summary(), quality: { secret: true } },
  };
  expect(decodeWalkRecordView(raw, pet)).toEqual(view());
});
test('create calls only atomic RPC, never best-effort daily/XP', async () => {
  const rpc = mock().mockResolvedValue({ data: commit(), error: null });
  await createWalkRecordRepository(rpc).create(input);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith(
    'create_walk_memory_from_session_v1',
    expect.objectContaining({
      p_pet_id: pet,
      p_client_session_id: session,
      p_memory_id: memory,
      p_request_id: request,
      p_record: expect.objectContaining({ title: '함께 걸은 날' }),
    }),
  );
});
test('author, accepted summary and metadata cannot be trusted draft fields', async () => {
  const rpc = mock(),
    record = { ...input.record, userId: other, metadata: { verified: true } };
  await expect(
    createWalkRecordRepository(rpc).create({ ...input, record }),
  ).rejects.toMatchObject({
    code: 'WALK_INVALID_RECORD_INPUT',
    preserveDraft: true,
  });
  expect(rpc).not.toHaveBeenCalled();
});
test('network/raw human errors remain unknown; structured machine error controls denial', async () => {
  const rpc = mock().mockRejectedValueOnce(new Error('network'));
  const repo = createWalkRecordRepository(rpc);
  await expect(repo.create(input)).rejects.toMatchObject({
    retryable: true,
    preserveDraft: true,
  });
  rpc.mockResolvedValue({
    data: null,
    error: { code: 'XX000', message: 'WALK_SESSION_DELETED' },
  });
  await expect(repo.create(input)).rejects.toMatchObject({
    code: 'WALK_SYNC_UNKNOWN_RETRYABLE',
    retryable: true,
  });
  rpc.mockResolvedValue({
    data: null,
    error: {
      code: '22023',
      details: JSON.stringify({
        walkErrorVersion: 1,
        walkCode: 'WALK_SESSION_DELETED',
      }),
    },
  });
  await expect(repo.create(input)).rejects.toMatchObject({
    code: 'WALK_SESSION_DELETED',
    retryable: false,
    preserveDraft: true,
  });
  rpc.mockResolvedValue({
    data: null,
    error: {
      code: '22023',
      details: JSON.stringify({
        walkErrorVersion: 1,
        walkCode: 'WALK_REWARD_SETTLEMENT_FAILED',
      }),
    },
  });
  await expect(repo.create(input)).rejects.toMatchObject({
    code: 'WALK_REWARD_SETTLEMENT_FAILED',
    retryable: true,
    preserveDraft: true,
  });
});
test('empty result is unknown, not a fabricated zero settlement', async () => {
  const rpc = mock().mockResolvedValue({ data: null, error: null });
  await expect(
    createWalkRecordRepository(rpc).create(input),
  ).rejects.toMatchObject({ retryable: true, preserveDraft: true });
});
test('history preserves microseconds without rounding and binds pet/page cursor', async () => {
  const next = {
    version: 1 as const,
    petId: pet,
    pageSize: 1,
    acceptedAt: '2026-10-21T15:00:00.123456Z',
    clientSessionId: session,
  };
  const rpc = mock().mockResolvedValue({
    data: { items: [pendingReference()], hasMore: true, nextCursor: next },
    error: null,
  });
  const repo = createWalkRecordRepository(rpc),
    page = await repo.history(pet, 1);
  expect(page.nextCursor?.acceptedAt).toBe(next.acceptedAt);
  await repo.history(pet, 1, page.nextCursor);
  expect(rpc).toHaveBeenLastCalledWith('get_walk_record_history_v1', {
    p_pet_id: pet,
    p_limit: 1,
    p_cursor: next,
  });
  await expect(repo.history(other, 1, next)).rejects.toMatchObject({
    retryable: true,
  });
  await expect(repo.history(pet, 2, next)).rejects.toMatchObject({
    retryable: true,
  });
});
test('batch summaries are one bounded call; manual/unavailable IDs may be absent', async () => {
  const rpc = mock()
    .mockResolvedValueOnce({ data: { items: [batchSource()] }, error: null })
    .mockResolvedValueOnce({ data: { items: [] }, error: null });
  const repo = createWalkRecordRepository(rpc);
  expect(
    await repo.memorySummaries([{ memoryId: memory, petId: pet }]),
  ).toHaveLength(1);
  expect(await repo.memorySummaries([{ memoryId: other, petId: pet }])).toEqual(
    [],
  );
  await expect(
    repo.memorySummaries([
      { memoryId: memory, petId: pet },
      { memoryId: memory, petId: pet },
    ]),
  ).rejects.toMatchObject({
    code: 'WALK_INVALID_RECORD_INPUT',
  });
  expect(rpc).toHaveBeenCalledTimes(2);
});
test('history cursor must bind the last row timestamp as well as its ID', async () => {
  const rpc = mock().mockResolvedValue({
    data: {
      items: [pendingReference()],
      hasMore: true,
      nextCursor: {
        version: 1,
        petId: pet,
        pageSize: 1,
        clientSessionId: session,
        acceptedAt: '2026-10-22T15:00:00.123456Z',
      },
    },
    error: null,
  });
  await expect(
    createWalkRecordRepository(rpc).history(pet, 1),
  ).rejects.toMatchObject({ retryable: true, preserveDraft: true });
});
test('batch boundary rejects a returned pet outside the captured Memory scope', async () => {
  const rpc = mock().mockResolvedValue({
    data: { items: [batchSource()] },
    error: null,
  });
  await expect(
    createWalkRecordRepository(rpc).memorySummaries([
      { memoryId: memory, petId: other },
    ]),
  ).rejects.toMatchObject({ retryable: true, preserveDraft: true });
});
test('batch source DTO never retransmits Memory body, images or XP audit', async () => {
  const rpc = mock().mockResolvedValue({
    data: {
      items: [
        {
          ...batchSource(),
          content: 'not consumed',
          imagePaths: ['not consumed'],
          claim: { xpLedgerReference: ledger },
          credential: 'not consumed',
          route: 'not consumed',
        },
      ],
    },
    error: null,
  });
  expect(
    await createWalkRecordRepository(rpc).memorySummaries([
      { memoryId: memory, petId: pet },
    ]),
  ).toEqual([batchSource()]);
});
test('prompt/dismiss is explicit and pet/session-bound', async () => {
  const rpc = mock()
    .mockResolvedValueOnce({ data: { item: pendingReference() }, error: null })
    .mockResolvedValueOnce({
      data: { clientSessionId: session, petId: pet, dismissed: true },
      error: null,
    })
    .mockResolvedValueOnce({ data: { item: null }, error: null });
  const repo = createWalkRecordRepository(rpc);
  expect((await repo.prompt(pet))?.recordState).toBe('RECORD_PENDING');
  await repo.dismiss(session, pet);
  expect(await repo.prompt(pet)).toBeNull();
  expect(rpc).toHaveBeenNthCalledWith(2, 'dismiss_walk_record_prompt_v1', {
    p_client_session_id: session,
    p_pet_id: pet,
  });
});
test('draft scope is isolated by owner, pet and immutable session', () => {
  const key = walkRecordDraftScope(other, pet, session);
  expect(key).not.toBe(walkRecordDraftScope(memory, pet, session));
  expect(key).not.toBe(walkRecordDraftScope(other, memory, session));
  expect(key).not.toBe(walkRecordDraftScope(other, pet, memory));
});
