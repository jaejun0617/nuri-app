/* global crypto */
import {
  isFreshCacheRow,
  isStaleCacheRow,
  normalizeWeatherRequestBody,
  resolveWeatherCache,
  WeatherCacheHttpError,
} from './weather-cache-core.js';
import { normalizeApiRequest, projectWeatherV1 } from './weather-api-domain.js';

function fromRow(row, source) {
  return {
    ok: true,
    data: row.combined_payload,
    source,
    coordBucket: row.coord_bucket,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    staleUntil: row.stale_until,
    attribution: row.combined_payload?.attribution,
  };
}
export async function coordinateWeather(input) {
  const normalized = normalizeApiRequest(input.body);
  const request = normalizeWeatherRequestBody(normalized.body);
  const key = `${request.coordBucket.key}|${request.cacheLocale}`;
  const lookup = {
    provider: 'open-meteo',
    coordBucket: request.coordBucket.key,
    locale: request.cacheLocale,
  };
  const read = async () => {
    const row = await input.cache.find(lookup);
    if (row && row.coord_bucket !== lookup.coordBucket) {
      input.emit('location_mismatch');
      throw new WeatherCacheHttpError(
        503,
        'weather_region_mismatch',
        'weather region mismatch',
      );
    }
    return row;
  };
  const usable = (row, source) => {
    if (!row) return null;
    const response = fromRow(row, source);
    try {
      projectWeatherV1(response, input.now?.getTime() ?? Date.now());
      return response;
    } catch {
      return null;
    }
  };
  const row = await read();
  const now = input.now ?? new Date();
  const fresh = isFreshCacheRow(row, now) ? usable(row, 'fresh_cache') : null;
  if (fresh) {
    input.emit('cache_hit');
    return fresh;
  }
  input.emit('cache_miss');
  const existing = input.inFlight?.get(key);
  if (existing) return existing;
  const work = (async () => {
    const owner = input.owner ?? crypto.randomUUID();
    const stale = () =>
      isStaleCacheRow(row, input.now ?? new Date())
        ? usable(row, 'stale_cache')
        : null;
    let acquired = false;
    try {
      acquired = await input.operations.acquire(key, owner);
      if (!acquired) {
        const fallback = stale();
        if (fallback)
          return { ...fallback, fallbackReason: 'weather_refresh_in_progress' };
        // Bounded follower wait. It never bypasses a busy/failed lease to call the provider.
        for (const delay of [100, 200, 400, 800, 1600, 2400]) {
          await input.sleep(delay);
          const changed = await read();
          const response = isFreshCacheRow(changed, input.now ?? new Date())
            ? usable(changed, 'fresh_cache')
            : null;
          if (response) {
            input.emit('cache_hit');
            return response;
          }
        }
        throw new WeatherCacheHttpError(
          503,
          'weather_refresh_in_progress',
          'weather refresh in progress',
        );
      }
      const latest = await read();
      const refreshed = isFreshCacheRow(latest, input.now ?? new Date())
        ? usable(latest, 'fresh_cache')
        : null;
      if (refreshed) {
        input.emit('cache_hit');
        return refreshed;
      }
      return await resolveWeatherCache({
        body: normalized.body,
        cache: input.cache,
        provider: input.provider,
        now: input.now,
      });
    } catch (error) {
      const fallback = stale();
      if (fallback)
        return {
          ...fallback,
          fallbackReason:
            error instanceof WeatherCacheHttpError
              ? error.code
              : 'weather_service_unavailable',
        };
      throw error;
    } finally {
      if (acquired) await input.operations.release(key, owner).catch(() => {});
    }
  })();
  input.inFlight?.set(key, work);
  try {
    return await work;
  } finally {
    input.inFlight?.delete(key);
  }
}
