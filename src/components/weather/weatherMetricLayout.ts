type MetricLayoutInput = {
  width: number;
  fontScale: number;
  values: readonly string[];
};

/** Reserve icon, padding and the complete value before choosing four columns. */
export function resolveWeatherMetricLayout({ width, fontScale, values }: MetricLayoutInput) {
  const compact = width <= 400;
  const horizontalPadding = compact ? 2 : 7;
  const gap = compact ? 2 : 4;
  const availableWidth = Math.max(0, width - 32 - 2.5 - 36);
  const maximumValueWidth = Math.max(0, ...values.map(value =>
    Array.from(value).reduce((sum, character) => sum +
      (character.charCodeAt(0) > 127 ? 11 : /[ .]/.test(character) ? 4 : 7), 0),
  ));
  const requiredCellWidth = 16 + gap + horizontalPadding * 2 + maximumValueWidth;
  const columns = fontScale > 1 || availableWidth / 4 < requiredCellWidth ? 2 : 4;
  return { columns, compact, horizontalPadding, gap } as const;
}
