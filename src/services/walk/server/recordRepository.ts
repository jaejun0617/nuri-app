import { getDateYmdInKst, isYmdString } from '../../../utils/date';
import {
  normalizeWalkTimestamp,
  normalizeWalkUuid,
  parseWalkWireInteger,
  type WalkSettlementOutcome,
} from '../domain';
import { WalkServerError, type WalkRpcTransport } from './repository';

export type WalkRecordSummary = Readonly<{
  sessionId: string;
  startedAt: string;
  endedAt: string;
  acceptedAt: string;
  measuredDurationMs: string;
  activeDurationMs: string;
  measuredDistanceM: string;
  acceptedDistanceM: string;
  eligibility: 'PROGRESSION_ELIGIBLE' | 'PROGRESSION_INELIGIBLE_QUALITY';
}>;
export type WalkMemoryDraft = Readonly<{
  title: string;
  content?: string | null;
  emotion?: string | null;
  tags?: readonly string[];
  imagePath?: string | null;
  imagePaths?: readonly string[];
}>;
export type WalkLinkedMemory = Readonly<{
  id: string;
  petId: string;
  title: string;
  content: string | null;
  emotion: string | null;
  tags: readonly string[];
  category: 'walk';
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  imagePath: string | null;
  imagePaths: readonly string[];
}>;
export type WalkServerClaim = Readonly<{
  sessionId: string;
  originalMemoryId: string;
  requestId: string;
  claimedAt: string;
  settledAt: string;
  activityDateKst: string;
  settlementOutcome: WalkSettlementOutcome;
  xpLedgerReference: string | null;
}>;
export type WalkRecordView = Readonly<{
  version: 1;
  source: 'GPS_TRACKED';
  clientSessionId: string;
  petId: string;
  sessionDeleted: boolean;
  recordState: 'RECORD_PENDING' | 'RECORDED' | 'RECORD_DELETED' | null;
  summary: WalkRecordSummary | null;
  claim: WalkServerClaim | null;
  memory: WalkLinkedMemory | null;
}>;
export type WalkRecordReference = Pick<
  WalkRecordView,
  | 'version'
  | 'source'
  | 'clientSessionId'
  | 'petId'
  | 'sessionDeleted'
  | 'recordState'
  | 'summary'
> &
  Readonly<{ originalMemoryId: string | null }>;
export type WalkMemorySourceSummary = Omit<
  WalkRecordReference,
  'originalMemoryId' | 'recordState'
> &
  Readonly<{ memoryId: string; recordState: 'RECORDED' }>;
export type WalkRecordCursor = Readonly<{
  version: 1;
  petId: string;
  pageSize: number;
  acceptedAt: string;
  clientSessionId: string;
}>;
export type WalkRecordActivity = Readonly<{
  currentStreak: number;
  bestStreak: number;
  todayCompleted: boolean;
  inserted: boolean;
  showCelebration: boolean;
  activityDateKst: string;
}>;
export type WalkRecordReward = Readonly<{
  awarded: boolean;
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
}>;
export type WalkRecordCommit = Readonly<{
  record: WalkRecordView;
  replayed: boolean;
  activity: WalkRecordActivity | null;
  reward: WalkRecordReward | null;
}>;

