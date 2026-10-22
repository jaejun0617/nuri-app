// 파일: src/services/ranking/activityRanking.ts
// 역할:
// - V1.1.1 NURI 랭킹 RPC의 제한 필드 응답을 화면용 모델로 정규화한다.
// - email/user_id/raw id는 서버에서 받지 않고, 앱도 노출하지 않는다.

import { supabase } from '../supabase/client';
import { calculateLevel } from '../activity/progressPolicy';

export type ActivityRankingCategoryKey =
  | 'overall'
  | 'walk'
  | 'posts'
  | 'comments'
  | 'health'
  | 'life'
  | 'grooming';

export type ActivityRankingCategory = {
  key: ActivityRankingCategoryKey;
  label: string;
  helper: string;
  unit: string;
};

export const ACTIVITY_RANKING_CATEGORIES: ReadonlyArray<ActivityRankingCategory> = [
  {
    key: 'overall',
    label: '종합',
    helper: '누적 XP 기준',
    unit: 'XP',
  },
  {
    key: 'walk',
    label: '산책',
    helper: '산책 XP 기준',
    unit: 'XP',
  },
  {
    key: 'posts',
    label: '글',
    helper: '타임라인·커뮤니티 글 수',
    unit: '개',
  },
  {
    key: 'comments',
    label: '댓글',
    helper: '댓글 활동 수',
    unit: '개',
  },
  {
    key: 'health',
    label: '건강',
    helper: '건강 기록 수',
    unit: '회',
  },
  {
    key: 'life',
    label: '생활',
    helper: '생활 기록 수',
    unit: '회',
  },
  {
    key: 'grooming',
    label: '미용',
    helper: '미용 기록 수',
    unit: '건',
  },
];

export type ActivityRankingRow = {
  rankNo: number;
  displayName: string;
  score: number;
  level: number;
  totalXp: number;
  category: ActivityRankingCategoryKey;
  isCurrentUser: boolean;
  rowSource: 'user' | 'qa_fixture';
};

export type ActivityRankingBar = ActivityRankingRow & {
  barRatio: number;
  scoreLabel: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function normalizeCategory(value: unknown): ActivityRankingCategoryKey {
  const normalized = toString(value) as ActivityRankingCategoryKey;
  return ACTIVITY_RANKING_CATEGORIES.some(item => item.key === normalized)
    ? normalized
    : 'overall';
}

function normalizeRowSource(value: unknown): ActivityRankingRow['rowSource'] {
  return value === 'qa_fixture' ? 'qa_fixture' : 'user';
}

export function mapActivityRankingRow(value: unknown): ActivityRankingRow | null {
  if (!isRecord(value)) return null;
  const displayName = toString(value.display_name);
  const rankNo = Math.max(0, Math.floor(toNumber(value.rank_no)));
  if (!displayName || rankNo <= 0) return null;
  const totalXp = Math.max(0, Math.floor(toNumber(value.total_xp)));

  return {
    rankNo,
    displayName,
    score: Math.max(0, Math.floor(toNumber(value.score))),
    level: calculateLevel(totalXp),
    totalXp,
    category: normalizeCategory(value.category),
    isCurrentUser: toBoolean(value.is_current_user),
    rowSource: normalizeRowSource(value.row_source),
  };
}

export function formatRankingScore(
  row: Pick<ActivityRankingRow, 'score' | 'category'>,
): string {
  if (!Number.isFinite(row.score) || row.score < 0) return '확인 필요';
  const category =
    ACTIVITY_RANKING_CATEGORIES.find(item => item.key === row.category) ??
    ACTIVITY_RANKING_CATEGORIES[0];
  const formatted = row.score.toLocaleString('ko-KR');
  return category.unit === 'XP' ? `${formatted} XP` : `${formatted}${category.unit}`;
}

export function buildRankingBars(rows: ActivityRankingRow[]): ActivityRankingBar[] {
  const validScore = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;
  const maxScore = rows.reduce((max, row) => Math.max(max, validScore(row.score)), 0);
  return rows.map(row => ({
    ...row,
    barRatio: maxScore > 0 ? validScore(row.score) / maxScore : 0,
    scoreLabel: formatRankingScore(row),
  }));
}

export async function fetchActivityRanking(input: {
  category: ActivityRankingCategoryKey;
  limit?: number;
  includeQaFixture?: boolean;
}): Promise<ActivityRankingRow[]> {
  const { data, error } = await supabase.rpc('get_activity_ranking_v1', {
    p_category: input.category,
    p_limit: input.limit ?? 20,
    p_include_qa_fixture: input.includeQaFixture ?? false,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data
    .map(mapActivityRankingRow)
    .filter((row): row is ActivityRankingRow => row !== null);
}

export type ActivityRankingSnapshot = {
  rows: ActivityRankingBar[];
  myRow: ActivityRankingBar | null;
};

/** A single ranked snapshot keeps top-10 and self consistent even at a tie. */
export async function fetchActivityRankingSnapshot(
  category: ActivityRankingCategoryKey,
): Promise<ActivityRankingSnapshot> {
  const { data, error } = await supabase.rpc('get_activity_ranking_snapshot_v1', {
    p_category: category,
  });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('NURI_RANKING_INVALID_RESPONSE');
  const mapped = data.map(mapActivityRankingRow).filter((row): row is ActivityRankingRow => row !== null);
  if (mapped.length !== data.length || mapped.length > 11 ||
      mapped.filter(row => row.isCurrentUser).length > 1 ||
      new Set(mapped.map(row => row.rankNo)).size !== mapped.length ||
      mapped.some(row => row.category !== category || row.rowSource !== 'user' ||
        (row.rankNo > 10 && !row.isCurrentUser))) {
    throw new Error('NURI_RANKING_INVALID_RESPONSE');
  }
  const rows = buildRankingBars(mapped.filter(row => row.rankNo <= 10));
  const own = mapped.find(row => row.isCurrentUser);
  const myRow = own ? rows.find(row => row.isCurrentUser) ?? buildRankingBars([own])[0] : null;
  return { rows, myRow };
}
