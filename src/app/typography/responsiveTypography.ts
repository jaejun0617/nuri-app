import type { TextStyle } from 'react-native';

// Editable sizing defaults, not device-model constants. Preserve small text
// and fixed brand/system surfaces; accessibility text is scaled by native.
export const RESPONSIVE_FONT_RULES = {
  bands: [360, 384, 600],
  standard: [2, 1, 0, 0],
  compact: [1, 0, 0, 0],
  smallFloor: 12,
} as const;

export function responsiveTypographyBand(width: number, fontScale: number): number {
  if (!Number.isFinite(width) || width <= 0 || fontScale !== 1) return 3;
  const firstWider = RESPONSIVE_FONT_RULES.bands.findIndex(limit => width < limit);
  return firstWider === -1 ? 3 : firstWider;
}

export function resolveResponsiveTextStyle(style: TextStyle | null | undefined, band: number, fixed = false): TextStyle | null | undefined {
  const fontSize = style?.fontSize;
  if (!style || fixed || fontSize === undefined || !Number.isFinite(fontSize) || fontSize <= RESPONSIVE_FONT_RULES.smallFloor) return style;
  const steps = fontSize < 16 ? RESPONSIVE_FONT_RULES.compact : RESPONSIVE_FONT_RULES.standard;
  const delta = steps[band] ?? 0;
  if (!delta) return style;
  return { ...style, fontSize: fontSize - delta,
    ...(style.lineHeight === undefined ? {} : { lineHeight: Math.max(fontSize - delta, style.lineHeight - delta) }) };
}
