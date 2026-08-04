import {
  buildTotalSummary,
  buildTotalSummaryLine,
  buildWeeklySummary,
  buildWeeklySummaryLine,
  completeTotalSummaryLoad,
  createTotalSummaryState,
  failTotalSummaryLoad,
  startTotalSummaryLoad,
} from '../src/services/home/weeklySummary';
import type { MemoryRecord } from '../src/services/supabase/memories';

function makeWalkRecord(id: string): MemoryRecord {
  return {
    id,
    petId: 'pet-a',
    title: '산책 기록',
    category: 'walk',
    tags: [],
    occurredAt: '2026-08-04',
    createdAt: '2026-08-04T00:00:00.000Z',
    imagePaths: [],
  };
}

describe('buildTotalSummary', () => {
  it('기간 제한 없이 현재 요약 대상 기록과 KST 고유 날짜를 집계한다', () => {
    const summary = buildTotalSummary([
      {
        id: 'walk-1',
        petId: 'pet-1',
        title: '지난 산책',
        category: 'walk',
        tags: [],
        occurredAt: '2025-12-31',
        createdAt: '2025-12-31T01:00:00.000Z',
        imagePaths: [],
      },
      {
        id: 'walk-2',
        petId: 'pet-1',
        title: '오늘 산책',
        category: 'walk',
        tags: [],
        occurredAt: '2026-01-02',
        createdAt: '2026-01-02T01:00:00.000Z',
        imagePaths: [],
      },
      {
        id: 'meal-1',
        petId: 'pet-1',
        title: '식사',
        category: 'meal',
        tags: [],
        createdAt: '2026-01-02T23:30:00.000Z',
        imagePaths: [],
      },
      {
        id: 'life-1',
        petId: 'pet-1',
        title: '미용',
        category: 'other',
        subCategory: 'grooming',
        tags: [],
        occurredAt: '2026-01-03',
        createdAt: '2026-01-03T01:00:00.000Z',
        imagePaths: [],
      },
      {
        id: 'hospital-1',
        petId: 'pet-1',
        title: '병원',
        category: 'other',
        subCategory: 'hospital',
        tags: [],
        occurredAt: '2026-01-03',
        createdAt: '2026-01-03T01:00:00.000Z',
        imagePaths: [],
      },
    ]);

    expect(summary).toEqual({
      walkCount: 2,
      mealCount: 1,
      lifeCount: 1,
      recordDays: 3,
      totalRecords: 4,
    });
  });

  it('전체 누적 수치에 맞는 문구를 만든다', () => {
    expect(
      buildTotalSummaryLine({
        walkCount: 2,
        mealCount: 1,
        lifeCount: 0,
        recordDays: 2,
        totalRecords: 3,
      }),
    ).toBe('산책과 식사 기록이 차곡차곡 쌓였어요!');
    expect(
      buildTotalSummaryLine({
        walkCount: 0,
        mealCount: 0,
        lifeCount: 0,
        recordDays: 0,
        totalRecords: 0,
      }),
    ).toBe('아직 남긴 기록이 없어요.');
  });
});

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

describe('total summary load state', () => {
  it('동일 펫 background refresh 중에는 기존 records를 유지한다', () => {
    const firstLoad = startTotalSummaryLoad(
      createTotalSummaryState(),
      'pet-a',
      1,
    );
    const initial = completeTotalSummaryLoad(firstLoad, {
      petId: 'pet-a',
      requestId: 1,
      records: [makeWalkRecord('walk-1')],
    });

    const refreshing = startTotalSummaryLoad(initial, 'pet-a', 2);

    expect(refreshing.status).toBe('refreshing');
    expect(refreshing.records).toBe(initial.records);
    expect(buildTotalSummary(refreshing.records ?? []).walkCount).toBe(1);

    const completed = completeTotalSummaryLoad(refreshing, {
      petId: 'pet-a',
      requestId: 2,
      records: [makeWalkRecord('walk-1'), makeWalkRecord('walk-2')],
    });

    expect(completed.status).toBe('ready');
    expect(buildTotalSummary(completed.records ?? []).walkCount).toBe(2);
  });

  it('최초 조회 중에는 실제 0건과 구분되는 loading 상태를 유지한다', () => {
    const loading = startTotalSummaryLoad(
      createTotalSummaryState(),
      'pet-a',
      1,
    );

    expect(loading.status).toBe('loading');
    expect(loading.records).toBeNull();
  });

  it('조회가 성공한 빈 배열만 실제 0건으로 확정한다', () => {
    const loading = startTotalSummaryLoad(
      createTotalSummaryState(),
      'pet-a',
      1,
    );
    const ready = completeTotalSummaryLoad(loading, {
      petId: 'pet-a',
      requestId: 1,
      records: [],
    });

    expect(ready.status).toBe('ready');
    expect(ready.records).toEqual([]);
    expect(buildTotalSummary(ready.records ?? []).totalRecords).toBe(0);
  });

  it('동일 펫 조회 실패 시 마지막 성공 records를 유지한다', () => {
    const firstLoad = startTotalSummaryLoad(
      createTotalSummaryState(),
      'pet-a',
      1,
    );
    const initial = completeTotalSummaryLoad(firstLoad, {
      petId: 'pet-a',
      requestId: 1,
      records: [makeWalkRecord('walk-1')],
    });
    const refreshing = startTotalSummaryLoad(initial, 'pet-a', 2);
    const failed = failTotalSummaryLoad(refreshing, {
      petId: 'pet-a',
      requestId: 2,
    });

    expect(failed.status).toBe('ready');
    expect(failed.records).toBe(initial.records);
    expect(buildTotalSummary(failed.records ?? []).walkCount).toBe(1);
  });

  it('펫 전환 시 이전 records를 숨기고 stale response를 차단한다', () => {
    const petAFirstLoad = startTotalSummaryLoad(
      createTotalSummaryState(),
      'pet-a',
      1,
    );
    const petA = completeTotalSummaryLoad(petAFirstLoad, {
      petId: 'pet-a',
      requestId: 1,
      records: [makeWalkRecord('walk-a')],
    });
    const petBLoading = startTotalSummaryLoad(petA, 'pet-b', 2);

    expect(petBLoading.records).toBeNull();
    expect(petBLoading.status).toBe('loading');

    const stalePetAResult = completeTotalSummaryLoad(petBLoading, {
      petId: 'pet-a',
      requestId: 1,
      records: [makeWalkRecord('walk-a-late')],
    });
    expect(stalePetAResult).toBe(petBLoading);

    const petBReady = completeTotalSummaryLoad(petBLoading, {
      petId: 'pet-b',
      requestId: 2,
      records: [],
    });
    expect(petBReady.status).toBe('ready');
    expect(petBReady.records).toEqual([]);
  });
});
