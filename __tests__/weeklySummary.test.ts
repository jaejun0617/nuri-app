import {
  buildWeeklySummary,
  buildWeeklySummaryLine,
} from '../src/services/home/weeklySummary';

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
          createdAt: '2026-03-02T23:30:00.000Z',
          imagePaths: [],
        },
        {
          id: 'm4',
          petId: 'pet-1',
          title: '미용',
          category: 'other',
          subCategory: 'grooming',
          tags: ['grooming'],
          occurredAt: '2026-03-04',
          createdAt: '2026-03-04T10:00:00.000Z',
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
    expect(summary.lifeCount).toBe(1);
    expect(summary.recordDays).toBe(3);
    expect(summary.totalRecords).toBe(3);
    expect(summary.upcomingSchedules).toBe(1);
  });

  it('저장된 category를 우선해 산책·식사 집계를 누락하지 않는다', () => {
    const summary = buildWeeklySummary(
      [
        {
          id: 'walk-category',
          petId: 'pet-1',
          title: '산책 기록',
          category: 'walk',
          tags: [],
          occurredAt: '2026-03-02',
          createdAt: '2026-03-02T10:00:00.000Z',
          imagePaths: [],
        },
        {
          id: 'meal-category',
          petId: 'pet-1',
          title: '식사 기록',
          category: 'meal',
          tags: ['old-label'],
          occurredAt: '2026-03-03',
          createdAt: '2026-03-03T10:00:00.000Z',
          imagePaths: [],
        },
        {
          id: 'health-category',
          petId: 'pet-1',
          title: '건강 기록',
          category: 'health',
          tags: ['walk', 'meal'],
          occurredAt: '2026-03-03',
          createdAt: '2026-03-03T10:00:00.000Z',
          imagePaths: [],
        },
      ],
      [],
      new Date('2026-03-06T12:00:00.000Z'),
    );

    expect(summary.walkCount).toBe(1);
    expect(summary.mealCount).toBe(1);
    expect(summary.lifeCount).toBe(0);
    expect(summary.recordDays).toBe(2);
    expect(summary.totalRecords).toBe(2);
  });

  it('집계 결과에 맞는 한 줄 요약을 만든다', () => {
    expect(
      buildWeeklySummaryLine({
        walkCount: 1,
        mealCount: 2,
        lifeCount: 0,
        recordDays: 2,
        totalRecords: 3,
        upcomingSchedules: 0,
      }),
    ).toBe('규칙적인 산책과 식사로 건강한 한 주를 보냈어요!');
    expect(
      buildWeeklySummaryLine({
        walkCount: 0,
        mealCount: 0,
        lifeCount: 0,
        recordDays: 0,
        totalRecords: 0,
        upcomingSchedules: 0,
      }),
    ).toBe('이번 주 첫 기록을 남겨보세요.');
  });
});
