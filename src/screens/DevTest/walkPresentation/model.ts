import type { WalkNativeSnapshot } from '../../../services/walk/runtime/nativeWalk';

export const GALLERY_STATES = [
  'PRE_WALK',
  'GPS_ACQUIRING',
  'WALKING',
  'PAUSED',
  'GPS_WEAK',
  'GPS_LOST',
  'RECOVERY_REQUIRED',
  'FINISH_CONFIRM',
  'FINISHED_LOCAL',
  'FUTURE_RECORD_CTA_PREVIEW',
] as const;
export type PresentationState = (typeof GALLERY_STATES)[number];
export const WALK_COPY: Record<
  PresentationState,
  { title: string; supporting: string; icon: string }
> = {
  PRE_WALK: {
    title: '우리 둘만의 작은 산책',
    supporting: '오늘도 함께, 한 걸음씩.',
    icon: 'heart',
  },
  GPS_ACQUIRING: {
    title: '위치 신호를 찾고 있어요',
    supporting: '하늘이 잘 보이는 곳에서 잠시 기다려주세요.',
    icon: 'crosshair',
  },
  WALKING: {
    title: '함께 걷는 중',
    supporting: '우리의 걸음이 차곡차곡 쌓이고 있어요.',
    icon: 'navigation',
  },
  PAUSED: {
    title: '잠시 쉬는 중',
    supporting: '쉬는 동안에는 거리를 더하지 않아요.',
    icon: 'pause',
  },
  GPS_WEAK: {
    title: '위치 신호가 조금 약해요',
    supporting: '정확한 지점만 골라 기록하고 있어요.',
    icon: 'wifi',
  },
  GPS_LOST: {
    title: '위치 신호를 다시 찾는 중',
    supporting: '신호가 없는 구간은 거리로 추정하지 않아요.',
    icon: 'wifi-off',
  },
  RECOVERY_REQUIRED: {
    title: '중단된 산책이 있어요',
    supporting: '마지막으로 안전하게 저장된 지점부터 이어갈 수 있어요.',
    icon: 'rotate-ccw',
  },
  FINISH_CONFIRM: {
    title: '오늘 산책, 기분 좋게 마칠까요?',
    supporting: '함께 걸은 순간을 기기에 안전하게 남겨요.',
    icon: 'flag',
  },
  FINISHED_LOCAL: {
    title: '우리, 오늘도 잘 다녀왔어요!',
    supporting: '산책 결과를 기기에 안전하게 저장했어요.',
    icon: 'check-circle',
  },
  FUTURE_RECORD_CTA_PREVIEW: {
    title: '오늘의 산책을 기억해요',
    supporting: '함께 걸은 순간을 기록으로 남겨볼까요?',
    icon: 'heart',
  },
};

// These labels describe the existing presentation state, not a new GPS policy.
export const WALK_GPS_STATUS: Record<
  PresentationState,
  { label: string; icon: string }
> = {
  PRE_WALK: { label: '산책 시작 전', icon: 'map-pin' },
  GPS_ACQUIRING: { label: 'GPS 신호 대기', icon: 'crosshair' },
  WALKING: { label: 'GPS 신호 양호', icon: 'navigation' },
  PAUSED: { label: 'GPS 기록 일시정지', icon: 'pause-circle' },
  GPS_WEAK: { label: 'GPS 신호 약함', icon: 'wifi' },
  GPS_LOST: { label: 'GPS 신호 없음', icon: 'wifi-off' },
  RECOVERY_REQUIRED: { label: '복구 대기', icon: 'rotate-ccw' },
  FINISH_CONFIRM: { label: '산책 종료 확인 중', icon: 'flag' },
  FINISHED_LOCAL: { label: '기기 저장 완료', icon: 'check-circle' },
  FUTURE_RECORD_CTA_PREVIEW: { label: '향후 기록 시안', icon: 'eye' },
};

export function presentationState(
  snapshot: WalkNativeSnapshot | null,
  hasFix: boolean,
): PresentationState {
  if (!snapshot || snapshot.runtimeState === 'IDLE') return 'PRE_WALK';
  if (snapshot.runtimeState === 'RECOVERY_REQUIRED') return 'RECOVERY_REQUIRED';
  if (snapshot.runtimeState === 'FINISHED_LOCAL') return 'FINISHED_LOCAL';
  if (snapshot.runtimeState === 'PAUSED') return 'PAUSED';
  if (!hasFix) return 'GPS_ACQUIRING';
  if (snapshot.distanceSummary?.gpsSignal === 'GPS_LOST') return 'GPS_LOST';
  if (snapshot.distanceSummary?.gpsSignal === 'GPS_WEAK') return 'GPS_WEAK';
  return 'WALKING';
}

// Display formatting only: native accepted distance remains the sole measurement source.
export function metricDistance(meters: string | null): string {
  if (meters === null) return '—';
  const value = Number(meters);
  return Number.isFinite(value) && value >= 0 ? (value / 1000).toFixed(2) : '—';
}
export function metricTime(milliseconds: string): string {
  const total = Math.max(0, Math.floor(Number(milliseconds) / 1000));
  if (!Number.isFinite(total)) return '—';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  return [
    hours > 0 ? String(hours) : null,
    String(minutes).padStart(2, '0'),
    String(total % 60).padStart(2, '0'),
  ]
    .filter(v => v !== null)
    .join(':');
}
export function averageSpeed(meters: string | null, activeMs: string): string {
  const ms = Number(activeMs),
    m = meters === null ? NaN : Number(meters);
  return ms > 0 && Number.isFinite(m) ? ((m * 3600) / ms).toFixed(1) : '—';
}
export function hasActiveWalk(snapshot: WalkNativeSnapshot | null): boolean {
  return (
    !!snapshot && !['IDLE', 'FINISHED_LOCAL'].includes(snapshot.runtimeState)
  );
}
export function safeWalkError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? error.code
      : error instanceof Error
      ? error.message
      : null;
  return typeof code === 'string' && /^WALK_[A-Z_]+$/.test(code)
    ? code
    : 'WALK_QA_FAILED';
}
