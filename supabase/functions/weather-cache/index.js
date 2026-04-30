/* global Deno, globalThis */
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';

import {
  buildOpenMeteoUrl,
  buildProviderMode,
  resolveWeatherCache,
  WeatherCacheHttpError,
} from '../_shared/weather-cache-core.js';

const FREE_FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const FREE_AIR_QUALITY_BASE_URL =
  'https://air-quality-api.open-meteo.com/v1/air-quality';
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

function jsonResponse(body, status = 200) {
  return new globalThis.Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...CORS_HEADERS,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

async function readJsonBody(request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  return request.json().catch(() => ({}));
}

function normalizeString(value) {
  const normalized = `${value ?? ''}`.trim();
  return normalized ? normalized : null;
}

function requireEnv(name) {
  const value = normalizeString(Deno.env.get(name));
  if (!value) {
    throw new WeatherCacheHttpError(
      500,
      'weather_cache_unconfigured',
      `${name} is required`,
    );
  }
  return value;
}

function createWeatherCacheRepository() {
  const supabase = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  return {
    async find(input) {
      const { data, error } = await supabase
        .from('nuri_weather_cache')
        .select(
          'provider, coord_bucket, locale, forecast_payload, air_quality_payload, combined_payload, fetched_at, expires_at, stale_until',
        )
        .eq('provider', input.provider)
        .eq('coord_bucket', input.coordBucket)
        .eq('locale', input.locale)
        .maybeSingle();

      if (error) {
        throw new WeatherCacheHttpError(
          500,
          'weather_cache_read_failed',
          'weather cache read failed',
        );
      }

      return data ?? null;
    },
    async upsert(input) {
      const { data, error } = await supabase
        .from('nuri_weather_cache')
        .upsert(
          {
            air_quality_payload: input.airQualityPayload,
            combined_payload: input.combinedPayload,
            coord_bucket: input.coordBucket,
            expires_at: input.expiresAt,
            fetched_at: input.fetchedAt,
            forecast_payload: input.forecastPayload,
            locale: input.locale,
            provider: input.provider,
            stale_until: input.staleUntil,
          },
          {
            onConflict: 'provider,coord_bucket,locale',
          },
        )
        .select(
          'provider, coord_bucket, locale, forecast_payload, air_quality_payload, combined_payload, fetched_at, expires_at, stale_until',
        )
        .single();

      if (error) {
        throw new WeatherCacheHttpError(
          500,
          'weather_cache_write_failed',
          'weather cache write failed',
        );
      }

      return data;
    },
  };
}

async function fetchProviderJson(url, errorCode) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new WeatherCacheHttpError(
      502,
      errorCode,
      `${errorCode}:${response.status}`,
    );
  }

  return response.json();
}

function createOpenMeteoProvider() {
  const providerMode = buildProviderMode(Deno.env.get('OPEN_METEO_PROVIDER_MODE'));
  const forecastBaseUrl =
    normalizeString(Deno.env.get('OPEN_METEO_BASE_URL')) ??
    (providerMode === 'free' ? FREE_FORECAST_BASE_URL : null);
  const airQualityBaseUrl =
    normalizeString(Deno.env.get('OPEN_METEO_AIR_QUALITY_BASE_URL')) ??
    (providerMode === 'free' ? FREE_AIR_QUALITY_BASE_URL : null);
  const apiKey = normalizeString(Deno.env.get('OPEN_METEO_API_KEY'));

  return {
    async fetchBundle(input) {
      const forecastUrl = buildOpenMeteoUrl({
        apiKey,
        baseUrl: forecastBaseUrl,
        coordBucket: input.coordBucket,
        kind: 'forecast',
        providerMode,
        timezone: input.timezone,
      });
      const airQualityUrl = buildOpenMeteoUrl({
        apiKey,
        baseUrl: airQualityBaseUrl,
        coordBucket: input.coordBucket,
        kind: 'air_quality',
        providerMode,
        timezone: input.timezone,
      });
      const [forecastResult, airQualityResult] = await Promise.allSettled([
        fetchProviderJson(forecastUrl, 'weather_forecast_provider_failed'),
        fetchProviderJson(
          airQualityUrl,
          'weather_air_quality_provider_failed',
        ),
      ]);

      if (forecastResult.status !== 'fulfilled') {
        throw forecastResult.reason;
      }

      return {
        forecast: forecastResult.value,
        airQuality:
          airQualityResult.status === 'fulfilled'
            ? airQualityResult.value
            : null,
        warning:
          airQualityResult.status === 'fulfilled'
            ? null
            : 'air_quality_unavailable',
      };
    },
  };
}

function shouldDebugLog() {
  return Deno.env.get('NURI_WEATHER_CACHE_DEBUG')?.trim() === 'true';
}

function debugLog(payload) {
  if (!shouldDebugLog()) {
    return;
  }

  console.info(
    JSON.stringify({
      scope: 'weather-cache',
      ...payload,
    }),
  );
}

Deno.serve(async request => {
  const startedAt = Date.now();

  if (request.method === 'OPTIONS') {
    return new globalThis.Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      scope: 'weather-cache',
      message: 'ready',
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'method_not_allowed',
          message: 'POST is required',
        },
      },
      405,
    );
  }

  try {
    const body = await readJsonBody(request);
    const response = await resolveWeatherCache({
      body,
      cache: createWeatherCacheRepository(),
      provider: createOpenMeteoProvider(),
    });

    debugLog({
      coordBucket: response.coordBucket,
      elapsedMs: Date.now() - startedAt,
      hasAirQuality: Boolean(response.data?.airQuality),
      resultStatus: 'ok',
      source: response.source,
    });

    return jsonResponse(response);
  } catch (error) {
    const status = error instanceof WeatherCacheHttpError ? error.status : 500;
    const code =
      error instanceof WeatherCacheHttpError
        ? error.code
        : 'weather_cache_unknown_error';

    debugLog({
      elapsedMs: Date.now() - startedAt,
      resultStatus: code,
      source: 'error',
    });

    return jsonResponse(
      {
        ok: false,
        error: {
          code,
          message:
            status >= 500
              ? '날씨 정보를 잠시 불러오지 못했어요.'
              : '날씨 요청 값을 확인해 주세요.',
        },
      },
      status,
    );
  }
});
