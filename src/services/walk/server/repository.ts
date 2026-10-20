import {
  getWalkFinishDigest,
  normalizeWalkTimestamp,
  normalizeWalkUuid,
  parseWalkFinishPayload,
  parseWalkWireInteger,
  WALK_ERROR_CODES,
  type WalkFinishPayloadV1,
  type WalkEligibility,
} from '../domain';

export type WalkServerState = 'ACTIVE' | 'ACCEPTED_SERVER' | 'REJECTED_SERVER'
  | 'NOT_ACCEPTED_FINAL' | 'DELETED';
export type WalkServerSummary = Readonly<{
  sessionId: string;
  startedAt: string;
  endedAt: string;
  measuredDurationMs: string;
  activeDurationMs: string;
  measuredDistanceM: string;
  acceptedDistanceM: string;
  eligibility: WalkEligibility;
  acceptedAt: string;
  routeBackupChoice: 'LOCAL_ONLY' | 'PRIVATE_BACKUP';
  routeRevision: string;
  routeDeletedAt: string | null;
}>;
export type WalkServerReceipt = Readonly<{
  clientSessionId: string;
  petId: string;
  state: WalkServerState;
  payloadDigest: string | null;
  deletedAt: string | null;
  recordClaimExists: boolean;
  summary: WalkServerSummary | null;
  rejectionCode: 'WALK_OVERLAP_CONFLICT' | null;
}>;
export type WalkResolution = WalkServerReceipt |
  Readonly<{ clientSessionId: string; state: 'NOT_FOUND' }>;
export type WalkRpcTransport = (name: string, parameters: Record<string, unknown>) =>
  PromiseLike<Readonly<{ data: unknown; error: unknown }>>;

// B2 calls this ONCE on the durable filtered acceptedDistanceM string. It must
// never use Native's diagnostic measuredDistanceM or JS floating-point math.
export function floorWalkFilteredDistanceM(filteredAcceptedDistanceM: string): string {
  if (typeof filteredAcceptedDistanceM !== 'string' || filteredAcceptedDistanceM.length > 80
    || !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(filteredAcceptedDistanceM)) {
    throw new WalkServerError('WALK_INVALID_DISTANCE', false);
  }
  return parseWalkWireInteger(filteredAcceptedDistanceM.split('.')[0], 'DISTANCE').toString();
}

