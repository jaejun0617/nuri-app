// 파일: src/utils/date.ts
// 목적:
// - KST 기준 날짜/시간 유틸 통합
// - 함께한 날짜(D-day) 계산
// - 오늘 yyyy-mm-dd / MM-DD
// - 날짜 + 요일(ko) 표시
// - record 날짜 기준 daysAgo 계산 (주간 버킷용)

export type TimePhase = 'morning' | 'noon' | 'evening';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function getKstNow() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

export function getKstYmd(): string {
  const d = getKstNow();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getKstMonthDay(): string {
  const d = getKstNow();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${m}-${day}`;
}

export function formatKstDateWithWeekday(): string {
  const d = getKstNow();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  // KST로 보정된 Date이므로 getUTCDay()가 곧 KST weekday
  const weekday = WEEKDAY_KO[d.getUTCDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

/**
 * diffDaysFromKst
 * - adoptionDate(YYYY-MM-DD) 기준 "함께한 일수" 계산
 * - KST 오늘 00:00 기준으로 계산
 */
export function diffDaysFromKst(dateYmd: string) {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

  const now = getKstNow();
  const today = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
    ),
  );

  const ms = today.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 시간대 기준
 * - morning: 07:00 ~ 11:59
 * - noon:    12:00 ~ 17:59
 * - evening: 18:00 ~ 06:59 (다음날)
 */
export function getTimePhase(): TimePhase {
  const now = getKstNow();
  const hour = now.getUTCHours(); // KST 보정된 now이므로 UTC hours가 KST hour

  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'noon';
  return 'evening';
}

export function safeYmd(input: string | null | undefined): string | null {
  const v = input?.trim() ?? '';
  if (!v) return null;
  // YYYY-MM-DD 가정
  if (v.length >= 10) return v.slice(0, 10);
  return null;
}

/**
 * daysAgoFromKstToday
 * - ymd(YYYY-MM-DD)가 "오늘로부터 몇 일 전"인지 계산
 * - 오늘: 0, 어제: 1 ...
 */
export function daysAgoFromKstToday(ymd: string): number | null {
  const safe = safeYmd(ymd);
  if (!safe) return null;

  const [y, m, d] = safe.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

  const now = getKstNow();
  const today = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
    ),
  );

  const ms = today.getTime() - target.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (!Number.isFinite(days)) return null;
  return days;
}
