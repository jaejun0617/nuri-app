import {
  parseWalkInteger,
  toWalkDecimal,
  toSafeWalkNumber,
  getThresholdForLevel,
  getLevelForLifetimeDistance,
  getProgressWithinLevel,
  getDistanceToNextLevel,
  getProgressionSnapshot,
  toProgressionWire,
  aggregateConfirmedDistance,
  getWalkProgressView,
  getCrossedLifetimeMilestones,
  getCrossedSessionFeedback,
  getWalkRewardPolicy,
} from '../src/services/walk/domain';

describe('Canonical integer units', () => {
  test('large decimal strings round-trip exactly, never through floating km', () => {
    const value = parseWalkInteger('900719925474099312345', 'DISTANCE');
    expect(toWalkDecimal(value)).toBe('900719925474099312345');
    expect(() => toSafeWalkNumber(value)).toThrow('WALK_INTEGER_OUT_OF_RANGE');
    expect(toSafeWalkNumber(BigInt(Number.MAX_SAFE_INTEGER))).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(parseWalkInteger('000123', 'DURATION')).toBe(123n);
  });
  test.each(['-1', '+1', '1.5', '1e3', ' 1', '', 'NaN'])(
    'malformed decimal %s rejected',
    value => {
      expect(() => parseWalkInteger(value, 'DISTANCE')).toThrow(
        'WALK_INVALID_DISTANCE',
      );
      expect(() => parseWalkInteger(value, 'DURATION')).toThrow(
        'WALK_INVALID_DURATION',
      );
    },
  );
  test('unbounded decimals and invalid number conversions are rejected', () => {
    expect(() => parseWalkInteger('1'.repeat(257), 'DISTANCE')).toThrow(
      'WALK_INTEGER_OUT_OF_RANGE',
    );
    expect(() => toSafeWalkNumber(-1n)).toThrow('WALK_INTEGER_OUT_OF_RANGE');
    expect(() => parseWalkInteger(1, 'DISTANCE')).toThrow(
      'WALK_INVALID_DISTANCE',
    );
  });
});

describe('Progression policy v1, no level ceiling', () => {
  test.each([
    ['0', 1n],
    ['999', 1n],
    ['1000', 2n],
    ['2999', 2n],
    ['3000', 3n],
    ['5999', 3n],
    ['6000', 4n],
    ['9999', 4n],
    ['10000', 5n],
    ['45000', 10n],
    ['190000', 20n],
    ['435000', 30n],
    ['780000', 40n],
    ['1225000', 50n],
    ['1000000', 45n],
    ['2000000', 63n],
    ['5000000', 100n],
  ])('%sm -> level %s', (distance, level) => {
    expect(getLevelForLifetimeDistance(BigInt(distance))).toBe(level);
  });
  test('threshold -1 / exact / +1 for levels 2..200, then beyond safe number range', () => {
    const levels = [
      ...Array.from({ length: 199 }, (_, i) => BigInt(i + 2)),
      10n ** 30n,
    ];
    for (const level of levels) {
      const threshold = getThresholdForLevel(level);
      expect(threshold).toBe(500n * level * (level - 1n));
      expect(getLevelForLifetimeDistance(threshold - 1n)).toBe(level - 1n);
      expect(getLevelForLifetimeDistance(threshold)).toBe(level);
      expect(getLevelForLifetimeDistance(threshold + 1n)).toBe(level);
    }
    expect(getLevelForLifetimeDistance(10n ** 100n)).toBeGreaterThan(100n);
  });
  test('progress is an exact integer ratio; wire snapshots contain only decimals', () => {
    expect(getProgressWithinLevel(2000n)).toEqual({
      numeratorM: 1000n,
      denominatorM: 2000n,
    });
    expect(getDistanceToNextLevel(2000n)).toBe(1000n);
    expect(getDistanceToNextLevel(1000n)).toBe(2000n);
    const wire = toProgressionWire(getProgressionSnapshot(2000n));
    expect(wire.level).toBe('2');
    expect(JSON.parse(JSON.stringify(wire))).toEqual(wire);
  });
  test('negative distances and invalid levels fail instead of clamping', () => {
    expect(() => getLevelForLifetimeDistance(-1n)).toThrow(
      'WALK_INVALID_DISTANCE',
    );
    expect(() => getThresholdForLevel(0n)).toThrow('WALK_INVALID_LEVEL');
  });
});

