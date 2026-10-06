import {
  normalizeApiRequest,
  projectWeatherV1,
  selectMeasurement,
  unavailableWeatherV1,
  validateWarning,
  validateNowcast,
} from '../supabase/functions/_shared/weather-api-domain';
import { coordinateWeather } from '../supabase/functions/_shared/weather-api-coordinator';
import { createOpenMeteoAdapter } from '../supabase/functions/_shared/weather-provider-open-meteo';
import {
  buildCombinedWeatherPayload,
  buildWeatherCacheTimes,
} from '../supabase/functions/_shared/weather-cache-core';

const now = new Date('2026-10-05T14:50:00Z');
const body = { latitude: 37.674, longitude: 126.769 };
const request = normalizeApiRequest(body);
const forecast = () => ({
  current_units: { wind_speed_10m: 'km/h' },
  current: {
    time: now.toISOString(),
    temperature_2m: 12,
    weather_code: 0,
    apparent_temperature: 10,
    relative_humidity_2m: 82,
    wind_speed_10m: 7.2,
    cloud_cover: 0,
  },
  hourly_units: { precipitation_probability: '%', precipitation: 'mm' },
  hourly: {
    time: ['2026-10-06T00:00', '2026-10-06T01:00'],
    precipitation_probability: [0, null],
    precipitation: [0, null],
  },
  daily: {
    time: ['2026-10-05', '2026-10-06'],
    weather_code: [0, 1],
    temperature_2m_max: [19, 20],
    temperature_2m_min: [11, 9],
    precipitation_probability_max: [84, 0],
    uv_index_max: [5.1, 0],
    sunrise: ['2026-10-05T06:31'],
    sunset: ['2026-10-05T18:10'],
  },
});
function row(date = now) {
  const times = buildWeatherCacheTimes(date);
  return {
    provider: 'open-meteo',
    coord_bucket: request.bucket.key,
    locale: 'ko-KR|Asia/Seoul',
    fetched_at: times.fetchedAt,
    expires_at: times.expiresAt,
    stale_until: times.staleUntil,
    combined_payload: buildCombinedWeatherPayload({
      forecast: forecast(),
      airQuality: null,
      coordBucket: request.bucket,
      timezone: 'Asia/Seoul',
    }),
  };
}
const response = r => ({
  data: r.combined_payload,
  coordBucket: r.coord_bucket,
  source: 'fresh_cache',
  fetchedAt: r.fetched_at,
  expiresAt: r.expires_at,
  staleUntil: r.stale_until,
});
describe('NURI weather v1 domain', () => {
  it.each([
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: 181 },
    { latitude: '37.1', longitude: 0 },
    { latitude: NaN, longitude: 0 },
    { ...body, timezone: 'UTC' },
    { ...body, provider: 'other' },
  ])('rejects impossible or undeclared input %j', input => {
    expect(() => normalizeApiRequest(input)).toThrow();
  });
  it('retains only a coarse location and preserves 0 versus missing values', () => {
    const data = projectWeatherV1(response(row()), now.getTime());
    expect(data.location.key).toBe('v1:37.68:126.76:d0.02');
    expect(JSON.stringify(data)).not.toContain('37.674');
    expect(data.current.windSpeed.value).toBe(2);
    expect(data.current.temperature.meta).toMatchObject({
      kind: 'FORECAST',
      issuedAt: null,
      validAt: now.toISOString(),
      retrievedAt: now.toISOString(),
    });
    expect(data.hourly.map(h => h.precipitationProbability.value)).toEqual([
      0,
      null,
    ]);
    expect(data.hourly.map(h => h.precipitationAmount.value)).toEqual([
      0,
      null,
    ]);
    expect(data.hourly[0]).toMatchObject({
      startsAt: '2026-10-05T14:00:00.000Z',
      endsAt: '2026-10-05T15:00:00.000Z',
    });
    expect(data.sun[0].sunrise.value).toBe('2026-10-04T21:31:00.000Z');
  });
  it('does not fabricate warnings, radar, observed air or clean air', () => {
    const data = projectWeatherV1(response(row()), now.getTime());
    expect(data.warnings).toEqual({ availability: 'unavailable', items: [] });
    expect(data.nowcast).toEqual({ availability: 'unavailable', items: [] });
    expect(data.airQuality.pm10.value).toBeNull();
    expect(data.sources.filter(s => s.state === 'READY_INACTIVE')).toHaveLength(
      4,
    );
    expect(
      validateWarning({
        id: 'model',
        title: 'rain',
        meta: { kind: 'FORECAST' },
      }),
    ).toBe(false);
    expect(
      validateNowcast({ precipitationMm: 0, meta: { kind: 'FORECAST' } }),
    ).toBe(false);
  });
  it('rejects expired cache and preserves stale original timestamps', () => {
    const previous = row(new Date(now.getTime() - 20 * 60000));
    const data = projectWeatherV1(
      { ...response(previous), source: 'stale_cache' },
      now.getTime(),
    );
    expect(data.freshness.state).toBe('STALE_SAFE');
    expect(data.freshness.retrievedAt).toBe(previous.fetched_at);
    expect(() =>
      projectWeatherV1(
        response(row(new Date(now.getTime() - 61 * 60000))),
        now.getTime(),
      ),
    ).toThrow();
    expect(unavailableWeatherV1(request.bucket, 'timeout').current).toBeNull();
  });
  it('keeps valid current weather when optional time arrays are malformed', () => {
    const cached = row();
    cached.combined_payload.forecast.hourly.time = {};
    cached.combined_payload.forecast.daily.time = null;
    const data = projectWeatherV1(response(cached), now.getTime());
    expect(data.current.temperature.value).toBe(12);
    expect(data.hourly).toEqual([]);
    expect(data.daily).toEqual([]);
  });
  it('uses source priority, never averaging an observation and model', () => {
    const model = projectWeatherV1(response(row()), now.getTime()).current
      .temperature;
    const observation = {
      ...model,
      value: 17,
      meta: { ...model.meta, kind: 'OBSERVED' },
    };
    expect(
      selectMeasurement(
        [model, observation],
        ['OBSERVED', 'FORECAST'],
        now.getTime(),
      ),
    ).toBe(observation);
    expect(
      selectMeasurement(
        [
          {
            ...observation,
            meta: { ...observation.meta, quality: 'UNAVAILABLE' },
          },
          model,
        ],
        ['OBSERVED', 'FORECAST'],
        now.getTime(),
      ),
    ).toBe(model);
  });
});

