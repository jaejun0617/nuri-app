import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useWeatherGuide, type WeatherGuideState } from '../src/hooks/useWeatherGuide';
import { buildWeatherGuideBundleForScenario } from '../src/services/weather/guide';
import { useWeatherStore } from '../src/store/weatherStore';

jest.mock('../src/hooks/useCurrentLocation', () => ({
  useCurrentLocation: jest.fn(),
}));

jest.mock('../src/hooks/useDistrict', () => ({
  useDistrict: jest.fn(),
}));

jest.mock('../src/services/weather/api', () => ({
  fetchOpenMeteoForecast: jest.fn(),
  fetchOpenMeteoAirQuality: jest.fn(),
}));

jest.mock('../src/services/weather/cache', () => ({
  loadCachedWeatherGuideBundle: jest.fn(() => Promise.resolve(null)),
  saveCachedWeatherGuideBundle: jest.fn(() => Promise.resolve()),
}));

const { useCurrentLocation } = jest.requireMock('../src/hooks/useCurrentLocation') as {
  useCurrentLocation: jest.Mock;
};
const { useDistrict } = jest.requireMock('../src/hooks/useDistrict') as {
  useDistrict: jest.Mock;
};
const {
  fetchOpenMeteoForecast,
  fetchOpenMeteoAirQuality,
} = jest.requireMock('../src/services/weather/api') as {
  fetchOpenMeteoForecast: jest.Mock;
  fetchOpenMeteoAirQuality: jest.Mock;
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

describe('useWeatherGuide', () => {
  const coords = { latitude: 37.674, longitude: 126.769, accuracy: 10 };

  beforeEach(() => {
    latestState = null;
    jest.clearAllMocks();
    useWeatherStore.setState({ byCoordsKey: {} });
  });

  it('위치와 API가 정상일 때 실제 날씨 번들을 반환한다', async () => {
    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'granted',
      coordinates: coords,
      error: null,
      refresh: jest.fn(),
    });
    useDistrict.mockReturnValue({
      loading: false,
      district: '일산3동',
      source: 'kakao',
      error: null,
    });
    fetchOpenMeteoForecast.mockResolvedValue({
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
    });
    fetchOpenMeteoAirQuality.mockResolvedValue({
      current: {
        pm10: 93,
        pm2_5: 24,
        ozone: 0.02,
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

  it('초기 live 번들이 있어도 API 실패가 확정되면 unavailable 상태로 내려간다', async () => {
    const initialBundle = buildWeatherGuideBundleForScenario('dusty', '일산3동');

    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'granted',
      coordinates: coords,
      error: null,
      refresh: jest.fn(),
    });
    useDistrict.mockReturnValue({
      loading: false,
      district: '일산3동',
      source: 'kakao',
      error: null,
    });
    fetchOpenMeteoForecast.mockRejectedValue(new Error('날씨 정보를 불러오지 못했어요.'));
    fetchOpenMeteoAirQuality.mockResolvedValue({
      current: {
        pm10: 10,
        pm2_5: 5,
        ozone: 0.01,
      },
    });

    const client = createClient();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness initialDistrict="일산3동" initialBundle={initialBundle} />
        </QueryClientProvider>,
      );
    });

    await waitFor(() => latestState?.bundle.dataSource === 'unavailable');

    expect(latestState?.bundle.dataSource).toBe('unavailable');
    expect(latestState?.bundle.currentTemperature).toBe(0);
    expect(latestState?.error).toBe('날씨 정보를 불러오지 못했어요.');

    await cleanup(renderer!, client);
  });

  it('캐시/초기 번들이 있으면 preview로 표시하다가 API 성공 후 live로 전환한다', async () => {
    const initialBundle = buildWeatherGuideBundleForScenario('fresh', '서초동');

    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'granted',
      coordinates: coords,
      error: null,
      refresh: jest.fn(),
    });
    useDistrict.mockReturnValue({
      loading: false,
      district: '서초동',
      source: 'kakao',
      error: null,
    });
    fetchOpenMeteoForecast.mockResolvedValue({
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
    });
    fetchOpenMeteoAirQuality.mockResolvedValue({
      current: {
        pm10: 12,
        pm2_5: 5,
        ozone: 0.02,
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
});
