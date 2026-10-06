import type { CommunityPostCategory } from '../../types/community';

type CommunityCategoryPalette = {
  text: string;
  subtle: string;
  onSelected: string;
};

// Category identity stays stable across seasons; action priority remains seasonal.
export const COMMUNITY_CATEGORY_PALETTE = {
  question: { text: '#315F9B', subtle: '#EAF2FF', onSelected: '#FFFFFF' },
  info: { text: '#21695E', subtle: '#E4F3F0', onSelected: '#FFFFFF' },
  daily: { text: '#9B4B16', subtle: '#FFF0E4', onSelected: '#FFFFFF' },
  free: { text: '#6B4D91', subtle: '#F0EBF8', onSelected: '#FFFFFF' },
} as const satisfies Record<CommunityPostCategory, CommunityCategoryPalette>;

const UNCLASSIFIED_PALETTE: CommunityCategoryPalette = {
  text: '#566271',
  subtle: '#F1F3F6',
  onSelected: '#FFFFFF',
};

export function getCommunityCategoryPalette(
  category: CommunityPostCategory | null,
): CommunityCategoryPalette {
  return category === null
    ? UNCLASSIFIED_PALETTE
    : COMMUNITY_CATEGORY_PALETTE[category];
}
