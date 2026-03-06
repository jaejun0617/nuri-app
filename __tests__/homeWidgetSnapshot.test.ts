import { buildHomeWidgetSnapshot } from '../src/services/home/widgetSnapshot';

describe('homeWidgetSnapshot', () => {
  it('일정과 기록이 없을 때도 기본 문구를 만든다', () => {
    const snapshot = buildHomeWidgetSnapshot({
      petName: '누리',
      themeColor: '#6D6AF8',
      schedules: [],
      records: [],
    });

    expect(snapshot.petName).toBe('누리');
    expect(snapshot.todayScheduleTitle).toContain('일정');
    expect(snapshot.recentRecordTitle).toContain('최근 기록');
  });
});
