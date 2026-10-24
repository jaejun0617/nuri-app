import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import LinearGradient from 'react-native-linear-gradient';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import SeasonalAmbientBackground from '../src/components/common/SeasonalAmbientBackground';
import { resolveHomeFrostedMaterial } from '../src/components/home/HomeFrostedGlass';
import { HomeAmbientBubbleCanvas } from '../src/screens/Main/components/LoggedInHome/HomeAmbientBubbleCanvas';
import { SeasonalHomeAutumnStage } from '../src/screens/Main/components/LoggedInHome/SeasonalHomeAutumn';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('@sbaiahmed1/react-native-blur', () => ({ BlurView: 'BlurView' }));

const seasons: readonly SeasonKey[] = ['spring', 'summer', 'autumn', 'winter'];
const read = (file: string) => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');

async function verifyGradientCanvas(
  child: React.ReactElement,
  id: string,
  colors: readonly string[] = ['#F1F5F8', '#F1F5F8'],
  locations: readonly number[] = [0, 1],
) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>{child}</ThemeProvider>,
    );
  });
  try {
    const canvas = renderer.root.findAll(node => node.type === View && node.props.testID === id)[0];
    expect(canvas).toBeDefined();
    expect(StyleSheet.flatten(canvas.props.style).backgroundColor).toBe(colors[colors.length - 1]);
    expect(canvas.props.pointerEvents).toBe('none');
    expect(canvas.props.accessibilityElementsHidden).toBe(true);
    if (React.isValidElement<{ backgroundMode?: string }>(child) && child.props.backgroundMode === 'homePalette') {
      expect(StyleSheet.flatten(canvas.props.style)).toMatchObject({
        position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
      });
    }
    const gradients = canvas.findAllByType(LinearGradient);
    expect(gradients).toHaveLength(1);
    expect(gradients[0].props.colors).toEqual(colors);
    expect(gradients[0].props.locations).toEqual(locations);
    expect(gradients[0].props.start).toEqual({ x: 0.5, y: 0 });
    expect(gradients[0].props.end).toEqual({ x: 0.5, y: 1 });
    expect(StyleSheet.flatten(gradients[0].props.style)).toEqual({
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    });
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    expect(renderer.root.findAll(node => /(?:glint-|center-light|season-wash|bubble-\d|lower-light-)/.test(node.props.testID ?? ''))).toHaveLength(0);
  } finally {
    await act(async () => renderer.unmount());
  }
}

describe('PO uniform blue-gray canvas without spheres or starlight', () => {
  it.each(seasons)('%s shared hubs use the exact solid blue-gray canvas', async season => {
    await verifyGradientCanvas(<SeasonalAmbientBackground season={season} />, 'seasonal-ambient-background');
  });

  it.each(seasons.flatMap(season => (['home', 'reading'] as const).map(decorationMode => ({ season, decorationMode }))))(
    '$season $decorationMode canvas removes every decorative layer',
    async ({ season, decorationMode }) => {
      await verifyGradientCanvas(
        <HomeAmbientBubbleCanvas season={season} heroHeight={800} decorationMode={decorationMode} backgroundMode="uniform" />,
        'home-ambient-bubble-canvas',
      );
    },
  );

  it.each([
    'screens/Records/RecordCreateScreen.tsx',
    'screens/Records/RecordEditScreen.tsx',
    'screens/Schedules/ScheduleCreateScreen.tsx',
    'screens/Schedules/ScheduleEditScreen.tsx',
  ])('%s keeps its uniform form background', file => {
    expect(read(file)).toContain('<SeasonalFormBackground uniform />');
  });

  it('keeps schedule detail on the uniform mode', () => {
    expect(read('screens/Schedules/ScheduleDetailScreen.tsx')).toContain('backgroundMode="uniform"');
  });

  it.each([
    'screens/Pets/PetProfileEditDoneScreen.tsx',
    'screens/Weather/WeatherActivityRecordScreen.tsx',
  ])('%s uses the common default form background', file => {
    expect(read(file)).toContain('<SeasonalFormBackground />');
    expect(read(file)).not.toContain('<SeasonalFormBackground uniform');
  });

  it('keeps monthly expenses on its existing lavender canvas', () => {
    expect(read('screens/Records/MonthlyExpensesScreen.tsx')).toContain(
      '<LavenderScreenBackground testID="monthly-expenses-background-gradient"',
    );
  });

  it('keeps the existing four-season CTA with neutral reflective-card material', () => {
    expect(seasons.map(season => SEASON_CTA[season].primary)).toEqual(['#B84066', '#247264', '#B95000', '#3B6398']);
    expect(seasons.map(season => resolveHomeFrostedMaterial(season).backgroundColor)).toEqual([
      'rgba(255, 255, 255, 0.26)', 'rgba(255, 255, 255, 0.26)',
      'rgba(255, 255, 255, 0.26)', 'rgba(255, 255, 255, 0.26)',
    ]);
  });
});

describe('PO Home-only seasonal background palette', () => {
  it.each([
    { season: 'spring', colors: ['#FDEFF3', '#FDF3F6', '#FDEFF3'] },
    { season: 'summer', colors: ['#EAFBFD', '#F0FBFD', '#E9FAFC'] },
    { season: 'autumn', colors: ['#FEF2E9', '#FEF6EF', '#FEF2E8'] },
    { season: 'winter', colors: ['#EBF5FD', '#F1F8FE', '#EAF4FD'] },
  ] as const)('$season uses the approved subtle three-stop palette', async ({ season, colors }) => {
    await verifyGradientCanvas(
      <HomeAmbientBubbleCanvas season={season} heroHeight={800} backgroundMode="homePalette" showDecorations />,
      'home-ambient-bubble-canvas',
      colors,
      [0, 0.5, 1],
    );
  });

  it('binds only Home to a fixed viewport palette with a matching top inset', () => {
    const source = read('screens/Main/components/LoggedInHome/LoggedInHome.tsx');
    expect(source).toContain('backgroundMode="homePalette"');
    expect(source).toContain('getHomeHeroColors(ambientSeason)');
    expect(source.match(/backgroundColor: heroColors.statusBar/g)).toHaveLength(1);
    expect(source).toContain("style={[styles.scroll, { backgroundColor: 'transparent' }]}");
    const homeRender = source.slice(source.indexOf('  // 10) render'));
    expect(homeRender.indexOf('<HomeAmbientBubbleCanvas')).toBeLessThan(homeRender.indexOf('<ScrollView'));
    expect(homeRender.match(/<HomeAmbientBubbleCanvas/g)).toHaveLength(1);
    expect(homeRender).not.toContain('<LavenderScreenBackground');
    expect(homeRender).toContain('<HomeHeroPhotoBackground');
  });

  it('does not wash the new palette with the legacy Hero header overlay', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <SeasonalHomeAutumnStage atmosphere={1} atmosphereAspectRatio={1} backgroundImageVisible={false}>
          <View testID="hero-content" />
        </SeasonalHomeAutumnStage>,
      );
    });
    try {
      expect(renderer.root.findAllByType(LinearGradient)).toHaveLength(0);
      expect(renderer.root.findAllByType(Image)).toHaveLength(0);
      expect(StyleSheet.flatten(renderer.root.findAllByType(View)[0].props.style).backgroundColor).toBe('transparent');
      expect(renderer.root.findByProps({ testID: 'hero-content' })).toBeDefined();
    } finally {
      await act(async () => renderer.unmount());
    }
  });
});
