import {
  fetchNuriWeatherV1,
  parseWeatherApiV1,
} from '../src/services/weather/api';
import { buildWeatherGuideBundleFromNuri } from '../src/services/weather/mapper';
const {
  projectWeatherV1,
} = require('../supabase/functions/_shared/weather-api-domain');
const {
  buildCombinedWeatherPayload,
  createCoordBucket,
  buildWeatherCacheTimes,
} = require('../supabase/functions/_shared/weather-cache-core');
jest.mock('../src/services/supabase/client', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));
const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: { functions: { invoke: jest.Mock } };
};
const coordinates = { latitude: 37.674, longitude: 126.769, accuracy: 10 };
function envelope() {
  const now = new Date(),
    times = buildWeatherCacheTimes(now),
    bucket = createCoordBucket(coordinates);
  return {
    ok: true,
    data: projectWeatherV1({
      source: 'provider',
      coordBucket: bucket.key,
      ...times,
      data: buildCombinedWeatherPayload({
        coordBucket: bucket,
        timezone: 'Asia/Seoul',
        airQuality: null,
        forecast: {
          current_units: { wind_speed_10m: 'm/s' },
          current: {
            time: now.toISOString(),
            temperature_2m: 12,
            weather_code: 0,
            wind_speed_10m: 2.2,
          },
          hourly_units: { precipitation_probability: '%', precipitation: 'mm' },
          hourly: {
            time: ['2026-10-06T00:00'],
            precipitation_probability: [0],
            precipitation: [0],
          },
          daily: {
            time: ['2026-10-05'],
            weather_code: [0],
            temperature_2m_max: [19],
            temperature_2m_min: [11],
            precipitation_probability_max: [84],
          },
        },
      }),
    }),
  };
}
describe('NURI v1 app contract', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T14:50:00Z'));
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());
  it('uses only the NURI endpoint and retains the approved display semantics', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: envelope(),
      error: null,
    });
    const weather = await fetchNuriWeatherV1(coordinates);
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'nuri-weather-v1',
      expect.objectContaining({ timeout: 15000 }),
    );
    const bundle = buildWeatherGuideBundleFromNuri({
      district: '일산3동',
      weather,
    });
    expect(bundle).toMatchObject({
      currentTemperature: 12,
      windSpeed: 2.2,
      scenario: 'fresh',
      dataSource: 'live',
      coordBucket: 'v1:37.68:126.76:d0.02',
    });
    expect(bundle.hourly?.[0]).toMatchObject({
      precipitationChance: 0,
      precipitationMm: 0,
    });
    expect(
      bundle.airQualityMetrics.every(m => m.valueLabel === '확인 중'),
    ).toBe(true);
    expect(bundle.detailHeadline).not.toContain('비 예보');
  });
  it.each(['region', 'version', 'unit', 'expired', 'timestamp'])(
    'rejects invalid %s without legacy fallback',
    reason => {
      const data = envelope();
      if (reason === 'region') data.data.location.key = 'wrong';
      if (reason === 'version') data.data.apiVersion = 'nuri.weather.v2';
      if (reason === 'unit') data.data.current.windSpeed.meta.unit = 'km/h';
      if (reason === 'expired')
        data.data.freshness.staleUntil = '2026-10-05T14:00:00Z';
      if (reason === 'timestamp')
        data.data.current.temperature.meta.validAt = '2026-02-30T10:00:00Z';
      expect(() => parseWeatherApiV1(data, coordinates)).toThrow();
    },
  );
  it('keeps missing optional measurements distinct from zero', () => {
    const data = envelope();
    data.data.hourly[0].precipitationProbability.value = null;
    data.data.hourly[0].precipitationProbability.meta.quality = 'UNAVAILABLE';
    const weather = parseWeatherApiV1(data, coordinates);
    const bundle = buildWeatherGuideBundleFromNuri({
      district: '일산3동',
      weather,
    });
    expect(bundle.hourly?.[0].precipitationChance).toBeNull();
    expect(bundle.hourly?.[0].precipitationMm).toBe(0);
    expect(bundle.missingMeasurements).toContain('humidity');
  });
  it('does not silently switch endpoints on a v1 failure', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: new Error('offline'),
    });
    await expect(fetchNuriWeatherV1(coordinates)).rejects.toMatchObject({
      code: 'weather_api_invoke_failed',
    });
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
  });
  it('supports independent field retrieval times without permitting role confusion', () => {
    const data = envelope();
    data.data.current.temperature.meta.retrievedAt = '2026-10-05T14:45:00Z';
    data.data.current.temperature.meta.expiresAt = '2026-10-05T15:00:00Z';
    expect(parseWeatherApiV1(data, coordinates).current.temperature.value).toBe(
      12,
    );
    data.data.current.temperature.meta.kind = 'WARNING';
    expect(() => parseWeatherApiV1(data, coordinates)).toThrow();
  });
  it('passes cancellation to the endpoint and makes no call for an aborted request', async () => {
    const controller = new AbortController();
    supabase.functions.invoke.mockResolvedValue({
      data: envelope(),
      error: null,
    });
    await fetchNuriWeatherV1(coordinates, controller.signal);
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'nuri-weather-v1',
      expect.objectContaining({ signal: controller.signal }),
    );
    controller.abort();
    await expect(
      fetchNuriWeatherV1(coordinates, controller.signal),
    ).rejects.toMatchObject({ code: 'weather_request_cancelled' });
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
  });
});
