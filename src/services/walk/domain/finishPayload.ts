import { sha256 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';
import {
  WalkDomainError,
  type WalkErrorCode,
  walkFailure,
  walkSuccess,
  type WalkResult,
} from './errorCodes';
import type {
  WalkFinishPayloadV1,
  WalkInterval,
  WalkQualitySummaryV1,
} from './types';
import {
  normalizeWalkUuid,
  parseWalkWireInteger,
  toWalkDecimal,
} from './units';
import { getDateYmdInKst, getStartOfWeekYmd } from '../../../utils/date';
import { getSeasonalThemeKey } from '../../../theme/seasonal/season';

const QUALITY_KEYS = Object.freeze([
  'schemaVersion',
  'totalFixCount',
  'acceptedFixCount',
  'rejectedAccuracyCount',
  'rejectedTimestampCount',
  'rejectedDuplicateCount',
  'rejectedJumpCount',
  'rejectedSpeedCount',
  'stationarySuppressedCount',
  'segmentCount',
  'gpsGapDurationMs',
  'maxGapDurationMs',
  'mockLocationObserved',
] as const);
const PAYLOAD_KEYS = Object.freeze([
  'payloadVersion',
  'clientSessionId',
  'petId',
  'startedAt',
  'endedAt',
  'measuredDurationMs',
  'activeDurationMs',
  'measuredDistanceM',
  'algorithmVersion',
  'qualitySchemaVersion',
  'qualitySummary',
  'routeBackupChoice',
] as const);

function requireShape(
  input: unknown,
  keys: readonly string[],
  code: WalkErrorCode,
): Record<string, unknown> {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    (Object.getPrototypeOf(input) !== Object.prototype &&
      Object.getPrototypeOf(input) !== null)
  ) {
    throw new WalkDomainError(code);
  }
  const names = Object.getOwnPropertyNames(input);
  if (
    names.length !== keys.length ||
    names.some(key => !keys.includes(key)) ||
    Object.getOwnPropertySymbols(input).length !== 0 ||
    names.some(
      key => !('value' in (Object.getOwnPropertyDescriptor(input, key) ?? {})),
    )
  ) {
    throw new WalkDomainError(code);
  }
  return input as Record<string, unknown>;
}

function qualityCount(input: unknown): number {
  if (
    typeof input !== 'number' ||
    !Number.isSafeInteger(input) ||
    input < 0 ||
    input > 2147483647
  ) {
    throw new WalkDomainError('WALK_INVALID_QUALITY_SUMMARY');
  }
  return input;
}

export function parseWalkQualitySummary(input: unknown): WalkQualitySummaryV1 {
  const value = requireShape(
    input,
    QUALITY_KEYS,
    'WALK_INVALID_QUALITY_SUMMARY',
  );
  if (
    value.schemaVersion !== 1 ||
    typeof value.mockLocationObserved !== 'boolean'
  ) {
    throw new WalkDomainError('WALK_INVALID_QUALITY_SUMMARY');
  }
  let gap: bigint;
  let maxGap: bigint;
  try {
    gap = parseWalkWireInteger(value.gpsGapDurationMs, 'DURATION');
    maxGap = parseWalkWireInteger(value.maxGapDurationMs, 'DURATION');
  } catch {
    throw new WalkDomainError('WALK_INVALID_QUALITY_SUMMARY');
  }
  // Rejection counters are mutually exclusive terminal dispositions per fix.
  const summary: WalkQualitySummaryV1 = {
    schemaVersion: 1,
    totalFixCount: qualityCount(value.totalFixCount),
    acceptedFixCount: qualityCount(value.acceptedFixCount),
    rejectedAccuracyCount: qualityCount(value.rejectedAccuracyCount),
    rejectedTimestampCount: qualityCount(value.rejectedTimestampCount),
    rejectedDuplicateCount: qualityCount(value.rejectedDuplicateCount),
    rejectedJumpCount: qualityCount(value.rejectedJumpCount),
    rejectedSpeedCount: qualityCount(value.rejectedSpeedCount),
    stationarySuppressedCount: qualityCount(value.stationarySuppressedCount),
    segmentCount: qualityCount(value.segmentCount),
    gpsGapDurationMs: toWalkDecimal(gap),
    maxGapDurationMs: toWalkDecimal(maxGap),
    mockLocationObserved: value.mockLocationObserved,
  };
  const terminalCount =
    summary.acceptedFixCount +
    summary.rejectedAccuracyCount +
    summary.rejectedTimestampCount +
    summary.rejectedDuplicateCount +
    summary.rejectedJumpCount +
    summary.rejectedSpeedCount +
    summary.stationarySuppressedCount;
  if (
    terminalCount > summary.totalFixCount ||
    summary.segmentCount > summary.acceptedFixCount ||
    maxGap > gap
  ) {
    throw new WalkDomainError('WALK_INVALID_QUALITY_SUMMARY');
  }
  return summary;
}

// Timestamp v1: explicit timezone, millisecond precision, real calendar fields.
// Date construction always has an input; neither parsing nor attribution reads
// the clock. Calendar round-trip prevents Date.parse's Feb-30 normalization.
export function normalizeWalkTimestamp(input: unknown): string {
  if (typeof input !== 'string')
    throw new WalkDomainError('WALK_INVALID_TIMESTAMP_ORDER');
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(
      input,
    );
  if (!match) throw new WalkDomainError('WALK_INVALID_TIMESTAMP_ORDER');
  const [year, month, day, hour, minute, second] = match
    .slice(1, 7)
    .map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  if (
    year < 100 ||
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() + 1 !== month ||
    calendar.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new WalkDomainError('WALK_INVALID_TIMESTAMP_ORDER');
  }
  const parsed = new Date(input);
  if (!Number.isFinite(parsed.getTime()))
    throw new WalkDomainError('WALK_INVALID_TIMESTAMP_ORDER');
  const iso = parsed.toISOString();
  if (!/^\d{4}-/.test(iso))
    throw new WalkDomainError('WALK_INVALID_TIMESTAMP_ORDER');
  return iso;
}

