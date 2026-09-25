import { getSeasonalWeatherVisualTheme } from '../src/theme/seasonal/weather';

describe('seasonal weather visual theme', () => {
  it('provides one warm autumn visual theme independent of time of day', () => {
    const autumn = getSeasonalWeatherVisualTheme('autumn');

    expect(autumn).toEqual(
      expect.objectContaining({
        season: 'autumn',
      }),
    );
    expect(autumn?.card.backgroundImage).toBeTruthy();
    expect(autumn?.card.backgroundOverlayColors).toHaveLength(3);
  });

  it.each(['spring', 'summer', 'winter'] as const)(
    'does not prematurely apply the autumn weather skin to %s',
    season => {
      expect(getSeasonalWeatherVisualTheme(season)).toBeNull();
    },
  );
});
