import {
  fetchWeatherCacheBundle,
  WEATHER_CACHE_FUNCTION_NAME,
} from '../src/services/weather/legacy';
import {
  WEATHER_FOCUS_REFRESH_MS,
  WEATHER_PREVIEW_MAX_AGE_MS,
  WEATHER_QUERY_STALE_MS,
} from '../src/services/weather/policy';

jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    functions: {
      invoke: jest.Mock;
    };
  };
};

describe('weather-cache client service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('weather-cache Edge Function을 호출하고 Open-Meteo direct fetch는 호출하지 않는다', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    supabase.functions.invoke.mockResolvedValue({
      data: {
        ok: true,
        attribution: {
          label: 'Open-Meteo',
          url: 'https://open-meteo.com/',
        },
        coordBucket: 'v1:37.68:126.76:d0.02',
        data: {
          airQuality: {
            current: {
              pm10: 12,
              pm2_5: 4,
              ozone: 0.02,
            },
          },
          forecast: {
            current: {
              temperature_2m: 18,
              apparent_temperature: 18,
              weather_code: 1,
              relative_humidity_2m: 42,
              wind_speed_10m: 1.2,
              cloud_cover: 10,
            },
          },
        },
        expiresAt: '2026-04-29T04:00:00.000Z',
        fetchedAt: '2026-04-29T03:00:00.000Z',
        source: 'provider',
        staleUntil: '2026-04-29T09:00:00.000Z',
      },
      error: null,
    });

    const result = await fetchWeatherCacheBundle({
      latitude: 37.674,
      longitude: 126.769,
      accuracy: 10,
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      WEATHER_CACHE_FUNCTION_NAME,
      {
        body: {
          latitude: 37.674,
          longitude: 126.769,
          locale: 'ko-KR',
          timezone: 'Asia/Seoul',
        },
        timeout: 8500,
      },
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.source).toBe('provider');
    expect(result.coordBucket).toBe('v1:37.68:126.76:d0.02');

    global.fetch = originalFetch;
  });

  it('rejects a response for a different region', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: { ok: true, coordBucket: 'v1:35.00:129.00:d0.02' },
      error: null,
    });
    await expect(
      fetchWeatherCacheBundle({
        latitude: 37.674,
        longitude: 126.769,
        accuracy: 10,
      }),
    ).rejects.toMatchObject({ code: 'weather_cache_region_mismatch' });
  });

  it('checks foreground weather every thirty minutes with a bounded one-hour preview', () => {
    expect(WEATHER_QUERY_STALE_MS).toBe(30 * 60 * 1000);
    expect(WEATHER_FOCUS_REFRESH_MS).toBe(30 * 60 * 1000);
    expect(WEATHER_PREVIEW_MAX_AGE_MS).toBe(60 * 60 * 1000);
  });
});
