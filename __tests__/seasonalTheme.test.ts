import {
  getSeasonalThemeKey,
  NURI_SEASON_TIME_ZONE,
} from '../src/theme/seasonal/season';
import {
  getSeasonalSplashVisual,
  SEASONAL_SPLASH_VISUALS,
} from '../src/theme/seasonal/assets';
import {
  getSeasonalLoginVisual,
  getSocialLoginLayout,
} from '../src/theme/seasonal/login';
import {
  getSeasonalHomeVisual,
  SEASONAL_HOME_COPY,
} from '../src/theme/seasonal/home';

describe('seasonal theme', () => {
  it('maps all four seasonal Home atmospheres', () => {
    expect(getSeasonalHomeVisual('autumn')).toEqual(
      expect.objectContaining({
        season: 'autumn',
        greetingCopy: '선선한 오늘, 함께한 순간을 남겨보세요',
        atmosphereAspectRatio: 724 / 2172,
        atmosphere: expect.anything(),
        ornamentSheet: expect.anything(),
        profileSheetBackground: null,
        headerPalette: {
          brand: '#C94732',
          greeting: '#C94732',
          copy: '#60483F',
        },
      }),
    );
    expect(getSeasonalHomeVisual('winter')).toEqual(
      expect.objectContaining({
        season: 'winter',
        greetingCopy: '포근한 오늘도 따뜻한 기억을 남겨보세요',
        atmosphereAspectRatio: 724 / 2172,
        atmosphere: expect.anything(),
        ornamentSheet: expect.anything(),
        profileSheetBackground: expect.anything(),
        headerPalette: {
          brand: '#4167A6',
          greeting: '#4167A6',
          copy: '#45536B',
        },
      }),
    );
    expect(getSeasonalHomeVisual('spring')).toEqual(
      expect.objectContaining({
        season: 'spring',
        atmosphereAspectRatio: 724 / 2172,
        ornamentSheet: null,
        profileSheetBackground: expect.anything(),
        greetingCopy: '따뜻한 봄날, 함께 좋은 추억을 남겨보세요',
        headerPalette: {
          brand: '#D94F7A',
          greeting: '#D94F7A',
          copy: '#654C59',
        },
      }),
    );
    expect(getSeasonalHomeVisual('summer')).toEqual(
      expect.objectContaining({
        season: 'summer',
        atmosphereAspectRatio: 724 / 2172,
        ornamentSheet: null,
        profileSheetBackground: expect.anything(),
        greetingCopy: '반짝이는 여름날도 함께 기록해요',
        headerPalette: {
          brand: '#25705F',
          greeting: '#25705F',
          copy: '#405C56',
        },
      }),
    );
    expect(SEASONAL_HOME_COPY.autumn).toBe(
      getSeasonalHomeVisual('autumn')?.greetingCopy,
    );
    expect(SEASONAL_HOME_COPY.winter).toBe(
      getSeasonalHomeVisual('winter')?.greetingCopy,
    );
    expect(SEASONAL_HOME_COPY.spring).toBe(
      getSeasonalHomeVisual('spring')?.greetingCopy,
    );
    expect(SEASONAL_HOME_COPY.summer).toBe(
      getSeasonalHomeVisual('summer')?.greetingCopy,
    );
    expect(getSeasonalHomeVisual('autumn', 'winter')?.season).toBe('winter');
    expect(getSeasonalHomeVisual('autumn', 'spring')?.season).toBe('spring');
    expect(getSeasonalHomeVisual('autumn', 'summer')?.season).toBe('summer');
  });
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

  it('maps the supplied social login art without duplicating its baked logo or copy', () => {
    const sources = (['spring', 'summer', 'autumn', 'winter'] as const).map(
      season => {
        const visual = getSeasonalLoginVisual(season);
        expect(visual.season).toBe(season);
        expect(visual.accessibilityLabel).toContain('함께한 순간을, 오래도록');
        return visual.source;
      },
    );
    expect(new Set(sources).size).toBe(4);
  });

  it('keeps seasonal overrides and automatic resolution', () => {
    expect(getSeasonalLoginVisual('autumn', 'spring').season).toBe('spring');
    expect(getSeasonalLoginVisual('autumn', 'summer').season).toBe('summer');
    expect(getSeasonalLoginVisual('autumn', 'winter').season).toBe('winter');
    expect(getSeasonalLoginVisual('autumn', 'auto').season).toBe('autumn');
  });

  it.each([
    [360, 640],
    [384, 760],
    [430, 880],
    [740, 320],
  ])(
    'fills %i x %i width at the original ratio with a scrollable short-screen fallback',
    (width, height) => {
      const layout = getSocialLoginLayout(width, height);
      expect(layout.heroHeight).toBeCloseTo((width * 1350) / 836);
      expect(layout.actionsMinHeight).toBeCloseTo(
        Math.max(0, height - layout.heroHeight),
      );
      expect(layout.imageWidth).toBe(width);
      expect(layout.imageWidth / layout.imageHeight).toBeCloseTo(836 / 1881);
      expect(layout.heroHeight / layout.imageHeight).toBeCloseTo(1350 / 1881);
    },
  );
});
