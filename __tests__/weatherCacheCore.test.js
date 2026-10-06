import {
  createCoordBucket,
  resolveWeatherCache,
  WeatherCacheHttpError,
  buildOpenMeteoUrl,
  buildWeatherCacheTimes,
  isFreshCacheRow,
} from '../supabase/functions/_shared/weather-cache-core.js';

const NOW = new Date('2026-04-29T03:00:00.000Z');
const FORECAST = {
  current: {
    time: '2026-04-29T12:00',
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
      contractVersion: 2,
      airQuality: AIR_QUALITY,
      coordBucket,
      forecast: FORECAST,
      provider: 'open-meteo',
    },
    coord_bucket: coordBucket,
    expires_at: '2026-04-29T03:30:00.000Z',
    fetched_at: '2026-04-29T02:55:00.000Z',
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
  it('keeps the 30-minute fresh boundary exclusive and never extends old rows', () => {
    const times = buildWeatherCacheTimes(NOW);
    const row = createCacheRow({
      fetched_at: times.fetchedAt,
      expires_at: times.expiresAt,
    });
    expect(isFreshCacheRow(row, new Date(NOW.getTime() + 30 * 60000 - 1))).toBe(
      true,
    );
    expect(isFreshCacheRow(row, new Date(NOW.getTime() + 30 * 60000))).toBe(
      false,
    );
    expect(
      isFreshCacheRow(
        {
          ...row,
          expires_at: new Date(NOW.getTime() + 15 * 60000).toISOString(),
        },
        new Date(NOW.getTime() + 15 * 60000),
      ),
    ).toBe(false);
  });

  it('refreshes legacy payloads even if their old TTL remains fresh', async () => {
    const row = createCacheRow();
    delete row.combined_payload.contractVersion;
    const provider = {
      fetchBundle: jest.fn(async () => ({
        forecast: FORECAST,
        airQuality: null,
      })),
    };
    const result = await resolveWeatherCache({
      body,
      cache: createCache(row),
      provider,
      now: NOW,
    });
    expect(result.source).toBe('provider');
    expect(Date.parse(result.expiresAt) - Date.parse(result.fetchedAt)).toBe(
      30 * 60 * 1000,
    );
    expect(Date.parse(result.staleUntil) - Date.parse(result.fetchedAt)).toBe(
      60 * 60 * 1000,
    );
  });
  it('does not revive hour-old fallback data using an old six-hour limit', async () => {
    await expect(
      resolveWeatherCache({
        body,
        cache: createCache(
          createCacheRow({ fetched_at: '2026-04-29T01:59:00Z' }),
        ),
        provider: {
          fetchBundle: async () => {
            throw new Error('offline');
          },
        },
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: 'weather_provider_unavailable' });
  });
  it.each([undefined, '2026-04-29T10:59', '2026-04-29T12:10'])(
    'rejects absent/stale/future model time %s',
    async time => {
      await expect(
        resolveWeatherCache({
          body,
          cache: createCache(null),
          provider: {
            fetchBundle: async () => ({
              forecast: { ...FORECAST, current: { ...FORECAST.current, time } },
            }),
          },
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: 'weather_forecast_invalid' });
    },
  );
  it('deduplicates simultaneous provider misses within one isolate', async () => {
    const inFlight = new Map();
    const provider = {
      fetchBundle: jest.fn(async () => ({
        forecast: FORECAST,
        airQuality: null,
      })),
    };
    const cache = createCache(null);
    await Promise.all(
      [1, 2, 3].map(() =>
        resolveWeatherCache({ body, cache, provider, now: NOW, inFlight }),
      ),
    );
    expect(provider.fetchBundle).toHaveBeenCalledTimes(1);
    expect(cache.upsert).toHaveBeenCalledTimes(1);
    expect(inFlight.size).toBe(0);
  });
  it('requests hourly probability and amount without forcing a model', () => {
    const url = buildOpenMeteoUrl({
      baseUrl: 'https://api.open-meteo.com/v1/forecast',
      coordBucket: createCoordBucket(body),
      timezone: 'Asia/Seoul',
      kind: 'forecast',
    });
    expect(url.searchParams.get('hourly')).toBe(
      'precipitation_probability,precipitation',
    );
    expect(url.searchParams.get('models')).toBeNull();
  });

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
