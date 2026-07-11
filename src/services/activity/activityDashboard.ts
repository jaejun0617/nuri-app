// 파일: src/services/activity/activityDashboard.ts
// 역할:
// - V1.1.1 활동·칭호 대시보드에 필요한 XP ledger, streak, title, 활동 카운트를
//   user-level 공통 활동과 pet-scoped 활동으로 분리해 화면용 모델로 정리한다.
// - 서버 XP/RLS 계약은 기존 MVP 테이블과 RPC를 재사용하고, 랭킹성 cross-user 조회는 만들지 않는다.

import type { TimelineCategoryCounts } from '../timeline/query';
import { createEmptyTimelineCategoryCounts } from '../timeline/query';
import { fetchTimelineCategoryCountsByPet } from '../supabase/memories';
import { supabase } from '../supabase/client';
import { getPetDailyStatus, type DailyStreakStatus } from './dailyStreak';
import {
  ACTIVITY_XP_POLICIES,
  LEVEL_THRESHOLDS,
  TITLE_POLICIES,
  calculateLevel,
  getLevelFloorXp,
  getNextLevelXp,
  getProgressWithinLevel,
  type ActivityXpEventType,
} from './progressPolicy';
import { getUserLevelSummary, type UserLevelSummary } from './xpProgress';

export type DashboardPet = {
  id: string;
  name: string;
  themeColor?: string | null;
};

export type ActivityDashboardTitle = {
  titleKey: string;
  titleName: string;
  earnedAt: string;
  sourceType: string;
  petId: string | null;
};

export type ActivityDashboardLedgerRow = {
  id: string;
  petId: string | null;
  eventType: ActivityXpEventType;
  sourceType: string;
  sourceId: string;
  xp: number;
  activityDateKst: string;
  createdAt: string;
};

export type ActivitySummaryMetric = {
  eventCount: number;
  xp: number;
};

export type AchievementScope = 'pet' | 'common';
export type AchievementDomain =
  | 'walk'
  | 'streak'
  | 'timeline'
  | 'timeline_category'
  | 'community'
  | 'comment'
  | 'health';

export type ActivityAchievement = {
  key: string;
  name: string;
  domain: AchievementDomain;
  scope: AchievementScope;
  ownerId: string;
  ownerLabel: string;
  conditionLabel: string;
  currentValue: number;
  threshold: number;
  achieved: boolean;
};

export type PetActivityDashboardSummary = {
  petId: string;
  petName: string;
  themeColor: string | null;
  xp: number;
  ledgerEventCount: number;
  walk: ActivitySummaryMetric;
  timeline: ActivitySummaryMetric;
  health: ActivitySummaryMetric & { recordCount: number };
  streak: DailyStreakStatus | null;
  timelineCategoryCounts: TimelineCategoryCounts;
  achievements: ActivityAchievement[];
};

export type CommonActivityDashboardSummary = {
  xp: number;
  ledgerEventCount: number;
  communityPosts: ActivitySummaryMetric & { postCount: number };
  comments: ActivitySummaryMetric & { commentCount: number };
  achievements: ActivityAchievement[];
};

export type ActivityDashboardData = {
  levelSummary: UserLevelSummary;
  levelProgress: number;
  maxLevel: number;
  representativeTitle: string;
  earnedTitles: ActivityDashboardTitle[];
  petSummaries: PetActivityDashboardSummary[];
  commonSummary: CommonActivityDashboardSummary;
  allAchievements: ActivityAchievement[];
  ledgerLimitReached: boolean;
};

type ActivityDashboardBuildInput = {
  pets: DashboardPet[];
  levelSummary: UserLevelSummary;
  titles: ActivityDashboardTitle[];
  ledgerRows: ActivityDashboardLedgerRow[];
  streakByPetId: Record<string, DailyStreakStatus | null>;
  timelineCountsByPetId: Record<string, TimelineCategoryCounts>;
  healthRecordCountsByPetId: Record<string, number>;
  communityPostCount: number;
  commentCount: number;
  ledgerLimitReached?: boolean;
};

type UserActivityLongSummary = {
  levelSummary: UserLevelSummary;
  communityPostCount: number;
  commentCount: number;
};

