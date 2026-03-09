import {
  formatRecordDisplayDate,
  formatRecordRelativeTime,
  getRecordDisplayYmd,
  getRecordSortTimestamp,
} from '../src/services/records/date';

describe('record date helpers', () => {
  it('표시 날짜와 상대시간은 occurredAt을 우선 사용한다', () => {
    const record = {
      occurredAt: '2026-02-01',
      createdAt: '2026-03-09T09:30:00.000Z',
    };

    expect(getRecordDisplayYmd(record)).toBe('2026-02-01');
    expect(formatRecordDisplayDate(record)).toBe('2026.02.01');
    expect(
      formatRecordRelativeTime(record, new Date('2026-03-09T12:00:00.000Z')),
    ).toBe('36일 전');
  });

  it('occurredAt이 없으면 createdAt을 fallback으로 사용한다', () => {
    const record = {
      occurredAt: null,
      createdAt: '2026-03-01T23:30:00.000Z',
    };

    expect(getRecordDisplayYmd(record)).toBe('2026-03-02');
    expect(
      formatRecordRelativeTime(record, new Date('2026-03-09T12:00:00.000Z')),
    ).toBe('7일 전');
  });

  it('오늘 날짜 기록은 오늘이 아니라 분/시간 단위로 보여준다', () => {
    const sameDayRecord = {
      occurredAt: '2026-03-09',
      createdAt: '2026-03-09T10:30:00.000Z',
    };
    const exactDayRecord = {
      occurredAt: null,
      createdAt: '2026-03-08T12:00:00.000Z',
    };

    expect(
      formatRecordRelativeTime(sameDayRecord, new Date('2026-03-09T12:00:00.000Z')),
    ).toBe('1시간 전');
    expect(
      formatRecordRelativeTime(exactDayRecord, new Date('2026-03-09T12:00:00.000Z')),
    ).toBe('24시간 전');
  });

  it('정렬 timestamp도 occurredAt을 우선 사용한다', () => {
    const olderCreatedButRecentOccurred = {
      occurredAt: '2026-03-08',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const newerCreatedButOldOccurred = {
      occurredAt: '2026-02-01',
      createdAt: '2026-03-09T00:00:00.000Z',
    };

    expect(getRecordSortTimestamp(olderCreatedButRecentOccurred)).toBeGreaterThan(
      getRecordSortTimestamp(newerCreatedButOldOccurred),
    );
  });
});
