import { PRODUCT_ACCENT } from '../../app/theme/tokens/productAccent';

/** Activity/Title is the reference for app-owned navigation chrome. */
export const APP_HEADER = {
  backIconSize: 28,
  actionIconSize: 24,
  targetSize: 48,
  topGap: 4,
  titleColor: PRODUCT_ACCENT.ink,
  subtitleColor: PRODUCT_ACCENT.muted,
  title: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const, letterSpacing: 0, color: PRODUCT_ACCENT.ink },
  subtitle: { fontSize: 11, lineHeight: 20, letterSpacing: 0, color: PRODUCT_ACCENT.muted },
} as const;