// Uncertain transport/server failures preserve the SAME durable Native request.
// Never log raw PostgREST errors, payloads or identifiers at this boundary.
export class WalkServerError extends Error {
  constructor(readonly code: string, readonly retryable: boolean) {
    super(code);
    this.name = 'WalkServerError';
  }
}
const invalid = (): never => { throw new WalkServerError('WALK_INVALID_SERVER_RESPONSE', true); };
function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
  return input as Record<string, unknown>;
}
function exact(input: unknown, keys: readonly string[]): Record<string, unknown> {
  const value = object(input);
  // Required V1 core only. Future progression/claim fields may be additive;
  // reconstruct an allowlisted result instead of spreading unparsed fields.
  if (keys.some(k => !Object.prototype.hasOwnProperty.call(value, k))) return invalid();
  return value;
}
function decimal(input: unknown, unit: 'DISTANCE' | 'DURATION' = 'DURATION'): string {
  try {
    const result = parseWalkWireInteger(input, unit).toString();
    if (result !== input) return invalid();
    return result;
  } catch { return invalid(); }
}
function uuid(input: unknown): string {
  try { return normalizeWalkUuid(input); } catch { return invalid(); }
}
function timestamp(input: unknown): string {
  try { return normalizeWalkTimestamp(input); } catch { return invalid(); }
}
function nullableTimestamp(input: unknown): string | null {
  return input === null ? null : timestamp(input);
}
function summary(input: unknown): WalkServerSummary {
  const v = exact(input, ['sessionId', 'startedAt', 'endedAt', 'measuredDurationMs',
    'activeDurationMs', 'measuredDistanceM', 'acceptedDistanceM', 'eligibility',
    'acceptedAt', 'routeBackupChoice', 'routeRevision', 'routeDeletedAt']);
  if (v.eligibility !== 'PROGRESSION_ELIGIBLE' && v.eligibility !== 'PROGRESSION_INELIGIBLE_QUALITY') return invalid();
  if (v.routeBackupChoice !== 'LOCAL_ONLY' && v.routeBackupChoice !== 'PRIVATE_BACKUP') return invalid();
  const result = {
    sessionId: uuid(v.sessionId), startedAt: timestamp(v.startedAt), endedAt: timestamp(v.endedAt),
    measuredDurationMs: decimal(v.measuredDurationMs), activeDurationMs: decimal(v.activeDurationMs),
    measuredDistanceM: decimal(v.measuredDistanceM, 'DISTANCE'), acceptedDistanceM: decimal(v.acceptedDistanceM, 'DISTANCE'),
    eligibility: v.eligibility, acceptedAt: timestamp(v.acceptedAt),
    routeBackupChoice: v.routeBackupChoice, routeRevision: decimal(v.routeRevision),
    routeDeletedAt: nullableTimestamp(v.routeDeletedAt),
  } satisfies WalkServerSummary;
  if (Date.parse(result.startedAt) >= Date.parse(result.endedAt)
    || BigInt(result.measuredDurationMs) === 0n
    || BigInt(result.measuredDurationMs) > BigInt(Date.parse(result.endedAt) - Date.parse(result.startedAt))
    || BigInt(result.activeDurationMs) > BigInt(result.measuredDurationMs)
    || BigInt(result.acceptedDistanceM) > BigInt(result.measuredDistanceM)
    || (result.eligibility === 'PROGRESSION_INELIGIBLE_QUALITY' && result.acceptedDistanceM !== '0')) return invalid();
  return result;
}
export function decodeWalkReceipt(input: unknown): WalkServerReceipt {
  const v = exact(input, ['clientSessionId', 'petId', 'state', 'payloadDigest', 'deletedAt',
    'recordClaimExists', 'summary', 'rejectionCode']);
  if (v.state !== 'ACTIVE' && v.state !== 'ACCEPTED_SERVER' && v.state !== 'REJECTED_SERVER'
    && v.state !== 'NOT_ACCEPTED_FINAL' && v.state !== 'DELETED') return invalid();
  if (v.payloadDigest !== null && (typeof v.payloadDigest !== 'string' || !/^[0-9a-f]{64}$/.test(v.payloadDigest))) return invalid();
  if (typeof v.recordClaimExists !== 'boolean') return invalid();
  if (v.rejectionCode !== null && v.rejectionCode !== 'WALK_OVERLAP_CONFLICT') return invalid();
  const decoded = v.summary === null ? null : summary(v.summary);
  if ((v.state === 'ACCEPTED_SERVER') !== (decoded !== null)
    || ((v.state === 'ACCEPTED_SERVER' || v.state === 'REJECTED_SERVER') && v.payloadDigest === null)
    || ((v.state === 'DELETED' || v.state === 'NOT_ACCEPTED_FINAL') && v.deletedAt === null)
    || ((v.state === 'ACTIVE' || v.state === 'NOT_ACCEPTED_FINAL') && (v.payloadDigest !== null || v.recordClaimExists))
    || (v.state !== 'DELETED' && v.state !== 'NOT_ACCEPTED_FINAL' && v.deletedAt !== null)
    || (v.state === 'REJECTED_SERVER' && (v.rejectionCode !== 'WALK_OVERLAP_CONFLICT' || v.recordClaimExists))
    || (v.state !== 'REJECTED_SERVER' && v.rejectionCode !== null)) return invalid();
  return {
    clientSessionId: uuid(v.clientSessionId), petId: uuid(v.petId), state: v.state,
    payloadDigest: v.payloadDigest, deletedAt: nullableTimestamp(v.deletedAt),
    recordClaimExists: v.recordClaimExists, summary: decoded, rejectionCode: v.rejectionCode,
  };
}
const stableCodes = new Set<string>([...WALK_ERROR_CODES, 'WALK_RESERVATION_REQUIRED']);
async function call(transport: WalkRpcTransport, name: string, parameters: Record<string, unknown>): Promise<unknown> {
  let result: Readonly<{ data: unknown; error: unknown }>;
  try { result = await transport(name, parameters); }
  catch { throw new WalkServerError('WALK_SYNC_UNKNOWN_RETRYABLE', true); }
  if (result.error) {
    const e = typeof result.error === 'object' ? result.error as Record<string, unknown> : {};
    if ((e.code === '22023' || e.code === '42501') && typeof e.details === 'string') {
      let details: unknown;
      try { details = JSON.parse(e.details); } catch { details = null; }
      if (details && typeof details === 'object' && 'walkErrorVersion' in details
        && details.walkErrorVersion === 1 && 'walkCode' in details
        && typeof details.walkCode === 'string' && stableCodes.has(details.walkCode)) {
        throw new WalkServerError(details.walkCode, false);
      }
    }
    throw new WalkServerError('WALK_SYNC_UNKNOWN_RETRYABLE', true);
  }
  return result.data;
}
function bind(receipt: WalkServerReceipt, clientSessionId: string, petId: string): WalkServerReceipt {
  if (receipt.clientSessionId !== clientSessionId || receipt.petId !== petId) return invalid();
  return receipt;
}
export function createWalkServerRepository(transport: WalkRpcTransport) {
  async function identityCall(name: string, session: string, pet: string) {
    const id = normalizeWalkUuid(session), petId = normalizeWalkUuid(pet);
    return bind(decodeWalkReceipt(await call(transport, name, {
      p_client_session_id: id, p_pet_id: petId,
    })), id, petId);
  }
  return {
    reserve: (id: string, pet: string) => identityCall('start_walk_v1', id, pet),
    cancel: (id: string, pet: string) => identityCall('cancel_walk_v1', id, pet),
    deleteSession: (id: string, pet: string) => identityCall('delete_walk_session_v1', id, pet),
    deleteRoute: (id: string, pet: string) => identityCall('delete_walk_route_v1', id, pet),
    async finish(input: WalkFinishPayloadV1): Promise<WalkServerReceipt> {
      const payload = parseWalkFinishPayload(input), digest = getWalkFinishDigest(payload);
      const receipt = bind(decodeWalkReceipt(await call(transport, 'finish_walk_v1', {
        p_payload: payload, p_payload_digest: digest,
      })), payload.clientSessionId, payload.petId);
      if (receipt.payloadDigest !== digest) return invalid();
      return receipt;
    },
    async reconcile(ids: readonly string[]): Promise<readonly WalkResolution[]> {
      const normalized = ids.map(normalizeWalkUuid);
      if (ids.length > 100 || new Set(normalized).size !== ids.length) throw new WalkServerError('WALK_INVALID_PAYLOAD', false);
      const response = await call(transport, 'get_walk_sessions_v1', { p_client_session_ids: normalized });
      if (!Array.isArray(response) || response.length !== normalized.length) return invalid();
      return response.map((entry: unknown, index): WalkResolution => {
        const value = object(entry);
        if (value.state === 'NOT_FOUND') {
          const missing = exact(value, ['clientSessionId', 'state']);
          if (uuid(missing.clientSessionId) !== normalized[index]) return invalid();
          return { clientSessionId: normalized[index], state: 'NOT_FOUND' };
        }
        const receipt = decodeWalkReceipt(value);
        if (receipt.clientSessionId !== normalized[index]) return invalid();
        return receipt;
      });
    },
  };
}
