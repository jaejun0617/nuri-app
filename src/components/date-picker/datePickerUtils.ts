// 파일: src/components/date-picker/datePickerUtils.ts
// 역할:
// - 공통 DatePicker가 사용하는 날짜 계산/보정 유틸 제공
// - 윤년, 월 마지막 날짜, initialDate 파싱, 연도 범위 보정 등을 한 곳에서 관리

export type DateParts = {
  year: number;
  month: number;
  day: number;
};

export const DEFAULT_MIN_YEAR = 1950;
export const DEFAULT_MAX_YEAR = new Date().getFullYear() + 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function isLeapYear(year: number) {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

export function getDaysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

export function clampDateParts(
  value: DateParts,
  minYear = DEFAULT_MIN_YEAR,
  maxYear = DEFAULT_MAX_YEAR,
): DateParts {
  const year = clamp(value.year, minYear, maxYear);
  const month = clamp(value.month, 1, 12);
  const day = clamp(value.day, 1, getDaysInMonth(year, month));

  return { year, month, day };
}

export function formatDatePart(value: number, width = 2) {
  return `${value}`.padStart(width, '0');
}

export function formatDateParts(value: DateParts) {
  return `${formatDatePart(value.year, 4)}-${formatDatePart(value.month)}-${formatDatePart(value.day)}`;
}

function toDatePartsFromDate(date: Date): DateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function parseStringDate(value: string): DateParts | null {
  const normalized = value.trim().replace(/[./]/g, '-');
  if (!normalized) return null;

  const separated = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (separated) {
    return {
      year: Number(separated[1]),
      month: Number(separated[2]),
      day: Number(separated[3]),
    };
  }

  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 8) {
    return {
      year: Number(digits.slice(0, 4)),
      month: Number(digits.slice(4, 6)),
      day: Number(digits.slice(6, 8)),
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return toDatePartsFromDate(date);
}

export function parseInitialDate(
  value: Date | string | null | undefined,
  minYear = DEFAULT_MIN_YEAR,
  maxYear = DEFAULT_MAX_YEAR,
): DateParts {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return clampDateParts(toDatePartsFromDate(value), minYear, maxYear);
  }

  if (typeof value === 'string') {
    const parsed = parseStringDate(value);
    if (parsed) return clampDateParts(parsed, minYear, maxYear);
  }

  return clampDateParts(toDatePartsFromDate(new Date()), minYear, maxYear);
}

export function partsToDate(value: DateParts) {
  return new Date(value.year, value.month - 1, value.day);
}

export function validateDateParts(value: DateParts) {
  if (value.month < 1 || value.month > 12) {
    return '월은 1~12 사이에서 입력해 주세요.';
  }

  const maxDay = getDaysInMonth(value.year, value.month);
  if (value.day < 1 || value.day > maxDay) {
    return `일은 ${value.year}-${formatDatePart(value.month)} 기준 1~${maxDay} 사이여야 합니다.`;
  }

  return null;
}
