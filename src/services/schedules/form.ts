// 파일: src/services/schedules/form.ts
// 역할:
// - 일정 생성/수정 화면이 공유하는 폼 옵션과 입력 정규화 로직을 제공
// - 날짜/시간 검증, 반복/알림 옵션, 카테고리-서브카테고리 매핑 규칙을 중앙화
// - ScheduleCreateScreen / ScheduleEditScreen 사이의 중복 분기를 줄여 유지보수 비용을 낮춤

import type {
  ScheduleCategory,
  ScheduleColorKey,
  ScheduleIconKey,
  ScheduleRepeatRule,
  ScheduleSubCategory,
} from '../supabase/schedules';

export const SCHEDULE_CATEGORY_OPTIONS: Array<{
  key: ScheduleCategory;
  label: string;
  icon: string;
}> = [
  { key: 'walk', label: '산책', icon: 'walk' },
  { key: 'meal', label: '식사', icon: 'silverware-fork-knife' },
  { key: 'health', label: '건강', icon: 'medical-bag' },
  { key: 'grooming', label: '미용', icon: 'content-cut' },
  { key: 'diary', label: '일기', icon: 'notebook-outline' },
  { key: 'other', label: '···', icon: 'dots-horizontal-circle-outline' },
];

export type ScheduleOtherUiSubCategoryKey =
  | 'grooming'
  | 'hospital'
  | 'indoor'
  | 'training'
  | 'outing'
  | 'shopping'
  | 'bathing'
  | 'etc';

export const SCHEDULE_OTHER_UI_SUBCATEGORY_OPTIONS: Array<{
  key: ScheduleOtherUiSubCategoryKey;
  label: string;
}> = [
  { key: 'grooming', label: '미용' },
  { key: 'hospital', label: '병원/약' },
  { key: 'indoor', label: '실내 놀이' },
  { key: 'training', label: '교육/훈련' },
  { key: 'outing', label: '외출/여행' },
  { key: 'shopping', label: '용품/쇼핑' },
  { key: 'bathing', label: '목욕/위생' },
  { key: 'etc', label: '기타' },
];

export const SCHEDULE_ICON_OPTIONS: Array<{
  key: ScheduleIconKey;
  label: string;
  icon: string;
}> = [
  { key: 'walk', label: '산책', icon: 'walk' },
  { key: 'meal', label: '식사', icon: 'silverware-fork-knife' },
  { key: 'medical-bag', label: '병원', icon: 'medical-bag' },
  { key: 'syringe', label: '접종', icon: 'syringe' },
  { key: 'pill', label: '약', icon: 'pill' },
  { key: 'content-cut', label: '미용', icon: 'content-cut' },
  { key: 'shower', label: '목욕', icon: 'shower' },
  { key: 'notebook', label: '일기', icon: 'notebook-outline' },
  { key: 'heart', label: '케어', icon: 'heart' },
  { key: 'star', label: '기타', icon: 'star' },
];

export const SCHEDULE_COLOR_OPTIONS: Array<{
  key: ScheduleColorKey;
  label: string;
  color: string;
}> = [
  { key: 'brand', label: '보라', color: '#6D6AF8' },
  { key: 'blue', label: '파랑', color: '#3B82F6' },
  { key: 'green', label: '초록', color: '#22C55E' },
  { key: 'orange', label: '주황', color: '#F97316' },
  { key: 'pink', label: '핑크', color: '#EC4899' },
  { key: 'gray', label: '회색', color: '#94A3B8' },
];

export const SCHEDULE_TIME_PRESETS = [
  '09:00',
  '10:00',
  '13:00',
  '15:00',
  '18:00',
  '20:00',
];

export const SCHEDULE_REPEAT_OPTIONS: Array<{
  key: ScheduleRepeatRule;
  label: string;
}> = [
  { key: 'none', label: '반복 안 함' },
  { key: 'daily', label: '매일' },
  { key: 'weekly', label: '매주' },
  { key: 'monthly', label: '매월' },
];

