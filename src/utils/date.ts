// 파일: src/utils/date.ts
// 목적:
// - KST 기준 날짜/시간 유틸 통합
// - 함께한 날짜(D-day) 계산
// - 오늘 yyyy-mm-dd
// - 오늘 MM-DD (작년 오늘 매칭용)
// - 시간대(아침/점심/저녁) 계산: 07:00 / 12:00 / 18:00 기준

export type TimePhase = 'morning' | 'noon' | 'evening';

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
  const hour = now.getUTCHours(); // KST로 보정된 now라 UTC hours를 써도 KST hour가 됨

  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'noon';
  return 'evening';
}
