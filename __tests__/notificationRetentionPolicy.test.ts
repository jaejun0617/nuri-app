import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildHomeNotificationDismissStorageKey,
  dismissHomeNotification,
  dismissHomeNotifications,
  filterHomeVisibleNotifications,
  getHomeNotificationDismissKey,
  HOME_NOTIFICATION_DISMISS_STORAGE_PREFIX_FOR_TEST,
  loadHomeNotificationDismissedKeys,
  normalizeHomeNotificationDismissKeys,
} from '../src/services/notifications/homeQuickDismiss';
import type { UserNotificationItem } from '../src/services/notifications/userNotifications';

function notification(
  id: string,
  source: UserNotificationItem['source'] = 'user',
): UserNotificationItem {
  return {
    id,
    source,
    title: `알림 ${id}`,
    body: '홈 간편 알림 보존 정책 테스트',
    type: 'notice',
    readAt: null,
    createdAt: '2026-07-03T00:00:00.000Z',
  };
}

describe('notification retention policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('홈 quick dismiss key는 사용자별 local storage로만 분리한다', async () => {
    await dismissHomeNotification({
      userId: 'user-a',
      notification: notification('00000000-0000-0000-0000-000000000001'),
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      `${HOME_NOTIFICATION_DISMISS_STORAGE_PREFIX_FOR_TEST}:user-a`,
      JSON.stringify(['user:00000000-0000-0000-0000-000000000001']),
    );
    expect(buildHomeNotificationDismissStorageKey('user-b')).toBe(
      `${HOME_NOTIFICATION_DISMISS_STORAGE_PREFIX_FOR_TEST}:user-b`,
    );
  });

  it('홈에서 치운 알림만 홈 목록에서 숨기고 알림함 원본 목록은 변경하지 않는다', () => {
    const first = notification('00000000-0000-0000-0000-000000000001');
    const second = notification(
      '00000000-0000-0000-0000-000000000002',
      'announcement',
    );
    const inboxItems = [first, second];
    const homeVisible = filterHomeVisibleNotifications(
      inboxItems,
      new Set([getHomeNotificationDismissKey(first)]),
    );

    expect(homeVisible).toEqual([second]);
    expect(inboxItems).toEqual([first, second]);
  });

  it('홈 모두 치우기는 현재 홈 목록의 key만 추가하고 중복 key를 정규화한다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify([
        'user:00000000-0000-0000-0000-000000000001',
        'user:00000000-0000-0000-0000-000000000001',
        'invalid-key',
      ]),
    );

    await dismissHomeNotifications({
      userId: 'user-a',
      notifications: [
        notification('00000000-0000-0000-0000-000000000002'),
        notification('00000000-0000-0000-0000-000000000003', 'announcement'),
      ],
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      buildHomeNotificationDismissStorageKey('user-a'),
      JSON.stringify([
        'announcement:00000000-0000-0000-0000-000000000003',
        'user:00000000-0000-0000-0000-000000000001',
        'user:00000000-0000-0000-0000-000000000002',
      ]),
    );
  });

  it('깨진 local storage 값은 홈 알림 전체 숨김으로 해석하지 않는다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{broken');

    await expect(loadHomeNotificationDismissedKeys('user-a')).resolves.toEqual(
      new Set(),
    );
    expect(normalizeHomeNotificationDismissKeys(['bad', 1, null])).toEqual([]);
  });
});
