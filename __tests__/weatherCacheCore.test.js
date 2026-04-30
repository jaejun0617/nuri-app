import {
  createCoordBucket,
  resolveWeatherCache,
  WeatherCacheHttpError,
} from '../supabase/functions/_shared/weather-cache-core.js';

const NOW = new Date('2026-04-29T03:00:00.000Z');
const FORECAST = {
  current: {
    temperature_2m: 18,
    apparent_temperature: 18,
    weather_code: 1,
    relative_humidity_2m: 42,
    wind_speed_10m: 1.8,
    cloud_cover: 12,
  },
  daily: {
    time: ['2026-04-29'],
    weather_code: [1],
    temperature_2m_max: [21],
    temperature_2m_min: [12],
    sunrise: ['2026-04-29T05:40:00+09:00'],
    sunset: ['2026-04-29T19:12:00+09:00'],
    uv_index_max: [5],
    precipitation_probability_max: [10],
  },
};
const AIR_QUALITY = {
  current: {
    pm10: 18,
    pm2_5: 8,
    ozone: 0.02,
  },
};

function createCacheRow(overrides = {}) {
  const coordBucket = 'v1:37.68:126.76:d0.02';
  return {
    air_quality_payload: AIR_QUALITY,
    combined_payload: {
      airQuality: AIR_QUALITY,
      coordBucket,
      forecast: FORECAST,
      provider: 'open-meteo',
    },
    coord_bucket: coordBucket,
    expires_at: '2026-04-29T03:30:00.000Z',
    fetched_at: '2026-04-29T02:30:00.000Z',
    forecast_payload: FORECAST,
    locale: 'ko-KR|Asia/Seoul',
    provider: 'open-meteo',
    stale_until: '2026-04-29T08:30:00.000Z',
    ...overrides,
  };
}

function createCache(row) {
  return {
    find: jest.fn(() => Promise.resolve(row)),
    upsert: jest.fn(input =>
      Promise.resolve(
        createCacheRow({
          air_quality_payload: input.airQualityPayload,
          combined_payload: input.combinedPayload,
          coord_bucket: input.coordBucket,
          expires_at: input.expiresAt,
          fetched_at: input.fetchedAt,
          forecast_payload: input.forecastPayload,
          locale: input.locale,
          provider: input.provider,
          stale_until: input.staleUntil,
        }),
      ),
    ),
  };
}

describe('weather-cache core', () => {
  const body = {
    latitude: 37.674,
    longitude: 126.769,
    locale: 'ko-KR',
    timezone: 'Asia/Seoul',
  };

  it('0.02도 좌표 bucket을 생성한다', () => {
    const bucket = createCoordBucket(body);

    expect(bucket).toEqual({
      key: 'v1:37.68:126.76:d0.02',
      latitude: 37.68,
      longitude: 126.76,
      sizeDegrees: 0.02,
    });
  });

  it('fresh cache hit이면 provider를 호출하지 않는다', async () => {
    const cache = createCache(createCacheRow());
    const provider = { fetchBundle: jest.fn() };

    const result = await resolveWeatherCache({
      body,
      cache,
      now: NOW,
      provider,
    });

    expect(result.source).toBe('fresh_cache');
    expect(provider.fetchBundle).not.toHaveBeenCalled();
    expect(cache.upsert).not.toHaveBeenCalled();
  });

  it('cache miss이면 forecast와 air quality bundle을 upsert한다', async () => {
    const cache = createCache(null);
    const provider = {
      fetchBundle: jest.fn(() =>
        Promise.resolve({
          airQuality: AIR_QUALITY,
          forecast: FORECAST,
          warning: null,
        }),
      ),
    };

    const result = await resolveWeatherCache({
      body,
      cache,
      now: NOW,
      provider,
    });

    expect(result.source).toBe('provider');
    expect(provider.fetchBundle).toHaveBeenCalledTimes(1);
    expect(cache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        airQualityPayload: AIR_QUALITY,
        coordBucket: 'v1:37.68:126.76:d0.02',
        forecastPayload: FORECAST,
      }),
    );
    expect(result.data.airQuality).toEqual(AIR_QUALITY);
  });

  it('provider 실패와 stale cache가 함께 있으면 stale_cache로 반환한다', async () => {
    const cache = createCache(
      createCacheRow({
        expires_at: '2026-04-29T02:59:00.000Z',
        stale_until: '2026-04-29T08:30:00.000Z',
      }),
    );
    const provider = {
      fetchBundle: jest.fn(() =>
        Promise.reject(
          new WeatherCacheHttpError(
            502,
            'weather_forecast_provider_failed',
            'forecast failed',
          ),
        ),
      ),
    };

    const result = await resolveWeatherCache({
      body,
      cache,
      now: NOW,
      provider,
    });

    expect(result.source).toBe('stale_cache');
    expect(result.fallbackReason).toBe('weather_forecast_provider_failed');
    expect(cache.upsert).not.toHaveBeenCalled();
  });

  it('provider 실패와 stale cache가 없으면 stable error code를 던진다', async () => {
    const cache = createCache(null);
    const provider = {
      fetchBundle: jest.fn(() => Promise.reject(new Error('network down'))),
    };

    await expect(
      resolveWeatherCache({
        body,
        cache,
        now: NOW,
        provider,
      }),
    ).rejects.toMatchObject({
      code: 'weather_provider_unavailable',
      status: 503,
    });
  });
});
