import {
  planWalkRecordClaim,
  settleWalkRecordClaim,
  getWalkDeletionEffects,
  reconcilePendingDeletion,
  createWalkTombstone,
  checkWalkFinishReplay,
  checkRouteRevision,
} from '../src/services/walk/domain';

const sessionId = '11111111-1111-4111-8111-111111111111';
const memoryId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const digest = 'a'.repeat(64);
const request = {
  sessionId,
  memoryId,
  requestId,
  serverAccepted: true,
  sessionDeleted: false,
  existingClaim: null,
  originalMemoryExists: false,
};

describe('One session, one original memory, one XP settlement', () => {
  test('new claim requires one atomic existing-pipeline transaction, not a new XP engine', () => {
    expect(planWalkRecordClaim(request)).toEqual({
      ok: true,
      value: {
        kind: 'CREATE_ATOMIC',
        sessionId,
        memoryId,
        requestId,
        rewardSource: {
          eventType: 'walk_timeline_post',
          sourceType: 'timeline_memory',
          sourceId: memoryId,
        },
      },
    });
  });
  test.each([
    { outcome: 'XP_AWARDED', xpLedgerReference: 'ledger-1' },
    { outcome: 'ZERO_XP_VALID', xpLedgerReference: null },
    { outcome: 'RECORD_CREATED_NO_XP_BY_POLICY', xpLedgerReference: null },
  ] as const)(
    'all valid settlement outcomes persist a once-only receipt: $outcome',
    reward => {
      const plan = planWalkRecordClaim(request);
      if (!plan.ok || plan.value.kind !== 'CREATE_ATOMIC')
        throw new Error('Expected new claim plan');
      const result = settleWalkRecordClaim(plan.value, { ok: true, ...reward });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected settled receipt');
      const existingClaim = result.value;
      expect(existingClaim).not.toHaveProperty('xpAmount');
      for (const nextRequestId of [
        requestId,
        '44444444-4444-4444-8444-444444444444',
      ]) {
        expect(
          planWalkRecordClaim({
            ...request,
            requestId: nextRequestId,
            existingClaim,
            originalMemoryExists: true,
          }),
        ).toEqual({
          ok: true,
          value: { kind: 'RETURN_EXISTING', claim: existingClaim },
        });
      }
      expect(
        planWalkRecordClaim({
          ...request,
          memoryId: '55555555-5555-4555-8555-555555555555',
          existingClaim,
          originalMemoryExists: true,
        }),
      ).toEqual({
        ok: true,
        value: { kind: 'RETURN_EXISTING', claim: existingClaim },
      });
      expect(
        planWalkRecordClaim({
          ...request,
          existingClaim,
          originalMemoryExists: false,
        }),
      ).toEqual({ ok: false, error: 'WALK_RECORD_RECREATE_FORBIDDEN' });
    },
  );
  test('unexpected reward failure requires rollback, never a successful pending receipt', () => {
    const plan = planWalkRecordClaim(request);
    if (!plan.ok || plan.value.kind !== 'CREATE_ATOMIC')
      throw new Error('Expected new claim plan');
    expect(settleWalkRecordClaim(plan.value, { ok: false })).toEqual({
      ok: false,
      error: 'WALK_REWARD_SETTLEMENT_FAILED',
      rollbackRequired: true,
      preserveDraft: true,
    });
    expect(
      settleWalkRecordClaim(plan.value, {
        ok: true,
        outcome: 'XP_AWARDED',
        xpLedgerReference: null,
      }).ok,
    ).toBe(false);
  });
  test('rejected, deleted and inconsistent sessions cannot create claims', () => {
    expect(
      planWalkRecordClaim({ ...request, serverAccepted: false }).error,
    ).toBe('WALK_SESSION_REJECTED');
    expect(
      planWalkRecordClaim({ ...request, sessionDeleted: true }).error,
    ).toBe('WALK_SESSION_DELETED');
    expect(
      planWalkRecordClaim({ ...request, originalMemoryExists: true }).error,
    ).toBe('WALK_INVALID_RECORD_RELATION');
  });
  test('an existing claim cannot replace the original memory identity with malformed data', () => {
    expect(
      planWalkRecordClaim({
        ...request,
        originalMemoryExists: true,
        existingClaim: {
          sessionId,
          originalMemoryId: 'invalid',
          requestId,
          settlementOutcome: 'ZERO_XP_VALID',
          xpLedgerReference: null,
        },
      }),
    ).toEqual({ ok: false, error: 'WALK_INVALID_RECORD_RELATION' });
  });
  test('a forged atomic plan cannot award XP to a different source memory', () => {
    expect(
      settleWalkRecordClaim(
        {
          kind: 'CREATE_ATOMIC',
          sessionId,
          memoryId,
          requestId,
          rewardSource: {
            eventType: 'walk_timeline_post',
            sourceType: 'timeline_memory',
            sourceId: sessionId,
          },
        },
        { ok: true, outcome: 'XP_AWARDED', xpLedgerReference: 'ledger-1' },
      ),
    ).toMatchObject({
      ok: false,
      error: 'WALK_REWARD_SETTLEMENT_FAILED',
      rollbackRequired: true,
    });
  });
});

