import { getKstDateParts } from '../../utils/date';
import type {
  CommunityListFilter,
  CommunityPostCategory,
} from '../../types/community';

export const COMMUNITY_LIST_FILTER_OPTIONS: ReadonlyArray<{
  key: CommunityListFilter;
  label: string;
}> = [
  { key: 'all', label: '전체' },
  { key: 'popular', label: '인기글' },
  { key: 'notice', label: '공지' },
];

export function getCommunityCategoryLabel(
  category: CommunityPostCategory | null | undefined,
) {
  switch (category) {
    case 'question':
      return '질문';
    case 'info':
      return '정보';
    case 'daily':
      return '일상';
    case 'free':
      return '자유';
    default:
      return '전체';
  }
}

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
