import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  useWeatherGuide,
  type WeatherGuideState,
} from '../src/hooks/useWeatherGuide';
import { buildWeatherGuideBundleForScenario } from '../src/services/weather/guide';
import { useWeatherStore } from '../src/store/weatherStore';
import * as dateUtils from '../src/utils/date';

const {
  projectWeatherV1,
} = require('../supabase/functions/_shared/weather-api-domain');

let mockWeatherFocused = true;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (effect: () => void | (() => void)) => {
      require('react').useEffect(
        () => (mockWeatherFocused ? effect() : undefined),
        [effect, mockWeatherFocused],
      );
    },
  };
});

jest.mock('../src/hooks/useCurrentLocation', () => ({
  useCurrentLocation: jest.fn(),
}));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));

jest.mock('../src/hooks/useDistrict', () => ({
  useDistrict: jest.fn(),
}));

jest.mock('../src/services/weather/api', () => ({
  fetchNuriWeatherV1: jest.fn(),
}));

jest.mock('../src/services/weather/cache', () => ({
  loadCachedWeatherGuideBundle: jest.fn(() => Promise.resolve(null)),
  saveCachedWeatherGuideBundle: jest.fn(() => Promise.resolve()),
}));

const { useCurrentLocation } = jest.requireMock(
  '../src/hooks/useCurrentLocation',
) as {
  useCurrentLocation: jest.Mock;
};
const { useDistrict } = jest.requireMock('../src/hooks/useDistrict') as {
  useDistrict: jest.Mock;
};
const { fetchNuriWeatherV1 } = jest.requireMock(
  '../src/services/weather/api',
) as {
  fetchNuriWeatherV1: jest.Mock;
};

type HarnessProps = {
  initialDistrict?: string;
  initialBundle?: ReturnType<typeof buildWeatherGuideBundleForScenario>;
};

let latestState: WeatherGuideState | null = null;

