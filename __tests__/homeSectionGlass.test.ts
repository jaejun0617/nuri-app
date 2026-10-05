import React from 'react';
import * as ReactNative from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { BlurView } from '@sbaiahmed1/react-native-blur';
import { resolveHomeFrostedMaterial } from '../src/components/home/HomeFrostedGlass';

import {
  HOME_SECTION_GLASS_MATERIAL_STYLE,
  HOME_SECTION_GLASS_SHADOW_EVALUATION_STYLE,
  HOME_SECTION_ROOT_STYLE,
  HomeSectionGlass,
  resolveHomeSectionGlassMaterial,
} from '../src/components/home/HomeSectionGlass';
import WeatherGuideHomeCard from '../src/components/weather/WeatherGuideHomeCard';
import { buildWeatherGuideBundleForScenario } from '../src/services/weather/guide';
import { styles as profileEditStyles } from '../src/screens/Pets/PetProfileEditScreen.styles';
import { getSeasonalProfileEditVisual } from '../src/theme/seasonal/profileEdit';
import { getHomeAmbientVisual } from '../src/theme/home/seasonalAmbient';
import * as seasonalTheme from '../src/theme/seasonal/season';
import type { SeasonKey } from '../src/theme/seasonal/season';
import { getSeasonalWeatherVisualTheme } from '../src/theme/seasonal/weather';

