import {
  getSeasonalThemeKey,
  NURI_SEASON_TIME_ZONE,
} from '../src/theme/seasonal/season';
import {
  getSeasonalSplashVisual,
  SEASONAL_SPLASH_VISUALS,
} from '../src/theme/seasonal/assets';

describe('seasonal theme', () => {
  it('uses Asia/Seoul as the fixed product timezone', () => {
    expect(NURI_SEASON_TIME_ZONE).toBe('Asia/Seoul');
  });

  it.each([
    ['2026-02-28T14:59:59.999Z', 'winter'],
    ['2026-02-28T15:00:00.000Z', 'spring'],
    ['2026-05-31T14:59:59.999Z', 'spring'],
    ['2026-05-31T15:00:00.000Z', 'summer'],
    ['2026-08-31T14:59:59.999Z', 'summer'],
    ['2026-08-31T15:00:00.000Z', 'autumn'],
    ['2026-11-30T14:59:59.999Z', 'autumn'],
    ['2026-11-30T15:00:00.000Z', 'winter'],
  ] as const)('resolves %s to %s at KST boundaries', (iso, expected) => {
    expect(getSeasonalThemeKey(new Date(iso))).toBe(expected);
  });

  it('keeps leap day in winter', () => {
    expect(getSeasonalThemeKey(new Date('2028-02-29T12:00:00.000Z'))).toBe(
      'winter',
    );
  });

  it('rejects an invalid date instead of silently choosing a season', () => {
    expect(() => getSeasonalThemeKey(new Date('invalid'))).toThrow(RangeError);
  });

  it('maps every season to a distinct bundled splash image', () => {
    const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
    const sources = seasons.map(season => {
      const visual = getSeasonalSplashVisual(season);
      expect(visual).toBe(SEASONAL_SPLASH_VISUALS[season]);
      expect(visual.accessibilityLabel).toContain('누리 스플래시');
      return visual.source;
    });

    expect(new Set(sources).size).toBe(4);
  });
});
