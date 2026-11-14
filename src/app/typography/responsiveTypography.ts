import type { TextStyle } from 'react-native';

export const RESPONSIVE_FONT_RULES = {
  bands: [360, 384, 600],
  standard: [2, 1, 0, 0],
  compact: [1, 0, 0, 0],
  smallFloor: 12,
} as const;

export const DEFAULT_TYPOGRAPHY_BAND = 3;
type TextScaleOptions = {
  fixedWidth?: boolean;
  allowFontScaling?: boolean;
};

export function responsiveTypographyBand(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return DEFAULT_TYPOGRAPHY_BAND;
  const firstWider = RESPONSIVE_FONT_RULES.bands.findIndex(limit => width < limit);
  return firstWider === -1 ? 3 : firstWider;
}

export function resolveResponsiveTextStyle(
  style: TextStyle | null | undefined,
  widthBand: number,
  { fixedWidth = false, allowFontScaling = true }: TextScaleOptions = {},
): TextStyle | null | undefined {
  const fontSize = style?.fontSize;
  const { compact, standard, smallFloor } = RESPONSIVE_FONT_RULES;
  if (!style || fixedWidth || !allowFontScaling || fontSize === undefined || !Number.isFinite(fontSize) || fontSize <= smallFloor) return style;
  const widthDelta = (fontSize < 16 ? compact : standard)[widthBand] ?? 0;
  const size = Math.max(smallFloor, fontSize - widthDelta);
  const delta = fontSize - size;
  if (!delta) return style;
  return { ...style, fontSize: size,
    ...(style.lineHeight === undefined ? {} : { lineHeight: Math.max(size, style.lineHeight - delta) }) };
}
