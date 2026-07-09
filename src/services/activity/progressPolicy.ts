// 파일: src/services/activity/progressPolicy.ts
// 역할:
// - V1.1 2차 MVP의 XP, 레벨, 칭호 정책을 앱과 테스트에서 공유한다.
// - 서버 RPC가 source of truth지만, 화면 progress bar와 focused test는 같은 기준표를 사용한다.

export type ActivityXpEventType =
  | 'walk_record'
  | 'walk_timeline_post'
  | 'timeline_post'
  | 'community_post'
  | 'comment'
  | 'health_record'
  | 'streak_3_bonus'
  | 'streak_7_bonus'
  | 'streak_30_bonus';

export type ActivityXpPolicy = {
  eventType: ActivityXpEventType;
  label: string;
  xp: number;
  dailyLimit: number;
  baseActivityCapApplies: boolean;
};

export const BASE_ACTIVITY_DAILY_XP_CAP = 150;

export const ACTIVITY_XP_POLICIES: Readonly<Record<ActivityXpEventType, ActivityXpPolicy>> = {
  walk_record: {
    eventType: 'walk_record',
    label: '산책 기록',
    xp: 20,
    dailyLimit: 2,
    baseActivityCapApplies: true,
  },
  walk_timeline_post: {
    eventType: 'walk_timeline_post',
    label: '산책 타임라인',
    xp: 30,
    dailyLimit: 1,
    baseActivityCapApplies: true,
  },
  timeline_post: {
    eventType: 'timeline_post',
    label: '타임라인 기록',
    xp: 15,
    dailyLimit: 3,
    baseActivityCapApplies: true,
  },
  community_post: {
    eventType: 'community_post',
    label: '커뮤니티 글',
    xp: 10,
    dailyLimit: 2,
    baseActivityCapApplies: true,
  },
  comment: {
    eventType: 'comment',
    label: '댓글',
    xp: 3,
    dailyLimit: 10,
    baseActivityCapApplies: true,
  },
  health_record: {
    eventType: 'health_record',
    label: '건강 기록',
    xp: 10,
    dailyLimit: 2,
    baseActivityCapApplies: true,
  },
  streak_3_bonus: {
    eventType: 'streak_3_bonus',
    label: '3일 연속 산책',
    xp: 30,
    dailyLimit: 1,
    baseActivityCapApplies: false,
  },
  streak_7_bonus: {
    eventType: 'streak_7_bonus',
    label: '7일 연속 산책',
    xp: 80,
    dailyLimit: 1,
    baseActivityCapApplies: false,
  },
  streak_30_bonus: {
    eventType: 'streak_30_bonus',
    label: '30일 연속 산책',
    xp: 300,
    dailyLimit: 1,
    baseActivityCapApplies: false,
  },
};

export type LevelThreshold = {
  level: number;
  minXp: number;
};

export const LEVEL_THRESHOLDS: ReadonlyArray<LevelThreshold> = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 250 },
  { level: 4, minXp: 450 },
  { level: 5, minXp: 700 },
  { level: 6, minXp: 1000 },
  { level: 7, minXp: 1350 },
  { level: 8, minXp: 1750 },
  { level: 9, minXp: 2150 },
  { level: 10, minXp: 2500 },
  { level: 11, minXp: 3200 },
  { level: 12, minXp: 4200 },
  { level: 13, minXp: 5500 },
  { level: 14, minXp: 7200 },
  { level: 15, minXp: 9400 },
  { level: 16, minXp: 12200 },
  { level: 17, minXp: 15700 },
  { level: 18, minXp: 20000 },
  { level: 19, minXp: 25200 },
  { level: 20, minXp: 31400 },
  { level: 21, minXp: 38700 },
  { level: 22, minXp: 47200 },
  { level: 23, minXp: 57000 },
  { level: 24, minXp: 68200 },
  { level: 25, minXp: 80900 },
  { level: 26, minXp: 95200 },
  { level: 27, minXp: 111200 },
  { level: 28, minXp: 129000 },
  { level: 29, minXp: 148700 },
  { level: 30, minXp: 170400 },
];

export type TitlePolicy = {
  key: string;
  name: string;
  metric: 'walk' | 'timeline' | 'community' | 'comment';
  threshold: number;
};

export const TITLE_POLICIES: ReadonlyArray<TitlePolicy> = [
  { key: 'first_walk_friend', name: '첫 산책 친구', metric: 'walk', threshold: 1 },
  { key: 'walk_sprout', name: '산책 새싹', metric: 'walk', threshold: 7 },
  { key: 'neighborhood_walker', name: '동네 산책러', metric: 'walk', threshold: 30 },
  { key: 'walk_king', name: '산책왕', metric: 'walk', threshold: 100 },
  { key: 'first_memory_record', name: '첫 추억 기록', metric: 'timeline', threshold: 1 },
  { key: 'memory_collector', name: '추억 수집가', metric: 'timeline', threshold: 10 },
  { key: 'record_master', name: '기록 장인', metric: 'timeline', threshold: 50 },
  { key: 'first_hello_done', name: '첫 인사 완료', metric: 'community', threshold: 1 },
  { key: 'neighborhood_news', name: '동네 소식통', metric: 'community', threshold: 10 },
  { key: 'comment_fairy', name: '댓글 요정', metric: 'comment', threshold: 30 },
  { key: 'warm_commenter', name: '따뜻한 참견러', metric: 'comment', threshold: 100 },
];

export function calculateLevel(totalXp: number): number {
  const safeXp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  return LEVEL_THRESHOLDS.reduce(
    (level, threshold) => (safeXp >= threshold.minXp ? threshold.level : level),
    1,
  );
}

export function getLevelFloorXp(level: number): number {
  return LEVEL_THRESHOLDS.find(item => item.level === level)?.minXp ?? 0;
}

export function getNextLevelXp(level: number): number {
  const next = LEVEL_THRESHOLDS.find(item => item.level === level + 1);
  return next?.minXp ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]?.minXp ?? 0;
}

export function getProgressWithinLevel(input: {
  totalXp: number;
  level: number;
  currentLevelXp?: number | null;
  nextLevelXp?: number | null;
}): number {
  const floor = input.currentLevelXp ?? getLevelFloorXp(input.level);
  const next = input.nextLevelXp ?? getNextLevelXp(input.level);
  if (next <= floor) return 1;
  return Math.max(0, Math.min(1, (input.totalXp - floor) / (next - floor)));
}
