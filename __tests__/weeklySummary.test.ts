import { buildWeeklySummary } from '../src/services/home/weeklySummary';

describe('buildWeeklySummary', () => {
  it('이번 주 기록과 일정을 올바르게 집계한다', () => {
    const summary = buildWeeklySummary(
      [
        {
          id: 'm1',
          petId: 'pet-1',
          title: '산책',
          tags: ['walk'],
          occurredAt: '2026-03-02',
          createdAt: '2026-03-02T10:00:00.000Z',
          imagePaths: [],
        },
        {
          id: 'm2',
          petId: 'pet-1',
          title: '식사',
          tags: ['meal'],
          occurredAt: '2026-03-03',
          createdAt: '2026-03-03T10:00:00.000Z',
          imagePaths: [],
        },
        {
          id: 'm3',
          petId: 'pet-1',
          title: '건강',
          tags: ['health'],
          occurredAt: '2026-03-03',
          createdAt: '2026-03-03T12:00:00.000Z',
          imagePaths: [],
        },
      ],
      [
        {
          id: 's1',
          userId: 'u1',
          petId: 'pet-1',
          title: '병원 예약',
          note: null,
          startsAt: '2026-03-04T09:00:00.000Z',
          endsAt: null,
          allDay: false,
          category: 'health',
          subCategory: 'hospital',
          iconKey: 'stethoscope',
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
          createdAt: '2026-03-02T00:00:00.000Z',
          updatedAt: '2026-03-02T00:00:00.000Z',
        },
      ],
      new Date('2026-03-06T12:00:00.000Z'),
    );

    expect(summary.walkCount).toBe(1);
    expect(summary.mealCount).toBe(1);
    expect(summary.healthCount).toBe(1);
    expect(summary.recordDays).toBe(2);
    expect(summary.totalRecords).toBe(3);
    expect(summary.upcomingSchedules).toBe(1);
  });
});
