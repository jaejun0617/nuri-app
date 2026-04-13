import {
  buildHealthActivityItems,
  buildWeightSummary,
  buildWeightTimelineItems,
} from '../src/services/health-report/viewModel';

describe('healthReport view model', () => {
  it('체중 증감 방향과 비율을 계산한다', () => {
    const timeline = buildWeightTimelineItems({
      previousLog: {
        id: 'w0',
        petId: 'pet-1',
        userId: 'user-1',
        measuredOn: '2026-03-01',
        weightKg: 4,
        note: null,
        source: 'manual',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
      logs: [
        {
          id: 'w1',
          petId: 'pet-1',
          userId: 'user-1',
          measuredOn: '2026-03-10',
          weightKg: 4.4,
          note: null,
          source: 'health_report',
          createdAt: '2026-03-10T00:00:00.000Z',
          updatedAt: '2026-03-10T00:00:00.000Z',
        },
        {
          id: 'w2',
          petId: 'pet-1',
          userId: 'user-1',
          measuredOn: '2026-03-20',
          weightKg: 4.2,
          note: null,
          source: 'health_report',
          createdAt: '2026-03-20T00:00:00.000Z',
          updatedAt: '2026-03-20T00:00:00.000Z',
        },
      ],
    });

    expect(timeline[0].direction).toBe('up');
    expect(timeline[0].deltaKg).toBe(0.4);
    expect(timeline[0].deltaRate).toBe(10);
    expect(timeline[1].direction).toBe('down');
    expect(timeline[1].deltaKg).toBe(-0.2);

    const summary = buildWeightSummary({
      logs: timeline,
      previousLog: null,
      latestSnapshot: {
        latestWeightKg: 4.2,
        latestMeasuredOn: '2026-03-20',
        latestLogId: 'w2',
      },
    });

    expect(summary.latestWeightKg).toBe(4.2);
    expect(summary.direction).toBe('down');
  });

  it('연결된 병원 일정은 건강 기록과 중복 노출하지 않는다', () => {
    const items = buildHealthActivityItems(
      [
        {
          id: 'm1',
          petId: 'pet-1',
          title: '병원 다녀왔어요',
          content: '정기 검진',
          category: 'health',
          tags: [],
          occurredAt: '2026-03-15',
          createdAt: '2026-03-15T03:00:00.000Z',
          imagePaths: [],
        },
      ],
      [
        {
          id: 's1',
          userId: 'user-1',
          petId: 'pet-1',
          title: '정기 검진',
          note: null,
          startsAt: '2026-03-15T02:00:00.000Z',
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
          linkedMemoryId: 'm1',
          completedAt: null,
          source: 'manual',
          externalCalendarId: null,
          externalEventId: null,
          syncStatus: 'local',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    );

    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('memory');
  });
});

