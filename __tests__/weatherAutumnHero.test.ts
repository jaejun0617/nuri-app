import {
  getSeasonalWeatherHeroVisual,
  getWeatherHeroTextPalette,
} from '../src/theme/seasonal/weatherHero';
import { getHomeAmbientVisual } from '../src/theme/home/seasonalAmbient';
import { getSeasonalWeatherVisualTheme } from '../src/theme/seasonal/weather';

describe('autumn weather hero contract', () => {
  it.each([
    ['fresh', true, 'normal-day'],
    ['fresh', false, 'normal-night'],
    ['rain', true, 'rain-day'],
    ['rain', false, 'rain-night'],
  ] as const)('selects %s / day=%s as %s', (scenario, daytime, key) => {
    const visual = getSeasonalWeatherHeroVisual('autumn', scenario, daytime);
    expect(visual?.key).toBe(key);
    expect(visual?.image).toEqual(
      require(`../src/assets/weather/autumn/${key}-v1.webp`),
    );
    expect(visual?.blendColors[2]).toBe(visual?.palette.background[0]);
    expect(new Set(visual?.palette.background).size).toBe(1);
    expect(visual?.text.primary).toBe(daytime ? '#162C46' : '#FFFFFF');
  });

  it.each([true, false])('does not register autumn snow / day=%s', daytime => {
    expect(getSeasonalWeatherHeroVisual('autumn', 'snow', daytime)).toBeNull();
  });

  it.each([true, false])('uses normal artwork for AQ / day=%s', daytime => {
    expect(getSeasonalWeatherHeroVisual('autumn', 'dusty', daytime)?.key).toBe(
      daytime ? 'normal-day' : 'normal-night',
    );
  });
});

describe('seasonal hero text without a panel', () => {
  it.each(
    (['autumn', 'winter', 'spring', 'summer'] as const).flatMap(season =>
      [true, false].map(isDaytime => ({ season, isDaytime })),
    ),
  )(
    'uses the Home background color for $season / day=$isDaytime without a surface',
    ({ season, isDaytime }) => {
      const palette = getWeatherHeroTextPalette(season, isDaytime);
      const home = getHomeAmbientVisual(season);
      const card = getSeasonalWeatherVisualTheme(season)?.card;
      const visual = getSeasonalWeatherHeroVisual(season, 'fresh', isDaytime);
      expect(visual?.key).toBe(isDaytime ? 'normal-day' : 'normal-night');
      expect(home.primaryColor).toBe(home.sectionFields[0].color);
      expect(palette).toEqual({
        primary: home.primaryColor,
        secondary: home.primaryColor,
        shadowColor: 'transparent',
        locationIcon: isDaytime ? card?.primaryText : card?.surfaceColors[0],
      });
    },
  );
});

describe('remaining seasonal weather hero contracts', () => {
  it.each(
    (['winter', 'spring', 'summer'] as const).flatMap(season =>
      (['fresh', 'rain', 'snow'] as const).flatMap(scenario =>
        [true, false].map(daytime => ({ season, scenario, daytime })),
      ),
    ),
  )(
    'selects $season $scenario / day=$daytime without changing data',
    ({ season, scenario, daytime }) => {
      const visual = getSeasonalWeatherHeroVisual(season, scenario, daytime);
      const key = `${scenario === 'fresh' ? 'normal' : scenario}-${
        daytime ? 'day' : 'night'
      }`;
      expect(visual?.key).toBe(key);
      expect(visual?.image).toEqual(
        require(`../src/assets/weather/${season}/${key}-v1.webp`),
      );
      expect(visual?.blendColors[2]).toBe(visual?.palette.background[0]);
      expect(new Set(visual?.palette.background).size).toBe(1);
    },
  );
  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'uses normal artwork for AQ in %s',
    season => {
      expect(getSeasonalWeatherHeroVisual(season, 'dusty', false)?.key).toBe(
        'normal-night',
      );
    },
  );
});
