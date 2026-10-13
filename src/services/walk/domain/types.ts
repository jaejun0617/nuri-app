export const WALK_RUNTIME_STATES = Object.freeze([
  'IDLE',
  'STARTING',
  'WALKING',
  'PAUSED',
  'FINISHING',
  'FINISHED_LOCAL',
  'RECOVERY_REQUIRED',
  'CANCELLED_LOCAL',
] as const);
export const WALK_SYNC_STATES = Object.freeze([
  'SYNC_PENDING',
  'SYNCING',
  'UNKNOWN_RETRYABLE',
  'ACCEPTED_SERVER',
  'REJECTED_SERVER',
] as const);
export const WALK_ELIGIBILITY_STATES = Object.freeze([
  'PROGRESSION_ELIGIBLE',
  'PROGRESSION_INELIGIBLE_QUALITY',
] as const);
export const WALK_RECORD_STATES = Object.freeze([
  'RECORD_PENDING',
  'RECORDED',
  'RECORD_DELETED',
] as const);
export const WALK_ROUTE_STATES = Object.freeze([
  'LOCAL_ONLY',
  'BACKUP_PENDING',
  'BACKED_UP',
  'BACKUP_RETRYABLE',
  'ROUTE_DELETED',
] as const);
export const WALK_UI_SIGNALS = Object.freeze([
  'GPS_WEAK',
  'GPS_LOST',
  'MILESTONE',
  'LEVEL_UP',
] as const);

export type WalkRuntimeState = (typeof WALK_RUNTIME_STATES)[number];
export type WalkSyncState = (typeof WALK_SYNC_STATES)[number];
export type WalkEligibility = (typeof WALK_ELIGIBILITY_STATES)[number];
export type WalkRecordState = (typeof WALK_RECORD_STATES)[number];
export type WalkRouteState = (typeof WALK_ROUTE_STATES)[number];
export type WalkUiSignal = (typeof WALK_UI_SIGNALS)[number];
export type WalkRouteBackupChoice = 'LOCAL_ONLY' | 'PRIVATE_BACKUP';
export type WalkPendingSyncState = Exclude<WalkSyncState, 'ACCEPTED_SERVER'>;

export type WalkQualitySummaryV1 = Readonly<{
  schemaVersion: 1;
  totalFixCount: number;
  acceptedFixCount: number;
  rejectedAccuracyCount: number;
  rejectedTimestampCount: number;
  rejectedDuplicateCount: number;
  rejectedJumpCount: number;
  rejectedSpeedCount: number;
  stationarySuppressedCount: number;
  segmentCount: number;
  gpsGapDurationMs: string;
  maxGapDurationMs: string;
  mockLocationObserved: boolean;
}>;

export type WalkFinishPayloadV1 = Readonly<{
  payloadVersion: 1;
  clientSessionId: string;
  petId: string;
  startedAt: string;
  endedAt: string;
  measuredDurationMs: string;
  activeDurationMs: string;
  measuredDistanceM: string;
  algorithmVersion: 1;
  qualitySchemaVersion: 1;
  qualitySummary: WalkQualitySummaryV1;
  routeBackupChoice: WalkRouteBackupChoice;
}>;

// Only the server adapter may construct accepted facts. A client measurement is
// deliberately not interchangeable with an accepted progression contribution.
export type WalkAcceptedContribution = Readonly<{
  clientSessionId: string;
  syncState: 'ACCEPTED_SERVER';
  eligibility: WalkEligibility;
  acceptedDistanceM: bigint;
  deleted: boolean;
}>;
export type WalkPendingContribution = Readonly<{
  clientSessionId: string;
  syncState: WalkPendingSyncState;
  measuredDistanceM: bigint;
}>;
export type WalkContribution =
  | WalkAcceptedContribution
  | WalkPendingContribution;

export type WalkOwnerScope = Readonly<{ userId: string; petId: string }>;
export type WalkReplayIdentity = Readonly<{
  clientSessionId: string;
  ownerScope: WalkOwnerScope;
  payloadDigest: string;
}>;
export type WalkTombstone = WalkReplayIdentity &
  Readonly<{
    deletedAt: string;
    recordClaimExists: boolean;
  }>;
export type WalkInterval = Readonly<{ startedAt: string; endedAt: string }>;

export type WalkSettlementOutcome =
  | 'XP_AWARDED'
  | 'ZERO_XP_VALID'
  | 'RECORD_CREATED_NO_XP_BY_POLICY';
export type WalkRecordClaim = Readonly<{
  sessionId: string;
  originalMemoryId: string;
  requestId: string;
  settlementOutcome: WalkSettlementOutcome;
  xpLedgerReference: string | null;
}>;
