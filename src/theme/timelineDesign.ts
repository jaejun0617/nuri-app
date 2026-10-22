import { typography } from '../app/theme/tokens/typography';

/** Timeline-only reference palette: seasonal artwork never recolors controls. */
export const TIMELINE_DESIGN = {
  canvas: '#F8F7FD', surface: '#FFFFFF', ink: '#161331', muted: '#716A9C',
  primary: '#7D4DFA', pressed: '#6936DF', selected: '#EEE8FF',
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
