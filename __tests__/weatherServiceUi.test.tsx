import React from 'react';
import ReactNative, {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
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

jest.mock('../src/hooks/useWeatherGuide', () => ({
  useWeatherGuide: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
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
    renderer = TestRenderer.create(element);
  });
  return renderer;
}
describe('weather service presentation UI', () => {
  beforeEach(() => {
    jest
      .spyOn(seasonPreference, 'useEffectiveSeason')
      .mockReturnValue('autumn');
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 384, height: 800, fontScale: 1, scale: 3 });
    refresh.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'keeps %s artwork and outer frost but removes inner surface fills',
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
      expect(renderer.root.findAllByType(BlurView)).toHaveLength(1);
      expect(texts(renderer)).toContain('구름 조금 예측');
      expect(texts(renderer)).toContain(
        `최고 ${weather.highTemperature}° · 최저 ${weather.lowTemperature}°`,
      );
      await act(async () => renderer.unmount());
    },
  );

  it.each(
    (['fresh', 'rain', 'snow', 'dusty'] as const).flatMap(scenario =>
      [true, false].map(isDaytime => ({ scenario, isDaytime })),
    ),
  )(
    'uses shared frost without replacing $scenario / daytime $isDaytime images',
    async ({ scenario, isDaytime }) => {
      state(
        buildWeatherGuideBundleForScenario(scenario, '일산3동', { isDaytime }),
      );
      const renderer = await render(<WeatherInsightScreen />);
      expect(renderer.root.findAllByType(BlurView)).toHaveLength(11);
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

  it('reflows enlarged metric panels rather than truncating descriptions', async () => {
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 360, height: 800, fontScale: 1.5, scale: 3 });
    state(buildWeatherGuideBundleForScenario('fresh'));
    const renderer = await render(<WeatherInsightScreen />);
    const metricCards = renderer.root
      .findAllByType(BlurView)
      .filter(node => StyleSheet.flatten(node.props.style).minHeight === 0);
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

  it('does not personalize the generic copy into our pet-name', async () => {
    const renderer = await render(
      <WeatherGuideHomeCard
        weather={buildWeatherGuideBundleForScenario('fresh')}
        petName="누리"
        visualTheme={getSeasonalWeatherVisualTheme('autumn')?.card}
        onPress={jest.fn()}
      />,
    );
    expect(texts(renderer)).toContain(
      '우리 아이의 컨디션에 맞춰 외출을 준비해 주세요.',
    );
    expect(texts(renderer).join('\n')).not.toContain('누리의 종류');
    const frame = StyleSheet.flatten(
      renderer.root.findByType(BlurView).props.style,
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
      expect(renderer.root.findAllByType(BlurView)).toHaveLength(1);
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
