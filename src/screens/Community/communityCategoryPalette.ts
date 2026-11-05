import type { CommunityPostCategory } from '../../types/community';
import { PRODUCT_ACCENT } from '../../app/theme/tokens/productAccent';

export const COMMUNITY_LIST_COLORS = {
  title: PRODUCT_ACCENT.ink,
  readTitle: '#687181',
  secondary: '#667080',
  divider: '#DDE3EB',
  categoryFill: '#EEEAF5',
  categoryText: '#655D78',
  railFill: 'rgba(255,255,255,0.16)',
} as const;

type CommunityCategoryPalette = {
  text: string;
  subtle: string;
  onSelected: string;
};

// Labels carry category identity; only the active filter uses the product accent.
export const COMMUNITY_CATEGORY_PALETTE = {
  question: { text: COMMUNITY_LIST_COLORS.categoryText, subtle: COMMUNITY_LIST_COLORS.categoryFill, onSelected: '#FFFFFF' },
  info: { text: COMMUNITY_LIST_COLORS.categoryText, subtle: COMMUNITY_LIST_COLORS.categoryFill, onSelected: '#FFFFFF' },
  daily: { text: COMMUNITY_LIST_COLORS.categoryText, subtle: COMMUNITY_LIST_COLORS.categoryFill, onSelected: '#FFFFFF' },
  free: { text: COMMUNITY_LIST_COLORS.categoryText, subtle: COMMUNITY_LIST_COLORS.categoryFill, onSelected: '#FFFFFF' },
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