function getIntervalEpoch(interval: WalkInterval): readonly [number, number] {
  const start = Date.parse(normalizeWalkTimestamp(interval.startedAt));
  const end = Date.parse(normalizeWalkTimestamp(interval.endedAt));
  if (end <= start) throw new WalkDomainError('WALK_INVALID_TIMESTAMP_ORDER');
  return [start, end];
}

export function parseWalkFinishPayload(input: unknown): WalkFinishPayloadV1 {
  const value = requireShape(input, PAYLOAD_KEYS, 'WALK_INVALID_PAYLOAD');
  if (value.payloadVersion !== 1)
    throw new WalkDomainError('WALK_UNSUPPORTED_PAYLOAD_VERSION');
  // Algorithm 1 is a schema identifier, not a claim that GPS quality is tuned.
  if (value.algorithmVersion !== 1)
    throw new WalkDomainError('WALK_UNSUPPORTED_ALGORITHM_VERSION');
  if (value.qualitySchemaVersion !== 1)
    throw new WalkDomainError('WALK_INVALID_QUALITY_SUMMARY');
  if (
    value.routeBackupChoice !== 'LOCAL_ONLY' &&
    value.routeBackupChoice !== 'PRIVATE_BACKUP'
  ) {
    throw new WalkDomainError('WALK_INVALID_PAYLOAD');
  }
  const startedAt = normalizeWalkTimestamp(value.startedAt);
  const endedAt = normalizeWalkTimestamp(value.endedAt);
  const [start, end] = getIntervalEpoch({ startedAt, endedAt });
  const measuredDurationMs = parseWalkWireInteger(
    value.measuredDurationMs,
    'DURATION',
  );
  const activeDurationMs = parseWalkWireInteger(
    value.activeDurationMs,
    'DURATION',
  );
  const measuredDistanceM = parseWalkWireInteger(
    value.measuredDistanceM,
    'DISTANCE',
  );
  if (
    measuredDurationMs === 0n ||
    measuredDurationMs > BigInt(end - start) ||
    activeDurationMs > measuredDurationMs
  ) {
    throw new WalkDomainError('WALK_INVALID_DURATION');
  }
  const qualitySummary = parseWalkQualitySummary(value.qualitySummary);
  if (BigInt(qualitySummary.gpsGapDurationMs) > measuredDurationMs)
    throw new WalkDomainError('WALK_INVALID_QUALITY_SUMMARY');
  return {
    payloadVersion: 1,
    clientSessionId: normalizeWalkUuid(value.clientSessionId),
    petId: normalizeWalkUuid(value.petId),
    startedAt,
    endedAt,
    measuredDurationMs: toWalkDecimal(measuredDurationMs),
    activeDurationMs: toWalkDecimal(activeDurationMs),
    measuredDistanceM: toWalkDecimal(measuredDistanceM),
    algorithmVersion: 1,
    qualitySchemaVersion: 1,
    qualitySummary,
    routeBackupChoice: value.routeBackupChoice,
  };
}

export function canonicalizeWalkFinish(input: unknown): string {
  // Parser constructs EVERY key in versioned order. No optional/null fields in
  // V1; arbitrary input property order can never affect canonical bytes.
  return JSON.stringify(parseWalkFinishPayload(input));
}

export function getWalkFinishDigest(input: unknown): string {
  // Existing pure JS SHA-256 dependency; no WebCrypto/native/Node requirement.
  // This fingerprint is NOT authentication. Phase 4 recomputes it server-side.
  return Buffer.from(
    sha256(Buffer.from(canonicalizeWalkFinish(input), 'utf8')),
  ).toString('hex');
}

export function intervalsOverlap(
  left: WalkInterval,
  right: WalkInterval,
): boolean {
  const [leftStart, leftEnd] = getIntervalEpoch(left);
  const [rightStart, rightEnd] = getIntervalEpoch(right);
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function checkWalkOverlap(
  candidate: WalkInterval,
  liveAcceptedIntervals: readonly WalkInterval[],
): WalkResult<true> {
  getIntervalEpoch(candidate);
  return liveAcceptedIntervals.some(interval =>
    intervalsOverlap(candidate, interval),
  )
    ? walkFailure('WALK_OVERLAP_CONFLICT')
    : walkSuccess(true);
}

export function getWalkDateAttribution(
  startedAt: string,
  memoryServerSavedAt: string,
) {
  const start = new Date(normalizeWalkTimestamp(startedAt));
  const saved = new Date(normalizeWalkTimestamp(memoryServerSavedAt));
  const walkDate = getDateYmdInKst(start);
  const rewardDate = getDateYmdInKst(saved);
  const weekStartDate = getStartOfWeekYmd(walkDate, { weekStartsOn: 1 });
  if (!walkDate || !rewardDate || !weekStartDate)
    throw new WalkDomainError('WALK_INVALID_TIMESTAMP_ORDER');
  return {
    walkDate,
    memoryOccurredAt: walkDate,
    weekStartDate,
    season: getSeasonalThemeKey(start),
    rewardDate,
  };
}
