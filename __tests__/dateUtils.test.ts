import {
  diffDaysFromKst,
  formatDateLabelFromDate,
  formatRelativeTimeFromNow,
  getDateYmdInKst,
} from '../src/utils/date';

describe('date utils', () => {
  it('서버 ISO 시각을 KST 날짜로 변환한다', () => {
    expect(getDateYmdInKst('2026-03-01T23:30:00.000Z')).toBe('2026-03-02');
  });

  it('함께한 일수를 KST 오늘 기준으로 inclusive 계산한다', () => {
    expect(diffDaysFromKst('2026-03-01', new Date('2026-03-02T00:30:00.000Z'))).toBe(2);
  });

  it('상대시간을 KST 캘린더 경계 기준으로 계산한다', () => {
    expect(
      formatRelativeTimeFromNow(
        '2026-03-01T23:30:00.000Z',
        new Date('2026-03-02T03:00:00.000Z'),
      ),
    ).toBe('3시간 전');
    expect(
      formatRelativeTimeFromNow(
        '2026-03-01',
        new Date('2026-03-03T00:00:00+09:00'),
      ),
    ).toBe('2일 전');
  });

  it('Date 인스턴스도 KST 점 표기로 포맷한다', () => {
    expect(
      formatDateLabelFromDate(new Date('2026-03-01T23:30:00.000Z')),
    ).toBe('2026.03.02');
  });
});