describe('distributed coordination and fallback', () => {
  function setup(initial = null) {
    let stored = initial,
      owner = null;
    const cache = {
      find: jest.fn(async () => stored),
      upsert: jest.fn(async input => {
        stored = {
          coord_bucket: input.coordBucket,
          combined_payload: input.combinedPayload,
          fetched_at: input.fetchedAt,
          expires_at: input.expiresAt,
          stale_until: input.staleUntil,
        };
        return stored;
      }),
    };
    const operations = {
      acquire: jest.fn(async (_key, id) => {
        if (owner) return false;
        owner = id;
        return true;
      }),
      release: jest.fn(async (_key, id) => {
        if (owner === id) owner = null;
      }),
    };
    const provider = {
      fetchBundle: jest.fn(async () => ({
        forecast: forecast(),
        airQuality: null,
      })),
    };
    const args = {
      body,
      cache,
      operations,
      provider,
      emit: jest.fn(),
      now,
      owner: 'owner-1',
      sleep: () => new Promise(resolve => setTimeout(resolve, 1)),
      inFlight: new Map(),
    };
    return { args, cache, operations, provider };
  }
  it('16 requests across independent isolates share one provider bundle', async () => {
    const { args, provider, operations } = setup();
    const results = await Promise.all(
      Array.from({ length: 16 }, (_, i) =>
        coordinateWeather({
          ...args,
          owner: `owner-${i}`,
          inFlight: new Map(),
        }),
      ),
    );
    expect(results).toHaveLength(16);
    expect(provider.fetchBundle).toHaveBeenCalledTimes(1);
    expect(operations.release).toHaveBeenCalledTimes(1);
    expect(new Set(results.map(r => r.fetchedAt)).size).toBe(1);
  });
  it('preserves safe stale cache on failure, but never serves expired data', async () => {
    const safe = setup(row(new Date(now.getTime() - 35 * 60000)));
    safe.provider.fetchBundle.mockRejectedValue(new Error('failure'));
    expect((await coordinateWeather(safe.args)).source).toBe('stale_cache');
    expect(safe.operations.release).toHaveBeenCalledTimes(1);
    const expired = setup(row(new Date(now.getTime() - 61 * 60000)));
    expired.provider.fetchBundle.mockRejectedValue(new Error('failure'));
    await expect(coordinateWeather(expired.args)).rejects.toThrow();
  });
  it('fails closed without a lease, and never bypasses a busy distributed owner', async () => {
    const { args, provider, operations } = setup();
    operations.acquire.mockResolvedValue(false);
    await expect(coordinateWeather(args)).rejects.toMatchObject({
      code: 'weather_refresh_in_progress',
    });
    expect(provider.fetchBundle).not.toHaveBeenCalled();
    expect(operations.release).not.toHaveBeenCalled();
  });
  it('rejects a mismatched shared row', async () => {
    const { args, provider } = setup({ ...row(), coord_bucket: 'different' });
    await expect(coordinateWeather(args)).rejects.toMatchObject({
      code: 'weather_region_mismatch',
    });
    expect(provider.fetchBundle).not.toHaveBeenCalled();
  });
});

