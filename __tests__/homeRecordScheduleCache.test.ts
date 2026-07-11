import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildHomeRecordScheduleCacheKey,
  clearAllHomeRecordScheduleCaches,
  loadHomeRecordScheduleCache,
  saveHomeRecordScheduleCache,
} from '../src/services/local/homeRecordScheduleCache';
import type { MemoryRecord } from '../src/services/supabase/memories';
import type { PetSchedule } from '../src/services/supabase/schedules';

function record(id: string, petId = 'pet-1'): MemoryRecord {
  return {
    id,
    petId,
    title: `기록 ${id}`,
    content: null,
    emotion: null,
    tags: [],
    category: 'diary',
    subCategory: null,
    price: null,
    occurredAt: null,
    createdAt: '2026-07-11T00:00:00.000Z',
    imageUrl: null,
    imagePath: null,
    imagePaths: [],
    timelineImagePath: null,
    timelineImageVariant: null,
  };
}

function schedule(
  id: string,
  input: { userId?: string; petId?: string } = {},
): PetSchedule {
  return {
    id,
    userId: input.userId ?? 'user-1',
    petId: input.petId ?? 'pet-1',
    title: `일정 ${id}`,
    note: null,
    startsAt: '2026-07-11T09:00:00.000Z',
    endsAt: null,
    allDay: false,
    category: 'walk',
    subCategory: null,
    iconKey: 'walk',
    colorKey: 'brand',
    reminderMinutes: [],
    repeatRule: 'none',
    repeatInterval: 1,
    repeatUntil: null,
    linkedMemoryId: null,
    completedAt: null,
    source: 'manual',
    externalCalendarId: null,
    externalEventId: null,
    syncStatus: 'local',
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
  };
}

describe('home record/schedule disk cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('userId와 petId로 cache key를 분리한다', () => {
    expect(
      buildHomeRecordScheduleCacheKey({
        userId: 'user-1',
        petId: 'pet-1',
      }),
    ).toBe('@nuri/home-record-schedule/v1:user-1:pet-1');
    expect(
      buildHomeRecordScheduleCacheKey({
        userId: 'user-2',
        petId: 'pet-1',
      }),
    ).toBe('@nuri/home-record-schedule/v1:user-2:pet-1');
  });

  it('현재 user/pet scope 데이터만 저장한다', async () => {
    await saveHomeRecordScheduleCache({
      userId: 'user-1',
      petId: 'pet-1',
      records: [record('record-1'), record('record-2', 'pet-2')],
      schedules: [
        schedule('schedule-1'),
        schedule('schedule-2', { userId: 'user-2', petId: 'pet-1' }),
      ],
      now: 1_000,
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    const [, payload] = (AsyncStorage.setItem as jest.Mock).mock.calls[0] as [
      string,
      string,
    ];
    const parsed = JSON.parse(payload) as {
      records: MemoryRecord[];
      schedules: PetSchedule[];
    };
    expect(parsed.records.map(item => item.id)).toEqual(['record-1']);
    expect(parsed.schedules.map(item => item.id)).toEqual(['schedule-1']);
  });

  it('정상 cache hit은 기록과 일정을 복원한다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        schemaVersion: 1,
        userId: 'user-1',
        petId: 'pet-1',
        savedAt: 1_000,
        records: [record('record-1')],
        schedules: [schedule('schedule-1')],
      }),
    );

    await expect(
      loadHomeRecordScheduleCache({
        userId: 'user-1',
        petId: 'pet-1',
        now: 2_000,
      }),
    ).resolves.toMatchObject({
      records: [{ id: 'record-1', petId: 'pet-1' }],
      schedules: [{ id: 'schedule-1', userId: 'user-1', petId: 'pet-1' }],
    });
  });

  it('깨진 cache는 제거하고 fallback 한다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{broken');

    await expect(
      loadHomeRecordScheduleCache({
        userId: 'user-1',
        petId: 'pet-1',
      }),
    ).resolves.toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      '@nuri/home-record-schedule/v1:user-1:pet-1',
    );
  });

  it('오래된 cache는 표시하지 않는다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        schemaVersion: 1,
        userId: 'user-1',
        petId: 'pet-1',
        savedAt: 1_000,
        records: [record('record-1')],
        schedules: [],
      }),
    );

    await expect(
      loadHomeRecordScheduleCache({
        userId: 'user-1',
        petId: 'pet-1',
        now: 4 * 24 * 60 * 60 * 1000 + 1_000,
      }),
    ).resolves.toBeNull();
  });

  it('로그아웃/계정 전환 정리 시 홈 기록·일정 cache만 제거한다', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      '@nuri/home-record-schedule/v1:user-1:pet-1',
      '@nuri/home-title-badge/v1:user-1:pet-1',
      '@nuri/home-record-schedule/v1:user-2:pet-2',
    ]);

    await clearAllHomeRecordScheduleCaches();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      '@nuri/home-record-schedule/v1:user-1:pet-1',
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      '@nuri/home-record-schedule/v1:user-2:pet-2',
    );
  });
});
