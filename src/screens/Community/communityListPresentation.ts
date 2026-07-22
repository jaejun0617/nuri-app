import { getKstDateParts } from '../../utils/date';

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

/**
 * Dense community rows use clock time for today's posts and a compact date for
 * older posts. The comparison is intentionally KST-based to match the rest of
 * the app's date contract.
 */
export function formatCommunityListTimestamp(
  createdAt: string,
  now = new Date(),
): string {
  const created = getKstDateParts(createdAt);
  const current = getKstDateParts(now);
  if (!created || !current) return '-';

  const isToday =
    created.year === current.year &&
    created.month === current.month &&
    created.day === current.day;
  if (isToday) {
    return `${pad2(created.hour)}:${pad2(created.minute)}`;
  }

  if (created.year === current.year) {
    return `${pad2(created.month)}.${pad2(created.day)}`;
  }

  return `${String(created.year).slice(-2)}.${pad2(created.month)}.${pad2(
    created.day,
  )}`;
}
