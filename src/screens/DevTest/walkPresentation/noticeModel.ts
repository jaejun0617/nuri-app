import type { WalkNativeSnapshot } from '../../../services/walk/runtime/nativeWalk';

export const WALK_NOTICE_COPY = {
  MINIMIZE_ACTIVE: {
    title: '잠깐 다른 일을 보고 와도 괜찮아요',
    body: '화면을 닫아도 산책 기록은 이어져요.\n돌아오면 함께 걷던 화면을 다시 볼 수 있어요.',
    primary: '계속 기록하고 닫기',
    secondary: '산책 화면으로 돌아가기',
    icon: 'smartphone',
  },
  MINIMIZE_PAUSED: {
    title: '편하게 쉬었다 돌아오세요',
    body: '시간과 거리 기록은 멈춘 상태로 유지돼요.\n다시 걸을 때 산책 계속하기를 눌러 주세요.',
    primary: '일시정지하고 닫기',
    secondary: '산책 화면으로 돌아가기',
    icon: 'pause-circle',
  },
  MINIMIZE_RECOVERY: {
    title: '산책은 기다리고 있을게요',
    body: '화면을 닫아도 자동으로 기록을 재개하지 않아요.\n돌아와서 이어갈지 선택해 주세요.',
    primary: '복구 대기하고 닫기',
    secondary: '산책 화면으로 돌아가기',
    icon: 'rotate-ccw',
  },
  PERMISSION_REQUIRED: {
    title: '위치 사용을 허용해 주세요',
    body: '정확한 위치를 허용하면\n함께 걸은 길을 기록할 수 있어요.',
    primary: '앱 설정 확인하기',
    secondary: '나중에 확인하기',
    icon: 'map-pin',
  },
  LOCATION_DISABLED: {
    title: '위치 기능이 꺼져 있어요',
    body: '휴대폰의 위치 기능을 켠 뒤\n산책 화면으로 돌아와 주세요.',
    primary: '위치 설정 열기',
    secondary: '산책 화면으로 돌아가기',
    icon: 'navigation',
  },
  REQUEST_FAILED: {
    title: '잠깐, 산책 상태를 확인할게요',
    body: '요청을 마치지 못했어요.\n현재 산책 상태부터 다시 확인해 볼까요?',
    primary: '상태 다시 확인하기',
    secondary: '산책 화면으로 돌아가기',
    icon: 'refresh-cw',
  },
} as const;
export type WalkNoticeKind = keyof typeof WALK_NOTICE_COPY;

export function noticeForError(code: string): WalkNoticeKind | null {
  if (
    code === 'WALK_PRECISE_LOCATION_REQUIRED' ||
    code === 'WALK_LOCATION_PERMISSION_REQUIRED'
  )
    return 'PERMISSION_REQUIRED';
  if (code === 'WALK_LOCATION_SERVICES_DISABLED') return 'LOCATION_DISABLED';
  return /^WALK_[A-Z_]+$/.test(code) ? 'REQUEST_FAILED' : null;
}

export function minimizeNotice(
  state: WalkNativeSnapshot['runtimeState'] | undefined,
): WalkNoticeKind {
  return state === 'PAUSED'
    ? 'MINIMIZE_PAUSED'
    : state === 'RECOVERY_REQUIRED'
    ? 'MINIMIZE_RECOVERY'
    : 'MINIMIZE_ACTIVE';
}
