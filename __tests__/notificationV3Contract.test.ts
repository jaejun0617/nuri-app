import {
  parseNotificationTarget,
  mapNotification,
  fetchUserNotificationUnreadCount,
  fetchNotificationPage,
} from '../src/services/notifications/userNotifications';
import {
  groupNotifications,
  notificationDateLabel,
  notificationRelativeTime,
} from '../src/services/notifications/notificationPresentation';
import { parseNotificationTap } from '../src/services/notifications/nativePush';

jest.mock('../src/services/supabase/client', () => ({
  supabase: { rpc: jest.fn() },
}));
const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: { rpc: jest.Mock };
};
const owner = '11111111-1111-4111-8111-111111111111',
  id = '22222222-2222-4222-8222-222222222222';
describe('notification v3 boundary contracts', () => {
  it('malformed rows fail rather than becoming a fake empty inbox', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { items: [null], unreadCount: 0, hasMore: false },
      error: null,
    });
    await expect(fetchNotificationPage({})).rejects.toThrow(
      'NURI_NOTIFICATION_RESPONSE_INVALID',
    );
  });
  it.each(['2026-02-31', '2026-13-01', 'not-date'])(
    'rejects invalid calendar date %s',
    startDate => {
      expect(
        parseNotificationTarget({
          kind: 'timeline_period',
          startDate,
          endDate: '2026-12-01',
        }),
      ).toEqual({ kind: 'unavailable' });
    },
  );
  it('preserves a fixed month and rejects arbitrary route and URL targets', () => {
    expect(
      parseNotificationTarget({
        kind: 'timeline_period',
        startDate: '2026-10-01',
        endDate: '2026-11-01',
      }),
    ).toEqual({
      kind: 'timeline_period',
      startDate: '2026-10-01',
      endDate: '2026-11-01',
      petId: null,
    });
    expect(parseNotificationTarget({ kind: 'route', route: 'Admin' })).toEqual({
      kind: 'unavailable',
    });
    expect(
      parseNotificationTarget({ kind: 'url', url: 'https://example.com' }),
    ).toEqual({ kind: 'unavailable' });
  });
  it('unknown schema versions fail closed for navigation', () => {
    expect(
      mapNotification({
        notification_id: id,
        title: '안내',
        created_at: '2026-10-21T00:00:00Z',
        schema_version: 99,
        target: { kind: 'activity' },
      })?.actionTarget,
    ).toEqual({ kind: 'unavailable' });
  });
  it('groups by user timezone across a DST boundary and joins page boundary duplicates', () => {
    const now = new Date('2026-11-02T05:10:00Z');
    const item = mapNotification({
      notification_id: id,
      notification_source: 'user',
      title: '안내',
      created_at: '2026-11-02T03:30:00Z',
    })!;
    expect(notificationDateLabel(item.createdAt, now, 'America/New_York')).toBe(
      '어제',
    );
    const groups = groupNotifications(
      [item, item, { ...item, id: owner }],
      now,
      'America/New_York',
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });
  it('relative time uses availableAt presentation without altering the clock', () => {
    expect(
      notificationRelativeTime(
        '2026-10-21T06:30:00Z',
        new Date('2026-10-21T06:40:00Z'),
        'Asia/Seoul',
      ),
    ).toBe('10분 전');
  });
  it('malformed unread response is an error, not a fake empty badge', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(fetchUserNotificationUnreadCount()).rejects.toThrow(
      'NURI_NOTIFICATION_RESPONSE_INVALID',
    );
  });
  it('push taps carry a validated recipient and ID, never an arbitrary route', () => {
    expect(
      parseNotificationTap({ id, source: 'user', recipientUserId: owner }),
    ).toEqual({ id, source: 'user', recipientUserId: owner });
    expect(
      parseNotificationTap({
        id: '../../Admin',
        source: 'user',
        recipientUserId: owner,
      }),
    ).toBeNull();
  });
});