const MAX_LEDGER_ROWS = 1000;

const EVENT_TYPES = new Set<ActivityXpEventType>(
  Object.keys(ACTIVITY_XP_POLICIES) as ActivityXpEventType[],
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNullableString(value: unknown): string | null {
  const normalized = toString(value);
  return normalized.length > 0 ? normalized : null;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toCount(value: unknown): number {
  const numeric = toNumber(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function normalizeEventType(value: unknown): ActivityXpEventType | null {
  const normalized = toString(value) as ActivityXpEventType;
  return EVENT_TYPES.has(normalized) ? normalized : null;
}

function mapLedgerRow(value: unknown): ActivityDashboardLedgerRow | null {
  if (!isRecord(value)) return null;
  const id = toString(value.id);
  const eventType = normalizeEventType(value.event_type);
  const sourceType = toString(value.source_type);
  const sourceId = toString(value.source_id);
  const activityDateKst = toString(value.activity_date_kst);
  const createdAt = toString(value.created_at);
  if (!id || !eventType || !sourceType || !sourceId || !activityDateKst || !createdAt) {
    return null;
  }

  return {
    id,
    petId: toNullableString(value.pet_id),
    eventType,
    sourceType,
    sourceId,
    xp: toCount(value.xp),
    activityDateKst,
    createdAt,
  };
}

function mapTitleRow(value: unknown): ActivityDashboardTitle | null {
  if (!isRecord(value)) return null;
  const titleKey = toString(value.title_key);
  const titleName = toString(value.title_name);
  const earnedAt = toString(value.earned_at);
  if (!titleKey || !titleName || !earnedAt) return null;

  return {
    titleKey,
    titleName,
    earnedAt,
    sourceType: toString(value.source_type) || 'xp_ledger',
    petId: toNullableString(value.pet_id),
  };
}

function mapUserActivityLongSummary(value: unknown): UserActivityLongSummary | null {
  if (!isRecord(value)) return null;
  const community = isRecord(value.community) ? value.community : {};
  return {
    levelSummary: {
      totalXp: toCount(value.totalXp),
      level: Math.max(1, toCount(value.level) || 1),
      currentLevelXp: toCount(value.currentLevelXp),
      nextLevelXp: toCount(value.nextLevelXp),
      updatedAt: null,
    },
    communityPostCount: toCount(community.post_count),
    commentCount: toCount(community.comment_count),
  };
}

function sumXp(rows: ActivityDashboardLedgerRow[]) {
  return rows.reduce((sum, row) => sum + row.xp, 0);
}

function countRowsByEvent(
  rows: ActivityDashboardLedgerRow[],
  eventTypes: ReadonlyArray<ActivityXpEventType>,
) {
  const allowed = new Set(eventTypes);
  return rows.filter(row => allowed.has(row.eventType));
}

function buildMetric(
  rows: ActivityDashboardLedgerRow[],
  eventTypes: ReadonlyArray<ActivityXpEventType>,
): ActivitySummaryMetric {
  const filtered = countRowsByEvent(rows, eventTypes);
  return {
    eventCount: filtered.length,
    xp: sumXp(filtered),
  };
}

function buildAchievement(input: {
  key: string;
  name: string;
  domain: AchievementDomain;
  scope: AchievementScope;
  ownerId: string;
  ownerLabel: string;
  conditionLabel: string;
  currentValue: number;
  threshold: number;
}): ActivityAchievement {
  return {
    ...input,
    currentValue: Math.max(0, Math.floor(input.currentValue)),
    achieved: input.currentValue >= input.threshold,
  };
}

function buildPetAchievements(input: {
  petId: string;
  petName: string;
  walkCount: number;
  bestStreak: number;
  timelineCount: number;
  timelineCategoryCounts: TimelineCategoryCounts;
  healthCount: number;
}): ActivityAchievement[] {
  const timelineCategoryTotal =
    (input.timelineCategoryCounts.walk ?? 0) +
    (input.timelineCategoryCounts.meal ?? 0) +
    (input.timelineCategoryCounts.diary ?? 0) +
    (input.timelineCategoryCounts.other ?? 0);

  return [
    buildAchievement({
      key: 'pet_first_walk_friend',
      name: '첫 산책 친구',
      domain: 'walk',
      scope: 'pet',
      ownerId: input.petId,
      ownerLabel: input.petName,
      conditionLabel: '산책 기록 1회',
      currentValue: input.walkCount,
      threshold: 1,
    }),
    buildAchievement({
      key: 'pet_walk_sprout',
      name: '산책 새싹',
      domain: 'walk',
      scope: 'pet',
      ownerId: input.petId,
      ownerLabel: input.petName,
      conditionLabel: '산책 기록 7회',
      currentValue: input.walkCount,
      threshold: 7,
    }),
    buildAchievement({
      key: 'pet_routine_sprout',
      name: '루틴 새싹',
      domain: 'streak',
      scope: 'pet',
      ownerId: input.petId,
      ownerLabel: input.petName,
      conditionLabel: '3일 연속 산책',
      currentValue: input.bestStreak,
      threshold: 3,
    }),
    buildAchievement({
      key: 'pet_steady_walker',
      name: '꾸준한 산책러',
      domain: 'streak',
      scope: 'pet',
      ownerId: input.petId,
      ownerLabel: input.petName,
      conditionLabel: '7일 연속 산책',
      currentValue: input.bestStreak,
      threshold: 7,
    }),
    buildAchievement({
      key: 'pet_first_memory_record',
      name: '첫 추억 기록',
      domain: 'timeline',
      scope: 'pet',
      ownerId: input.petId,
      ownerLabel: input.petName,
      conditionLabel: '타임라인 1개',
      currentValue: input.timelineCount,
      threshold: 1,
    }),
    buildAchievement({
      key: 'pet_memory_collector',
      name: '추억 수집가',
      domain: 'timeline',
      scope: 'pet',
      ownerId: input.petId,
      ownerLabel: input.petName,
      conditionLabel: '타임라인 10개',
      currentValue: input.timelineCount,
      threshold: 10,
    }),
    buildAchievement({
      key: 'pet_category_keeper',
      name: '하루 기록러',
      domain: 'timeline_category',
      scope: 'pet',
      ownerId: input.petId,
      ownerLabel: input.petName,
      conditionLabel: '카테고리 기록 10개',
      currentValue: timelineCategoryTotal,
      threshold: 10,
    }),
    buildAchievement({
      key: 'pet_first_health_record',
      name: '첫 건강 기록',
      domain: 'health',
      scope: 'pet',
      ownerId: input.petId,
      ownerLabel: input.petName,
      conditionLabel: '건강 기록 1개',
      currentValue: input.healthCount,
      threshold: 1,
    }),
    buildAchievement({
      key: 'pet_health_habit',
      name: '건강 습관러',
      domain: 'health',
      scope: 'pet',
      ownerId: input.petId,
      ownerLabel: input.petName,
      conditionLabel: '건강 기록 10개',
      currentValue: input.healthCount,
      threshold: 10,
    }),
  ];
}

function buildCommonAchievements(input: {
  communityPostCount: number;
  commentCount: number;
}): ActivityAchievement[] {
  return [
    buildAchievement({
      key: 'common_first_hello_done',
      name: '첫 인사 완료',
      domain: 'community',
      scope: 'common',
      ownerId: 'common',
      ownerLabel: '공통 활동',
      conditionLabel: '커뮤니티 글 1개',
      currentValue: input.communityPostCount,
      threshold: 1,
    }),
    buildAchievement({
      key: 'common_neighborhood_news',
      name: '동네 소식통',
      domain: 'community',
      scope: 'common',
      ownerId: 'common',
      ownerLabel: '공통 활동',
      conditionLabel: '커뮤니티 글 10개',
      currentValue: input.communityPostCount,
      threshold: 10,
    }),
    buildAchievement({
      key: 'common_storyteller',
      name: '이야기꾼',
      domain: 'community',
      scope: 'common',
      ownerId: 'common',
      ownerLabel: '공통 활동',
      conditionLabel: '커뮤니티 글 50개',
      currentValue: input.communityPostCount,
      threshold: 50,
    }),
    buildAchievement({
      key: 'common_kind_commenter',
      name: '다정한 댓글러',
      domain: 'comment',
      scope: 'common',
      ownerId: 'common',
      ownerLabel: '공통 활동',
      conditionLabel: '댓글 10개',
      currentValue: input.commentCount,
      threshold: 10,
    }),
    buildAchievement({
      key: 'common_comment_fairy',
      name: '댓글 요정',
      domain: 'comment',
      scope: 'common',
      ownerId: 'common',
      ownerLabel: '공통 활동',
      conditionLabel: '댓글 30개',
      currentValue: input.commentCount,
      threshold: 30,
    }),
    buildAchievement({
      key: 'common_warm_commenter',
      name: '따뜻한 참견러',
      domain: 'comment',
      scope: 'common',
      ownerId: 'common',
      ownerLabel: '공통 활동',
      conditionLabel: '댓글 100개',
      currentValue: input.commentCount,
      threshold: 100,
    }),
  ];
}

export function buildActivityDashboard(
  input: ActivityDashboardBuildInput,
): ActivityDashboardData {
  const commonRows = input.ledgerRows.filter(row => row.petId === null);
  const commonCommunityRows = countRowsByEvent(commonRows, ['community_post']);
  const commonCommentRows = countRowsByEvent(commonRows, ['comment']);

  const petSummaries = input.pets.map(pet => {
    const petRows = input.ledgerRows.filter(row => row.petId === pet.id);
    const walk = buildMetric(petRows, [
      'walk_record',
      'walk_timeline_post',
      'streak_3_bonus',
      'streak_7_bonus',
      'streak_30_bonus',
    ]);
    const timeline = buildMetric(petRows, ['walk_timeline_post', 'timeline_post']);
    const health = buildMetric(petRows, ['health_record']);
    const streak = input.streakByPetId[pet.id] ?? null;
    const timelineCategoryCounts =
      input.timelineCountsByPetId[pet.id] ?? createEmptyTimelineCategoryCounts();
    const healthRecordCount = input.healthRecordCountsByPetId[pet.id] ?? health.eventCount;
    const achievements = buildPetAchievements({
      petId: pet.id,
      petName: pet.name,
      walkCount: countRowsByEvent(petRows, ['walk_record', 'walk_timeline_post']).length,
      bestStreak: streak?.bestStreak ?? 0,
      timelineCount: timelineCategoryCounts.all ?? timeline.eventCount,
      timelineCategoryCounts,
      healthCount: healthRecordCount,
    });

    return {
      petId: pet.id,
      petName: pet.name,
      themeColor: pet.themeColor ?? null,
      xp: sumXp(petRows),
      ledgerEventCount: petRows.length,
      walk,
      timeline,
      health: {
        ...health,
        recordCount: healthRecordCount,
      },
      streak,
      timelineCategoryCounts,
      achievements,
    };
  });

  const commonSummary: CommonActivityDashboardSummary = {
    xp: sumXp(commonRows),
    ledgerEventCount: commonRows.length,
    communityPosts: {
      eventCount: commonCommunityRows.length,
      xp: sumXp(commonCommunityRows),
      postCount: input.communityPostCount,
    },
    comments: {
      eventCount: commonCommentRows.length,
      xp: sumXp(commonCommentRows),
      commentCount: input.commentCount,
    },
    achievements: buildCommonAchievements({
      communityPostCount: input.communityPostCount,
      commentCount: input.commentCount,
    }),
  };

  const policyTitleNames = new Set(TITLE_POLICIES.map(item => item.name));
  const representativeTitle =
    input.titles.find(title => policyTitleNames.has(title.titleName))?.titleName ??
    input.titles[0]?.titleName ??
    '첫 추억 기록 준비 중';
  const normalizedLevel = calculateLevel(input.levelSummary.totalXp);
  const normalizedLevelSummary: UserLevelSummary = {
    ...input.levelSummary,
    level: normalizedLevel,
    currentLevelXp: getLevelFloorXp(normalizedLevel),
    nextLevelXp: getNextLevelXp(normalizedLevel),
  };

  return {
    levelSummary: normalizedLevelSummary,
    levelProgress: getProgressWithinLevel(normalizedLevelSummary),
    maxLevel: LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]?.level ?? 10,
    representativeTitle,
    earnedTitles: input.titles,
    petSummaries,
    commonSummary,
    allAchievements: [
      ...petSummaries.flatMap(summary => summary.achievements),
      ...commonSummary.achievements,
    ],
    ledgerLimitReached: input.ledgerLimitReached === true,
  };
}

async function fetchUserActivityLedger(): Promise<ActivityDashboardLedgerRow[]> {
  const { data, error } = await supabase
    .from('user_xp_ledger')
    .select('id, pet_id, event_type, source_type, source_id, xp, activity_date_kst, created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_LEDGER_ROWS);

  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data
    .map(mapLedgerRow)
    .filter((row): row is ActivityDashboardLedgerRow => row !== null);
}

async function fetchUserActivityTitles(): Promise<ActivityDashboardTitle[]> {
  const { data, error } = await supabase
    .from('user_titles')
    .select('title_key, title_name, earned_at, source_type, pet_id')
    .order('earned_at', { ascending: false });

  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data
    .map(mapTitleRow)
    .filter((row): row is ActivityDashboardTitle => row !== null);
}

async function fetchCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

async function fetchUserActivityLongSummary(): Promise<UserActivityLongSummary | null> {
  const { data, error } = await supabase.rpc('get_user_activity_long_summary_v1');
  if (error) throw error;
  return mapUserActivityLongSummary(data);
}

async function fetchCommunityPostCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) throw error;
  return count ?? 0;
}

async function fetchCommentCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) throw error;
  return count ?? 0;
}

