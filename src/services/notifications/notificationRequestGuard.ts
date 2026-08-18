// 파일: src/services/notifications/notificationRequestGuard.ts
// 목적:
// - 알림함 요청 중 최신 요청만 화면 상태에 반영하도록 lifecycle을 제한한다.
// - 화면이 unmount된 뒤 늦게 도착한 사용자/session 응답은 폐기한다.

export type NotificationRequestGuard = {
  begin: () => number;
  isCurrent: (requestId: number) => boolean;
  activate: () => void;
  deactivate: () => void;
};

export function createNotificationRequestGuard(): NotificationRequestGuard {
  let latestRequestId = 0;
  let active = true;

  return {
    begin: () => {
      latestRequestId += 1;
      return latestRequestId;
    },
    isCurrent: (requestId: number) =>
      active && requestId === latestRequestId,
    activate: () => {
      active = true;
    },
    deactivate: () => {
      active = false;
      latestRequestId += 1;
    },
  };
}
