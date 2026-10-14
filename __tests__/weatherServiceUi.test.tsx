import React from 'react';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import ReactNative, {
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@sbaiahmed1/react-native-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import WeatherInsightScreen from '../src/screens/Weather/WeatherInsightScreen';
import WeatherGuideHomeCard from '../src/components/weather/WeatherGuideHomeCard';
import WeatherHourlyPrecipitation from '../src/components/weather/WeatherHourlyPrecipitation';
import {
  buildWeatherGuideBundleForScenario,
  createPreviewWeatherGuideBundle,
  createUnavailableWeatherGuideBundle,
  type WeatherGuideBundle,
  type HourlyWeatherItem,
} from '../src/services/weather/guide';
import { useWeatherGuide } from '../src/hooks/useWeatherGuide';
import * as seasonPreference from '../src/app/providers/SeasonPreferenceProvider';
import { getSeasonalWeatherVisualTheme } from '../src/theme/seasonal/weather';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import { HOME_FLOATING_WIDGET_MATERIAL } from '../src/components/home/HomeWidgetMaterial';
import { getSeasonalWeatherHeroVisual } from '../src/theme/seasonal/weatherHero';

const mockGoBack = jest.fn();

jest.mock('../src/hooks/useWeatherGuide', () => ({
  useWeatherGuide: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ name: 'WeatherInsight', key: 'weather' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));
const mockGuide = jest.mocked(useWeatherGuide);
const texts = (renderer: TestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .filter((value): value is string => typeof value === 'string');
const refresh = jest.fn(() => Promise.resolve());
function state(bundle: WeatherGuideBundle) {
  const value: ReturnType<typeof useWeatherGuide> = {
    bundle,
    loading: false,
    error: null,
    refresh,
    isUnavailable: bundle.dataSource === 'unavailable',
    isPreview: bundle.dataSource === 'preview',
    coordinates: null,
    hasFreshLocation: true,
    usingStaleLocation: false,
    locationLabel: '현재 위치',
  };
  mockGuide.mockReturnValue(value);
  return value;
}
async function render(element: React.ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>{element}</ThemeProvider>,
    );
  });
  return renderer;
}

function expectGlassBackButton(header: TestRenderer.ReactTestInstance, color: string) {
  expect(
    header.findAllByType(Text).some(node => node.props.children === '오늘의 날씨'),
  ).toBe(false);
  const back = header.find(
    node => node.props.accessibilityLabel === '뒤로 가기' && !!node.props.onPress,
  );
  expect(back.props.accessibilityRole).toBe('button');
  expect(StyleSheet.flatten(back.props.style)).toMatchObject({ width: 48, height: 48 });
  const glass = back.findAll(node => node.type === View && node.props.testID === 'weather-back-glass')[0];
  expect(glass).toBeDefined();
  expect(StyleSheet.flatten(glass.props.style)).toMatchObject({
    width: 40, height: 40, borderRadius: 20, marginTop: 0, overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: HOME_FLOATING_WIDGET_MATERIAL.backgroundColor,
  });
  expect(glass.props.pointerEvents).toBe('none');
  expect(glass.findByProps({ testID: 'weather-back-glass-reflection' })).toBeDefined();
  expect(glass.findByProps({ testID: 'weather-back-glass-glint' })).toBeDefined();
  back.props.onPress();
  expect(mockGoBack).toHaveBeenCalledTimes(1);
  expect(
    back.findAll(node => node.props.name === 'arrow-left')
      .every(node => node.props.color === color),
  ).toBe(true);
}

function expectImageHeader(
  renderer: TestRenderer.ReactTestRenderer,
  color: string,
) {
  const hero = renderer.root.findByType(ImageBackground);
  const header = hero.findByProps({ testID: 'weather-header-surface' });
  expect(StyleSheet.flatten(header.props.style)).toMatchObject({
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    zIndex: 1,
  });
  expectGlassBackButton(header, color);
  expect(
    hero.findAllByType(Text).some(node =>
      node.props.testID === 'weather-hero-district' ||
      node.props.testID === 'weather-hero-temperature',
    ),
  ).toBe(false);
  expect(
    hero.findAllByProps({ testID: 'weather-hero-information' }),
  ).toHaveLength(0);
  for (const node of header.findAllByType(Text)) {
    const style = StyleSheet.flatten(node.props.style);
    for (const key of ['textShadowColor', 'textShadowOffset', 'textShadowRadius']) {
      expect(style).not.toHaveProperty(key);
    }
  }
  const safeArea = renderer.root.findByType(SafeAreaView);
  expect(safeArea.props.edges).toEqual(['top', 'left', 'right']);
  expect(safeArea.findAll(node => node === hero)).toHaveLength(1);
  const statusBar = renderer.root.findByType(StatusBar);
  expect(statusBar.props.barStyle).toBe('dark-content');
  for (const key of ['translucent', 'backgroundColor', 'hidden']) {
    expect(statusBar.props[key]).toBeUndefined();
  }
  expect(renderer.root.findAllByType(LinearGradient)[0].props.colors).toEqual([
    '#F1F5F8', '#F1F5F8',
  ]);
}

