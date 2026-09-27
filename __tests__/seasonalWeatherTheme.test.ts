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
    expect(autumn?.card).not.toHaveProperty('backgroundOverlayColors');
  });

  it('provides a distinct winter card and icy section transition', () => {
    const winter = getSeasonalWeatherVisualTheme('winter');

    expect(winter).toEqual(
      expect.objectContaining({
        season: 'winter',
        bottomFinishColors: expect.arrayContaining(['#FFFFFF']),
      }),
    );
    expect(winter?.card.backgroundImage).toBeTruthy();
    expect(winter?.card.backgroundResizeMode).toBe('contain');
    expect(winter?.card.backgroundLeftInset).toBe(0);
    expect(winter?.card.primaryText).toBe('#183653');
    expect(winter?.card.metricText).toBe('#183653');
    expect(winter?.card.accent).toBe('#245F92');
    expect(winter?.card.accent).not.toBe(
      getSeasonalWeatherVisualTheme('autumn')?.card.accent,
    );
  });

  it.each(['spring', 'summer'] as const)(
    'does not prematurely apply the autumn weather skin to %s',
    season => {
      expect(getSeasonalWeatherVisualTheme(season)).toBeNull();
    },
  );
});
