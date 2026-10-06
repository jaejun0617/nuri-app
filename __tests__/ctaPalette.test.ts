import { createTheme } from '../src/app/theme/theme';
import {
  resolveCtaPalette,
  SEASON_CTA,
  shouldStackCtaPair,
  type CtaRole,
} from '../src/app/theme/ctaPalette';
import type { SeasonKey } from '../src/theme/seasonal/season';

const seasons: SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];
const colors = createTheme('light').colors;
const palette = (
  role: CtaRole,
  season: SeasonKey = 'autumn',
  state: 'default' | 'pressed' | 'loading' | 'disabled' = 'default',
) => resolveCtaPalette({ role, season, state, colorScheme: 'light', colors });
function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map(value => parseInt(value, 16) / 255)
    .map(value =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
const whiteContrast = (hex: string) => 1.05 / (luminance(hex) + 0.05);
describe('approved CTA role palette', () => {
  it('uses the PO burnt orange, never the rejected terracotta', () => {
    expect(palette('primary').background).toBe('#B95000');
    expect(palette('primary', 'autumn', 'pressed').background).toBe('#963F00');
    expect(JSON.stringify(SEASON_CTA)).not.toContain('#A84B2F');
  });
  it.each(seasons)('%s default and pressed primary meet 4.5:1', season => {
    for (const state of ['default', 'pressed'] as const) {
      const actual = palette('primary', season, state);
      expect(actual.text).toBe('#FFFFFF');
      expect(whiteContrast(actual.background)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it.each(seasons)(
    'destructive confirmation is season-independent in %s',
    season => {
      expect(palette('destructiveConfirm', season).background).toBe('#B93645');
      expect(palette('destructiveConfirm', season, 'pressed').background).toBe(
        '#982936',
      );
      expect(whiteContrast('#B93645')).toBeGreaterThanOrEqual(4.5);
      expect(whiteContrast('#982936')).toBeGreaterThanOrEqual(4.5);
    },
  );
  it('separates entry, cleanup, neutral and disabled', () => {
    expect(palette('destructiveEntry')).toMatchObject({
      background: 'rgba(255,241,243,0.85)',
      text: '#B93645',
    });
    expect(palette('cleanup').background).toBe('rgba(255,241,243,0.62)');
    expect(palette('neutral').background).toBe('#F1F3F6');
    expect(palette('disabled')).toEqual(
      palette('primary', 'summer', 'disabled'),
    );
    expect(palette('disabled')).toMatchObject({
      background: '#E8EBEF',
      text: '#566271',
    });
    expect(palette('primary', 'autumn', 'loading')).toEqual(palette('primary'));
  });
  it('keeps secondary within the approved glass alpha range', () => {
    expect(palette('secondary').background).toBe('rgba(255,255,255,0.62)');
    expect(palette('secondary', 'autumn', 'pressed').background).toBe(
      'rgba(255,255,255,0.72)',
    );
    expect(palette('secondary').border).toBe('rgba(36,48,66,0.30)');
  });
  it('uses existing dark surfaces without adding a product dark mode', () => {
    const dark = createTheme('dark');
    expect(
      resolveCtaPalette({
        role: 'secondary',
        season: 'autumn',
        colorScheme: 'dark',
        colors: dark.colors,
      }),
    ).toMatchObject({
      background: dark.colors.surface,
      text: dark.colors.textPrimary,
    });
  });
  it.each([360, 384, 400, 430])(
    'stacks enlarged labels at %s dp instead of shrinking',
    width => {
      expect(shouldStackCtaPair(width, 1.5)).toBe(true);
      expect(shouldStackCtaPair(width, 1.3)).toBe(true);
      expect(shouldStackCtaPair(width, 1)).toBe(width < 380);
    },
  );
});
