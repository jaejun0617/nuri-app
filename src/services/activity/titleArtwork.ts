import type { ImageSourcePropType } from 'react-native';

// Shared by the vault and Home. Stable IDs own artwork; display names never do.
export const ACHIEVEMENT_ART: Readonly<Record<string, ImageSourcePropType>> = {
  pet_first_health_record: require('../../assets/activity/first-health.png'),
  pet_health_habit: require('../../assets/activity/first-health.png'),
  pet_first_walk_friend: require('../../assets/activity/first-walk.png'),
  pet_walk_sprout: require('../../assets/activity/walk-sprout.png'),
  pet_routine_sprout: require('../../assets/activity/routine-sprout.png'),
  pet_steady_walker: require('../../assets/activity/steady-walker.png'),
  pet_first_memory_record: require('../../assets/activity/first-memory.png'),
  pet_memory_collector: require('../../assets/activity/memory-collector.png'),
  pet_category_keeper: require('../../assets/activity/daily-recorder.png'),
  common_first_hello_done: require('../../assets/activity/first-hello.png'),
  common_neighborhood_news: require('../../assets/activity/first-hello.png'),
  common_storyteller: require('../../assets/activity/first-hello.png'),
  common_kind_commenter: require('../../assets/activity/kind-commenter.png'),
  common_comment_fairy: require('../../assets/activity/kind-commenter.png'),
  common_warm_commenter: require('../../assets/activity/kind-commenter.png'),
};

// Higher tiers reuse an explicitly documented motif, not a newly invented illustration.
export const SERVER_TITLE_ART: Readonly<Record<string, ImageSourcePropType>> = {
  first_walk_friend: ACHIEVEMENT_ART.pet_first_walk_friend,
  walk_sprout: ACHIEVEMENT_ART.pet_walk_sprout,
  neighborhood_walker: ACHIEVEMENT_ART.pet_first_walk_friend,
  walk_king: ACHIEVEMENT_ART.pet_first_walk_friend,
  first_memory_record: ACHIEVEMENT_ART.pet_first_memory_record,
  memory_collector: ACHIEVEMENT_ART.pet_memory_collector,
  record_master: ACHIEVEMENT_ART.pet_category_keeper,
  first_hello_done: ACHIEVEMENT_ART.common_first_hello_done,
  neighborhood_news: ACHIEVEMENT_ART.common_neighborhood_news,
  comment_fairy: ACHIEVEMENT_ART.common_comment_fairy,
  warm_commenter: ACHIEVEMENT_ART.common_warm_commenter,
};

export function getServerTitleArtwork(titleKey: string | null | undefined) {
  return titleKey &&
    Object.prototype.hasOwnProperty.call(SERVER_TITLE_ART, titleKey)
    ? SERVER_TITLE_ART[titleKey]
    : undefined;
}

export function getTitleArtwork(titleKey: string | null | undefined) {
  return titleKey &&
    Object.prototype.hasOwnProperty.call(ACHIEVEMENT_ART, titleKey)
    ? ACHIEVEMENT_ART[titleKey]
    : getServerTitleArtwork(titleKey);
}
