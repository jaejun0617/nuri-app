// 파일: src/utils/date.ts
// 목적:
// - 앱 전반의 날짜/시간 기준을 KST(Asia/Seoul) 캘린더로 통일
// - 서버 ISO 시각 -> KST 날짜 표시/비교/상대시간 계산을 한 곳에서 제공

export type TimePhase = 'morning' | 'noon' | 'evening';
export type DateInput = string | number | Date | null | undefined;
export type KstDateParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function isYmdString(value: string | null | undefined): value is string {
  return /^\d{4}-\d{2}-\d{2}$/.test((value ?? '').trim());
}

function parseYmdToUtcDate(ymd: string): Date | null {
  if (!isYmdString(ymd)) return null;
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function parseDateInput(input: DateInput): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : new Date(input.getTime());
  }

  if (typeof input === 'number') {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = `${input ?? ''}`.trim();
  if (!raw) return null;

  if (isYmdString(raw)) {
    return parseYmdToUtcDate(raw);
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toKstShiftedDate(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

function formatPartsToYmd(parts: Pick<KstDateParts, 'year' | 'month' | 'day'>) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function getUtcWeekdayFromYmd(ymd: string): number | null {
  const date = parseYmdToUtcDate(ymd);
  if (!date) return null;
  return date.getUTCDay();
}

export function getKstDateParts(input: DateInput = new Date()): KstDateParts | null {
  const date = parseDateInput(input);
  if (!date) return null;

  const shifted = toKstShiftedDate(date);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function getKstNow(now = new Date()) {
  return toKstShiftedDate(now);
}

export function getKstYmd(now = new Date()): string {
  const parts = getKstDateParts(now);
  return parts ? formatPartsToYmd(parts) : '';
}

export function getDateYmdInKst(input: DateInput): string | null {
  const parts = getKstDateParts(input);
  return parts ? formatPartsToYmd(parts) : null;
}

export function getKstMonthDay(now = new Date()): string {
  const parts = getKstDateParts(now);
  if (!parts) return '';
  return `${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function formatKstDateWithWeekday(now = new Date()): string {
  const parts = getKstDateParts(now);
  if (!parts) return '';
  return `${parts.month}월 ${parts.day}일 (${WEEKDAY_KO[parts.weekday]})`;
}

export function safeYmd(input: string | null | undefined): string | null {
  const value = (input ?? '').trim();
  return isYmdString(value) ? value : null;
}

export function formatYmdToDots(ymd: string | null | undefined): string | null {
  const normalized = safeYmd(ymd);
  if (!normalized) return null;
  return normalized.replace(/-/g, '.');
}

export function formatYmdWithWeekday(
  ymd: string | null | undefined,
  options?: { separator?: string; suffix?: boolean },
): string | null {
  const normalized = safeYmd(ymd);
  if (!normalized) return null;

  const separator = options?.separator ?? '.';
  const weekday = getUtcWeekdayFromYmd(normalized);
  if (weekday === null) return null;

  const formatted = normalized.split('-').join(separator);
  return options?.suffix === false
    ? `${formatted} (${WEEKDAY_KO[weekday]})`
    : `${formatted} ${WEEKDAY_KO[weekday]}요일`;
}

export function formatMonthDayFromYmd(
  ymd: string | null | undefined,
  separator = '.',
): string | null {
  const normalized = safeYmd(ymd);
  if (!normalized) return null;
  return `${Number(normalized.slice(5, 7))}${separator}${Number(normalized.slice(8, 10))}`;
}

export function addDaysToYmd(
  ymd: string | null | undefined,
  offsetDays: number,
): string | null {
  const normalized = safeYmd(ymd);
  if (!normalized) return null;

  const date = parseYmdToUtcDate(normalized);
  if (!date) return null;

  const next = new Date(date.getTime() + offsetDays * DAY_MS);
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(
    next.getUTCDate(),
  )}`;
}

export function diffCalendarDaysBetweenYmd(
  fromYmd: string | null | undefined,
  toYmd: string | null | undefined,
): number | null {
  const from = parseYmdToUtcDate(safeYmd(fromYmd) ?? '');
  const to = parseYmdToUtcDate(safeYmd(toYmd) ?? '');
  if (!from || !to) return null;
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export function diffDaysFromKst(dateYmd: string, now = new Date()) {
  const diff = diffCalendarDaysBetweenYmd(dateYmd, getKstYmd(now));
  if (diff === null) return null;
  return diff + 1;
}

export function daysAgoFromKstToday(ymd: string, now = new Date()): number | null {
  return diffCalendarDaysBetweenYmd(ymd, getKstYmd(now));
}

export function getTimePhase(now = new Date()): TimePhase {
  const parts = getKstDateParts(now);
  const hour = parts?.hour ?? 0;

  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'noon';
  return 'evening';
}

export function calcAgeFromBirthYmd(
  birthYmd: string | null | undefined,
  now = new Date(),
): number | null {
  const birth = safeYmd(birthYmd);
  if (!birth) return null;

  const today = getKstDateParts(now);
  if (!today) return null;

  const year = Number(birth.slice(0, 4));
  const month = Number(birth.slice(5, 7));
  const day = Number(birth.slice(8, 10));
  let age = today.year - year;

  if (today.month < month || (today.month === month && today.day < day)) {
    age -= 1;
  }

  return Math.max(0, age);
}

export function getMonthKeyFromYmd(ymd: string | null | undefined): string | null {
  const normalized = safeYmd(ymd);
  return normalized ? normalized.slice(0, 7) : null;
}

export function getMonthKeyInKst(input: DateInput): string | null {
  const ymd = getDateYmdInKst(input);
  return getMonthKeyFromYmd(ymd);
}

export function humanizeMonthKey(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  return `${ym.slice(0, 4)}.${ym.slice(5, 7)}`;
}

export function isSameMonthKey(
  input: DateInput,
  monthKey: string | null | undefined,
): boolean {
  if (!monthKey) return false;
  return getMonthKeyInKst(input) === monthKey;
}

export function getStartOfWeekYmd(
  ymd: string | null | undefined,
  options?: { weekStartsOn?: 0 | 1 },
): string | null {
  const normalized = safeYmd(ymd);
  if (!normalized) return null;

  const weekday = getUtcWeekdayFromYmd(normalized);
  if (weekday === null) return null;

  const weekStartsOn = options?.weekStartsOn ?? 1;
  const offset =
    weekStartsOn === 1 ? (weekday === 0 ? -6 : 1 - weekday) : -weekday;
  return addDaysToYmd(normalized, offset);
}

export function formatRelativeTimeFromNow(
  input: DateInput,
  now = new Date(),
): string {
  const raw = typeof input === 'string' ? input.trim() : '';

  if (isYmdString(raw)) {
    const diffDays = diffCalendarDaysBetweenYmd(raw, getKstYmd(now));
    if (diffDays === null) return '';
    if (diffDays <= 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    return formatMonthDayFromYmd(raw) ?? '';
  }

  const target = parseDateInput(input);
  if (!target) return '';

  const diffMs = Math.max(0, now.getTime() - target.getTime());
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;

  if (diffMs < hourMs) {
    return `${Math.max(1, Math.floor(diffMs / minuteMs))}분 전`;
  }

  const targetYmd = getDateYmdInKst(target);
  const todayYmd = getKstYmd(now);
  if (!targetYmd || !todayYmd) return '';

  const diffDays = diffCalendarDaysBetweenYmd(targetYmd, todayYmd);
  if (diffDays === null) return '';

  if (diffDays <= 0) {
    return `${Math.max(1, Math.floor(diffMs / hourMs))}시간 전`;
  }
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatMonthDayFromYmd(targetYmd) ?? '';
}

export function formatDateLabelFromDate(value: Date | null): string {
  const ymd = getDateYmdInKst(value);
  return formatYmdToDots(ymd) ?? '';
}
