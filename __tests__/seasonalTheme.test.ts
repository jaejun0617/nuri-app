import {
  getSeasonalThemeKey,
  NURI_SEASON_TIME_ZONE,
} from '../src/theme/seasonal/season';
import {
  getSeasonalSplashVisual,
  SEASONAL_SPLASH_VISUALS,
} from '../src/theme/seasonal/assets';
import { getSeasonalLoginVisual } from '../src/theme/seasonal/login';
import { getSeasonalSignupVisual } from '../src/theme/seasonal/signup';

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

  it('maps all four approved seasonal login visuals', () => {
    expect(getSeasonalLoginVisual('spring')).toEqual(
      expect.objectContaining({
        season: 'spring',
        backgroundColor: '#FBEDEB',
        ctaColor: '#E77F9A',
        headlineAccentColor: '#E86F88',
        heroHeightOffset: 8,
        policyLinkColor: '#A83F68',
        subtitleColor: '#59483F',
        socialLabel: '소셜로 로그인',
      }),
    );

    expect(getSeasonalLoginVisual('summer')).toEqual(
      expect.objectContaining({
        season: 'summer',
        backgroundColor: '#EAF6D8',
        ctaColor: '#4F91D8',
        headlineAccentColor: '#438EDC',
        heroHeightOffset: 8,
        policyLinkColor: '#2F6EB8',
        subtitleColor: '#3F5260',
        socialLabel: '소셜로 로그인',
      }),
    );

    expect(getSeasonalLoginVisual('autumn')).toEqual(
      expect.objectContaining({
        season: 'autumn',
        backgroundColor: '#E99B54',
        accentColor: '#D95C2B',
        heroHeightOffset: 0,
        socialLabel: '소셜 계정으로 시작하기',
      }),
    );

    expect(getSeasonalLoginVisual('winter')).toEqual(
      expect.objectContaining({
        season: 'winter',
        backgroundColor: '#EAF0FB',
        ctaColor: '#9297F2',
        headlineAccentColor: '#A84F3B',
        heroHeightOffset: 40,
        policyLinkColor: '#5961C8',
        subtitleColor: '#2F4266',
        socialLabel: 'SNS 계정으로 시작하기',
      }),
    );
  });

  it('supports bounded seasonal QA overrides and returns to AUTO', () => {
    expect(getSeasonalLoginVisual('autumn', 'spring')?.season).toBe('spring');
    expect(getSeasonalLoginVisual('autumn', 'summer')?.season).toBe('summer');
    expect(getSeasonalLoginVisual('autumn', 'winter')?.season).toBe('winter');
    expect(getSeasonalLoginVisual('autumn', 'auto')?.season).toBe('autumn');
  });

  it('maps the approved autumn and winter signup visuals without changing autumn', () => {
    expect(getSeasonalSignupVisual('autumn')).toEqual(
      expect.objectContaining({
        season: 'autumn',
        backgroundColor: '#E99B54',
        accentColor: '#E9693A',
        policyLinkColor: '#8C351C',
      }),
    );
    expect(getSeasonalSignupVisual('spring')).toBeNull();
    expect(getSeasonalSignupVisual('summer')).toBeNull();
    expect(getSeasonalSignupVisual('winter')).toEqual(
      expect.objectContaining({
        season: 'winter',
        backgroundColor: '#EAF0FB',
        accentColor: '#9297F2',
        policyLinkColor: '#5961C8',
      }),
    );
    expect(getSeasonalSignupVisual('winter')?.source).not.toBe(
      getSeasonalSignupVisual('autumn')?.source,
    );
  });

  it('supports bounded signup overrides and resets to AUTO', () => {
    expect(getSeasonalSignupVisual('spring', 'autumn')?.season).toBe('autumn');
    expect(getSeasonalSignupVisual('autumn', 'winter')?.season).toBe('winter');
    expect(getSeasonalSignupVisual('winter', 'autumn')?.season).toBe('autumn');
    expect(getSeasonalSignupVisual('spring', 'auto')).toBeNull();
    expect(getSeasonalSignupVisual('autumn', 'auto')?.season).toBe('autumn');
  });
});
