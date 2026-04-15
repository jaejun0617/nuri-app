import {
  buildReminderMinutesFromSelection,
  buildQuickToggleReminderMinutes,
  createScheduleDatePresets,
  formatReminderMinutesSummary,
  formatScheduleDateSummary,
  getAutoScheduleIconKey,
  getReminderKeyByMinutes,
  getReminderMinutesByKey,
  inferScheduleSubCategory,
  normalizeScheduleDateInput,
  normalizeReminderIntervalMinutes,
  normalizeScheduleTimeInput,
  parseReminderSelection,
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

  it('카테고리와 기타 분류에 맞는 기본 아이콘을 고른다', () => {
    expect(getAutoScheduleIconKey('walk')).toBe('walk');
    expect(getAutoScheduleIconKey('meal')).toBe('meal');
    expect(getAutoScheduleIconKey('other', 'hospital')).toBe('medical-bag');
    expect(getAutoScheduleIconKey('other', 'bathing')).toBe('shower');
  });

  it('알림 키와 분 배열을 서로 역변환한다', () => {
    expect(getReminderMinutesByKey('ten')).toEqual([10]);
    expect(getReminderKeyByMinutes([10])).toBe('ten');
    expect(getReminderKeyByMinutes([])).toBe('none');
  });

  it('직접 입력과 반복 횟수로 알림 배열을 만든다', () => {
    const next = buildReminderMinutesFromSelection({
      reminderKey: 'custom',
      reminderRepeatKey: 'three',
      customReminderMinutesText: '5',
      startsAt: '2099-03-06T10:00:00.000Z',
      now: new Date('2099-03-06T09:40:00.000Z'),
    });

    expect(next).toEqual([5, 10, 15]);
    expect(formatReminderMinutesSummary(next)).toBe('5분 전 · 3회');
    expect(parseReminderSelection(next)).toEqual({
      reminderKey: 'five',
      reminderRepeatKey: 'three',
      customReminderMinutesText: '',
    });
  });

  it('빠른 토글 기본 알림과 직접 분 입력을 정규화한다', () => {
    expect(normalizeReminderIntervalMinutes('15')).toBe(15);
    expect(() => normalizeReminderIntervalMinutes('0')).toThrow(
      '직접 설정은 1분 이상 1440분 이하로 입력해 주세요.',
    );
    expect(
      buildQuickToggleReminderMinutes(
        new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      ),
    ).toEqual([5]);
  });

  it('날짜 요약과 프리셋 목록을 만든다', () => {
    expect(formatScheduleDateSummary('2026.03.06')).toContain('2026.03.06');
    expect(createScheduleDatePresets()).toHaveLength(7);
  });
});
