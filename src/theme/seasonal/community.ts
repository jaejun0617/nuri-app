import type { ImageSourcePropType } from 'react-native';
import type { SeasonKey } from './season';

// The supplied artwork includes its copy. Preserve the complete canvas on every width.
export const COMMUNITY_HERO_ASPECT_RATIO = 883 / 439;
// Cover only the foreground below the pets' feet; scale the 29px overlap with width.
export const COMMUNITY_HERO_PANEL_OVERLAP_RATIO = 29 / 883;
export const COMMUNITY_HERO_ACCESSIBILITY_LABEL =
  '우리 아이들의 이야기. 사이좋은 대화가 더 행복한 하루를 만들어요. 반려동물과 반려인이 함께하는 따뜻한 커뮤니티, 누리에서 소중한 이야기를 나눠보세요.';

export const COMMUNITY_HERO_IMAGES = {
  autumn: require('../../assets/seasonal/community/autumn.png'),
  winter: require('../../assets/seasonal/community/winter.png'),
  spring: require('../../assets/seasonal/community/spring.png'),
  summer: require('../../assets/seasonal/community/summer.png'),
} as const satisfies Record<SeasonKey, ImageSourcePropType>;

// Only the artwork edges are blended; the complete original canvas stays at its native ratio.
export const COMMUNITY_HERO_SURFACES = {
  autumn: { header: '#FFF0D6', tail: ['#C97022', '#AA4E20'] },
  winter: { header: '#ECF5FF', tail: ['#DFEDFA', '#D6E6F6'] },
  spring: { header: '#FFF0F4', tail: ['#BED194', '#A3BE7A'] },
  summer: { header: '#EFF8EC', tail: ['#B2CF75', '#93B467'] },
} as const satisfies Record<
  SeasonKey,
  { header: string; tail: readonly [string, string] }
>;
