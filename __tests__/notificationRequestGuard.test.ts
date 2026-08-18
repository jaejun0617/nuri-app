import { createNotificationRequestGuard } from '../src/services/notifications/notificationRequestGuard';

describe('notification request guard', () => {
  it('새 요청이 시작되면 이전 요청을 stale로 판정한다', () => {
    const guard = createNotificationRequestGuard();
    const firstRequest = guard.begin();
    const secondRequest = guard.begin();

    expect(guard.isCurrent(firstRequest)).toBe(false);
    expect(guard.isCurrent(secondRequest)).toBe(true);
  });

  it('화면이 종료되면 늦게 도착한 응답을 적용하지 않는다', () => {
    const guard = createNotificationRequestGuard();
    const requestId = guard.begin();

    guard.deactivate();

    expect(guard.isCurrent(requestId)).toBe(false);
  });
});
