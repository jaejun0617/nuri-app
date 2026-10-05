import React from 'react';
import ReactNative, { StyleSheet, Text, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { BlurView } from '@sbaiahmed1/react-native-blur';

import WeatherGuideHomeCard from '../src/components/weather/WeatherGuideHomeCard';
import { buildWeatherGuideBundleForScenario } from '../src/services/weather/guide';
import { getSeasonalWeatherVisualTheme } from '../src/theme/seasonal/weather';
import { getWeatherAdvice } from '../src/services/weather/presentation';

describe('Weather Home enlarged text flow', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(
    [360, 384, 400, 430].flatMap(width =>
      [1, 1.3, 1.5].map(fontScale => ({ width, fontScale })),
    ),
  )(
    'keeps default geometry and expands content at $width dp / $fontScale',
    async ({ width, fontScale }) => {
      jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
        width,
        height: 800,
        scale: 3,
        fontScale,
      });
      const onPress = jest.fn();
      const weather = {
        ...buildWeatherGuideBundleForScenario('fresh', '일산3동'),
        windSpeed: 13.5,
      };
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <WeatherGuideHomeCard
            weather={weather}
            petName="누리"
            visualTheme={getSeasonalWeatherVisualTheme('autumn')?.card}
            onPress={onPress}
          />,
        );
      });
      const border = StyleSheet.flatten(
        renderer.root.findByType(BlurView).props.style,
      );
      if (fontScale === 1) {
        expect(border.height).toBe((width - 32) / (1665 / 945));
      } else {
        expect(border.height).toBeUndefined();
      }
      const wind = renderer.root
        .findAllByType(Text)
        .find(node => node.props.children === `${weather.windSpeed}m/s`);
      expect(wind?.props.numberOfLines).toBe(fontScale > 1 ? undefined : 1);
      expect(wind?.props.children).toBe('13.5m/s');
      expect(StyleSheet.flatten(wind?.parent?.props.style).flexShrink).toBe(0);
      const metrics = renderer.root
        .findAllByType(View)
        .filter(node => StyleSheet.flatten(node.props.style)?.width === '50%');
      expect(metrics).toHaveLength(fontScale > 1 ? 4 : 0);
      const notice = renderer.root
        .findAllByType(Text)
        .find(node => node.props.children === getWeatherAdvice(weather).label);
      expect(notice?.props.numberOfLines).toBe(fontScale > 1 ? undefined : 2);
      const button = renderer.root.find(
        node =>
          node.props.accessibilityLabel === '날씨 상세 보기' &&
          !!node.props.onPress,
      );
      button.props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);
      await act(async () => renderer.unmount());
    },
  );
});
