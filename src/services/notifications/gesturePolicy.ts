// 파일: src/services/notifications/gesturePolicy.ts
// 역할:
// - 앱 내부 알림 카드의 좌우 dismiss와 상하 펼침/접힘 제스처 판정을 분리한다.
// - UI 컴포넌트 밖에서 테스트 가능한 정책으로 유지해 제스처 충돌 회귀를 줄인다.

export type NotificationCardGestureIntent =
  | 'dismiss'
  | 'expand'
  | 'collapse'
  | 'none';

type NotificationCardGestureInput = {
  dx: number;
  dy: number;
  expanded: boolean;
};

const HORIZONTAL_CAPTURE_THRESHOLD = 14;
const VERTICAL_CAPTURE_THRESHOLD = 18;
const HORIZONTAL_DISMISS_THRESHOLD = 72;
const VERTICAL_TOGGLE_THRESHOLD = 34;
const HORIZONTAL_DOMINANCE_RATIO = 1.25;
const VERTICAL_DOMINANCE_RATIO = 1.2;

function getAbsDelta(input: Pick<NotificationCardGestureInput, 'dx' | 'dy'>) {
  return {
    absDx: Math.abs(input.dx),
    absDy: Math.abs(input.dy),
  };
}

export function shouldCaptureNotificationCardGesture(
  input: Pick<NotificationCardGestureInput, 'dx' | 'dy'>,
): boolean {
  const { absDx, absDy } = getAbsDelta(input);
  const horizontalIntent =
    absDx > HORIZONTAL_CAPTURE_THRESHOLD &&
    absDx > absDy * HORIZONTAL_DOMINANCE_RATIO;
  const verticalIntent =
    absDy > VERTICAL_CAPTURE_THRESHOLD &&
    absDy > absDx * VERTICAL_DOMINANCE_RATIO;

  return horizontalIntent || verticalIntent;
}

export function getNotificationCardGestureIntent(
  input: NotificationCardGestureInput,
): NotificationCardGestureIntent {
  const { absDx, absDy } = getAbsDelta(input);

  if (
    absDx > HORIZONTAL_DISMISS_THRESHOLD &&
    absDx > absDy * HORIZONTAL_DOMINANCE_RATIO
  ) {
    return 'dismiss';
  }

  if (
    absDy > VERTICAL_TOGGLE_THRESHOLD &&
    absDy > absDx * VERTICAL_DOMINANCE_RATIO
  ) {
    if (input.dy > 0) return input.expanded ? 'none' : 'expand';
    if (input.dy < 0) return input.expanded ? 'collapse' : 'none';
  }

  return 'none';
}
