import { responsiveTypographyBand, resolveResponsiveTextStyle } from '../src/app/typography/responsiveTypography';
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
