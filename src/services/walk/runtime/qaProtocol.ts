import { walkDecimal, walkExactObject } from './distanceProjection';
export const WALK_QA_STEPS = ['READINESS', 'STATIONARY', 'OPEN_1', 'OPEN_2', 'URBAN_1', 'URBAN_2', 'REBOOT', 'CLEANUP'] as const;
export type WalkQaStepType = (typeof WALK_QA_STEPS)[number];
export const WALK_QA_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED_WITH_REASON'] as const;
export type WalkQaProtocol = Readonly<{
  schemaVersion: 1; protocolId: string; revision: string; mode: 'READINESS' | 'PHYSICAL';
  stepIndex: number; cleaned: boolean;
  steps: ReadonlyArray<Readonly<{ stepType: WalkQaStepType; status: (typeof WALK_QA_STATUSES)[number]; error: string | null; receipt: Readonly<Record<string, unknown>> | null }>>;
}>;
export function assertWalkQaReceiptSafe(input: unknown): void {
  if (Array.isArray(input)) { input.forEach(assertWalkQaReceiptSafe); return; }
  if (!input || typeof input !== 'object') return;
  const forbidden = new Set(['latitude', 'longitude', 'route', 'rawRoute', 'coordinates', 'owner', 'pet', 'session', 'sessionId', 'userId', 'petId', 'token', 'credential', 'email', 'url', 'path', 'baseline', 'command']);
  const allowed = new Set(['schemaVersion', 'protocolId', 'revision', 'mode', 'stepIndex', 'cleaned', 'steps', 'stepType', 'status', 'error', 'receipt', 'sha256',
    'receiptId', 'routeLabel', 'referenceDistanceM', 'measuredDistanceM', 'acceptedDistanceM', 'errorPercentage', 'activeDurationMs', 'pausedDurationMs',
    'quality', 'routeSummary', 'performance', 'pauseDistanceDeltaM', 'pauseObserved', 'rebootContract', 'algorithmVersion', 'policyVersion', 'result', 'stableErrorCode',
    'totalFixCount', 'acceptedFixCount', 'rejectedAccuracyCount', 'rejectedTimestampCount', 'rejectedDuplicateCount', 'rejectedJumpCount', 'rejectedSpeedCount', 'stationarySuppressedCount',
    'segmentCount', 'gpsGapDurationMs', 'maxGapDurationMs', 'mockLocationObserved', 'filteredPointCount', 'simplifiedPointCount', 'filteredRouteDistanceM', 'simplifiedRouteDistanceM',
    'lengthDeviation', 'endpointLoss', 'segmentMerge', 'gapBridgeM', 'turnLoss', 'filteredTurnCount', 'preservedTurnCount', 'batteryStart', 'batteryEnd', 'batteryTemperatureMaxC', 'thermalMax', 'cpuPeakPercent', 'cpuObservedMs',
    'pssStartKb', 'pssEndKb', 'pssPeakKb', 'rssPeakKb', 'nativeHeapStartBytes', 'nativeHeapEndBytes', 'nativeHeapPeakBytes', 'observedMs', 'screenOnMs', 'screenOffMs', 'backgroundMs',
    'sampleCount', 'appVsyncFrames', 'appVsyncLateFrames', 'frameScope', 'jsMemoryStatus', 'removedQaSessions', 'temporaryRouteRemaining']);
  for (const [key, value] of Object.entries(input)) {
    if (forbidden.has(key) || key.startsWith('_') || !allowed.has(key)) throw new Error('WALK_QA_RECEIPT_PRIVATE_FIELD');
    assertWalkQaReceiptSafe(value);
  }
}
export function decodeWalkQaProtocol(input: unknown): WalkQaProtocol | null {
  if (input === null) return null;
  assertWalkQaReceiptSafe(input);
  const v = walkExactObject(input, ['schemaVersion', 'protocolId', 'revision', 'mode', 'stepIndex', 'cleaned', 'steps']);
  if (v.schemaVersion !== 1 || typeof v.protocolId !== 'string' || !/^[a-f0-9-]{36}$/.test(v.protocolId)
    || typeof v.revision !== 'string' || !/^[1-9][0-9]*$/.test(v.revision)
    || (v.mode !== 'READINESS' && v.mode !== 'PHYSICAL') || typeof v.cleaned !== 'boolean'
    || typeof v.stepIndex !== 'number' || !Number.isSafeInteger(v.stepIndex) || !Array.isArray(v.steps)
    || v.steps.length < 2 || v.steps.length > 7 || v.stepIndex < 0 || v.stepIndex > v.steps.length) throw new Error('WALK_QA_PROTOCOL_INVALID');
  const steps = v.steps.map((item: unknown) => {
    const s = walkExactObject(item, ['stepType', 'status', 'error', 'receipt']);
    if (!WALK_QA_STEPS.includes(s.stepType as WalkQaStepType) || !WALK_QA_STATUSES.includes(s.status as (typeof WALK_QA_STATUSES)[number])
      || !(s.error === null || typeof s.error === 'string' && /^[A-Z_]+$/.test(s.error))
      || !(s.receipt === null || typeof s.receipt === 'object' && !Array.isArray(s.receipt))) throw new Error('WALK_QA_PROTOCOL_INVALID');
    return s as WalkQaProtocol['steps'][number];
  });
  if (steps.at(-1)?.stepType !== 'CLEANUP' || new Set(steps.map(s => s.stepType)).size !== steps.length
    || (v.mode === 'READINESS' && steps.map(s => s.stepType).join(',') !== 'READINESS,CLEANUP')) throw new Error('WALK_QA_PROTOCOL_INVALID');
  return { schemaVersion: 1, protocolId: v.protocolId, revision: v.revision, mode: v.mode,
    stepIndex: v.stepIndex, cleaned: v.cleaned, steps };
}
export function walkQaReference(label: string, meters: string): Readonly<{ label: string; meters: number }> {
  if (!/^[A-Z][A-Z0-9_-]{0,31}$/.test(label) || !walkDecimal(meters) || Number(meters) < 500 || Number(meters) > 2000) throw new Error('WALK_QA_PROTOCOL_INVALID');
  return { label, meters: Number(meters) };
}
export const WALK_QA_STEP_COPY: Readonly<Record<WalkQaStepType, string>> = {
  READINESS: '준비 점검입니다. 실제 보행 정확도는 아직 판정하지 않습니다.',
  STATIONARY: '같은 장소에서 10분간 정지합니다. 안전한 장소에서 진행하세요.',
  OPEN_1: '독립 기준 거리를 확인한 개방 구간입니다. 화면을 켜고 진행합니다.',
  OPEN_2: '같은 개방 구간입니다. 일부 화면 OFF와 일시정지·재개를 포함합니다.',
  URBAN_1: '독립 기준 거리를 확인한 도심 구간입니다. 급회전 3개 이상을 포함합니다.',
  URBAN_2: '도심 구간과 승인된 GPS gap 시나리오입니다. 45초 이상 신호 단절 후 새 구간을 확인합니다.',
  REBOOT: '재부팅 기준점을 먼저 저장합니다. 직접 재부팅·잠금 해제 후 앱에서 수동 재개하고 짧은 구간을 걷습니다.',
  CLEANUP: '영수증을 보존하고 이 검증의 로컬 경로와 체크포인트만 제거합니다.',
};
