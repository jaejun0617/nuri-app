import {
  getPetDailyStatus,
  recordPetDailyActivity,
} from '../src/services/activity/dailyStreak';
import {
  awardUserActivityXp,
  getUserLevelSummary,
  getUserTitles,
} from '../src/services/activity/xpProgress';
import { recordTimelineCreateActivity } from '../src/services/activity/timelineActivity';
import {
  dismissAllUserNotifications,
  dismissUserNotification,
  fetchUserNotificationUnreadCount,
  fetchUserNotifications,
  markUserNotificationRead,
} from '../src/services/notifications/userNotifications';

jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    rpc: jest.Mock<Promise<{ data: unknown; error: null }>, [string, unknown?]>;
  };
};

describe('V1.1 second MVP RPC mappers', () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  it('daily streak status를 앱 모델로 정규화한다', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [
        {
          current_streak: 3,
          best_streak: 7,
          today_completed: true,
          activity_date_kst: '2026-07-01',
          last_completed_date_kst: '2026-07-01',
        },
      ],
      error: null,
    });

    await expect(getPetDailyStatus('pet-1')).resolves.toMatchObject({
      currentStreak: 3,
      bestStreak: 7,
      todayCompleted: true,
      activityDateKst: '2026-07-01',
    });
    expect(supabase.rpc).toHaveBeenCalledWith('get_pet_daily_status_v1', {
      p_pet_id: 'pet-1',
    });
  });

  it('산책 타임라인 작성은 streak와 XP를 함께 기록한다', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: [
          {
            current_streak: 1,
            best_streak: 1,
            today_completed: true,
            inserted: true,
            show_celebration: true,
            activity_date_kst: '2026-07-01',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            awarded: true,
            xp_awarded: 30,
            total_xp: 30,
            level: 1,
            leveled_up: false,
          },
        ],
        error: null,
      });

    await expect(
      recordTimelineCreateActivity({
        petId: 'pet-1',
        memoryId: 'memory-1',
        category: 'walk',
      }),
    ).resolves.toMatchObject({
      streak: { showCelebration: true },
      xp: { awarded: true, xpAwarded: 30 },
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      1,
      'record_pet_daily_activity_v1',
      {
        p_pet_id: 'pet-1',
        p_source_type: 'timeline_walk_post',
        p_source_id: 'memory-1',
      },
    );
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'award_user_activity_xp_v1', {
      p_pet_id: 'pet-1',
      p_event_type: 'walk_timeline_post',
      p_source_type: 'timeline_memory',
      p_source_id: 'memory-1',
    });
  });

  it('일반 타임라인 작성은 streak 없이 XP만 기록한다', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [
        {
          awarded: true,
          xp_awarded: 15,
          total_xp: 15,
          level: 1,
          leveled_up: false,
        },
      ],
      error: null,
    });

    await expect(
      recordTimelineCreateActivity({
        petId: 'pet-1',
        memoryId: 'memory-2',
        category: 'diary',
      }),
    ).resolves.toMatchObject({
      streak: null,
      xp: { awarded: true, xpAwarded: 15 },
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('award_user_activity_xp_v1', {
      p_pet_id: 'pet-1',
      p_event_type: 'timeline_post',
      p_source_type: 'timeline_memory',
      p_source_id: 'memory-2',
    });
  });

  it('XP, level, title mapper는 민감 정보 없이 표시 모델만 반환한다', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: [
          {
            awarded: true,
            xp_awarded: 10,
            total_xp: 110,
            level: 2,
            leveled_up: true,
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            total_xp: 110,
            level: 2,
            current_level_xp: 100,
            next_level_xp: 250,
            updated_at: '2026-07-01T00:00:00.000Z',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            title_key: 'first_memory_record',
            title_name: '첫 추억 기록',
            earned_at: '2026-07-01T00:00:00.000Z',
            source_type: 'xp_ledger',
          },
        ],
        error: null,
      });

    await expect(
      awardUserActivityXp({
        petId: 'pet-1',
        eventType: 'health_record',
        sourceType: 'health_record',
        sourceId: 'health-1',
      }),
    ).resolves.toMatchObject({ awarded: true, level: 2, leveledUp: true });
    await expect(getUserLevelSummary()).resolves.toMatchObject({
      totalXp: 110,
      level: 2,
      nextLevelXp: 250,
    });
    await expect(getUserTitles()).resolves.toEqual([
      {
        titleKey: 'first_memory_record',
        titleName: '첫 추억 기록',
        earnedAt: '2026-07-01T00:00:00.000Z',
        sourceType: 'xp_ledger',
      },
    ]);
  });

  it('알림 목록과 읽음 처리를 read path 모델로 정규화한다', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: [
          {
            notification_id: '11111111-1111-1111-1111-111111111111',
            notification_source: 'announcement',
            title: '공지',
            body: '새 소식이 있어요.',
            type: 'notice',
            read_at: null,
            created_at: '2026-07-01T00:00:00.000Z',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: 1, error: null })
      .mockResolvedValueOnce({ data: 0, error: null })
      .mockResolvedValueOnce({ data: 0, error: null })
      .mockResolvedValueOnce({ data: 0, error: null });

    await expect(fetchUserNotifications()).resolves.toEqual([
      {
        id: '11111111-1111-1111-1111-111111111111',
        source: 'announcement',
        title: '공지',
        body: '새 소식이 있어요.',
        type: 'notice',
        readAt: null,
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ]);
    await expect(fetchUserNotificationUnreadCount()).resolves.toBe(1);
    await expect(
      markUserNotificationRead({
        id: '11111111-1111-1111-1111-111111111111',
        source: 'announcement',
      }),
    ).resolves.toBe(0);
    await expect(
      dismissUserNotification({
        id: '11111111-1111-1111-1111-111111111111',
        source: 'announcement',
      }),
    ).resolves.toBe(0);
    await expect(dismissAllUserNotifications()).resolves.toBe(0);

    expect(supabase.rpc).toHaveBeenLastCalledWith(
      'dismiss_all_user_notifications_v1',
    );
  });

  it('daily activity 직접 기록 mapper는 하루 1회 결과를 보존한다', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [
        {
          current_streak: 1,
          best_streak: 2,
          today_completed: true,
          inserted: false,
          show_celebration: false,
          activity_date_kst: '2026-07-01',
        },
      ],
      error: null,
    });

    await expect(
      recordPetDailyActivity({
        petId: 'pet-1',
        sourceType: 'timeline_walk_post',
        sourceId: 'memory-1',
      }),
    ).resolves.toMatchObject({
      currentStreak: 1,
      bestStreak: 2,
      inserted: false,
      showCelebration: false,
    });
  });
});
