import {
  createScheduleDatePresets,
  formatScheduleDateSummary,
  getReminderKeyByMinutes,
  getReminderMinutesByKey,
  inferScheduleSubCategory,
  normalizeScheduleDateInput,
  normalizeScheduleTimeInput,
} from '../src/services/schedules/form';

describe('schedules form helpers', () => {
  it('날짜/시간 입력을 정규화한다', () => {
    expect(normalizeScheduleDateInput('2026.03.06')).toBe('2026-03-06');
    expect(normalizeScheduleTimeInput('09:30')).toBe('09:30');
    expect(() => normalizeScheduleTimeInput('9:30')).toThrow(
      '시간 형식은 HH:MM 입니다.',
    );
  });

  it('카테고리에 맞는 기본 서브카테고리를 추론한다', () => {
    expect(inferScheduleSubCategory('health')).toBe('checkup');
    expect(inferScheduleSubCategory('grooming')).toBe('bath');
  });

  it('알림 키와 분 배열을 서로 역변환한다', () => {
    expect(getReminderMinutesByKey('hour')).toEqual([60]);
    expect(getReminderKeyByMinutes([60])).toBe('hour');
    expect(getReminderKeyByMinutes([])).toBe('none');
  });

  it('날짜 요약과 프리셋 목록을 만든다', () => {
    expect(formatScheduleDateSummary('2026.03.06')).toContain('2026.03.06');
    expect(createScheduleDatePresets()).toHaveLength(7);
  });
});
