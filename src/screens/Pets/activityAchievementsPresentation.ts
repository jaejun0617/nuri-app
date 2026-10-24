import type {
  ActivityAchievement,
  ActivityDashboardData,
  PetActivityDashboardSummary,
} from '../../services/activity/activityDashboard';
import { HOME_HERO_ACCENT } from '../../theme/home/heroLayout';
import { LAVENDER_CANVAS } from '../../theme/lavenderCanvas';

export const ACTIVITY_COLORS = {
  canvas: LAVENDER_CANVAS.base,
  ink: '#19152F',
  muted: '#827D9F',
  marker: '#DED0F4',
  accent: HOME_HERO_ACCENT.primary,
  tint: HOME_HERO_ACCENT.tint,
  border: '#E5DDF7',
  track: '#E4E0EE',
} as const;

export const ACTIVITY_ART = {
  growth: require('../../assets/activity/growth-companion.png'),
  check: require('../../assets/activity/acquired-check.png'),
  lock: require('../../assets/activity/locked.png'),
} as const;

export { ACHIEVEMENT_ART } from '../../services/activity/titleArtwork';

const REFERENCE_ORDER = [
  'pet_first_health_record',
  'pet_first_walk_friend',
  'common_first_hello_done',
  'pet_first_memory_record',
  'pet_walk_sprout',
  'common_kind_commenter',
  'pet_memory_collector',
  'pet_category_keeper',
  'pet_routine_sprout',
  'pet_steady_walker',
];

export function getActivityLayout(width: number, fontScale: number) {
  return {
    columns: width < 350 || fontScale >= 1.3 ? 3 : 4,
    stack: width < 350 || fontScale >= 1.3,
    inset: width < 350 ? 12 : 16,
  } as const;
}

export function getActivityVault(
  dashboard: ActivityDashboardData,
  pet: PetActivityDashboardSummary | null,
) {
  const unique = new Map<string, ActivityAchievement>();
  for (const item of [
    ...(pet?.achievements ?? []),
    ...dashboard.commonSummary.achievements,
  ]) {
    const identity = `${item.scope}:${item.ownerId}:${item.key}`;
    if (!unique.has(identity)) unique.set(identity, item);
  }
  const items = [...unique.values()].sort((a, b) => {
    const ai = REFERENCE_ORDER.indexOf(a.key),
      bi = REFERENCE_ORDER.indexOf(b.key);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.threshold - b.threshold;
  });
  return {
    acquired: items.filter(item => item.achieved),
    challenges: items
      .filter(item => !item.achieved)
      .map(item => ({
        ...item,
        // Historical acquisition is unchanged; an unfinished streak shows today's run.
        currentValue:
          item.domain === 'streak' && item.policyVersion !== 2
            ? pet?.streak?.currentStreak ?? 0
            : item.currentValue,
      })),
  };
}
export function getChallengeProgress(item: ActivityAchievement) {
  const target = Math.max(1, Math.floor(item.threshold));
  const current = Math.max(0, Math.min(target, Math.floor(item.currentValue)));
  return {
    current,
    target,
    ratio: current / target,
    segmented: item.domain === 'streak' && target <= 30,
  };
}
export function getWalkActivityCount(pet: PetActivityDashboardSummary) {
  // The legacy walk XP metric also contains streak bonuses; this input counts walks only.
  return (
    pet.walkRecordCount ?? pet.achievements.find(item => item.key === 'pet_first_walk_friend')
      ?.currentValue ?? pet.walk.eventCount
  );
}