describe('Home section glass', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each<SeasonKey>(['winter', 'spring', 'summer'])(
    'uses the approved Home transmission while retaining the %s Profile Edit border',
    season => {
      const palette = getSeasonalProfileEditVisual(season).palette;

      expect(resolveHomeSectionGlassMaterial(season)).toEqual({
        backgroundColor: getHomeAmbientVisual(season).glassSurface,
        borderColor: palette.sectionBorderColor,
      });
      expect(palette.sectionSurfaceColor).toContain('0.70');
      expect(getHomeAmbientVisual(season).glassSurface).toContain('0.50');
      expect(HOME_SECTION_GLASS_MATERIAL_STYLE.borderWidth).toBe(
        profileEditStyles.sectionGlass.borderWidth,
      );
    },
  );

  it('uses the 50% Autumn Home fill without changing Profile Edit or the border', () => {
    const palette = getSeasonalProfileEditVisual('autumn').palette;

    expect(palette.sectionSurfaceColor).toBe('rgba(255, 252, 246, 0.70)');
    expect(resolveHomeSectionGlassMaterial('autumn')).toEqual({
      backgroundColor: 'rgba(255, 252, 246, 0.50)',
      borderColor: palette.sectionBorderColor,
    });
    expect(HOME_SECTION_GLASS_MATERIAL_STYLE.borderWidth).toBe(
      profileEditStyles.sectionGlass.borderWidth,
    );
  });

  it('keeps the section root transparent and the glass as the only outer surface', () => {
    expect(HOME_SECTION_ROOT_STYLE).toMatchObject({
      backgroundColor: 'transparent',
      overflow: 'visible',
    });
    expect(HOME_SECTION_GLASS_MATERIAL_STYLE).toMatchObject({
      position: 'absolute',
      borderRadius: 22,
      borderWidth: 1,
      backgroundColor: 'transparent',
      overflow: 'hidden',
    });
    expect(HOME_SECTION_GLASS_MATERIAL_STYLE).not.toHaveProperty(
      'shadowOpacity',
    );
    expect(HOME_SECTION_GLASS_SHADOW_EVALUATION_STYLE).toMatchObject({
      shadowOpacity: 0,
      elevation: 0,
    });
  });

  it('paints one untouchable material behind the unchanged functional content', async () => {
    jest.spyOn(seasonalTheme, 'getSeasonalThemeKey').mockReturnValue('autumn');
    const onPress = jest.fn();
    const contentStyle = { height: 44, paddingHorizontal: 12 };
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        React.createElement(
          HomeSectionGlass,
          { testID: 'section', style: { padding: 14, marginTop: 12 } },
          React.createElement(ReactNative.TouchableOpacity, {
            testID: 'content',
            style: contentStyle,
            onPress,
          }),
        ),
      );
    });
    if (!renderer) throw new Error('Home glass did not render');

    const section = renderer.root.findAll(
      node => node.type === BlurView && node.props.testID === 'section',
    )[0];
    expect(ReactNative.StyleSheet.flatten(section.props.style)).toMatchObject({
      padding: 14,
      marginTop: 12,
      backgroundColor: 'transparent',
      borderWidth: 0,
      elevation: 0,
    });
    const surfaces = renderer.root
      .findAllByProps({
        testID: 'home-frosted-tint',
      })
      .filter(node => node.type === ReactNative.View);
    expect(surfaces).toHaveLength(1);
    expect(surfaces[0].props.pointerEvents).toBe('none');
    expect(
      ReactNative.StyleSheet.flatten(surfaces[0].props.style),
    ).toMatchObject({
      backgroundColor: resolveHomeFrostedMaterial('autumn').backgroundColor,
      borderColor: resolveHomeFrostedMaterial('autumn').borderColor,
      position: 'absolute',
      borderRadius: 22,
    });
    const content = renderer.root.findByProps({ testID: 'content' });
    expect(content.props.style).toBe(contentStyle);
    expect(
      ReactNative.StyleSheet.flatten(surfaces[0].props.style),
    ).not.toHaveProperty('opacity');
    expect(
      ReactNative.StyleSheet.flatten(section.props.style),
    ).not.toHaveProperty('opacity');
    content.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => renderer?.unmount());
  });

  it.each(
    (['autumn', 'winter', 'spring', 'summer'] as const).flatMap(season =>
      [360, 400, 430].map(width => ({ season, width })),
    ),
  )(
    'preserves the $season $width dp Weather geometry and action under the shared glass',
    async ({ season, width }) => {
      jest.spyOn(seasonalTheme, 'getSeasonalThemeKey').mockReturnValue(season);
      jest.spyOn(ReactNative.Dimensions, 'get').mockReturnValue({
        width,
        height: 832,
        scale: 3,
        fontScale: 1,
      });
      const onPress = jest.fn();
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          React.createElement(WeatherGuideHomeCard, {
            weather: buildWeatherGuideBundleForScenario('fresh', '일산3동'),
            visualTheme: getSeasonalWeatherVisualTheme(season)?.card,
            hideSeasonalBackgroundImage: true,
            onPress,
          }),
        );
      });
      if (!renderer) throw new Error('Home Weather did not render');

      const frame = renderer.root.findAll(node =>
        Boolean(
          node.type === BlurView &&
            ReactNative.StyleSheet.flatten(node.props.style)?.padding === 1.25,
        ),
      )[0];
      expect(ReactNative.StyleSheet.flatten(frame.props.style)).toMatchObject({
        height: (width - 32) / (1665 / 945),
        borderRadius: 27,
        minHeight: 0,
        padding: 1.25,
      });
      const surfaces = renderer.root
        .findAllByProps({
          testID: 'home-frosted-tint',
        })
        .filter(node => node.type === ReactNative.View);
      expect(surfaces).toHaveLength(1);
      expect(surfaces[0].props.pointerEvents).toBe('none');
      expect(
        ReactNative.StyleSheet.flatten(surfaces[0].props.style),
      ).toMatchObject({
        backgroundColor: resolveHomeFrostedMaterial(season).backgroundColor,
        borderColor: resolveHomeFrostedMaterial(season).borderColor,
        borderRadius: 27,
      });
      const action = renderer.root.findByType(ReactNative.TouchableOpacity);
      expect(ReactNative.StyleSheet.flatten(action.props.style)).toMatchObject({
        shadowOpacity: 0,
        elevation: 0,
      });
      action.props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);

      await ReactTestRenderer.act(async () => renderer?.unmount());
    },
  );
});
