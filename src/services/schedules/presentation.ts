// 파일: src/services/schedules/presentation.ts
// 역할:
// - 일정 화면들에서 공통으로 쓰는 날짜/아이콘/색상 표시 규칙을 제공
// - 홈/목록/상세가 같은 아이콘 맵과 색상 팔레트를 공유하도록 맞춤
// - 일정 카테고리를 타임라인 카테고리와 연결하는 브리지 역할도 담당

import type {
  PetSchedule,
  ScheduleColorKey,
  ScheduleIconKey,
} from '../supabase/schedules';
import type {
  MemoryMainCategory,
  MemoryOtherSubCategory,
} from '../memories/categoryMeta';
import {
  formatDateLabelFromDate,
  getKstDateParts,
} from '../../utils/date';

export function formatScheduleDateLabel(schedule: PetSchedule): string {
  const parts = getKstDateParts(schedule.startsAt);
  if (!parts) return '';

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const base = `${parts.month}/${parts.day} (${weekdays[parts.weekday]})`;

  if (schedule.allDay) return base;

  return `${base} ${formatKoreanTime(parts.hour, parts.minute)}`;
}

export function formatScheduleDetailDate(schedule: PetSchedule): string {
  const parts = getKstDateParts(schedule.startsAt);
  if (!parts) return '';

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dateLabel = formatDateLabelFromDate(new Date(schedule.startsAt));
  if (!dateLabel) return '';
  const base = `${dateLabel} (${weekdays[parts.weekday]})`;

  if (schedule.allDay) return `${base} · 하루 종일`;

  return `${base} · ${formatKoreanTime(parts.hour, parts.minute)}`;
}

function formatScheduleCategory(category: PetSchedule['category']): string {
  switch (category) {
    case 'walk':
      return '산책';
    case 'meal':
      return '식사';
    case 'health':
      return '건강';
    case 'grooming':
      return '미용';
    case 'diary':
      return '일기';
    case 'other':
    default:
      return '기타';
  }
}

function formatScheduleSubCategory(
  subCategory: PetSchedule['subCategory'],
): string | null {
  switch (subCategory) {
    case 'hospital':
      return '병원';
    case 'medicine':
      return '투약/복약';
    case 'checkup':
      return '검진';
    case 'vaccine':
      return '접종';
    case 'bath':
      return '목욕';
    case 'haircut':
      return '미용';
    case 'nail':
      return '발톱 관리';
    case 'meal-plan':
      return '식사 관리';
    case 'walk-routine':
      return '산책 루틴';
    case 'journal':
      return '일기';
    case 'etc':
      return '기타';
    case null:
    case undefined:
    default:
      return null;
  }
}

export function formatScheduleCategoryLabel(
  schedule: Pick<PetSchedule, 'category' | 'subCategory'>,
): string {
  const category = formatScheduleCategory(schedule.category);
  const subCategory = formatScheduleSubCategory(schedule.subCategory);
  return subCategory ? `${category} · ${subCategory}` : category;
}

function formatKoreanTime(hour: number, minute: number): string {
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${hour12}:${`${minute}`.padStart(2, '0')}`;
}

export function mapScheduleIconName(iconKey: ScheduleIconKey): string {
  switch (iconKey) {
    case 'meal':
    case 'bowl':
      return 'silverware-fork-knife';
    case 'stethoscope':
      return 'stethoscope';
    case 'syringe':
      return 'needle';
    case 'notebook':
      return 'notebook-outline';
    case 'medical-bag':
    case 'pill':
    case 'content-cut':
    case 'shower':
    case 'heart':
    case 'star':
    case 'calendar':
    case 'dots':
    case 'walk':
      return iconKey;
    default:
      return 'calendar';
  }
}

export function getScheduleColorPalette(colorKey: ScheduleColorKey): {
  bg: string;
  fg: string;
  tint: string;
} {
  switch (colorKey) {
    case 'blue':
      return {
        bg: 'rgba(59,130,246,0.12)',
        fg: '#2563EB',
        tint: 'rgba(59,130,246,0.10)',
      };
    case 'green':
      return {
        bg: 'rgba(34,197,94,0.12)',
        fg: '#16A34A',
        tint: 'rgba(34,197,94,0.10)',
      };
    case 'orange':
      return {
        bg: 'rgba(249,115,22,0.12)',
        fg: '#EA580C',
        tint: 'rgba(249,115,22,0.10)',
      };
    case 'pink':
      return {
        bg: 'rgba(236,72,153,0.12)',
        fg: '#DB2777',
        tint: 'rgba(236,72,153,0.10)',
      };
    case 'yellow':
      return {
        bg: 'rgba(245,158,11,0.12)',
        fg: '#D97706',
        tint: 'rgba(245,158,11,0.10)',
      };
    case 'gray':
      return {
        bg: 'rgba(148,163,184,0.12)',
        fg: '#64748B',
        tint: 'rgba(148,163,184,0.10)',
      };
    case 'brand':
    default:
      return {
        bg: 'rgba(109,106,248,0.12)',
        fg: '#6D6AF8',
        tint: 'rgba(109,106,248,0.10)',
      };
  }
}

export function mapScheduleToMemoryCategory(schedule: PetSchedule): {
  mainCategory: Exclude<MemoryMainCategory, 'all'>;
  otherSubCategory?: MemoryOtherSubCategory;
} {
  if (schedule.category === 'walk') return { mainCategory: 'walk' };
  if (schedule.category === 'meal') return { mainCategory: 'meal' };
  if (schedule.category === 'health') return { mainCategory: 'health' };
  if (schedule.category === 'diary') return { mainCategory: 'diary' };

  if (schedule.category === 'grooming') {
    return { mainCategory: 'other', otherSubCategory: 'grooming' };
  }

  if (
    schedule.subCategory === 'hospital' ||
    schedule.subCategory === 'medicine' ||
    schedule.subCategory === 'checkup' ||
    schedule.subCategory === 'vaccine'
  ) {
    return { mainCategory: 'other', otherSubCategory: 'hospital' };
  }

  return { mainCategory: 'other', otherSubCategory: 'etc' };
}