async function fetchHealthRecordCountByPet(petId: string): Promise<number> {
  const { count, error } = await supabase
    .from('memories')
    .select('id', { count: 'exact', head: true })
    .eq('pet_id', petId)
    .or('category.eq.health,sub_category.eq.hospital');

  if (error) throw error;
  return count ?? 0;
}

export async function loadActivityDashboard(
  pets: DashboardPet[],
): Promise<ActivityDashboardData> {
  const userId = await fetchCurrentUserId();
  if (!userId) {
    return buildActivityDashboard({
      pets,
      levelSummary: {
        totalXp: 0,
        level: 1,
        currentLevelXp: 0,
        nextLevelXp: 100,
        updatedAt: null,
      },
      titles: [],
      ledgerRows: [],
      streakByPetId: {},
      timelineCountsByPetId: {},
      healthRecordCountsByPetId: {},
      communityPostCount: 0,
      commentCount: 0,
    });
  }

  const [
    longSummary,
    titles,
    ledgerRows,
    petStreakPairs,
    petTimelineCountPairs,
    petHealthCountPairs,
  ] = await Promise.all([
    fetchUserActivityLongSummary().catch(() => null),
    fetchUserActivityTitles(),
    fetchUserActivityLedger(),
    Promise.all(
      pets.map(async pet => [pet.id, await getPetDailyStatus(pet.id)] as const),
    ),
    Promise.all(
      pets.map(async pet => [pet.id, await fetchTimelineCategoryCountsByPet(pet.id)] as const),
    ),
    Promise.all(
      pets.map(async pet => [pet.id, await fetchHealthRecordCountByPet(pet.id)] as const),
    ),
  ]);

  const fallbackSummary = longSummary ?? {
    levelSummary: await getUserLevelSummary(),
    communityPostCount: await fetchCommunityPostCount(userId),
    commentCount: await fetchCommentCount(userId),
  };

  return buildActivityDashboard({
    pets,
    levelSummary: fallbackSummary.levelSummary,
    titles,
    ledgerRows,
    streakByPetId: Object.fromEntries(petStreakPairs),
    timelineCountsByPetId: Object.fromEntries(petTimelineCountPairs),
    healthRecordCountsByPetId: Object.fromEntries(petHealthCountPairs),
    communityPostCount: fallbackSummary.communityPostCount,
    commentCount: fallbackSummary.commentCount,
    ledgerLimitReached: ledgerRows.length >= MAX_LEDGER_ROWS,
  });
}