describe('Confirmed vs provisional', () => {
  const accepted = {
    clientSessionId: 's1',
    syncState: 'ACCEPTED_SERVER' as const,
    eligibility: 'PROGRESSION_ELIGIBLE' as const,
    acceptedDistanceM: 900n,
    deleted: false,
  };
  test('only accepted, eligible, live sessions contribute, independent of memory and route', () => {
    expect(
      aggregateConfirmedDistance([
        accepted,
        {
          ...accepted,
          clientSessionId: 's2',
          eligibility: 'PROGRESSION_INELIGIBLE_QUALITY',
        },
        { ...accepted, clientSessionId: 's3', deleted: true },
        {
          clientSessionId: 's4',
          syncState: 'SYNC_PENDING',
          measuredDistanceM: 100n,
        },
      ]),
    ).toBe(900n);
  });
  test('pending display may cross a level but grants no confirmed reward', () => {
    const result = getWalkProgressView(
      900n,
      [
        {
          clientSessionId: 'p1',
          syncState: 'SYNC_PENDING',
          measuredDistanceM: 200n,
        },
      ],
      [],
    );
    expect(result.confirmed.level).toBe(1n);
    expect(result.provisional.level).toBe(2n);
    expect(result.pendingDistanceM).toBe(200n);
    expect(result.provisionalIsCanonical).toBe(false);
    expect(result.provisionalGrantsRewards).toBe(false);
  });
  test('lost response is reconciled by ID with authoritative server total, not added twice', () => {
    const result = getWalkProgressView(
      1100n,
      [
        {
          clientSessionId: 'p1',
          syncState: 'UNKNOWN_RETRYABLE',
          measuredDistanceM: 200n,
        },
        {
          clientSessionId: 'p2',
          syncState: 'REJECTED_SERVER',
          measuredDistanceM: 500n,
        },
      ],
      ['p1'],
    );
    expect(result.provisional.lifetimeDistanceM).toBe(1100n);
    expect(result.pendingDistanceM).toBe(0n);
  });
  test('duplicate session identities must not inflate totals', () => {
    expect(() => aggregateConfirmedDistance([accepted, accepted])).toThrow(
      'WALK_PAYLOAD_CONFLICT',
    );
    const p = {
      clientSessionId: 'p1',
      syncState: 'SYNC_PENDING' as const,
      measuredDistanceM: 1n,
    };
    expect(() => getWalkProgressView(0n, [p, p], [])).toThrow(
      'WALK_PAYLOAD_CONFLICT',
    );
  });
});

describe('Milestones and ephemeral session feedback', () => {
  test('first eligible session and crossed distances are permanent candidates, not receipts', () => {
    expect(
      getCrossedLifetimeMilestones({
        previousDistanceM: 0n,
        nextDistanceM: 100000n,
        previousEligibleSessionCount: 0n,
        nextEligibleSessionCount: 1n,
        eligibility: 'PROGRESSION_ELIGIBLE',
        earned: [],
      }),
    ).toEqual(['FIRST_GPS_WALK', '10_KM', '100_KM']);
  });
  test('quality-ineligible and already earned milestones never emit again', () => {
    const input = {
      previousDistanceM: 9999n,
      nextDistanceM: 10000n,
      previousEligibleSessionCount: 1n,
      nextEligibleSessionCount: 2n,
      eligibility: 'PROGRESSION_ELIGIBLE' as const,
      earned: ['FIRST_GPS_WALK', '10_KM'] as const,
    };
    expect(getCrossedLifetimeMilestones(input)).toEqual([]);
    expect(
      getCrossedLifetimeMilestones({
        ...input,
        eligibility: 'PROGRESSION_INELIGIBLE_QUALITY',
        earned: [],
      }),
    ).toEqual([]);
    expect(
      getCrossedLifetimeMilestones({
        ...input,
        previousDistanceM: 10000n,
        nextDistanceM: 9000n,
      }),
    ).toEqual([]);
  });
  test('session feedback is distinct, repeatable policy with caller-owned shown keys', () => {
    const input = {
      previousDistanceM: 0n,
      nextDistanceM: 1000n,
      previousActiveDurationMs: 0n,
      nextActiveDurationMs: 1200000n,
      shown: [],
    };
    expect(getCrossedSessionFeedback(input)).toEqual([
      'SESSION_500_M',
      'SESSION_1_KM',
      'SESSION_20_MIN',
    ]);
    expect(
      getCrossedSessionFeedback({
        ...input,
        shown: ['SESSION_500_M', 'SESSION_1_KM', 'SESSION_20_MIN'],
      }),
    ).toEqual([]);
  });
});