describe('Deletion policy preserves existing no-clawback rewards', () => {
  test('route-only deletion has no progression/memory/XP side effects', () => {
    expect(getWalkDeletionEffects('ROUTE_ONLY_DELETE')).toMatchObject({
      progression: 'KEEP',
      level: 'KEEP',
      memory: 'KEEP',
      xp: 'KEEP',
      route: 'DELETE',
    });
  });
  test('memory deletion retains distance/claim/XP and forbids recreation', () => {
    expect(getWalkDeletionEffects('MEMORY_DELETE')).toMatchObject({
      progression: 'KEEP',
      level: 'KEEP',
      claim: 'KEEP',
      recreate: 'DENY',
      xp: 'KEEP',
      recordActivity: 'EXISTING_DELETE_POLICY',
    });
  });
  test('session deletion recalculates current level but keeps earned memories', () => {
    expect(getWalkDeletionEffects('SESSION_DELETE')).toMatchObject({
      progression: 'EXCLUDE',
      level: 'RECALCULATE',
      route: 'DELETE',
      memory: 'KEEP',
      xp: 'KEEP',
      milestone: 'KEEP',
      tombstone: 'KEEP_MINIMAL',
    });
  });
  test.each(['ACCOUNT_FINAL_DELETE', 'PET_FINAL_DELETE'] as const)(
    '%s erases all Walk data, including replay receipts',
    type => {
      expect(getWalkDeletionEffects(type)).toMatchObject({
        allWalkData: 'DELETE',
        tombstone: 'DELETE',
      });
    },
  );
  test('uncertain outbox acceptance must be reconciled before local cancellation', () => {
    expect(getWalkDeletionEffects('PENDING_LOCAL_DELETE').outbox).toBe(
      'RECONCILE_BEFORE_CANCEL',
    );
    expect(reconcilePendingDeletion('UNKNOWN')).toBe('WAIT_FOR_SERVER');
    expect(reconcilePendingDeletion('ACCEPTED')).toBe(
      'DELETE_ACCEPTED_SESSION',
    );
    expect(reconcilePendingDeletion('NOT_FOUND')).toBe('WAIT_FOR_SERVER');
    expect(reconcilePendingDeletion('NOT_ACCEPTED_FINAL')).toBe(
      'CANCEL_LOCAL_OUTBOX',
    );
    expect(reconcilePendingDeletion('ALREADY_DELETED')).toBe(
      'CANCEL_LOCAL_OUTBOX',
    );
  });
});

describe('Minimal tombstone and idempotent finish/route contracts', () => {
  const scope = {
    userId: '33333333-3333-4333-8333-333333333333',
    petId: memoryId,
  };
  test('tombstone strips all measurements/quality/route and normalizes the receipt', () => {
    const source = {
      clientSessionId: sessionId,
      ownerScope: scope,
      payloadDigest: digest,
      recordClaimExists: true,
      measuredDistanceM: '2430',
      qualitySummary: {},
      route: ['private'],
    };
    const tombstone = createWalkTombstone(source, '2026-10-13T09:00:00+09:00');
    expect(tombstone).toEqual({
      clientSessionId: sessionId,
      ownerScope: scope,
      payloadDigest: digest,
      recordClaimExists: true,
      deletedAt: '2026-10-13T00:00:00.000Z',
    });
    expect(
      checkWalkFinishReplay(
        {
          clientSessionId: sessionId,
          payloadDigest: digest,
          ownerScope: scope,
        },
        { ...tombstone, kind: 'DELETED' },
      ),
    ).toEqual({ ok: false, error: 'WALK_SESSION_DELETED' });
  });
  test('same ID/digest returns existing, different body conflicts, caller scope never authorizes itself', () => {
    const incoming = {
      clientSessionId: sessionId,
      payloadDigest: digest,
      ownerScope: scope,
    };
    const existing = { ...incoming, kind: 'ACCEPTED' as const };
    expect(checkWalkFinishReplay(incoming, null)).toEqual({
      ok: true,
      value: 'CREATE',
    });
    expect(checkWalkFinishReplay(incoming, existing)).toEqual({
      ok: true,
      value: 'RETURN_EXISTING',
    });
    expect(
      checkWalkFinishReplay(
        { ...incoming, payloadDigest: 'b'.repeat(64) },
        existing,
      ).error,
    ).toBe('WALK_PAYLOAD_CONFLICT');
    expect(
      checkWalkFinishReplay(
        { ...incoming, ownerScope: { ...scope, userId: memoryId } },
        existing,
      ).error,
    ).toBe('WALK_OWNER_MISMATCH');
  });
  test('route revision guard cannot resurrect a deleted route or alter progression', () => {
    expect(checkRouteRevision(1n, 1n, false)).toEqual({
      ok: true,
      value: true,
    });
    expect(checkRouteRevision(1n, 2n, false).error).toBe(
      'WALK_ROUTE_REVISION_CONFLICT',
    );
    expect(checkRouteRevision(2n, 2n, true).error).toBe(
      'WALK_ROUTE_REVISION_CONFLICT',
    );
  });
});