describe('provider defenses', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });
  afterEach(() => jest.useRealTimers());
  const make = fetcher => {
    const operations = {
      health: jest.fn(async () => null),
      consume: jest.fn(async () => true),
      result: jest.fn(async () => {}),
    };
    const emit = jest.fn();
    return {
      operations,
      emit,
      adapter: createOpenMeteoAdapter({
        env: () => undefined,
        operations,
        emit,
        fetcher,
      }),
    };
  };
  it.each([429, 500])(
    'does not retry provider %i or leak provider URLs',
    async status => {
      const fetcher = jest.fn(async () => ({ ok: false, status }));
      const { adapter, emit } = make(fetcher);
      await expect(
        adapter.fetchBundle({
          coordBucket: request.bucket,
          timezone: 'Asia/Seoul',
        }),
      ).rejects.toThrow('weather provider unavailable');
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(emit).toHaveBeenCalledWith(
        'provider_request',
        1,
        'open-meteo-forecast',
      );
    },
  );
  it('respects circuit suppression and atomic budgets before any network call', async () => {
    const fetcher = jest.fn(),
      { adapter, operations } = make(fetcher);
    operations.health.mockResolvedValue({
      suppressed_until: new Date(Date.now() + 60000).toISOString(),
    });
    await expect(
      adapter.fetchBundle({
        coordBucket: request.bucket,
        timezone: 'Asia/Seoul',
      }),
    ).rejects.toMatchObject({ code: 'weather_provider_suppressed' });
    expect(fetcher).not.toHaveBeenCalled();
    operations.health.mockResolvedValue(null);
    operations.consume.mockResolvedValue(false);
    await expect(
      adapter.fetchBundle({
        coordBucket: request.bucket,
        timezone: 'Asia/Seoul',
      }),
    ).rejects.toMatchObject({ code: 'weather_provider_budget_exhausted' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('returns partial air quality without inventing values on malformed optional data', async () => {
    const fetcher = jest.fn(async url => ({
      ok: true,
      json: async () =>
        url.hostname.includes('air-quality') ? null : forecast(),
    }));
    const { adapter } = make(fetcher);
    const result = await adapter.fetchBundle({
      coordBucket: request.bucket,
      timezone: 'Asia/Seoul',
    });
    expect(result.airQuality).toBeNull();
    expect(result.warning).toBe('air_quality_unavailable');
  });
  it('cancels a hung provider at the bounded deadline', async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('abort'))),
        ),
    );
    const { adapter, emit } = make(fetcher);
    const promise = adapter.fetchBundle({
      coordBucket: request.bucket,
      timezone: 'Asia/Seoul',
    });
    const settled = promise.catch(error => error);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(6501);
    expect(await settled).toMatchObject({ code: 'weather_provider_timeout' });
    expect(emit).toHaveBeenCalledWith('timeout', 1, 'open-meteo-forecast');
    jest.useRealTimers();
  });
});
