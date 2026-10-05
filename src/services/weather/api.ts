// NURI contract only. The legacy client is an explicit rollback path, not an automatic provider fallback.
import type { DeviceCoordinates } from '../location/currentPosition';
import { supabase } from '../supabase/client';
import { getWeatherCoordBucketKey } from './coordBucket';
import type {
  WeatherApiV1,
  WeatherMetric,
  WeatherKind,
  WeatherQuality,
} from './domain';
import { parseWeatherTime } from './reliability';
export { WeatherCacheServiceError } from './legacy';
import { WeatherCacheServiceError } from './legacy';

export const WEATHER_API_FUNCTION_NAME = 'nuri-weather-v1';
const fail = (code = 'weather_api_invalid_response'): never => {
  throw new WeatherCacheServiceError(
    code,
    '날씨 정보를 잠시 불러오지 못했어요.',
  );
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200)
    return fail();
  return value;
}
function time(value: unknown): string {
  const result = text(value);
  if (parseWeatherTime(result) === null) return fail();
  return result;
}
function array(value: unknown, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit) return fail();
  return value;
}
function kind(value: unknown): WeatherKind {
  if (
    value === 'OBSERVED' ||
    value === 'FORECAST' ||
    value === 'WARNING' ||
    value === 'AIR_QUALITY_OBSERVED' ||
    value === 'AIR_QUALITY_FORECAST' ||
    value === 'NOWCAST'
  )
    return value;
  return fail();
}
function quality(value: unknown): WeatherQuality {
  if (
    value === 'VALID' ||
    value === 'PARTIAL' ||
    value === 'STALE' ||
    value === 'UNAVAILABLE'
  )
    return value;
  return fail();
}
export function parseWeatherApiV1(
  value: unknown,
  coordinates: DeviceCoordinates,
  now = Date.now(),
): WeatherApiV1 {
  const envelope = record(value);
  if (envelope.ok !== true)
    return fail(
      typeof record(envelope.error).code === 'string'
        ? String(record(envelope.error).code)
        : 'weather_api_unavailable',
    );
  const data = record(envelope.data);
  if (data.apiVersion !== 'nuri.weather.v1')
    return fail('weather_api_version_mismatch');
  const location = record(data.location);
  const key = getWeatherCoordBucketKey(coordinates);
  if (
    location.key !== key ||
    location.timezone !== 'Asia/Seoul' ||
    location.locale !== 'ko-KR' ||
    location.bucketSizeDegrees !== 0.02
  )
    return fail('weather_cache_region_mismatch');
  const fresh = record(data.freshness);
  const retrievedAt = time(fresh.retrievedAt),
    expiresAt = time(fresh.expiresAt),
    staleUntil = time(fresh.staleUntil);
  if (
    !['FRESH', 'STALE_SAFE'].includes(String(fresh.state)) ||
    Date.parse(retrievedAt) > now + 120000 ||
    now - Date.parse(retrievedAt) >= 3600000 ||
    Date.parse(staleUntil) <= now ||
    Date.parse(expiresAt) <= Date.parse(retrievedAt) ||
    Date.parse(expiresAt) - Date.parse(retrievedAt) > 900000 ||
    Date.parse(staleUntil) - Date.parse(retrievedAt) > 3600000 ||
    !['provider', 'fresh_cache', 'stale_cache'].includes(String(fresh.cache))
  )
    return fail();
  if (fresh.state === 'FRESH' && Date.parse(expiresAt) <= now) return fail();
  const meta = (valueMeta: unknown, unit: string) => {
    const m = record(valueMeta);
    if (m.unit !== unit || m.locationKey !== key) return fail();
    const parsed = {
      source: text(m.source),
      kind: kind(m.kind),
      unit,
      issuedAt: m.issuedAt === null ? null : time(m.issuedAt),
      validAt: m.validAt === null ? null : time(m.validAt),
      retrievedAt: time(m.retrievedAt),
      expiresAt: time(m.expiresAt),
      locationKey: key,
      quality: quality(m.quality),
    };
    if (
      Date.parse(parsed.retrievedAt) > now + 120000 ||
      now - Date.parse(parsed.retrievedAt) >= 3600000 ||
      Date.parse(parsed.expiresAt) <= Date.parse(parsed.retrievedAt) ||
      (Date.parse(parsed.expiresAt) <= now &&
        !['STALE', 'UNAVAILABLE'].includes(parsed.quality))
    )
      return fail();
    return parsed;
  };
  const numeric = (
    valueMetric: unknown,
    unit: string,
    min = -Infinity,
    max = Infinity,
    roles: WeatherKind[] = ['FORECAST', 'OBSERVED'],
  ): WeatherMetric => {
    const m = record(valueMetric),
      metadata = meta(m.meta, unit);
    if (!roles.includes(metadata.kind)) return fail();
    if (
      m.value !== null &&
      (typeof m.value !== 'number' ||
        !Number.isFinite(m.value) ||
        m.value < min ||
        m.value > max)
    )
      return fail();
    if (
      m.value !== null &&
      (!metadata.validAt || metadata.quality === 'UNAVAILABLE')
    )
      return fail();
    return { value: m.value as number | null, meta: metadata };
  };
  const timestamp = (valueMetric: unknown): WeatherMetric<string> => {
    const m = record(valueMetric);
    return {
      value: m.value === null ? null : time(m.value),
      meta: meta(m.meta, 'ISO8601'),
    };
  };
  const current = record(data.current);
  const parsedCurrent = {
    temperature: numeric(current.temperature, '°C', -100, 70),
    apparentTemperature: numeric(current.apparentTemperature, '°C', -120, 90),
    weatherCode: numeric(current.weatherCode, 'WMO', 0, 99),
    humidity: numeric(current.humidity, '%', 0, 100),
    windSpeed: numeric(current.windSpeed, 'm/s', 0),
    cloudCover: numeric(current.cloudCover, '%', 0, 100),
  };
  if (
    parsedCurrent.temperature.value === null ||
    parsedCurrent.weatherCode.value === null ||
    Date.parse(parsedCurrent.temperature.meta.validAt ?? '') > now + 300000 ||
    ![
      0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75,
      77, 80, 81, 82, 85, 86, 95, 96, 99,
    ].includes(parsedCurrent.weatherCode.value)
  )
    return fail();
  const hourly = array(data.hourly, 192).map(item => {
    const h = record(item);
    return {
      startsAt: time(h.startsAt),
      endsAt: time(h.endsAt),
      precipitationProbability: numeric(
        h.precipitationProbability,
        '%',
        0,
        100,
        ['FORECAST'],
      ),
      precipitationAmount: numeric(h.precipitationAmount, 'mm', 0, Infinity, [
        'FORECAST',
      ]),
    };
  });
  if (
    hourly.some(
      h => Date.parse(h.endsAt) - Date.parse(h.startsAt) !== 3600000,
    ) ||
    new Set(hourly.map(h => h.endsAt)).size !== hourly.length
  )
    return fail();
  const daily = array(data.daily, 7).map(item => {
    const d = record(item);
    const date = text(d.date);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      parseWeatherTime(`${date}T00:00:00+09:00`) === null
    )
      return fail();
    return {
      date,
      weatherCode: numeric(d.weatherCode, 'WMO', 0, 99),
      highTemperature: numeric(d.highTemperature, '°C', -100, 70),
      lowTemperature: numeric(d.lowTemperature, '°C', -100, 70),
      uvIndex: numeric(d.uvIndex, 'index', 0, 30),
      precipitationProbability: numeric(
        d.precipitationProbability,
        '%',
        0,
        100,
      ),
      sunrise: timestamp(d.sunrise),
      sunset: timestamp(d.sunset),
    };
  });
  const aq = record(data.airQuality);
  if (aq.availability !== 'available' && aq.availability !== 'unavailable')
    return fail();
  const airQuality: WeatherApiV1['airQuality'] = {
    availability: aq.availability,
    pm10: numeric(aq.pm10, 'μg/m³', 0, Infinity, [
      'AIR_QUALITY_OBSERVED',
      'AIR_QUALITY_FORECAST',
    ]),
    pm25: numeric(aq.pm25, 'μg/m³', 0, Infinity, [
      'AIR_QUALITY_OBSERVED',
      'AIR_QUALITY_FORECAST',
    ]),
    ozone: numeric(aq.ozone, 'μg/m³', 0, Infinity, [
      'AIR_QUALITY_OBSERVED',
      'AIR_QUALITY_FORECAST',
    ]),
  };
  const warnings = record(data.warnings),
    nowcast = record(data.nowcast);
  if (
    !['available', 'unavailable'].includes(String(warnings.availability)) ||
    !['available', 'unavailable'].includes(String(nowcast.availability))
  )
    return fail();
  const warningItems = array(warnings.items, 100).map(item => {
    const w = record(item),
      m = meta(w.meta, 'warning');
    if (m.kind !== 'WARNING' || m.source !== 'kma-warning' || !m.issuedAt)
      return fail();
    return {
      id: text(w.id),
      title: text(w.title),
      regionCode: text(w.regionCode),
      meta: m,
    };
  });
  const nowcastItems = array(nowcast.items, 192).map(item => {
    const n = record(item),
      m = meta(n.meta, 'mm');
    if (
      m.kind !== 'NOWCAST' ||
      m.source !== 'kma-nowcast' ||
      typeof n.precipitationMm !== 'number' ||
      !Number.isFinite(n.precipitationMm) ||
      n.precipitationMm < 0
    )
      return fail();
    return { precipitationMm: n.precipitationMm, meta: m };
  });
  if (
    (warnings.availability === 'unavailable' && warningItems.length) ||
    (nowcast.availability === 'unavailable' && nowcastItems.length)
  )
    return fail();
  const sources: WeatherApiV1['sources'] = array(data.sources, 16).map(item => {
    const s = record(item);
    if (s.state !== 'ACTIVE' && s.state !== 'READY_INACTIVE') return fail();
    const attribution = s.attribution === null ? null : record(s.attribution);
    return {
      source: text(s.source),
      kind: kind(s.kind),
      state: s.state,
      attribution: attribution
        ? {
            label: text(attribution.label),
            ...(typeof attribution.url === 'string'
              ? { url: attribution.url }
              : {}),
          }
        : null,
    };
  });
  return {
    apiVersion: 'nuri.weather.v1',
    location: {
      key,
      bucketSizeDegrees: 0.02,
      timezone: 'Asia/Seoul',
      locale: 'ko-KR',
    },
    current: parsedCurrent,
    hourly,
    daily,
    airQuality,
    warnings: {
      availability:
        warnings.availability === 'available' ? 'available' : 'unavailable',
      items: warningItems,
    },
    nowcast: {
      availability:
        nowcast.availability === 'available' ? 'available' : 'unavailable',
      items: nowcastItems,
    },
    freshness: {
      state: fresh.state === 'FRESH' ? 'FRESH' : 'STALE_SAFE',
      quality: quality(fresh.quality),
      retrievedAt,
      expiresAt,
      staleUntil,
      cache:
        fresh.cache === 'provider'
          ? 'provider'
          : fresh.cache === 'fresh_cache'
          ? 'fresh_cache'
          : 'stale_cache',
      fallbackReason:
        typeof fresh.fallbackReason === 'string' ? fresh.fallbackReason : null,
    },
    sources,
  };
}

export async function fetchNuriWeatherV1(
  coordinates: DeviceCoordinates,
  signal?: AbortSignal,
): Promise<WeatherApiV1> {
  if (signal?.aborted) return fail('weather_request_cancelled');
  const { data, error } = await supabase.functions.invoke(
    WEATHER_API_FUNCTION_NAME,
    {
      body: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        locale: 'ko-KR',
        timezone: 'Asia/Seoul',
      },
      timeout: 15000,
      ...(signal ? { signal } : {}),
    },
  );
  if (error) return fail('weather_api_invoke_failed');
  return parseWeatherApiV1(data, coordinates);
}
