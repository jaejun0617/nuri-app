export const WALK_ERROR_CODES = Object.freeze([
  'WALK_INVALID_STATE_TRANSITION',
  'WALK_ALREADY_ACTIVE',
  'WALK_INVALID_DURATION',
  'WALK_INVALID_DISTANCE',
  'WALK_INVALID_LEVEL',
  'WALK_INTEGER_OUT_OF_RANGE',
  'WALK_INVALID_TIMESTAMP_ORDER',
  'WALK_UNSUPPORTED_PAYLOAD_VERSION',
  'WALK_UNSUPPORTED_ALGORITHM_VERSION',
  'WALK_INVALID_PAYLOAD',
  'WALK_INVALID_QUALITY_SUMMARY',
  'WALK_INVALID_IDENTIFIER',
  'WALK_PAYLOAD_CONFLICT',
  'WALK_OVERLAP_CONFLICT',
  'WALK_OWNER_MISMATCH',
  'WALK_SESSION_REJECTED',
  'WALK_SESSION_DELETED',
  'WALK_QUALITY_INELIGIBLE',
  'WALK_INVALID_RECORD_RELATION',
  'WALK_RECORD_ALREADY_CLAIMED',
  'WALK_RECORD_RECREATE_FORBIDDEN',
  'WALK_REWARD_SETTLEMENT_FAILED',
  'WALK_ROUTE_REVISION_CONFLICT',
] as const);

export type WalkErrorCode = (typeof WALK_ERROR_CODES)[number];
export type WalkResult<T> =
  | { readonly ok: true; readonly value: T; readonly error?: never }
  | {
      readonly ok: false;
      readonly error: WalkErrorCode;
      readonly value?: never;
    };

// Boundary parsers throw only stable codes, never input values or private data.
export class WalkDomainError extends Error {
  constructor(readonly code: WalkErrorCode) {
    super(code);
    this.name = 'WalkDomainError';
  }
}

export function walkSuccess<T>(value: T): WalkResult<T> {
  return { ok: true, value };
}

export function walkFailure<T = never>(error: WalkErrorCode): WalkResult<T> {
  return { ok: false, error };
}