describe('weather service presentation UI', () => {
  beforeEach(() => {
    jest.spyOn(seasonPreference, 'useSeasonPreference').mockReturnValue({
      season: 'autumn',
      override: 'autumn',
      setOverride: jest.fn(async () => {}),
    });
    jest
      .spyOn(seasonPreference, 'useEffectiveSeason')
      .mockReturnValue('autumn');
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 384, height: 800, fontScale: 1, scale: 3 });
    refresh.mockClear();
    mockGoBack.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'keeps %s artwork and outer reflection but removes inner surface fills',
    async season => {
      const weather = {
        ...buildWeatherGuideBundleForScenario('fresh'),
        detailStatus: '구름 조금',
      };
      const renderer = await render(
        <WeatherGuideHomeCard
          weather={weather}
          visualTheme={getSeasonalWeatherVisualTheme(season)?.card}
          onPress={jest.fn()}
        />,
      );
      const fills = renderer.root
        .findAllByType(View)
        .map(node => StyleSheet.flatten(node.props.style)?.backgroundColor)
        .filter(Boolean);
      expect(fills.filter(color => color !== 'transparent')).toHaveLength(1);
      expect(renderer.root.findAllByType(BlurView)).toHaveLength(0);
      expect(renderer.root.findAll(node => node.type === View && node.props.testID === 'home-reflective-fill')).toHaveLength(1);
      expect(texts(renderer)).toContain('구름 조금 예측');
      expect(texts(renderer)).toContain(
        `최고 ${weather.highTemperature}° · 최저 ${weather.lowTemperature}°`,
      );
      await act(async () => renderer.unmount());
    },
  );

  it.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    'uses selected %s CTA text on the Home card without changing its fixed material',
    async season => {
      jest.spyOn(seasonPreference, 'useEffectiveSeason').mockReturnValue(season);
      const weather = buildWeatherGuideBundleForScenario('fresh', '일산3동');
      const visualTheme = getSeasonalWeatherVisualTheme('autumn')?.card;
      const renderer = await render(
        <WeatherGuideHomeCard
          weather={weather}
          locationLabel="일산3동"
          visualTheme={visualTheme}
          onPress={jest.fn()}
        />,
      );
      for (const label of [
        '일산3동',
        String(weather.currentTemperature),
        '°',
        'C',
        '외출 전 체크',
      ]) {
        const node = renderer.root
          .findAllByType(Text)
          .find(text => text.props.children === label);
        expect(node).toBeDefined();
        expect(StyleSheet.flatten(node?.props.style).color).toBe(
          SEASON_CTA[season].primary,
        );
      }
      const date = renderer.root
        .findAllByType(Text)
        .find(
          node =>
            typeof node.props.children === 'string' &&
            /월.*일.*\(/.test(node.props.children),
        );
      expect(StyleSheet.flatten(date?.props.style).color).toBe(
        visualTheme?.primaryText,
      );
      await act(async () => renderer.unmount());
    },
  );

  it.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    'keeps the %s unavailable boundary and plain header without a fake region or temperature',
    async season => {
      jest.spyOn(seasonPreference, 'useEffectiveSeason').mockReturnValue(season);
      const weather = createUnavailableWeatherGuideBundle('일산3동');
      state(weather);
      const renderer = await render(<WeatherInsightScreen />);
      expect(
        renderer.root.findAll(node => node.props.name === 'map-pin'),
      ).toHaveLength(0);
      const heroText = renderer.root.findAllByType(Text).filter(
        node => typeof node.props.testID === 'string' &&
          node.props.testID.startsWith('weather-hero-'),
      );
      expect(heroText).toHaveLength(0);
      const header = renderer.root.findByProps({ testID: 'weather-header-surface' });
      expect(StyleSheet.flatten(header.props.style).position).toBeUndefined();
      expectGlassBackButton(header, createTheme('light').colors.textPrimary);
      expect(texts(renderer)).not.toContain('오늘의 날씨');
      expect(renderer.root.findAllByType(ImageBackground)).toHaveLength(0);
      expect(texts(renderer)).toContain('날씨를 불러오지 못했어요');
      await act(async () => renderer.unmount());
    },
  );

  it.each(['fresh', 'preview', 'unavailable'] as const)(
    'groups %s detail sections in one rounded Walk-style sheet without nesting vertical scroll views',
    async mode => {
      const bundle = buildWeatherGuideBundleForScenario('fresh');
      state(mode === 'unavailable'
        ? createUnavailableWeatherGuideBundle()
        : mode === 'preview' ? createPreviewWeatherGuideBundle(bundle) : bundle);
      const renderer = await render(<WeatherInsightScreen />);
      const sheet = renderer.root.findByProps({ testID: 'weather-details-sheet' });
      expect(StyleSheet.flatten(sheet.props.style)).toMatchObject({
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: mode === 'unavailable' ? 0 : -28,
        marginHorizontal: -18,
        paddingHorizontal: 18,
        paddingTop: 20,
        gap: 12,
        backgroundColor: '#F1F5F8',
      });
      expect(
        sheet.findAllByType(ScrollView).filter(node => !node.props.horizontal),
      ).toHaveLength(0);
      const body = sheet.findAllByType(Text).map(node => node.props.children);
      for (const label of ['7일 예보', '일출과 일몰', '반려동물 외출 안내']) {
        expect(body).toContain(label);
      }
      expect(
        sheet.findAll(node => node.type === View && node.props.testID === 'weather-hourly-viewport'),
      ).toHaveLength(1);
      expect(sheet.findAllByType(ImageBackground)).toHaveLength(0);
      await act(async () => renderer.unmount());
    },
  );

  it.each(
    (['fresh', 'rain', 'snow', 'dusty'] as const).flatMap(scenario =>
      [true, false].map(isDaytime => ({ scenario, isDaytime })),
    ),
  )(
    'retains shared frost and data for $scenario / daytime $isDaytime',
    async ({ scenario, isDaytime }) => {
      state(
        buildWeatherGuideBundleForScenario(scenario, '일산3동', { isDaytime }),
      );
      const renderer = await render(<WeatherInsightScreen />);
      expect(renderer.root.findAllByType(BlurView)).toHaveLength(0);
      expect(renderer.root.findAll(node => node.type === View && node.props.testID === 'home-reflective-fill')).toHaveLength(11);
      expect(renderer.root.findAllByType(ImageBackground)).toHaveLength(1);
      expect(renderer.root.findByType(SafeAreaView).props.edges).toEqual([
        'top',
        'left',
        'right',
      ]);
      expect(
        StyleSheet.flatten(
          renderer.root
            .findAllByType(ScrollView)
            .find(node => !node.props.horizontal)?.props.contentContainerStyle,
        ).paddingBottom,
      ).toBe(36);
      expect(texts(renderer)).toContain('반려동물 외출 안내');
      expect(texts(renderer)).not.toContain('기압');
      expect(texts(renderer)).not.toContain('가시거리');
      expect(
        renderer.root.findAll(
          node => node.props.accessibilityLabel === '날씨 다시 확인',
        ),
      ).toHaveLength(0);
      const visibleText = texts(renderer).join('\n');
      for (const metadata of [
        '한국시간',
        '관측값 아님',
        '5분마다',
        '조회',
        '기준 시각',
        '하루 최대 강수 확률 · 최고 / 최저',
        '날씨에 따른 참고 안내',
      ]) {
        expect(visibleText).not.toContain(metadata);
      }
      expect(visibleText).toContain('날씨·대기질 예측: Open-Meteo');
      expect(refresh).not.toHaveBeenCalled();
      await act(async () => renderer.unmount());
    },
  );

  it.each(
    (['fresh', 'rain'] as const).flatMap(scenario =>
      [true, false].flatMap(isDaytime =>
        [320, 384, 430].map(width => ({ scenario, isDaytime, width })),
      ),
    ),
  )(
    'renders autumn $scenario / day=$isDaytime at $width dp',
    async ({ scenario, isDaytime, width }) => {
      jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
        width,
        height: 800,
        fontScale: 1,
        scale: 3,
      });
      const bundle = buildWeatherGuideBundleForScenario(scenario, '일산3동', {
        isDaytime,
      });
      state(bundle);
      const renderer = await render(<WeatherInsightScreen />);
      const visual = getSeasonalWeatherHeroVisual(
        'autumn',
        scenario,
        isDaytime,
      );
      const hero = renderer.root.findByType(ImageBackground);
      expect(hero.props.source).toEqual(visual?.image);
      expect(StyleSheet.flatten(hero.props.style).minHeight).toBe(width);
      expect(StyleSheet.flatten(hero.props.style).height).toBeUndefined();
      expectImageHeader(renderer, isDaytime ? '#162C46' : '#FFFFFF');
      expect(texts(renderer)).not.toContain('일산3동');
      expect(hero.findAll(node => node.props.name === 'map-pin')).toHaveLength(0);
      const fade = hero
        .findAllByType(LinearGradient)
        .find(node => node.props.testID === 'weather-hero-bottom-blend');
      expect(fade?.props.colors[2]).toBe(visual?.palette.background[0]);
      expect(StyleSheet.flatten(fade?.props.style).height).toBe(width * 0.18);
      expect(
        hero.findAllByProps({ testID: 'weather-hero-top-blend' }),
      ).toHaveLength(0);
      const headerStyle = StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'weather-header-surface' }).props
          .style,
      );
      expect(headerStyle.backgroundColor).toBeUndefined();
      expect(headerStyle.marginBottom).toBeUndefined();
      expect(fade?.props.pointerEvents).toBe('none');
      expect(renderer.root.findAllByType(BlurView)).toHaveLength(0);
      expect(renderer.root.findAll(node => node.type === View && node.props.testID === 'home-reflective-fill')).toHaveLength(11);
      expect(hero.findAllByType(BlurView)).toHaveLength(0);
      await act(async () => renderer.unmount());
    },
  );

  it.each(
    (['winter', 'spring', 'summer'] as const).flatMap(season =>
      (['fresh', 'rain', 'snow'] as const).flatMap(scenario =>
        [true, false].map(isDaytime => ({ season, scenario, isDaytime })),
      ),
    ),
  )(
    'preserves $season $scenario / day=$isDaytime artwork and lower blend without an upper blend',
    async ({ season, scenario, isDaytime }) => {
      jest
        .spyOn(seasonPreference, 'useEffectiveSeason')
        .mockReturnValue(season);
      state(
        buildWeatherGuideBundleForScenario(scenario, '현재 위치', {
          isDaytime,
        }),
      );
      const renderer = await render(<WeatherInsightScreen />);
      const visual = getSeasonalWeatherHeroVisual(season, scenario, isDaytime);
      const hero = renderer.root.findByType(ImageBackground);
      expect(hero.props.source).toEqual(visual?.image);
      expect(
        hero.findAllByProps({ testID: 'weather-hero-top-blend' }),
      ).toHaveLength(0);
      const lowerBlend = hero
        .findAllByType(LinearGradient)
        .find(node => node.props.testID === 'weather-hero-bottom-blend');
      expect(lowerBlend?.props.colors).toEqual(visual?.blendColors);
      expect(lowerBlend?.props.colors[2]).toBe(visual?.palette.background[0]);
      expect(hero.findAllByType(BlurView)).toHaveLength(0);
      expect(
        hero.findAllByProps({ testID: 'weather-hero-reading-tint' }),
      ).toHaveLength(0);
      expectImageHeader(renderer, isDaytime ? '#162C46' : '#FFFFFF');
      await act(async () => renderer.unmount());
    },
  );

  it('removes the approved seasonal review controls without changing the shared preference', async () => {
    const setOverride = jest.fn(async () => {});
    jest
      .spyOn(seasonPreference, 'useSeasonPreference')
      .mockReturnValue({ season: 'autumn', override: 'autumn', setOverride });
    state(buildWeatherGuideBundleForScenario('fresh'));
    const renderer = await render(<WeatherInsightScreen />);
    expect(
      renderer.root.findAllByProps({ testID: 'weather-season-review-controls' }),
    ).toHaveLength(0);
    for (const season of ['autumn', 'winter', 'spring', 'summer']) {
      expect(
        renderer.root.findAllByProps({
          testID: `weather-review-season-${season}`,
        }),
      ).toHaveLength(0);
    }
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: '뒤로 가기' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root
        .findAllByType(Text)
        .some(node => node.props.children === '오늘의 날씨'),
    ).toBe(false);
    expect(setOverride).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it('keeps real snow data on the common snow path without autumn snow assets', async () => {
    state(buildWeatherGuideBundleForScenario('snow'));
    const renderer = await render(<WeatherInsightScreen />);
    expect(renderer.root.findByType(ImageBackground).props.source).toEqual(
      require('../src/assets/weather/snow.png'),
    );
    await act(async () => renderer.unmount());
  });

  it('preserves recent and unavailable warnings without region or temperature in the hero', async () => {
    const preview = createPreviewWeatherGuideBundle(
      buildWeatherGuideBundleForScenario('rain'),
    );
    state(preview);
    const renderer = await render(<WeatherInsightScreen />);
    expectImageHeader(renderer, preview.isDaytime ? '#162C46' : '#FFFFFF');
    expect(texts(renderer)).toContain('최근 확인한 날씨예요');
    state(createUnavailableWeatherGuideBundle());
    await act(async () =>
      renderer.update(
        <ThemeProvider theme={createTheme('light')}>
          <WeatherInsightScreen />
        </ThemeProvider>,
      ),
    );
    expect(renderer.root.findAllByType(ImageBackground)).toHaveLength(0);
    expect(texts(renderer)).toContain('날씨를 불러오지 못했어요');
    await act(async () => renderer.unmount());
  });

  it('reflows enlarged metric panels rather than truncating descriptions', async () => {
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 360, height: 800, fontScale: 1.5, scale: 3 });
    state(buildWeatherGuideBundleForScenario('fresh'));
    const renderer = await render(<WeatherInsightScreen />);
    const info = renderer.root.findByProps({
      testID: 'weather-header-surface',
    });
    expect(StyleSheet.flatten(info.props.style).width).toBeUndefined();
    expect(StyleSheet.flatten(info.props.style).maxWidth).toBeUndefined();
    expect(StyleSheet.flatten(info.props.style).height).toBeUndefined();
    expect(
      info
        .findAllByType(Text)
        .every(node => node.props.numberOfLines === undefined),
    ).toBe(true);
    const metricCards = renderer.root
      .findAll(node => node.type === View && node.props.testID === 'home-reflective-fill')
      .map(node => node.parent)
      .filter((node): node is TestRenderer.ReactTestInstance => node !== null && StyleSheet.flatten(node.props.style).minHeight === 0);
    expect(metricCards).toHaveLength(6);
    expect(
      metricCards.every(
        node => StyleSheet.flatten(node.props.style).width === '100%',
      ),
    ).toBe(true);
    await act(async () => renderer.unmount());
  });

  it.each(['preview', 'unavailable'] as const)(
    'keeps the $status boundary explicit with no image placeholder copy',
    async status => {
      state(
        status === 'preview'
          ? createPreviewWeatherGuideBundle(
              buildWeatherGuideBundleForScenario('fresh'),
            )
          : createUnavailableWeatherGuideBundle(),
      );
      const renderer = await render(<WeatherInsightScreen />);
      expect(texts(renderer).join('\n')).not.toContain('이미지 슬롯');
      expect(texts(renderer)).toContain(
        status === 'preview'
          ? '최근 날씨를 보여드려요'
          : '날씨를 확인해 주세요',
      );
      expect(texts(renderer)).toContain(
        status === 'preview'
          ? '최근 확인한 날씨예요'
          : '최신 날씨를 확인하지 못했어요',
      );
      await act(async () =>
        renderer.root
          .find(
            node =>
              node.props.accessibilityLabel === '날씨 다시 확인' &&
              !!node.props.onPress,
          )
          .props.onPress(),
      );
      expect(refresh).toHaveBeenCalledTimes(1);
      await act(async () => renderer.unmount());
    },
  );

  it('personalizes owned pet copy without replacing species labels', async () => {
    const renderer = await render(
      <WeatherGuideHomeCard
        weather={buildWeatherGuideBundleForScenario('fresh')}
        petName="누리"
        visualTheme={getSeasonalWeatherVisualTheme('autumn')?.card}
        onPress={jest.fn()}
      />,
    );
    expect(texts(renderer)).toContain(
      '누리의 컨디션에 맞춰 외출을 준비해 주세요.',
    );
    expect(texts(renderer).join('\n')).not.toContain('누리의 종류');
    const frame = StyleSheet.flatten(
      renderer.root.findAll(node => node.type === View && node.props.testID === 'home-glass-weather')[0].props.style,
    );
    expect(frame.height).toBeUndefined();
    expect(frame.minHeight).toBe((384 - 32) / (1665 / 945));
    await act(async () => renderer.unmount());
  });

  it('keeps retry available after a refresh error even with renderable data', async () => {
    const current = state(buildWeatherGuideBundleForScenario('fresh'));
    mockGuide.mockReturnValue({ ...current, error: 'network unavailable' });
    const renderer = await render(<WeatherInsightScreen />);
    expect(texts(renderer)).toContain('최신 날씨를 확인하지 못했어요');
    expect(texts(renderer).join('\n')).not.toContain('network unavailable');
    await act(async () => renderer.unmount());
  });

  const hours = (count: number): HourlyWeatherItem[] =>
    Array.from({ length: count }, (_, index) => ({
      startsAt: `2026-10-05T${String(12 + index).padStart(2, '0')}:00:00+09:00`,
      endsAt: `2026-10-05T${String(13 + index).padStart(2, '0')}:00:00+09:00`,
      precipitationChance: index === 1 ? null : 0,
      precipitationMm: index === 1 ? null : 0,
    }));

  it.each([320, 360, 384, 430])(
    'fits hourly slots to %i dp without nested panels or fabricated zeros',
    async width => {
      jest
        .spyOn(ReactNative, 'useWindowDimensions')
        .mockReturnValue({ width, height: 800, fontScale: 1, scale: 3 });
      const renderer = await render(
        <WeatherHourlyPrecipitation
          items={hours(8)}
          textColor="#FFFFFF"
          secondaryColor="#CCCCCC"
        />,
      );
      expect(renderer.root.findAllByType(BlurView)).toHaveLength(0);
      expect(renderer.root.findAll(node => node.type === View && node.props.testID === 'home-reflective-fill')).toHaveLength(1);
      const slots = renderer.root
        .findAllByType(View)
        .filter(node => node.props.testID === 'weather-hourly-slot');
      expect(slots).toHaveLength(8);
      const slotWidth = StyleSheet.flatten(slots[0].props.style)
        .width as number;
      expect(slotWidth).toBeGreaterThanOrEqual(88);
      expect(slotWidth).toBeLessThanOrEqual(width - 72);
      expect(texts(renderer)).toContain('0%');
      expect(texts(renderer)).toContain('0mm');
      expect(texts(renderer).filter(text => text === '—')).toHaveLength(2);
      expect(slots[1].props.accessibilityLabel).toContain('미제공');
      await act(async () => renderer.unmount());
    },
  );

  it('uses the measured panel width and expands slots for larger fonts', async () => {
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 360, height: 800, fontScale: 1.5, scale: 3 });
    const renderer = await render(
      <WeatherHourlyPrecipitation
        items={hours(8)}
        textColor="#FFFFFF"
        secondaryColor="#CCCCCC"
      />,
    );
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'weather-hourly-viewport' })
        .props.onLayout({ nativeEvent: { layout: { width: 280 } } }),
    );
    const slot = renderer.root
      .findAllByType(View)
      .find(node => node.props.testID === 'weather-hourly-slot');
    expect(StyleSheet.flatten(slot?.props.style).width).toBe(140);
    expect(
      renderer.root.findByProps({ testID: 'weather-hourly-timeline' }).props
        .scrollEnabled,
    ).toBe(true);
    await act(async () => renderer.unmount());
  });

  it('keeps three slots in one row and provides an honest empty state', async () => {
    const renderer = await render(
      <WeatherHourlyPrecipitation
        items={hours(3)}
        textColor="#FFFFFF"
        secondaryColor="#CCCCCC"
      />,
    );
    expect(
      renderer.root.findByProps({ testID: 'weather-hourly-timeline' }).props
        .scrollEnabled,
    ).toBe(false);
    await act(async () =>
      renderer.update(
        <WeatherHourlyPrecipitation
          items={[]}
          textColor="#FFFFFF"
          secondaryColor="#CCCCCC"
        />,
      ),
    );
    expect(texts(renderer)).toContain(
      '시간대별 강수 정보를 확인하지 못했어요.',
    );
    expect(
      renderer.root.findAllByProps({ testID: 'weather-hourly-timeline' }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });
});
