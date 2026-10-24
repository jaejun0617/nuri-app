import type { ImageSourcePropType } from 'react-native';
import {
  APPROVED_TITLE_ART,
  isApprovedTitleArtworkId,
} from './approvedTitleArtwork';

// These are artwork aliases, not award-policy migrations. Existing IDs stay valid.
export const LEGACY_TITLE_ARTWORK_IDS = {
  pet_first_health_record: 'HC01',
  pet_health_habit: 'HC05',
  pet_first_walk_friend: 'WK01',
  pet_walk_sprout: 'WK02',
  pet_routine_sprout: 'RT01',
  pet_steady_walker: 'RT03',
  pet_first_memory_record: 'MR01',
  pet_memory_collector: 'MR03',
  pet_category_keeper: 'MR05',
  common_first_hello_done: 'CP01',
  common_neighborhood_news: 'CP05',
  common_storyteller: 'CP09',
  common_kind_commenter: 'CM03',
  common_comment_fairy: 'CM07',
  common_warm_commenter: 'CM10',
} as const;

export const SERVER_TITLE_ARTWORK_IDS = {
  first_walk_friend: 'WK01', walk_sprout: 'WK02', neighborhood_walker: 'WK07', walk_king: 'WK10',
  first_memory_record: 'MR01', memory_collector: 'MR03', record_master: 'MR08',
  first_hello_done: 'CP01', neighborhood_news: 'CP05', comment_fairy: 'CM07', warm_commenter: 'CM10',
} as const;

const LEGACY_ALIASES: Readonly<Record<string, keyof typeof APPROVED_TITLE_ART>> = {
  ...LEGACY_TITLE_ARTWORK_IDS,
  ...SERVER_TITLE_ARTWORK_IDS,
};

export function getCanonicalTitleId(key: string) {
  if (isApprovedTitleArtworkId(key)) return key;
  return Object.prototype.hasOwnProperty.call(LEGACY_ALIASES, key)
    ? LEGACY_ALIASES[key]
    : undefined;
}

// Shared by the vault and Home. Stable IDs own artwork; display names never do.
export const ACHIEVEMENT_ART: Readonly<Record<string, ImageSourcePropType>> = {
  pet_first_health_record: APPROVED_TITLE_ART.HC01,
  pet_health_habit: APPROVED_TITLE_ART.HC05,
  pet_first_walk_friend: APPROVED_TITLE_ART.WK01,
  pet_walk_sprout: APPROVED_TITLE_ART.WK02,
  pet_routine_sprout: APPROVED_TITLE_ART.RT01,
  pet_steady_walker: APPROVED_TITLE_ART.RT03,
  pet_first_memory_record: APPROVED_TITLE_ART.MR01,
  pet_memory_collector: APPROVED_TITLE_ART.MR03,
  pet_category_keeper: APPROVED_TITLE_ART.MR05,
  common_first_hello_done: APPROVED_TITLE_ART.CP01,
  common_neighborhood_news: APPROVED_TITLE_ART.CP05,
  common_storyteller: APPROVED_TITLE_ART.CP09,
  common_kind_commenter: APPROVED_TITLE_ART.CM03,
  common_comment_fairy: APPROVED_TITLE_ART.CM07,
  common_warm_commenter: APPROVED_TITLE_ART.CM10,
};

// Server and dashboard aliases of the same title share identity, not other tiers.
export const SERVER_TITLE_ART: Readonly<Record<string, ImageSourcePropType>> = {
  first_walk_friend: ACHIEVEMENT_ART.pet_first_walk_friend,
  walk_sprout: ACHIEVEMENT_ART.pet_walk_sprout,
  neighborhood_walker: APPROVED_TITLE_ART.WK07,
  walk_king: APPROVED_TITLE_ART.WK10,
  first_memory_record: ACHIEVEMENT_ART.pet_first_memory_record,
  memory_collector: ACHIEVEMENT_ART.pet_memory_collector,
  record_master: APPROVED_TITLE_ART.MR08,
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
  if (titleKey && isApprovedTitleArtworkId(titleKey)) {
    return APPROVED_TITLE_ART[titleKey];
  }
  return titleKey &&
    Object.prototype.hasOwnProperty.call(ACHIEVEMENT_ART, titleKey)
    ? ACHIEVEMENT_ART[titleKey]
    : getServerTitleArtwork(titleKey);
}
