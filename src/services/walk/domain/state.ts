import { walkFailure, walkSuccess, type WalkResult } from './errorCodes';
import {
  WALK_RUNTIME_STATES,
  type WalkRecordState,
  type WalkRuntimeState,
} from './types';

const TRANSITIONS: Readonly<
  Record<WalkRuntimeState, readonly WalkRuntimeState[]>
> = Object.freeze({
  IDLE: Object.freeze(['STARTING'] as const),
  STARTING: Object.freeze(['WALKING', 'IDLE'] as const),
  WALKING: Object.freeze(['PAUSED', 'FINISHING', 'RECOVERY_REQUIRED'] as const),
  PAUSED: Object.freeze(['WALKING', 'FINISHING', 'RECOVERY_REQUIRED'] as const),
  FINISHING: Object.freeze(['FINISHED_LOCAL'] as const),
  FINISHED_LOCAL: Object.freeze([]),
  RECOVERY_REQUIRED: Object.freeze([
    'PAUSED',
    'FINISHING',
    'CANCELLED_LOCAL',
  ] as const),
  CANCELLED_LOCAL: Object.freeze([]),
});

function isRuntimeState(value: string): value is WalkRuntimeState {
  return WALK_RUNTIME_STATES.some(state => state === value);
}

export function transitionWalkRuntime(
  from: string,
  to: string,
): WalkResult<WalkRuntimeState> {
  if (
    !isRuntimeState(from) ||
    !isRuntimeState(to) ||
    !TRANSITIONS[from].includes(to)
  ) {
    return walkFailure('WALK_INVALID_STATE_TRANSITION');
  }
  return walkSuccess(to);
}

// A terminal session is archived by the future runtime before creating a NEW
// IDLE session; this function does not reset or reuse the old session identity.
export function assertCanStartWalk(current: string): WalkResult<true> {
  if (!isRuntimeState(current))
    return walkFailure('WALK_INVALID_STATE_TRANSITION');
  if (
    current !== 'IDLE' &&
    current !== 'FINISHED_LOCAL' &&
    current !== 'CANCELLED_LOCAL'
  ) {
    return walkFailure('WALK_ALREADY_ACTIVE');
  }
  return walkSuccess(true);
}

export function deriveWalkRecordState(
  input: Readonly<{
    serverAccepted: boolean;
    claimExists: boolean;
    originalMemoryExists: boolean;
    sessionDeleted: boolean;
  }>,
): WalkResult<WalkRecordState | null> {
  if (
    (!input.serverAccepted &&
      (input.claimExists || input.originalMemoryExists)) ||
    (input.originalMemoryExists && !input.claimExists)
  ) {
    return walkFailure('WALK_INVALID_RECORD_RELATION');
  }
  if (!input.serverAccepted) return walkSuccess(null);
  if (input.claimExists)
    return walkSuccess(
      input.originalMemoryExists ? 'RECORDED' : 'RECORD_DELETED',
    );
  return walkSuccess(input.sessionDeleted ? null : 'RECORD_PENDING');
}