export const SCHEDULE_REMINDER_OPTIONS = [
  { key: 'none', label: '알림 없음', minutes: [] as number[] },
  { key: 'ten', label: '10분 전', minutes: [10] },
  { key: 'hour', label: '1시간 전', minutes: [60] },
  { key: 'day', label: '하루 전', minutes: [1440] },
] as const;

export type ScheduleReminderOptionKey =
  (typeof SCHEDULE_REMINDER_OPTIONS)[number]['key'];

export function toScheduleDateInput(date: Date) {
  return `${date.getFullYear()}.${`${date.getMonth() + 1}`.padStart(2, '0')}.${`${date.getDate()}`.padStart(2, '0')}`;
}

export function normalizeScheduleDateInput(raw: string): string {
  const value = raw.trim().replace(/\./g, '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('날짜 형식은 YYYY.MM.DD 입니다.');
  }
  return value;
}

export function normalizeScheduleTimeInput(raw: string): string {
  const value = raw.trim();
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new Error('시간 형식은 HH:MM 입니다.');
  }
  return value;
}

export function inferScheduleSubCategory(
  category: ScheduleCategory,
  otherUiKey?: ScheduleOtherUiSubCategoryKey | null,
): ScheduleSubCategory | null {
  switch (category) {
    case 'grooming':
      return 'bath';
    case 'health':
      return 'checkup';
    case 'walk':
      return 'walk-routine';
    case 'meal':
      return 'meal-plan';
    case 'diary':
      return 'journal';
    case 'other':
      switch (otherUiKey) {
        case 'hospital':
          return 'hospital';
        case 'grooming':
        case 'bathing':
          return 'bath';
        case 'indoor':
        case 'training':
        case 'outing':
        case 'shopping':
        case 'etc':
        default:
          return 'etc';
      }
    default:
      return 'etc';
  }
}

export function getAutoScheduleIconKey(
  category: ScheduleCategory,
  otherUiKey?: ScheduleOtherUiSubCategoryKey | null,
): ScheduleIconKey {
  switch (category) {
    case 'walk':
      return 'walk';
    case 'meal':
      return 'meal';
    case 'health':
      return 'medical-bag';
    case 'grooming':
      return 'content-cut';
    case 'diary':
      return 'notebook';
    case 'other':
      switch (otherUiKey) {
        case 'hospital':
          return 'medical-bag';
        case 'grooming':
          return 'content-cut';
        case 'bathing':
          return 'shower';
        case 'indoor':
        case 'training':
        case 'outing':
        case 'shopping':
        case 'etc':
        default:
          return 'star';
      }
    default:
      return 'star';
  }
}

export function mapScheduleSubCategoryToOtherUiKey(
  category: ScheduleCategory,
  subCategory: ScheduleSubCategory | null | undefined,
): ScheduleOtherUiSubCategoryKey | null {
  if (category !== 'other') return null;

  switch (subCategory) {
    case 'hospital':
    case 'medicine':
    case 'checkup':
      return 'hospital';
    case 'bath':
    case 'haircut':
    case 'nail':
      return 'bathing';
    case 'etc':
    case null:
    case undefined:
    default:
      return 'etc';
  }
}

export function formatScheduleDateSummary(dateText: string) {
  const normalized = dateText.replace(/\./g, '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return dateText;

  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${dateText} (${weekdays[date.getDay()]})`;
}

export function createScheduleDatePresets() {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    const labels = ['오늘', '내일', '모레'];
    return {
      label: labels[index] ?? `${date.getMonth() + 1}/${date.getDate()}`,
      value: toScheduleDateInput(date),
    };
  });
}

export function getReminderMinutesByKey(
  key: ScheduleReminderOptionKey,
): number[] {
  return [
    ...(SCHEDULE_REMINDER_OPTIONS.find(option => option.key === key)?.minutes ??
      []),
  ];
}

export function getReminderKeyByMinutes(
  minutes: number[] | null | undefined,
): ScheduleReminderOptionKey {
  return (
    SCHEDULE_REMINDER_OPTIONS.find(
      option =>
        JSON.stringify(option.minutes) === JSON.stringify(minutes ?? []),
    )?.key ?? 'none'
  );
}
