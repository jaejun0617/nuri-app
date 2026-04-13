import {
  getKstYmd,
  getMonthKeyInKst,
  safeYmd,
} from '../../utils/date';

export type HealthReportMonthBounds = {
  monthKey: string;
  startYmd: string;
  endYmd: string;
  endExclusiveYmd: string;
  startIso: string;
  endInclusiveIso: string;
  endExclusiveIso: string;
  daysInMonth: number;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toMonthStartUtc(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, -9, 0, 0, 0));
}

function isMonthKey(value: string | null | undefined): value is string {
  return /^\d{4}-\d{2}$/.test((value ?? '').trim());
}

export function normalizeHealthReportMonthKey(
  monthKey?: string | null,
  now = new Date(),
): string {
  const normalized = `${monthKey ?? ''}`.trim();
  if (isMonthKey(normalized)) {
    return normalized;
  }

  return getMonthKeyInKst(now) ?? getKstYmd(now).slice(0, 7);
}

export function addMonthsToHealthReportMonthKey(
  monthKey: string,
  offset: number,
): string {
  const normalized = normalizeHealthReportMonthKey(monthKey);
  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(5, 7));
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

export function buildHealthReportMonthBounds(
  monthKey: string,
): HealthReportMonthBounds {
  const normalizedMonthKey = normalizeHealthReportMonthKey(monthKey);
  const year = Number(normalizedMonthKey.slice(0, 4));
  const month = Number(normalizedMonthKey.slice(5, 7));

  const startYmd = `${year}-${pad2(month)}-01`;
  const nextMonth = addMonthsToHealthReportMonthKey(normalizedMonthKey, 1);
  const nextYear = Number(nextMonth.slice(0, 4));
  const nextMonthNumber = Number(nextMonth.slice(5, 7));
  const endExclusiveYmd = `${nextYear}-${pad2(nextMonthNumber)}-01`;

  const monthStartUtc = toMonthStartUtc(year, month);
  const nextMonthStartUtc = toMonthStartUtc(nextYear, nextMonthNumber);
  const daysInMonth = Math.round(
    (nextMonthStartUtc.getTime() - monthStartUtc.getTime()) /
      (24 * 60 * 60 * 1000),
  );
  const endYmd = `${year}-${pad2(month)}-${pad2(daysInMonth)}`;

  return {
    monthKey: normalizedMonthKey,
    startYmd,
    endYmd,
    endExclusiveYmd,
    startIso: monthStartUtc.toISOString(),
    endInclusiveIso: new Date(nextMonthStartUtc.getTime() - 1).toISOString(),
    endExclusiveIso: nextMonthStartUtc.toISOString(),
    daysInMonth,
  };
}

export function buildHealthReportDateItems(monthKey: string): string[] {
  const bounds = buildHealthReportMonthBounds(monthKey);
  const items: string[] = [];

  for (let day = 1; day <= bounds.daysInMonth; day += 1) {
    items.push(`${bounds.monthKey}-${pad2(day)}`);
  }

  return items.filter(item => safeYmd(item) !== null);
}

