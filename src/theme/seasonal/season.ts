export const NURI_SEASON_TIME_ZONE = 'Asia/Seoul' as const;

export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';

const KST_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Resolves NURI's season from an instant using the fixed Asia/Seoul calendar.
 * KST has no daylight-saving transition, so an explicit UTC offset keeps the
 * result deterministic across devices without relying on the device timezone.
 */
export function getSeasonalThemeKey(date: Date = new Date()): SeasonKey {
  const timestamp = date.getTime();

  if (!Number.isFinite(timestamp)) {
    throw new RangeError(
      'A valid date is required to resolve the NURI season.',
    );
  }

  const monthInKst = new Date(timestamp + KST_UTC_OFFSET_MS).getUTCMonth() + 1;

  if (monthInKst >= 3 && monthInKst <= 5) return 'spring';
  if (monthInKst >= 6 && monthInKst <= 8) return 'summer';
  if (monthInKst >= 9 && monthInKst <= 11) return 'autumn';

  return 'winter';
}
