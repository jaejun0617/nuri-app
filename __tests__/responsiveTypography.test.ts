import { responsiveTypographyBand, resolveCompactReadingScale, resolveResponsiveTextStyle } from '../src/app/typography/responsiveTypography';
import { getResponsiveContentWidth } from '../src/services/app/responsiveLayout';

test('global sizes use inset-adjusted breakpoints and preserve the fixed width baselines', () => {
  const style = { fontSize: 16, lineHeight: 24 };
  const at = responsiveTypographyBand;
  expect(getResponsiveContentWidth(384, 12, 12)).toBe(360);
  expect(resolveResponsiveTextStyle(style, at(320))).toEqual({ fontSize: 14, lineHeight: 22 });
  expect(resolveResponsiveTextStyle(style, at(360))).toEqual({ fontSize: 15, lineHeight: 23 });
  for (const width of [384, 599, 600, 720]) {
    expect(resolveResponsiveTextStyle(style, at(width))).toBe(style);
  }
  expect(resolveResponsiveTextStyle(style, at(320), { fixedWidth: true })).toBe(style);
  expect(resolveResponsiveTextStyle(style, at(320), { allowFontScaling: false })).toBe(style);
  const small = { fontSize: 12, lineHeight: 16 };
  expect(resolveResponsiveTextStyle(small, at(320))).toBe(small);
});

test.each([
  [320, 1, 1],
  [320, 1.15, 1],
  [320, 1.325, 1.1],
  [320, 1.5, 1.2],
  [320, 1.75, 1.35],
  [320, 2, 1.5],
  [320, 2.5, 1.5],
  [321, 2, 1],
  [0, 2, 1],
  [320, NaN, 1],
])('maps a %s dp window and system scale %s to %s', (width, system, expected) => {
  expect(resolveCompactReadingScale(width, system)).toBeCloseTo(expected);
});

test('scales text and line height after computing the base size without scaling inherited or excluded text twice', () => {
  const band = responsiveTypographyBand(320);
  const style = { fontSize: 16, lineHeight: 24 };
  expect(resolveResponsiveTextStyle(style, band, { readingScale: 1.5 }))
    .toEqual({ fontSize: 21, lineHeight: 33 });
  expect(resolveResponsiveTextStyle(style, band, { readingScale: 1.5, fixedWidth: true }))
    .toEqual({ fontSize: 24, lineHeight: 36 });
  expect(resolveResponsiveTextStyle(style, band, { readingScale: 1.5, allowFontScaling: false })).toBe(style);
  expect(resolveResponsiveTextStyle({ fontSize: 11, lineHeight: 16 }, band, { readingScale: 1.5 }))
    .toEqual({ fontSize: 16.5, lineHeight: 24 });
  const inherited = { color: '#000' };
  expect(resolveResponsiveTextStyle(inherited, band, { readingScale: 1.5 })).toBe(inherited);
});
