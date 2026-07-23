import {
  buildFrequentRecordSummaries,
  buildFrequentRecordSummary,
  formatFrequentRecordRelativeTime,
} from '../src/services/home/frequentRecords';
import type { MemoryRecord } from '../src/services/supabase/memories';

function record(
  overrides: Partial<MemoryRecord> = {},
): MemoryRecord {
  return {
    id: 'memory-1',
    petId: 'pet-1',
    title: '기록',
    content: null,
    emotion: null,
    tags: [],
    category: 'walk',
    subCategory: null,
    price: null,
    occurredAt: '2026-07-23',
    createdAt: '2026-07-23T03:00:00.000Z',
    imageUrl: null,
    imagePath: null,
    imagePaths: [],
    timelineImagePath: null,
    timelineImageVariant: null,
    ...overrides,
  };
}

describe('frequent records home view model', () => {
  it('selects the latest record per category and keeps grooming under other/grooming', () => {
    const summaries = buildFrequentRecordSummaries(
      [
        record({
          id: 'old-walk',
          title: '오래된 산책',
          createdAt: '2026-07-22T03:00:00.000Z',
        }),
        record({
          id: 'new-walk',
          title: '저녁 산책 32분',
          createdAt: '2026-07-23T04:00:00.000Z',
        }),
        record({
          id: 'meal',
          title: 'QA meal food 180g',
          category: 'meal',
        }),
        record({
          id: 'health',
          title: 'QA health condition',
          category: 'health',
          emotion: 'sad',
        }),
        record({
          id: 'grooming',
          title: 'QA grooming bath fur',
          category: 'other',
          subCategory: 'grooming',
        }),
        record({
          id: 'other',
          title: '실내 놀이',
          category: 'other',
          subCategory: 'indoor',
        }),
      ],
      new Date('2026-07-23T05:00:00.000Z'),
    );

    expect(summaries.find(item => item.category === 'walk')).toMatchObject({
      record: { id: 'new-walk' },
      relativeTimeLabel: '1시간 전',
      summaryLabel: '32분 산책 완료',
    });
    expect(summaries.find(item => item.category === 'meal')).toMatchObject({
      summaryLabel: '사료 180g',
    });
    expect(summaries.find(item => item.category === 'health')).toMatchObject({
      summaryLabel: '컨디션 나빠요',
    });
    expect(summaries.find(item => item.category === 'grooming')).toMatchObject({
      record: { id: 'grooming' },
      summaryLabel: '목욕 & 털 정리',
    });
    expect(summaries.find(item => item.category === 'meal')).toMatchObject({
      record: { id: 'meal' },
      hasRecentRecord: true,
      summaryLabel: '사료 180g',
    });
  });

  it('uses a safe relative-time label for invalid, future, and old timestamps', () => {
    expect(
      formatFrequentRecordRelativeTime(
        record({ createdAt: '2026-07-23T04:59:40.000Z' }),
        new Date('2026-07-23T05:00:00.000Z'),
      ),
    ).toBe('방금 전');
    expect(
      formatFrequentRecordRelativeTime(
        record({ createdAt: '2026-07-23T05:30:00.000Z' }),
        new Date('2026-07-23T05:00:00.000Z'),
      ),
    ).toBe('방금 전');
    expect(
      formatFrequentRecordRelativeTime(
        record({ createdAt: 'not-a-date' }),
        new Date('2026-07-23T05:00:00.000Z'),
      ),
    ).toBeNull();
    expect(
      formatFrequentRecordRelativeTime(
        record({
          createdAt: '2026-07-10T05:00:00.000Z',
          occurredAt: '2026-07-10',
        }),
        new Date('2026-07-23T05:00:00.000Z'),
      ),
    ).toBe('7월 10일');
  });

  it('uses a safe Korean fallback and compacts derived summaries', () => {
    expect(buildFrequentRecordSummary('health', record({ title: '   ' }))).toBe(
      '건강 기록 완료',
    );
    expect(
      buildFrequentRecordSummary(
        'meal',
        record({
          category: 'meal',
          title: '아주 긴 식사 기록 제목 180g',
        }),
      ),
    ).toBe('사료 180g');
  });

  it('derives the morning walk label from the stored creation time', () => {
    expect(
      buildFrequentRecordSummary(
        'walk',
        record({
          title: 'QA walk morning',
          createdAt: '2026-07-23T00:30:00.000Z',
        }),
      ),
    ).toBe('오전 산책 완료');
  });
});
