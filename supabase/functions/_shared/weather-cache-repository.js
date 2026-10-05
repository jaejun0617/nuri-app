/* global AbortSignal */
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';
import { WeatherCacheHttpError } from './weather-cache-core.js';

const columns =
  'provider,coord_bucket,locale,forecast_payload,air_quality_payload,combined_payload,fetched_at,expires_at,stale_until';
export function createWeatherRepository(url, serviceKey) {
  if (!url || !serviceKey)
    throw new WeatherCacheHttpError(
      503,
      'weather_service_unconfigured',
      'weather service unconfigured',
    );
  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: async (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(2500) }),
    },
  });
  const check = (result, code) => {
    if (result.error)
      throw new WeatherCacheHttpError(503, code, 'weather storage unavailable');
    return result.data;
  };
  const rpc = async (name, args) =>
    check(await client.rpc(name, args), 'weather_operations_unavailable');
  return {
    async find(input) {
      return check(
        await client
          .from('nuri_weather_cache')
          .select(columns)
          .eq('provider', input.provider)
          .eq('coord_bucket', input.coordBucket)
          .eq('locale', input.locale)
          .maybeSingle(),
        'weather_cache_read_failed',
      );
    },
    async upsert(input) {
      return check(
        await client
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
            { onConflict: 'provider,coord_bucket,locale' },
          )
          .select(columns)
          .single(),
        'weather_cache_write_failed',
      );
    },
    acquire: (key, owner) =>
      rpc('nuri_weather_acquire_lease', { p_key: key, p_owner: owner }),
    release: (key, owner) =>
      rpc('nuri_weather_release_lease', { p_key: key, p_owner: owner }),
    consume: (key, seconds, limit) =>
      rpc('nuri_weather_consume', {
        p_key: key,
        p_seconds: seconds,
        p_limit: limit,
      }),
    result: (provider, success) =>
      rpc('nuri_weather_provider_result', {
        p_provider: provider,
        p_success: success,
      }),
    async health(provider) {
      return check(
        await client
          .from('nuri_weather_provider_health')
          .select('suppressed_until')
          .eq('provider', provider)
          .maybeSingle(),
        'weather_operations_unavailable',
      );
    },
    metric: (provider, metric, bucket, value) =>
      rpc('nuri_weather_record_metric', {
        p_provider: provider,
        p_metric: metric,
        p_bucket: bucket,
        p_value: value,
      }),
  };
}
