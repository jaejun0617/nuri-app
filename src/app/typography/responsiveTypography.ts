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
  readingScale?: number;
};

export function resolveCompactReadingScale(windowWidth: number, systemScale: number): number {
  if (!(windowWidth > 0 && windowWidth <= 320) || !Number.isFinite(systemScale) || systemScale <= 1.15) return 1;
  if (systemScale < 1.5) return 1 + 0.2 * (systemScale - 1.15) / (1.5 - 1.15);
  return 1.2 + 0.3 * (Math.min(systemScale, 2) - 1.5) / (2 - 1.5);
}

export function responsiveTypographyBand(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return DEFAULT_TYPOGRAPHY_BAND;
  const firstWider = RESPONSIVE_FONT_RULES.bands.findIndex(limit => width < limit);
  return firstWider === -1 ? 3 : firstWider;
}

export function resolveResponsiveTextStyle(
  style: TextStyle | null | undefined,
  widthBand: number,
  { fixedWidth = false, allowFontScaling = true, readingScale = 1 }: TextScaleOptions = {},
): TextStyle | null | undefined {
  const fontSize = style?.fontSize;
  const { compact, standard, smallFloor } = RESPONSIVE_FONT_RULES;
  if (!style || !allowFontScaling || fontSize === undefined || !Number.isFinite(fontSize)) return style;
  const widthDelta = fixedWidth || fontSize <= smallFloor ? 0 : (fontSize < 16 ? compact : standard)[widthBand] ?? 0;
  const size = widthDelta ? Math.max(smallFloor, fontSize - widthDelta) : fontSize;
  const delta = fontSize - size;
  if (!delta && readingScale === 1) return style;
  const lineHeight = style.lineHeight;
  return {
    ...style,
    fontSize: size * readingScale,
    ...(lineHeight === undefined ? {} : { lineHeight: (delta ? Math.max(size, lineHeight - delta) : lineHeight) * readingScale }),
  };
}
