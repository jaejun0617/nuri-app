import {
  buildOpenMeteoUrl,
  buildProviderMode,
  WeatherCacheHttpError,
} from './weather-cache-core.js';
import { validForecastCurrent } from './weather-api-domain.js';

const defaults = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  air_quality: 'https://air-quality-api.open-meteo.com/v1/air-quality',
};
const allowedHosts = new Set([
  'api.open-meteo.com',
  'air-quality-api.open-meteo.com',
  'customer-api.open-meteo.com',
  'customer-air-quality-api.open-meteo.com',
]);

export function createOpenMeteoAdapter({
  env,
  operations,
  emit,
  fetcher = fetch,
  signal,
}) {
  const mode = buildProviderMode(env('OPEN_METEO_PROVIDER_MODE'));
  async function read(kind, input) {
    const provider =
      kind === 'forecast' ? 'open-meteo-forecast' : 'open-meteo-aq';
    const start = Date.now();
    const health = await operations.health(provider);
    if (
      health?.suppressed_until &&
      Date.parse(health.suppressed_until) > Date.now()
    )
      throw new WeatherCacheHttpError(
        503,
        'weather_provider_suppressed',
        'provider suppressed',
      );
    // Reservations count all upstream attempts, including failures. No retry storm on 429/5xx.
    for (const [seconds, limit] of [
      [60, 90],
      [3600, 1000],
      [86400, 4500],
    ]) {
      if (!(await operations.consume(`provider:${provider}`, seconds, limit)))
        throw new WeatherCacheHttpError(
          503,
          'weather_provider_budget_exhausted',
          'provider budget exhausted',
        );
    }
    const baseUrl =
      env(
        kind === 'forecast'
          ? 'OPEN_METEO_BASE_URL'
          : 'OPEN_METEO_AIR_QUALITY_BASE_URL',
      ) || (mode === 'free' ? defaults[kind] : null);
    const url = buildOpenMeteoUrl({
      baseUrl,
      apiKey: env('OPEN_METEO_API_KEY'),
      providerMode: mode,
      coordBucket: input.coordBucket,
      timezone: input.timezone,
      kind,
    });
    if (
      url.protocol !== 'https:' ||
      !allowedHosts.has(url.hostname) ||
      url.username ||
      url.password
    )
      throw new WeatherCacheHttpError(
        503,
        'weather_provider_unconfigured',
        'invalid provider endpoint',
      );
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 6500);
    emit('provider_request', 1, provider);
    try {
      const response = await fetcher(url, { signal: controller.signal });
      if (!response.ok)
        throw new WeatherCacheHttpError(
          502,
          response.status === 429
            ? 'weather_provider_rate_limited'
            : 'weather_provider_http_failed',
          'provider rejected request',
        );
      const payload = await response.json();
      if (!payload || typeof payload !== 'object' || Array.isArray(payload))
        throw new WeatherCacheHttpError(
          502,
          'weather_provider_malformed',
          'provider malformed',
        );
      if (kind === 'forecast' && !validForecastCurrent(payload))
        throw new WeatherCacheHttpError(
          502,
          'weather_forecast_invalid',
          'forecast invalid',
        );
      await operations.result(provider, true);
      emit('provider_success', 1, provider);
      return payload;
    } catch (error) {
      const timedOut = controller.signal.aborted && !signal?.aborted;
      emit(timedOut ? 'timeout' : 'provider_failure', 1, provider);
      await operations.result(provider, false).catch(() => {});
      throw new WeatherCacheHttpError(
        502,
        timedOut
          ? 'weather_provider_timeout'
          : error instanceof WeatherCacheHttpError
          ? error.code
          : 'weather_provider_failed',
        'weather provider unavailable',
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      emit('provider_latency', Date.now() - start, provider);
    }
  }
  return {
    id: 'open-meteo',
    capabilities: ['FORECAST', 'AIR_QUALITY_FORECAST'],
    async fetchBundle(input) {
      const [forecast, airQuality] = await Promise.allSettled([
        read('forecast', input),
        read('air_quality', input),
      ]);
      if (forecast.status !== 'fulfilled') throw forecast.reason;
      return {
        forecast: forecast.value,
        airQuality: airQuality.status === 'fulfilled' ? airQuality.value : null,
        warning:
          airQuality.status === 'fulfilled' ? null : 'air_quality_unavailable',
      };
    },
  };
}