function Harness({ initialDistrict, initialBundle }: HarnessProps) {
  latestState = useWeatherGuide(initialDistrict, initialBundle);
  return null;
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

async function flush() {
  await ReactTestRenderer.act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

async function waitFor(check: () => boolean, attempts = 10) {
  for (let index = 0; index < attempts; index += 1) {
    await flush();
    if (check()) return;
  }

  throw new Error('조건이 충족되지 않았어요.');
}

async function cleanup(
  renderer: ReactTestRenderer.ReactTestRenderer,
  client: QueryClient,
) {
  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
  client.clear();
}

function mockWeatherCacheResponse(input: {
  forecast: Record<string, unknown>;
  airQuality: Record<string, unknown> | null;
  source?: 'fresh_cache' | 'provider' | 'stale_cache';
}) {
  fetchNuriWeatherV1.mockResolvedValue(
    projectWeatherV1({
      data: {
        airQuality: input.airQuality,
        forecast: {
          ...input.forecast,
          current: {
            ...(input.forecast.current as Record<string, unknown>),
            time: new Date().toISOString(),
          },
        },
      },
      airQuality: input.airQuality,
      attribution: {
        label: 'Open-Meteo',
        url: 'https://open-meteo.com/',
      },
      coordBucket: 'v1:37.68:126.76:d0.02',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      fallbackReason: null,
      fetchedAt: new Date().toISOString(),
      forecast: {
        ...input.forecast,
        current: {
          ...(input.forecast.current as Record<string, unknown>),
          time: new Date().toISOString(),
        },
      },
      source: input.source ?? 'provider',
      staleUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      warning: null,
    }),
  );
}

function initialWeather(
  scenario: Parameters<typeof buildWeatherGuideBundleForScenario>[0],
  district: string,
) {
  return {
    ...buildWeatherGuideBundleForScenario(scenario, district),
    coordBucket: 'v1:37.68:126.76:d0.02',
    fetchedAt: new Date().toISOString(),
    forecastValidAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    staleUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

describe('useWeatherGuide', () => {
  const coords = { latitude: 37.674, longitude: 126.769, accuracy: 10 };

  beforeEach(() => {
    latestState = null;
    mockWeatherFocused = true;
    jest.clearAllMocks();
    jest.spyOn(dateUtils, 'getKstYmd').mockReturnValue('2026-03-09');
    useWeatherStore.setState({ byCoordsKey: {}, currentSnapshot: null });
  });

  afterEach(() => jest.restoreAllMocks());

  it('polls only visible foreground screens and expires an old successful result after failures', async () => {
    jest.useFakeTimers();
    const start = Date.now();
    let onState: ((state: AppStateStatus) => void) | undefined;
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        onState = listener;
        return { remove: jest.fn() };
      });
    useCurrentLocation.mockImplementation(() => ({
      loading: false,
      permission: 'granted',
      coordinates: { ...coords, source: 'gps', capturedAt: Date.now() },
      isFresh: true,
      isStale: false,
      error: null,
      refresh: jest.fn(async () => ({
        ...coords,
        source: 'gps',
        capturedAt: Date.now(),
      })),
    }));
    useDistrict.mockReturnValue({
      loading: false,
      district: '일산3동',
      error: null,
    });
    mockWeatherCacheResponse({
      forecast: { current: { temperature_2m: 18, weather_code: 0 } },
      airQuality: null,
    });
    const client = createClient();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
      await jest.advanceTimersByTimeAsync(1);
    });
    await ReactTestRenderer.act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(latestState?.bundle.dataSource).toBe('live');
    const initialCalls = fetchNuriWeatherV1.mock.calls.length;
    await ReactTestRenderer.act(async () => {
      await jest.advanceTimersByTimeAsync(4 * 60000);
    });
    expect(fetchNuriWeatherV1).toHaveBeenCalledTimes(initialCalls);
    await ReactTestRenderer.act(async () => {
      await jest.advanceTimersByTimeAsync(60000);
    });
    await ReactTestRenderer.act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(fetchNuriWeatherV1.mock.calls.length).toBeGreaterThan(initialCalls);
    const foregroundCalls = fetchNuriWeatherV1.mock.calls.length;
    mockWeatherFocused = false;
    await ReactTestRenderer.act(async () => {
      renderer.update(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
    });
    await ReactTestRenderer.act(async () => {
      await jest.advanceTimersByTimeAsync(5 * 60000);
    });
    expect(fetchNuriWeatherV1).toHaveBeenCalledTimes(foregroundCalls);
    mockWeatherFocused = true;
    await ReactTestRenderer.act(async () => {
      renderer.update(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
      await jest.advanceTimersByTimeAsync(1);
    });
    const refocusedCalls = fetchNuriWeatherV1.mock.calls.length;
    await ReactTestRenderer.act(async () => {
      onState?.('background');
    });
    await ReactTestRenderer.act(async () => {
      await jest.advanceTimersByTimeAsync(10 * 60000);
    });
    expect(fetchNuriWeatherV1).toHaveBeenCalledTimes(refocusedCalls);
    fetchNuriWeatherV1.mockRejectedValue(new Error('offline'));
    await ReactTestRenderer.act(async () => {
      onState?.('active');
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(latestState?.bundle.dataSource).toBe('preview');
    await ReactTestRenderer.act(async () => {
      jest.setSystemTime(start + 61 * 60000);
      await jest.advanceTimersByTimeAsync(30000);
    });
    expect(latestState?.bundle.dataSource).toBe('unavailable');
    await cleanup(renderer, client);
    jest.useRealTimers();
  });

  it('위치와 API가 정상일 때 실제 날씨 번들을 반환한다', async () => {
    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'granted',
      coordinates: coords,
      source: 'gps',
      isFresh: true,
      isStale: false,
      lastUpdatedAt: Date.now(),
      error: null,
      refresh: jest.fn(),
    });
    useDistrict.mockReturnValue({
      loading: false,
      district: '일산3동',
      source: 'kakao',
      error: null,
    });
    mockWeatherCacheResponse({
      forecast: {
        current: {
          temperature_2m: -2.1,
          apparent_temperature: -5.2,
          weather_code: 3,
          relative_humidity_2m: 61,
          wind_speed_10m: 3.4,
          cloud_cover: 68,
        },
        daily: {
          time: ['2026-03-09'],
          weather_code: [3],
          temperature_2m_max: [7],
          temperature_2m_min: [-2],
          sunrise: ['2026-03-09T06:43:00+09:00'],
          sunset: ['2026-03-09T18:27:00+09:00'],
          uv_index_max: [3.2],
          precipitation_probability_max: [8],
        },
      },
      airQuality: {
        current: {
          pm10: 93,
          pm2_5: 24,
          ozone: 0.02,
        },
      },
    });

    const client = createClient();

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness initialDistrict="현재 위치" />
        </QueryClientProvider>,
      );
    });
    await waitFor(() => latestState?.bundle.dataSource === 'live');

    expect(latestState?.bundle.dataSource).toBe('live');
    expect(latestState?.bundle.district).toBe('일산3동');
    expect(latestState?.bundle.currentTemperature).toBe(-2);
    expect(latestState?.bundle.airQualityMetrics.length).toBeGreaterThan(0);
    expect(latestState?.error).toBeNull();

    await cleanup(renderer!, client);
  });

  it('위치 권한이 거부되면 unavailable 상태를 반환한다', async () => {
    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'denied',
      coordinates: null,
      source: null,
      isFresh: false,
      isStale: false,
      lastUpdatedAt: null,
      error: '위치 권한이 없어 현재 지역을 불러오지 못했어요.',
      refresh: jest.fn(),
    });
    useDistrict.mockReturnValue({
      loading: false,
      district: null,
      source: null,
      error: '위치 권한이 없어 현재 지역을 불러오지 못했어요.',
    });

    const client = createClient();

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness initialDistrict="현재 위치" />
        </QueryClientProvider>,
      );
    });
    await flush();

    expect(latestState?.bundle.dataSource).toBe('unavailable');
    expect(latestState?.bundle.currentTemperature).toBe(0);
    expect(latestState?.bundle.weekly).toEqual([]);
    expect(latestState?.error).toContain('위치 권한');

    await cleanup(renderer!, client);
  });

  it('초기 live 번들이 있고 API가 실패하면 기존 번들을 preview로 유지한다', async () => {
    const initialBundle = initialWeather('dusty', '일산3동');

    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'granted',
      coordinates: coords,
      source: 'gps',
      isFresh: true,
      isStale: false,
      lastUpdatedAt: Date.now(),
      error: null,
      refresh: jest.fn(),
    });
    useDistrict.mockReturnValue({
      loading: false,
      district: '일산3동',
      source: 'kakao',
      error: null,
    });
    fetchNuriWeatherV1.mockRejectedValue(
      new Error('날씨 정보를 불러오지 못했어요.'),
    );

    const client = createClient();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness initialDistrict="일산3동" initialBundle={initialBundle} />
        </QueryClientProvider>,
      );
    });

    await waitFor(
      () => latestState?.error === '날씨 정보를 불러오지 못했어요.',
    );

    expect(latestState?.bundle.dataSource).toBe('preview');
    expect(latestState?.bundle.currentTemperature).toBe(
      initialBundle.currentTemperature,
    );
    expect(latestState?.error).toBe('날씨 정보를 불러오지 못했어요.');

    await cleanup(renderer!, client);
  });

  it('캐시/초기 번들이 있으면 preview로 표시하다가 API 성공 후 live로 전환한다', async () => {
    const initialBundle = initialWeather('fresh', '서초동');

    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'granted',
      coordinates: coords,
      source: 'gps',
      isFresh: true,
      isStale: false,
      lastUpdatedAt: Date.now(),
      error: null,
      refresh: jest.fn(),
    });
    useDistrict.mockReturnValue({
      loading: false,
      district: '서초동',
      source: 'kakao',
      error: null,
    });
    mockWeatherCacheResponse({
      forecast: {
        current: {
          temperature_2m: 21.1,
          apparent_temperature: 22.4,
          weather_code: 1,
          relative_humidity_2m: 41,
          wind_speed_10m: 1.6,
          cloud_cover: 8,
        },
        daily: {
          time: ['2026-03-09'],
          weather_code: [1],
          temperature_2m_max: [24],
          temperature_2m_min: [14],
          sunrise: ['2026-03-09T06:43:00+09:00'],
          sunset: ['2026-03-09T18:27:00+09:00'],
          uv_index_max: [4.1],
          precipitation_probability_max: [4],
        },
      },
      airQuality: {
        current: {
          pm10: 12,
          pm2_5: 5,
          ozone: 0.02,
        },
      },
    });

    const client = createClient();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness initialDistrict="서초동" initialBundle={initialBundle} />
        </QueryClientProvider>,
      );
    });

    expect(latestState?.bundle.dataSource).toBe('preview');
    expect(latestState?.isPreview).toBe(true);

    await waitFor(() => latestState?.bundle.dataSource === 'live');

    expect(latestState?.bundle.dataSource).toBe('live');
    expect(latestState?.isPreview).toBe(false);
    expect(latestState?.bundle.currentTemperature).toBe(21);

    await cleanup(renderer!, client);
  });

  it('대기질 응답이 실패해도 예보 응답만으로 live 날씨와 주간 예보를 갱신한다', async () => {
    const initialBundle = initialWeather('fresh', '서초동');

    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'granted',
      coordinates: coords,
      source: 'gps',
      isFresh: true,
      isStale: false,
      lastUpdatedAt: Date.now(),
      error: null,
      refresh: jest.fn(),
    });
    useDistrict.mockReturnValue({
      loading: false,
      district: '서초동',
      source: 'kakao',
      error: null,
    });
    mockWeatherCacheResponse({
      forecast: {
        current: {
          temperature_2m: 19.2,
          apparent_temperature: 20.1,
          weather_code: 1,
          relative_humidity_2m: 44,
          wind_speed_10m: 2.1,
          cloud_cover: 10,
        },
        daily: {
          time: ['2026-03-09', '2026-03-10'],
          weather_code: [1, 2],
          temperature_2m_max: [21, 22],
          temperature_2m_min: [12, 13],
          sunrise: ['2026-03-09T06:43:00+09:00', '2026-03-10T06:41:00+09:00'],
          sunset: ['2026-03-09T18:27:00+09:00', '2026-03-10T18:28:00+09:00'],
          uv_index_max: [4.1, 4.4],
          precipitation_probability_max: [4, 8],
        },
      },
      airQuality: null,
    });

    const client = createClient();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness initialDistrict="서초동" initialBundle={initialBundle} />
        </QueryClientProvider>,
      );
    });

    await waitFor(() => latestState?.bundle.dataSource === 'live');

    expect(latestState?.bundle.dataSource).toBe('live');
    expect(latestState?.bundle.currentTemperature).toBe(19);
    expect(latestState?.bundle.weekly).toHaveLength(2);
    expect(latestState?.error).toBeNull();

    await cleanup(renderer!, client);
  });
});
