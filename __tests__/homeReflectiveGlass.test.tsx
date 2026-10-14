import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@sbaiahmed1/react-native-blur';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { HomeSectionGlass } from '../src/components/home/HomeSectionGlass';
import { HomeReflectiveGlass } from '../src/components/home/HomeReflectiveGlass';
import { HomeScheduleCalendar } from '../src/components/home/HomeScheduleCalendar';
import WeatherGuideHomeCard from '../src/components/weather/WeatherGuideHomeCard';
import {
  HOME_FLOATING_WIDGET_GLINT,
  HOME_FLOATING_WIDGET_MATERIAL,
  HOME_FLOATING_WIDGET_REFLECTION,
} from '../src/components/home/HomeWidgetMaterial';
import { buildWeatherGuideBundleForScenario } from '../src/services/weather/guide';
import { getSeasonalWeatherVisualTheme } from '../src/theme/seasonal/weather';
import type { SeasonKey } from '../src/theme/seasonal/season';

const seasons: readonly SeasonKey[] = ['spring', 'summer', 'autumn', 'winter'];

async function verifyMaterial(child: React.ReactElement, radius: number) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<ThemeProvider theme={createTheme('light')}>{child}</ThemeProvider>);
  });
  try {
    expect(renderer.root.findAllByType(BlurView)).toHaveLength(0);
    const fill = renderer.root.findAll(node => node.type === View && node.props.testID === 'home-reflective-fill');
    expect(fill).toHaveLength(1);
    expect(StyleSheet.flatten(fill[0].props.style)).toMatchObject({
      ...HOME_FLOATING_WIDGET_MATERIAL, borderRadius: radius, position: 'absolute',
    });
    const gradients = renderer.root.findAllByType(LinearGradient);
    for (const [suffix, material] of [
      ['reflection', HOME_FLOATING_WIDGET_REFLECTION],
      ['glint', HOME_FLOATING_WIDGET_GLINT],
    ] as const) {
      const layers = gradients.filter(node => node.props.testID === `home-reflective-glass-${suffix}`);
      expect(layers).toHaveLength(1);
      expect(layers[0].props.colors).toEqual(material.colors);
      expect(layers[0].props.start).toEqual(material.start);
      expect(layers[0].props.end).toEqual(material.end);
      expect(layers[0].props.pointerEvents).toBe('none');
      expect(layers[0].props.importantForAccessibility).toBe('no-hide-descendants');
    }
    expect(fill[0].props.pointerEvents).toBe('none');
    expect(fill[0].props.importantForAccessibility).toBe('no-hide-descendants');
  } finally {
    await act(async () => renderer.unmount());
  }
}

describe('Home outer cards reuse the existing four-widget reflective material', () => {
  it.each(seasons)('%s section cards use reflection without native blur', async () => {
    await verifyMaterial(<HomeSectionGlass><TouchableOpacity><Text>기록 보기</Text></TouchableOpacity></HomeSectionGlass>, 22);
  });

  it.each(seasons)('%s Home calendar uses the same material', async season => {
    await verifyMaterial(<HomeScheduleCalendar petId="public-synthetic-pet" items={[]} dataState="ready"
      season={season} activeScheduleIds={new Set()} accentColor="#247264" accentDeepColor="#154BC4"
      isFocused={false} onPressAll={jest.fn()} onPressDetail={jest.fn()} />, 22);
  });

  it.each(seasons)('%s Home weather keeps its 27dp frame with the same material', async season => {
    await verifyMaterial(<WeatherGuideHomeCard weather={buildWeatherGuideBundleForScenario('fresh')}
      visualTheme={getSeasonalWeatherVisualTheme(season)?.card} hideSeasonalBackgroundImage
      onPress={jest.fn()} />, 27);
  });

  it('retains frame geometry, visible content and action accessibility independently of decorative layers', async () => {
    const onPress = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<HomeReflectiveGlass testID="frame" borderRadius={24}
        style={{ padding: 14, minHeight: 108, borderBottomLeftRadius: 0 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="기록 보기" onPress={onPress}>
          <Text style={{ color: '#247264' }}>그대로인 내용</Text>
        </TouchableOpacity>
      </HomeReflectiveGlass>);
    });
    try {
      const frame = renderer.root.findAll(node => node.type === View && node.props.testID === 'frame')[0];
      expect(frame.props.pointerEvents).toBe('box-none');
      expect(frame.props.importantForAccessibility).not.toBe('no-hide-descendants');
      expect(StyleSheet.flatten(frame.props.style)).toMatchObject({
        width: '100%', marginTop: 12, padding: 14, minHeight: 108,
        borderRadius: 24, borderBottomLeftRadius: 0, borderTopLeftRadius: 24,
        borderWidth: 0, backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0,
      });
      expect(StyleSheet.flatten(frame.props.style).opacity).toBeUndefined();
      const fill = renderer.root.findByProps({ testID: 'home-reflective-fill' });
      expect(StyleSheet.flatten(fill.props.style)).toMatchObject({ borderBottomLeftRadius: 0, borderTopLeftRadius: 24 });
      const button = renderer.root.findByType(TouchableOpacity);
      expect(button.props.accessibilityLabel).toBe('기록 보기');
      button.props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(renderer.root.findByType(Text).props.style.color).toBe('#247264');
    } finally {
      await act(async () => renderer.unmount());
    }
  });
});
