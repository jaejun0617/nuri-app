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

  it('provides a distinct spring card with readable blossom accents', () => {
    const spring = getSeasonalWeatherVisualTheme('spring');

    expect(spring).toEqual(
      expect.objectContaining({
        season: 'spring',
        bottomFinishColors: expect.arrayContaining(['#FFFFFF']),
      }),
    );
    expect(spring?.card.backgroundImage).toBeTruthy();
    expect(spring?.card.backgroundResizeMode).toBe('contain');
    expect(spring?.card.backgroundLeftInset).toBe(0);
    expect(spring?.card.primaryText).toBe('#543B48');
    expect(spring?.card.metricText).toBe('#543B48');
    expect(spring?.card.accent).toBe('#CF6680');
    expect(spring?.card.locationBorder).toBe('transparent');
    expect(spring?.card.guideBorder).toBe('transparent');
  });

  it('provides a distinct summer card with readable green accents', () => {
    const summer = getSeasonalWeatherVisualTheme('summer');

    expect(summer).toEqual(
      expect.objectContaining({
        season: 'summer',
        bottomFinishColors: expect.arrayContaining(['#FFFFFF']),
      }),
    );
    expect(summer?.card.backgroundImage).toBeTruthy();
    expect(summer?.card.backgroundResizeMode).toBe('contain');
    expect(summer?.card.backgroundLeftInset).toBe(0);
    expect(summer?.card.primaryText).toBe('#244D3F');
    expect(summer?.card.metricText).toBe('#244D3F');
    expect(summer?.card.accent).toBe('#2E7D5B');
    expect(summer?.card.locationBorder).toBe('transparent');
    expect(summer?.card.guideBorder).toBe('transparent');
  });
});
