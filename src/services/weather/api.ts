// 파일: src/services/weather/api.ts
// 역할:
// - 앱 클라이언트의 날씨 조회를 Supabase Edge Function weather-cache로 단일화한다.
// - Open-Meteo provider URL/API key는 앱 번들에 두지 않고 서버 proxy/cache 경계 뒤에 둔다.

import type { DeviceCoordinates } from '../location/currentPosition';
import { supabase } from '../supabase/client';

export const WEATHER_CACHE_FUNCTION_NAME = 'weather-cache';
const WEATHER_CACHE_REQUEST_TIMEOUT_MS = 8500;
const WEATHER_CACHE_LOCALE = 'ko-KR';
const WEATHER_CACHE_TIMEZONE = 'Asia/Seoul';

export type WeatherForecastResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    cloud_cover?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: number[];
    precipitation_probability_max?: number[];
  };
};

export type WeatherAirQualityResponse = {
  current?: {
    pm10?: number;
    pm2_5?: number;
    ozone?: number;
  };
};

export type WeatherDataAttribution = {
  label: string;
  url?: string;
};

export type WeatherCacheSource = 'fresh_cache' | 'provider' | 'stale_cache';

export type WeatherCacheBundleResult = {
  forecast: WeatherForecastResponse;
  airQuality: WeatherAirQualityResponse | null;
  source: WeatherCacheSource;
  fetchedAt: string;
  expiresAt: string;
  staleUntil: string;
  coordBucket: string;
  attribution: WeatherDataAttribution;
  warning: string | null;
  fallbackReason: string | null;
};

type WeatherCacheInvokeResponse = {
  ok?: boolean;
  data?: unknown;
  source?: unknown;
  fetchedAt?: unknown;
  expiresAt?: unknown;
  staleUntil?: unknown;
  coordBucket?: unknown;
  attribution?: unknown;
  warning?: unknown;
  fallbackReason?: unknown;
  error?: unknown;
};

export class WeatherCacheServiceError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WeatherCacheServiceError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function readAttribution(value: unknown): WeatherDataAttribution {
  const record = readRecord(value);
  const label = normalizeString(record?.label) ?? 'Open-Meteo';
  const url = normalizeString(record?.url) ?? undefined;
  return {
    label,
    ...(url ? { url } : {}),
  };
}

function getWeatherCacheErrorMessage(code: string) {
  switch (code) {
    case 'invalid_coordinates':
      return '현재 위치 값을 확인하지 못해 날씨 정보를 불러오지 못했어요.';
    case 'weather_provider_unconfigured':
    case 'weather_cache_unconfigured':
      return '날씨 서비스 설정을 확인해야 해요.';
    case 'weather_provider_unavailable':
    case 'weather_forecast_provider_failed':
      return '날씨 정보를 잠시 불러오지 못했어요.';
    default:
      return '날씨 정보를 잠시 불러오지 못했어요.';
  }
}

function readStableErrorCode(error: unknown): string {
  if (isRecord(error)) {
    return normalizeString(error.code) ?? 'weather_cache_failed';
  }
  return 'weather_cache_failed';
}

function parseWeatherCacheSource(value: unknown): WeatherCacheSource {
  if (
    value === 'fresh_cache' ||
    value === 'provider' ||
    value === 'stale_cache'
  ) {
    return value;
  }

  throw new WeatherCacheServiceError(
    'weather_cache_invalid_response',
    '날씨 응답 형식이 올바르지 않아요.',
  );
}

function requireString(value: unknown, code: string): string {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw new WeatherCacheServiceError(
      code,
      '날씨 응답 형식이 올바르지 않아요.',
    );
  }
  return normalized;
}

function parseWeatherCacheResponse(
  rawResponse: WeatherCacheInvokeResponse,
): WeatherCacheBundleResult {
  if (rawResponse?.ok === false || rawResponse.error) {
    const code = readStableErrorCode(rawResponse.error);
    throw new WeatherCacheServiceError(code, getWeatherCacheErrorMessage(code));
  }

  const data = readRecord(rawResponse.data);
  const forecast = readRecord(data?.forecast);
  if (!data || !forecast) {
    throw new WeatherCacheServiceError(
      'weather_cache_invalid_response',
      '날씨 응답 형식이 올바르지 않아요.',
    );
  }

  const airQualityRecord = readRecord(data.airQuality);

  return {
    airQuality: airQualityRecord as WeatherAirQualityResponse | null,
    attribution: readAttribution(rawResponse.attribution ?? data.attribution),
    coordBucket: requireString(
      rawResponse.coordBucket,
      'weather_cache_invalid_response',
    ),
    expiresAt: requireString(
      rawResponse.expiresAt,
      'weather_cache_invalid_response',
    ),
    fallbackReason: normalizeString(rawResponse.fallbackReason),
    fetchedAt: requireString(
      rawResponse.fetchedAt,
      'weather_cache_invalid_response',
    ),
    forecast: forecast as WeatherForecastResponse,
    source: parseWeatherCacheSource(rawResponse.source),
    staleUntil: requireString(
      rawResponse.staleUntil,
      'weather_cache_invalid_response',
    ),
    warning: normalizeString(rawResponse.warning),
  };
}

async function invokeWeatherCache(
  coords: DeviceCoordinates,
): Promise<WeatherCacheInvokeResponse> {
  const invokePromise = supabase.functions.invoke(WEATHER_CACHE_FUNCTION_NAME, {
    body: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      locale: WEATHER_CACHE_LOCALE,
      timezone: WEATHER_CACHE_TIMEZONE,
    },
  });
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('weather-cache timeout'));
    }, WEATHER_CACHE_REQUEST_TIMEOUT_MS);
  });

  const { data, error } = await Promise.race([
    invokePromise,
    timeoutPromise,
  ]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  if (error) {
    throw new WeatherCacheServiceError(
      'weather_cache_invoke_failed',
      error.message || '날씨 정보를 잠시 불러오지 못했어요.',
    );
  }

  return data as WeatherCacheInvokeResponse;
}

export async function fetchWeatherCacheBundle(
  coords: DeviceCoordinates,
): Promise<WeatherCacheBundleResult> {
  const startedAt = Date.now();
  try {
    const result = parseWeatherCacheResponse(await invokeWeatherCache(coords));

    if (__DEV__) {
      console.info(
        '[NURI-DEBUG] weather-cache completed',
        JSON.stringify({
          coordBucket: result.coordBucket,
          elapsedMs: Date.now() - startedAt,
          hasAirQuality: Boolean(result.airQuality),
          source: result.source,
          status: 'ok',
        }),
      );
    }

    return result;
  } catch (error: unknown) {
    const normalized =
      error instanceof WeatherCacheServiceError
        ? error
        : new WeatherCacheServiceError(
            'weather_cache_invoke_failed',
            '날씨 정보를 잠시 불러오지 못했어요.',
          );

    if (__DEV__) {
      console.info(
        '[NURI-DEBUG] weather-cache failed',
        JSON.stringify({
          elapsedMs: Date.now() - startedAt,
          hasAirQuality: false,
          source: 'error',
          status: normalized.code,
        }),
      );
    }

    throw normalized;
  }
}
