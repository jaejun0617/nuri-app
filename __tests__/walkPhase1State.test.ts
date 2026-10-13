import {
  WALK_RUNTIME_STATES,
  WALK_SYNC_STATES,
  WALK_ELIGIBILITY_STATES,
  WALK_RECORD_STATES,
  WALK_ROUTE_STATES,
  WALK_UI_SIGNALS,
  WALK_ERROR_CODES,
  transitionWalkRuntime,
  assertCanStartWalk,
  deriveWalkRecordState,
} from '../src/services/walk/domain';

describe('Walk independent state axes', () => {
  test('runtime has only native lifecycle states, not sync or presentation signals', () => {
    expect(WALK_RUNTIME_STATES).toEqual([
      'IDLE',
      'STARTING',
      'WALKING',
      'PAUSED',
      'FINISHING',
      'FINISHED_LOCAL',
      'RECOVERY_REQUIRED',
      'CANCELLED_LOCAL',
    ]);
    expect(WALK_SYNC_STATES).toEqual([
      'SYNC_PENDING',
      'SYNCING',
      'UNKNOWN_RETRYABLE',
      'ACCEPTED_SERVER',
      'REJECTED_SERVER',
    ]);
    expect(WALK_ELIGIBILITY_STATES).toHaveLength(2);
    expect(WALK_RECORD_STATES).toEqual([
      'RECORD_PENDING',
      'RECORDED',
      'RECORD_DELETED',
    ]);
    expect(WALK_ROUTE_STATES).toEqual([
      'LOCAL_ONLY',
      'BACKUP_PENDING',
      'BACKED_UP',
      'BACKUP_RETRYABLE',
      'ROUTE_DELETED',
    ]);
    expect(WALK_UI_SIGNALS).toEqual([
      'GPS_WEAK',
      'GPS_LOST',
      'MILESTONE',
      'LEVEL_UP',
    ]);
    expect(Object.isFrozen(WALK_RUNTIME_STATES)).toBe(true);
  });

  const allowed: ReadonlyArray<readonly [string, string]> = [
    ['IDLE', 'STARTING'],
    ['STARTING', 'WALKING'],
    ['STARTING', 'IDLE'],
    ['WALKING', 'PAUSED'],
    ['WALKING', 'FINISHING'],
    ['WALKING', 'RECOVERY_REQUIRED'],
    ['PAUSED', 'WALKING'],
    ['PAUSED', 'FINISHING'],
    ['PAUSED', 'RECOVERY_REQUIRED'],
    ['FINISHING', 'FINISHED_LOCAL'],
    ['RECOVERY_REQUIRED', 'PAUSED'],
    ['RECOVERY_REQUIRED', 'FINISHING'],
    ['RECOVERY_REQUIRED', 'CANCELLED_LOCAL'],
  ];
  test.each(allowed)('%s -> %s is explicit and pure', (from, to) => {
    expect(transitionWalkRuntime(from, to)).toEqual({ ok: true, value: to });
  });
  test('every other state pair, including terminal jumps and no-op, is rejected', () => {
    for (const from of WALK_RUNTIME_STATES) {
      for (const to of WALK_RUNTIME_STATES) {
        if (!allowed.some(pair => pair[0] === from && pair[1] === to)) {
          expect(transitionWalkRuntime(from, to)).toEqual({
            ok: false,
            error: 'WALK_INVALID_STATE_TRANSITION',
          });
        }
      }
    }
    expect(transitionWalkRuntime('GPS_WEAK', 'WALKING').ok).toBe(false);
  });
  test.each([
    'STARTING',
    'WALKING',
    'PAUSED',
    'FINISHING',
    'RECOVERY_REQUIRED',
  ])('%s blocks double start', state => {
    expect(assertCanStartWalk(state)).toEqual({
      ok: false,
      error: 'WALK_ALREADY_ACTIVE',
    });
  });
  test('stable codes cover the frozen rejection contracts without user copy', () => {
    const required = [
      'WALK_INVALID_STATE_TRANSITION',
      'WALK_ALREADY_ACTIVE',
      'WALK_INVALID_DURATION',
      'WALK_INVALID_DISTANCE',
      'WALK_INVALID_TIMESTAMP_ORDER',
      'WALK_UNSUPPORTED_PAYLOAD_VERSION',
      'WALK_UNSUPPORTED_ALGORITHM_VERSION',
      'WALK_INVALID_QUALITY_SUMMARY',
      'WALK_PAYLOAD_CONFLICT',
      'WALK_OVERLAP_CONFLICT',
      'WALK_SESSION_REJECTED',
      'WALK_SESSION_DELETED',
      'WALK_QUALITY_INELIGIBLE',
      'WALK_RECORD_ALREADY_CLAIMED',
      'WALK_RECORD_RECREATE_FORBIDDEN',
      'WALK_ROUTE_REVISION_CONFLICT',
    ];
    expect(WALK_ERROR_CODES).toEqual(expect.arrayContaining(required));
    expect(new Set(WALK_ERROR_CODES).size).toBe(WALK_ERROR_CODES.length);
  });
});

describe('Walk record state is relational, not another mutable source', () => {
  test.each([
    [false, false, false, false, null],
    [true, false, false, false, 'RECORD_PENDING'],
    [true, true, true, false, 'RECORDED'],
    [true, true, false, false, 'RECORD_DELETED'],
    [true, false, false, true, null],
    [true, true, true, true, 'RECORDED'],
    [true, true, false, true, 'RECORD_DELETED'],
  ] as const)(
    'accepted=%s claim=%s memory=%s deleted=%s -> %s',
    (
      serverAccepted,
      claimExists,
      originalMemoryExists,
      sessionDeleted,
      expected,
    ) => {
      expect(
        deriveWalkRecordState({
          serverAccepted,
          claimExists,
          originalMemoryExists,
          sessionDeleted,
        }),
      ).toEqual({ ok: true, value: expected });
    },
  );
  test.each([
    [false, true, false],
    [false, true, true],
    [true, false, true],
    [false, false, true],
  ])(
    'inconsistent relations are not hidden as pending',
    (serverAccepted, claimExists, originalMemoryExists) => {
      expect(
        deriveWalkRecordState({
          serverAccepted,
          claimExists,
          originalMemoryExists,
          sessionDeleted: false,
        }),
      ).toEqual({ ok: false, error: 'WALK_INVALID_RECORD_RELATION' });
    },
  );
});
