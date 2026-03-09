import {
  buildTimelineView,
  compareTimelineRecords,
  getTimelineMonthKey,
  getTimelineRecordYmd,
  humanizeTimelineMonthKey,
  shouldAutoLoadMoreTimeline,
} from '../src/services/timeline/query';
import type { MemoryRecord } from '../src/services/supabase/memories';

function buildRecord(input: Partial<MemoryRecord> & Pick<MemoryRecord, 'id' | 'petId' | 'title' | 'createdAt'>): MemoryRecord {
  return {
    tags: [],
    imagePaths: [],
    ...input,
  };
}

describe('timeline query', () => {
  it('날짜 기준 정렬은 occurredAt 우선, createdAt/id로 안정 정렬한다', () => {
    const items = [
      buildRecord({
        id: 'b',
        petId: 'pet-1',
        title: '둘째',
        occurredAt: '2026-03-02',
        createdAt: '2026-03-01T09:00:00.000Z',
      }),
      buildRecord({
        id: 'a',
        petId: 'pet-1',
        title: '첫째',
        occurredAt: '2026-03-02',
        createdAt: '2026-03-01T09:00:00.000Z',
      }),
      buildRecord({
        id: 'c',
        petId: 'pet-1',
        title: '셋째',
        occurredAt: '2026-03-01',
        createdAt: '2026-03-01T10:00:00.000Z',
      }),
    ];

    items.sort(compareTimelineRecords);
    expect(items.map(item => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('중복 제거 후 필터/검색/월 인덱스를 일관되게 계산한다', () => {
    const duplicate = buildRecord({
      id: '1',
      petId: 'pet-1',
      title: '산책 메모',
      tags: ['#산책'],
      category: 'walk',
      occurredAt: '2026-03-02',
      createdAt: '2026-03-02T10:00:00.000Z',
    });
    const items = [
      duplicate,
      duplicate,
      buildRecord({
        id: '2',
        petId: 'pet-1',
        title: '병원 방문',
        tags: ['#병원약'],
        category: 'other',
        subCategory: 'hospital',
        occurredAt: '2026-02-10',
        createdAt: '2026-02-10T10:00:00.000Z',
      }),
    ];

    const view = buildTimelineView({
      items,
      filters: {
        ymFilter: null,
        mainCategory: 'all',
        otherSubCategory: null,
        query: '산책',
        sortMode: 'recent',
      },
    });

    expect(view.baseItems).toHaveLength(2);
    expect(view.filteredItems.map(item => item.id)).toEqual(['1']);
    expect(view.availableMonthKeys).toEqual(['2026-03', '2026-02']);
    expect(view.firstIndexByMonth.get('2026-03')).toBe(0);
  });

  it('month key와 ymd를 timezone 영향 없이 계산한다', () => {
    const record = buildRecord({
      id: '1',
      petId: 'pet-1',
      title: '야간 기록',
      createdAt: '2026-03-01T23:30:00.000Z',
    });

    expect(getTimelineRecordYmd(record)).toBe('2026-03-02');
    expect(getTimelineMonthKey(record)).toBe('2026-03');
    expect(humanizeTimelineMonthKey('2026-03')).toBe('2026.03');
  });

  it('클라이언트 필터가 걸리면 자동 loadMore를 막는다', () => {
    expect(
      shouldAutoLoadMoreTimeline({
        status: 'ready',
        hasMore: true,
        query: '',
        pendingJumpMonth: null,
        ymFilter: null,
        mainCategory: 'all',
        otherSubCategory: null,
      }),
    ).toBe(true);

    expect(
      shouldAutoLoadMoreTimeline({
        status: 'ready',
        hasMore: true,
        query: '산책',
        pendingJumpMonth: null,
        ymFilter: null,
        mainCategory: 'all',
        otherSubCategory: null,
      }),
    ).toBe(false);

    expect(
      shouldAutoLoadMoreTimeline({
        status: 'ready',
        hasMore: true,
        query: '',
        pendingJumpMonth: null,
        ymFilter: '2026-03',
        mainCategory: 'all',
        otherSubCategory: null,
      }),
    ).toBe(false);
  });
});
