/* global Deno, Response, TextDecoder, TextEncoder, crypto */
import { coordinateWeather } from './weather-api-coordinator.js';
import {
  normalizeApiRequest,
  projectWeatherV1,
  unavailableWeatherV1,
  PROVIDER_CAPABILITIES,
  WEATHER_API_VERSION,
} from './weather-api-domain.js';
import { createOpenMeteoAdapter } from './weather-provider-open-meteo.js';
import { createWeatherProviderRegistry } from './weather-provider-registry.js';
import { createWeatherRepository } from './weather-cache-repository.js';
import { WeatherCacheHttpError } from './weather-cache-core.js';

const inFlight = new Map();
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization,x-client-info,apikey,content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...(status === 429 ? { 'retry-after': '60' } : {}),
    },
  });

async function readBody(request) {
  const url = new URL(request.url);
  if (url.href.length > 2048)
    throw new WeatherCacheHttpError(
      413,
      'weather_request_too_large',
      'request too large',
    );
  if (request.method === 'GET') {
    const body = Object.fromEntries(url.searchParams);
    if (
      ['latitude', 'longitude'].some(
        k => !/^[-+]?\d+(?:\.\d+)?$/.test(body[k] ?? '') || body[k].length > 24,
      )
    )
      throw new WeatherCacheHttpError(
        400,
        'invalid_coordinates',
        'invalid coordinates',
      );
    return {
      ...body,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
    };
  }
  if (!(request.headers.get('content-type') ?? '').includes('application/json'))
    throw new WeatherCacheHttpError(
      415,
      'invalid_weather_content_type',
      'json required',
    );
  const reader = request.body?.getReader();
  if (!reader)
    throw new WeatherCacheHttpError(
      400,
      'invalid_weather_request',
      'missing body',
    );
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        throw new WeatherCacheHttpError(
          413,
          'weather_request_too_large',
          'request too large',
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new WeatherCacheHttpError(
      400,
      'invalid_weather_request',
      'invalid json',
    );
  }
}
async function callerKey(request, secret) {
  // Day-rotating one-way identity, never persist/log the IP or token itself.
  const ip = (
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
    .split(',')[0]
    .trim()
    .slice(0, 80);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(
      `${secret}|${new Date().toISOString().slice(0, 10)}|${ip}`,
    ),
  );
  return `caller:${Array.from(new Uint8Array(digest), x =>
    x.toString(16).padStart(2, '0'),
  ).join('')}`;
}
export function createWeatherHandler({
  legacy = false,
  env = name => Deno.env.get(name),
  repositoryFactory = createWeatherRepository,
} = {}) {
  return async request => {
    const start = Date.now();
    let bucket = null;
    let repository = null;
    const events = new Map();
    const emit = (metric, value = 1, provider = 'nuri') => {
      const key = `${provider}|${metric}`;
      events.set(key, (events.get(key) ?? 0) + value);
    };
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors });
    if (!['GET', 'POST'].includes(request.method))
      return json({ ok: false, error: { code: 'method_not_allowed' } }, 405);
    const url = new URL(request.url);
    if (request.method === 'GET' && !url.search)
      return json({
        ok: true,
        apiVersion: WEATHER_API_VERSION,
        scope: legacy ? 'weather-cache' : 'nuri-weather-v1',
        contractVersion: legacy ? 2 : 1,
        freshMinutes: 15,
        staleMinutes: 60,
        providerMode:
          env('OPEN_METEO_PROVIDER_MODE') === 'customer' ? 'customer' : 'free',
        providers: PROVIDER_CAPABILITIES,
      });
    let status = 200;
    let response;
    try {
      const input = normalizeApiRequest(await readBody(request));
      bucket = input.bucket;
      repository = repositoryFactory(
        env('SUPABASE_URL'),
        env('SUPABASE_SERVICE_ROLE_KEY'),
      );
      emit('requests');
      const caller = await callerKey(
        request,
        env('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      if (
        !(await repository.consume(caller, 60, 60)) ||
        !(await repository.consume('requests:global', 60, 1200))
      ) {
        emit('rate_limited');
        throw new WeatherCacheHttpError(
          429,
          'weather_rate_limited',
          'weather rate limited',
        );
      }
      const providers = createWeatherProviderRegistry(
        createOpenMeteoAdapter({
          env,
          operations: repository,
          emit,
          signal: request.signal,
        }),
      );
      const raw = await coordinateWeather({
        body: input.body,
        cache: repository,
        operations: repository,
        provider: providers.forecast,
        inFlight,
        emit,
        sleep: ms =>
          new Promise((resolve, reject) => {
            if (request.signal.aborted) {
              reject(
                new WeatherCacheHttpError(
                  499,
                  'weather_request_cancelled',
                  'request cancelled',
                ),
              );
              return;
            }
            const abort = () => {
              clearTimeout(timer);
              reject(
                new WeatherCacheHttpError(
                  499,
                  'weather_request_cancelled',
                  'request cancelled',
                ),
              );
            };
            const timer = setTimeout(() => {
              request.signal.removeEventListener('abort', abort);
              resolve();
            }, ms);
            request.signal.addEventListener('abort', abort, { once: true });
          }),
      });
      const data = projectWeatherV1(raw);
      emit(data.freshness.state === 'FRESH' ? 'fresh_cache' : 'stale_cache');
      if (data.missingFields) emit('missing_fields', data.missingFields);
      response = legacy ? raw : { ok: true, data };
    } catch (error) {
      status = error instanceof WeatherCacheHttpError ? error.status : 503;
      const code =
        error instanceof WeatherCacheHttpError
          ? error.code
          : 'weather_service_unavailable';
      emit('unavailable');
      response = {
        ok: false,
        error: { code, message: '날씨 정보를 잠시 불러오지 못했어요.' },
        ...(!legacy && bucket
          ? { data: unavailableWeatherV1(bucket, code) }
          : {}),
      };
    } finally {
      emit('response_latency', Date.now() - start);
      console.info(
        JSON.stringify({
          scope: 'nuri-weather-v1',
          apiVersion: WEATHER_API_VERSION,
          location_bucket: bucket?.key ?? null,
          result_state: status === 200 ? 'available' : 'unavailable',
          status,
          metrics: Object.fromEntries(events),
        }),
      );
      if (repository && bucket) {
        const results = await Promise.allSettled(
          Array.from(events, ([key, value]) => {
            const [provider, metric] = key.split('|');
            return repository.metric(provider, metric, bucket.key, value);
          }),
        );
        if (results.some(r => r.status === 'rejected'))
          console.warn(
            JSON.stringify({
              scope: 'nuri-weather-v1',
              code: 'weather_metric_write_failed',
            }),
          );
      }
    }
    return json(response, status);
  };
}