// Any failure, including malformed/unknown replies, leaves the owner/pet/session
// draft intact. E clears only the matching scope after a validated commit.
export class WalkRecordError extends WalkServerError {
  readonly preserveDraft = true;
}
const invalid = (): never => {
  throw new WalkRecordError('WALK_INVALID_RECORD_RESPONSE', true);
};
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return invalid();
  return v as Record<string, unknown>;
}
function id(v: unknown): string {
  try {
    return normalizeWalkUuid(v);
  } catch {
    return invalid();
  }
}
function time(v: unknown): string {
  try {
    return normalizeWalkTimestamp(v);
  } catch {
    return invalid();
  }
}
function date(v: unknown): string {
  if (typeof v !== 'string' || !isYmdString(v)) return invalid();
  return v;
}
function integer(v: unknown, min = 0, max = 2147483647): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max)
    return invalid();
  return v;
}
function bool(v: unknown): boolean {
  if (typeof v !== 'boolean') return invalid();
  return v;
}
function text(v: unknown, max: number, nullable = false): string | null {
  if (nullable && v === null) return null;
  if (typeof v !== 'string' || v.length > max) return invalid();
  return v;
}
function strings(
  v: unknown,
  maxItems: number,
  maxLength: number,
): readonly string[] {
  if (!Array.isArray(v) || v.length > maxItems) return invalid();
  return v.map(x => {
    const s = text(x, maxLength);
    if (s === null) return invalid();
    return s;
  });
}
function decimal(v: unknown, unit: 'DISTANCE' | 'DURATION'): string {
  try {
    const n = parseWalkWireInteger(v, unit).toString();
    if (n !== v) return invalid();
    return n;
  } catch {
    return invalid();
  }
}
const emotions = new Set([
  'happy',
  'calm',
  'excited',
  'neutral',
  'sad',
  'anxious',
  'angry',
  'tired',
]);
function summary(input: unknown): WalkRecordSummary {
  const v = object(input);
  if (
    v.eligibility !== 'PROGRESSION_ELIGIBLE' &&
    v.eligibility !== 'PROGRESSION_INELIGIBLE_QUALITY'
  )
    return invalid();
  const r: WalkRecordSummary = {
    sessionId: id(v.sessionId),
    startedAt: time(v.startedAt),
    endedAt: time(v.endedAt),
    acceptedAt: time(v.acceptedAt),
    measuredDurationMs: decimal(v.measuredDurationMs, 'DURATION'),
    activeDurationMs: decimal(v.activeDurationMs, 'DURATION'),
    measuredDistanceM: decimal(v.measuredDistanceM, 'DISTANCE'),
    acceptedDistanceM: decimal(v.acceptedDistanceM, 'DISTANCE'),
    eligibility: v.eligibility,
  };
  if (
    Date.parse(r.startedAt) >= Date.parse(r.endedAt) ||
    BigInt(r.measuredDurationMs) === 0n ||
    BigInt(r.measuredDurationMs) >
      BigInt(Date.parse(r.endedAt) - Date.parse(r.startedAt)) ||
    BigInt(r.activeDurationMs) > BigInt(r.measuredDurationMs) ||
    BigInt(r.acceptedDistanceM) > BigInt(r.measuredDistanceM) ||
    (r.eligibility === 'PROGRESSION_INELIGIBLE_QUALITY' &&
      r.acceptedDistanceM !== '0')
  )
    return invalid();
  return r;
}
function claim(input: unknown): WalkServerClaim {
  const v = object(input);
  if (
    v.settlementOutcome !== 'XP_AWARDED' &&
    v.settlementOutcome !== 'ZERO_XP_VALID' &&
    v.settlementOutcome !== 'RECORD_CREATED_NO_XP_BY_POLICY'
  )
    return invalid();
  const r: WalkServerClaim = {
    sessionId: id(v.sessionId),
    originalMemoryId: id(v.originalMemoryId),
    requestId: id(v.requestId),
    claimedAt: time(v.claimedAt),
    settledAt: time(v.settledAt),
    activityDateKst: date(v.activityDateKst),
    settlementOutcome: v.settlementOutcome,
    xpLedgerReference:
      v.xpLedgerReference === null ? null : id(v.xpLedgerReference),
  };
  if (
    (r.settlementOutcome === 'XP_AWARDED') !== (r.xpLedgerReference !== null) ||
    r.settledAt < r.claimedAt ||
    getDateYmdInKst(r.claimedAt) !== r.activityDateKst
  )
    return invalid();
  return r;
}
function memory(input: unknown): WalkLinkedMemory {
  const v = object(input),
    title = text(v.title, 100),
    content = text(v.content, 5000, true),
    emotion = text(v.emotion, 20, true);
  if (
    v.category !== 'walk' ||
    title === null ||
    !title.trim() ||
    (emotion !== null && !emotions.has(emotion))
  )
    return invalid();
  return {
    id: id(v.id),
    petId: id(v.petId),
    title,
    content,
    emotion,
    tags: strings(v.tags, 20, 100),
    category: 'walk',
    occurredAt: date(v.occurredAt),
    createdAt: time(v.createdAt),
    updatedAt: time(v.updatedAt),
    imagePath: text(v.imagePath, 1024, true),
    imagePaths: strings(v.imagePaths, 10, 1024),
  };
}
export function decodeWalkRecordView(
  input: unknown,
  expectedPet: string,
  expectedSession?: string,
): WalkRecordView {
  const v = object(input);
  if (
    v.version !== 1 ||
    v.source !== 'GPS_TRACKED' ||
    (v.recordState !== null &&
      v.recordState !== 'RECORD_PENDING' &&
      v.recordState !== 'RECORDED' &&
      v.recordState !== 'RECORD_DELETED')
  )
    return invalid();
  const r: WalkRecordView = {
    version: 1,
    source: 'GPS_TRACKED',
    clientSessionId: id(v.clientSessionId),
    petId: id(v.petId),
    sessionDeleted: bool(v.sessionDeleted),
    recordState: v.recordState,
    summary: v.summary === null ? null : summary(v.summary),
    claim: v.claim === null ? null : claim(v.claim),
    memory: v.memory === null ? null : memory(v.memory),
  };
  if (
    r.petId !== normalizeWalkUuid(expectedPet) ||
    (expectedSession &&
      r.clientSessionId !== normalizeWalkUuid(expectedSession)) ||
    (r.sessionDeleted && r.summary !== null) ||
    (r.claim === null && r.memory !== null) ||
    (r.recordState === 'RECORDED' || r.recordState === 'RECORD_DELETED') !==
      (r.claim !== null) ||
    (r.claim !== null &&
      r.recordState !== (r.memory ? 'RECORDED' : 'RECORD_DELETED')) ||
    (r.recordState === 'RECORD_PENDING' &&
      (r.claim !== null || r.summary === null || r.sessionDeleted)) ||
    (r.recordState === null && (r.claim !== null || r.summary !== null)) ||
    (r.summary && r.claim && r.summary.sessionId !== r.claim.sessionId) ||
    (r.memory &&
      (!r.claim ||
        r.memory.id !== r.claim.originalMemoryId ||
        r.memory.petId !== r.petId ||
        getDateYmdInKst(r.memory.createdAt) !== r.claim.activityDateKst ||
        (r.summary &&
          getDateYmdInKst(r.summary.startedAt) !== r.memory.occurredAt)))
  )
    return invalid();
  return r;
}
function reference(input: unknown, expectedPet: string): WalkRecordReference {
  const v = object(input);
  if (
    v.version !== 1 ||
    v.source !== 'GPS_TRACKED' ||
    (v.recordState !== null &&
      v.recordState !== 'RECORD_PENDING' &&
      v.recordState !== 'RECORDED' &&
      v.recordState !== 'RECORD_DELETED')
  )
    return invalid();
  const r: WalkRecordReference = {
    version: 1,
    source: 'GPS_TRACKED',
    clientSessionId: id(v.clientSessionId),
    petId: id(v.petId),
    sessionDeleted: bool(v.sessionDeleted),
    recordState: v.recordState,
    summary: v.summary === null ? null : summary(v.summary),
    originalMemoryId:
      v.originalMemoryId === null ? null : id(v.originalMemoryId),
  };
  if (
    r.petId !== expectedPet ||
    (r.sessionDeleted && r.summary !== null) ||
    (!r.sessionDeleted && r.summary === null) ||
    (r.recordState === null && !r.sessionDeleted) ||
    (r.recordState === 'RECORDED' || r.recordState === 'RECORD_DELETED') !==
      (r.originalMemoryId !== null) ||
    (r.recordState === 'RECORD_PENDING' && r.sessionDeleted)
  )
    return invalid();
  return r;
}
function cursor(input: unknown, pet: string, size: number): WalkRecordCursor {
  const v = object(input);
  if (
    v.version !== 1 ||
    id(v.petId) !== pet ||
    integer(v.pageSize, 1, 100) !== size ||
    typeof v.acceptedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(v.acceptedAt)
  )
    return invalid();
  // Preserve ALL six server microsecond digits for keyset identity. Never round
  // this cursor through the millisecond presentation timestamp.
  time(v.acceptedAt.slice(0, 23) + 'Z');
  return {
    version: 1,
    petId: pet,
    pageSize: size,
    acceptedAt: v.acceptedAt,
    clientSessionId: id(v.clientSessionId),
  };
}
export function decodeWalkRecordCommit(
  input: unknown,
  session: string,
  pet: string,
  candidateMemory: string,
  request: string,
): WalkRecordCommit {
  const v = object(input),
    record = decodeWalkRecordView(v.record, pet, session),
    replayed = bool(v.replayed);
  if (
    record.recordState !== 'RECORDED' ||
    !record.memory ||
    !record.claim ||
    record.sessionDeleted
  )
    return invalid();
  if (replayed) {
    if (v.activity !== null || v.reward !== null) return invalid();
    return { record, replayed, activity: null, reward: null };
  }
  if (
    record.memory.id !== normalizeWalkUuid(candidateMemory) ||
    record.claim.requestId !== normalizeWalkUuid(request)
  )
    return invalid();
  const d = object(v.activity),
    x = object(v.reward);
  const activity: WalkRecordActivity = {
    currentStreak: integer(d.current_streak),
    bestStreak: integer(d.best_streak),
    todayCompleted: bool(d.today_completed),
    inserted: bool(d.inserted),
    showCelebration: bool(d.show_celebration),
    activityDateKst: date(d.activity_date_kst),
  };
  const reward: WalkRecordReward = {
    awarded: bool(x.awarded),
    xpAwarded: integer(x.xp_awarded),
    totalXp: integer(x.total_xp),
    level: integer(x.level, 1, 100),
    leveledUp: bool(x.leveled_up),
  };
  if (
    !activity.inserted ||
    !activity.todayCompleted ||
    activity.bestStreak < activity.currentStreak ||
    activity.activityDateKst !== record.claim.activityDateKst ||
    reward.awarded !== reward.xpAwarded > 0 ||
    reward.totalXp < reward.xpAwarded ||
    reward.awarded !== (record.claim.settlementOutcome === 'XP_AWARDED') ||
    record.claim.settlementOutcome === 'RECORD_CREATED_NO_XP_BY_POLICY'
  )
    return invalid();
  return { record, replayed, activity, reward };
}
const permanent = new Set([
  'WALK_OWNER_MISMATCH',
  'WALK_INVALID_IDENTIFIER',
  'WALK_SESSION_REJECTED',
  'WALK_SESSION_DELETED',
  'WALK_INVALID_RECORD_RELATION',
  'WALK_RECORD_ALREADY_CLAIMED',
  'WALK_RECORD_RECREATE_FORBIDDEN',
  'WALK_INVALID_RECORD_INPUT',
  'WALK_RECORD_CURSOR_INVALID',
  'WALK_LINKED_RECORD_IMMUTABLE',
]);
async function call(
  transport: WalkRpcTransport,
  name: string,
  parameters: Record<string, unknown>,
): Promise<unknown> {
  let result: Readonly<{ data: unknown; error: unknown }>;
  try {
    result = await transport(name, parameters);
  } catch {
    throw new WalkRecordError('WALK_SYNC_UNKNOWN_RETRYABLE', true);
  }
  if (result.error) {
    const e =
      typeof result.error === 'object' && result.error !== null
        ? (result.error as Record<string, unknown>)
        : {};
    if (
      (e.code === '22023' || e.code === '42501') &&
      typeof e.details === 'string'
    ) {
      let d: unknown;
      try {
        d = JSON.parse(e.details);
      } catch {
        d = null;
      }
      if (
        d &&
        typeof d === 'object' &&
        'walkErrorVersion' in d &&
        d.walkErrorVersion === 1 &&
        'walkCode' in d &&
        typeof d.walkCode === 'string'
      ) {
        if (permanent.has(d.walkCode))
          throw new WalkRecordError(d.walkCode, false);
        if (d.walkCode === 'WALK_REWARD_SETTLEMENT_FAILED')
          throw new WalkRecordError(d.walkCode, true);
      }
    }
    throw new WalkRecordError('WALK_SYNC_UNKNOWN_RETRYABLE', true);
  }
  return result.data;
}
export function walkRecordDraftScope(
  owner: string,
  pet: string,
  session: string,
): string {
  return [
    'walk-record-v1',
    normalizeWalkUuid(owner),
    normalizeWalkUuid(pet),
    normalizeWalkUuid(session),
  ].join(':');
}
function draft(value: WalkMemoryDraft): WalkMemoryDraft {
  const v = object(value),
    title = text(v.title, 100),
    content = v.content === undefined ? null : text(v.content, 5000, true);
  const emotion = v.emotion === undefined ? null : text(v.emotion, 20, true);
  if (!title?.trim() || (emotion !== null && !emotions.has(emotion)))
    throw new WalkRecordError('WALK_INVALID_RECORD_INPUT', false);
  if (
    Object.keys(v).some(
      k =>
        ![
          'title',
          'content',
          'emotion',
          'tags',
          'imagePath',
          'imagePaths',
        ].includes(k),
    )
  )
    throw new WalkRecordError('WALK_INVALID_RECORD_INPUT', false);
  return {
    title: title.trim(),
    content,
    emotion,
    tags: strings(v.tags ?? [], 20, 100),
    imagePath: v.imagePath === undefined ? null : text(v.imagePath, 1024, true),
    imagePaths: strings(v.imagePaths ?? [], 10, 1024),
  };
}
export function createWalkRecordRepository(transport: WalkRpcTransport) {
  return {
    async create(
      input: Readonly<{
        clientSessionId: string;
        petId: string;
        memoryId: string;
        requestId: string;
        record: WalkMemoryDraft;
      }>,
    ): Promise<WalkRecordCommit> {
      const session = normalizeWalkUuid(input.clientSessionId),
        pet = normalizeWalkUuid(input.petId),
        m = normalizeWalkUuid(input.memoryId),
        request = normalizeWalkUuid(input.requestId);
      const response = await call(
        transport,
        'create_walk_memory_from_session_v1',
        {
          p_client_session_id: session,
          p_pet_id: pet,
          p_memory_id: m,
          p_request_id: request,
          p_record: draft(input.record),
        },
      );
      return decodeWalkRecordCommit(response, session, pet, m, request);
    },
    async get(session: string, petId: string): Promise<WalkRecordView> {
      const s = normalizeWalkUuid(session),
        pet = normalizeWalkUuid(petId);
      return decodeWalkRecordView(
        await call(transport, 'get_walk_record_v1', {
          p_client_session_id: s,
          p_pet_id: pet,
        }),
        pet,
        s,
      );
    },
    async memorySummaries(
      expected: readonly Readonly<{ memoryId: string; petId: string }>[],
    ): Promise<readonly WalkMemorySourceSummary[]> {
      // Capture request scope BEFORE awaiting. Multi-pet views must explicitly
      // supply each Memory's expected pet; never bind to the echoed response.
      const scope = new Map(
        expected.map(item => [
          normalizeWalkUuid(item.memoryId),
          normalizeWalkUuid(item.petId),
        ]),
      );
      const ids = [...scope.keys()];
      if (ids.length < 1 || ids.length > 100 || scope.size !== expected.length)
        throw new WalkRecordError('WALK_INVALID_RECORD_INPUT', false);
      const v = object(
        await call(transport, 'get_walk_memory_summaries_v1', {
          p_memory_ids: ids,
        }),
      );
      if (!Array.isArray(v.items) || v.items.length > ids.length)
        return invalid();
      const items = v.items.map(x => {
        const a = object(x),
          memoryId = id(a.memoryId),
          expectedPet = scope.get(memoryId);
        if (!expectedPet) return invalid();
        const r = reference({ ...a, originalMemoryId: memoryId }, expectedPet);
        if (r.recordState !== 'RECORDED') return invalid();
        return {
          version: r.version,
          source: r.source,
          clientSessionId: r.clientSessionId,
          petId: r.petId,
          sessionDeleted: r.sessionDeleted,
          summary: r.summary,
          memoryId,
          recordState: 'RECORDED' as const,
        };
      });
      if (new Set(items.map(x => x.memoryId)).size !== items.length)
        return invalid();
      return items;
    },
    async history(
      petId: string,
      size = 30,
      after: WalkRecordCursor | null = null,
    ): Promise<
      Readonly<{
        items: readonly WalkRecordReference[];
        hasMore: boolean;
        nextCursor: WalkRecordCursor | null;
      }>
    > {
      const pet = normalizeWalkUuid(petId);
      integer(size, 1, 100);
      if (after) cursor(after, pet, size);
      const v = object(
        await call(transport, 'get_walk_record_history_v1', {
          p_pet_id: pet,
          p_limit: size,
          p_cursor: after,
        }),
      );
      if (!Array.isArray(v.items) || v.items.length > size) return invalid();
      const items = v.items.map(x => reference(x, pet)),
        hasMore = bool(v.hasMore),
        nextCursor =
          v.nextCursor === null ? null : cursor(v.nextCursor, pet, size);
      if (
        new Set(items.map(x => x.clientSessionId)).size !== items.length ||
        items.some(x => x.sessionDeleted || x.summary === null) ||
        hasMore !== (nextCursor !== null) ||
        (hasMore && items.length !== size) ||
        (nextCursor &&
          nextCursor.clientSessionId !==
            items[items.length - 1]?.clientSessionId) ||
        (nextCursor &&
          time(nextCursor.acceptedAt.slice(0, 23) + 'Z') !==
            items[items.length - 1]?.summary?.acceptedAt)
      )
        return invalid();
      return { items, hasMore, nextCursor };
    },
    async prompt(petId: string): Promise<WalkRecordReference | null> {
      const pet = normalizeWalkUuid(petId),
        v = object(
          await call(transport, 'get_walk_record_prompt_v1', { p_pet_id: pet }),
        );
      if (v.item === null) return null;
      const r = reference(v.item, pet);
      if (r.recordState !== 'RECORD_PENDING') return invalid();
      return r;
    },
    async dismiss(session: string, petId: string): Promise<void> {
      const s = normalizeWalkUuid(session),
        pet = normalizeWalkUuid(petId);
      const v = object(
        await call(transport, 'dismiss_walk_record_prompt_v1', {
          p_client_session_id: s,
          p_pet_id: pet,
        }),
      );
      if (
        v.dismissed !== true ||
        id(v.clientSessionId) !== s ||
        id(v.petId) !== pet
      )
        return invalid();
    },
  };
}