describe('Manual vs GPS reward separation', () => {
  test('manual memory keeps existing XP, count and streak, never Walk distance', () => {
    expect(
      getWalkRewardPolicy({ source: 'MANUAL', memoryExists: true }),
    ).toEqual({
      progressionDistanceM: 0n,
      accountXp: 'EXISTING_RECORD_POLICY',
      gpsBonusXp: 0,
      includedInRecordCount: true,
      streak: 'EXISTING_RECORD_POLICY',
      linkedRecordAllowed: false,
      manualFallbackAllowed: false,
    });
  });
  test.each([false, true])('eligible accepted GPS, memory=%s', memoryExists => {
    const result = getWalkRewardPolicy({
      source: 'GPS_TRACKED',
      syncState: 'ACCEPTED_SERVER',
      eligibility: 'PROGRESSION_ELIGIBLE',
      acceptedDistanceM: 2430n,
      deleted: false,
      memoryExists,
    });
    expect(result.progressionDistanceM).toBe(2430n);
    expect(result.accountXp).toBe(
      memoryExists ? 'EXISTING_RECORD_POLICY' : 'NONE',
    );
    expect(result.includedInRecordCount).toBe(memoryExists);
    expect(result.gpsBonusXp).toBe(0);
  });
  test('accepted quality-ineligible can record for normal XP without distance', () => {
    const result = getWalkRewardPolicy({
      source: 'GPS_TRACKED',
      syncState: 'ACCEPTED_SERVER',
      eligibility: 'PROGRESSION_INELIGIBLE_QUALITY',
      acceptedDistanceM: 2430n,
      deleted: false,
      memoryExists: true,
    });
    expect(result.progressionDistanceM).toBe(0n);
    expect(result.linkedRecordAllowed).toBe(true);
    expect(result.accountXp).toBe('EXISTING_RECORD_POLICY');
  });
  test('rejected GPS offers only explicit manual fallback, never automatic memory/XP', () => {
    const result = getWalkRewardPolicy({
      source: 'GPS_TRACKED',
      syncState: 'REJECTED_SERVER',
      memoryExists: false,
    });
    expect(result.linkedRecordAllowed).toBe(false);
    expect(result.manualFallbackAllowed).toBe(true);
    expect(result.progressionDistanceM).toBe(0n);
    expect(result.accountXp).toBe('NONE');
  });
  test('deleted session cannot create a new memory, but existing memory/XP remain', () => {
    const result = getWalkRewardPolicy({
      source: 'GPS_TRACKED',
      syncState: 'ACCEPTED_SERVER',
      eligibility: 'PROGRESSION_ELIGIBLE',
      acceptedDistanceM: 2430n,
      deleted: true,
      memoryExists: true,
    });
    expect(result.progressionDistanceM).toBe(0n);
    expect(result.linkedRecordAllowed).toBe(false);
    expect(result.accountXp).toBe('EXISTING_RECORD_POLICY');
  });
});
