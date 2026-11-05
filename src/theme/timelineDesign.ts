import { typography } from '../app/theme/tokens/typography';
import { PRODUCT_CANVAS_COLOR } from '../app/theme/tokens/colors';
import { PRODUCT_ACCENT } from '../app/theme/tokens/productAccent';

/** Timeline-only reference palette: seasonal artwork never recolors controls. */
export const TIMELINE_DESIGN = {
  canvas: PRODUCT_CANVAS_COLOR, surface: '#FFFFFF', ink: PRODUCT_ACCENT.ink, muted: '#716A9C',
  primary: PRODUCT_ACCENT.primary, pressed: PRODUCT_ACCENT.pressed, selected: PRODUCT_ACCENT.tint,
  border: '#E7E1FA', disabled: '#DDD9EF', disabledText: '#9B95BA',
  danger: '#DF3036', dangerSurface: '#FCE1E4', highlight: '#FBE3DF', overlay: 'rgba(20,18,38,0.46)',
} as const;

// Home role values, not pixel-scaled PNG lettering. AppText still owns family preference.
export const TIMELINE_TYPE = {
  screen: typography.preset.unifiedTitle,
  section: typography.preset.unifiedLabel,
  card: typography.preset.unifiedLabel,
  body: typography.preset.unifiedBody,
  input: typography.preset.unifiedLabel,
  meta: typography.preset.unifiedMeta,
  caption: typography.preset.unifiedMicro,
  number: { fontSize: 25, lineHeight: 32, fontWeight: '700' as const, letterSpacing: 0 },
  button: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const, letterSpacing: 0 },
} as const;
