/* global Request */
import { createWeatherHandler } from '../supabase/functions/_shared/weather-api-runtime';
import { createWeatherProviderRegistry } from '../supabase/functions/_shared/weather-provider-registry';
import {
  buildCombinedWeatherPayload,
  buildWeatherCacheTimes,
  createCoordBucket,
} from '../supabase/functions/_shared/weather-cache-core';
jest.mock('../supabase/functions/_shared/weather-cache-repository', () => ({
  createWeatherRepository: jest.fn(),
}));

const location = { latitude: 37.674, longitude: 126.769 };
function repository() {
  const now = new Date(),
    times = buildWeatherCacheTimes(now),
    bucket = createCoordBucket(location);
  const row = {
    coord_bucket: bucket.key,
    fetched_at: times.fetchedAt,
    expires_at: times.expiresAt,
    stale_until: times.staleUntil,
    combined_payload: buildCombinedWeatherPayload({
      coordBucket: bucket,
      timezone: 'Asia/Seoul',
      airQuality: null,
      forecast: {
        current: {
          time: now.toISOString(),
          temperature_2m: 12,
          weather_code: 0,
        },
      },
    }),
  };
  return {
    find: jest.fn(async () => row),
    consume: jest.fn(async () => true),
    metric: jest.fn(async () => {}),
    acquire: jest.fn(async () => true),
    release: jest.fn(async () => {}),
    health: jest.fn(async () => null),
    result: jest.fn(async () => {}),
  };
}
describe('v1 HTTP boundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  const handler = repo =>
    createWeatherHandler({
      env: name =>
        name === 'SUPABASE_SERVICE_ROLE_KEY'
          ? 'fixture-salt'
          : 'https://fixture.invalid',
      repositoryFactory: () => repo,
    });
  const post = body =>
    new Request('https://fixture.invalid/functions/v1/nuri-weather-v1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  it('serves a cache response with no-store and only coarse location rollups', async () => {
    const repo = repository();
    const response = await handler(repo)(post(location));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const result = await response.json();
    expect(result.data.apiVersion).toBe('nuri.weather.v1');
    expect(repo.acquire).not.toHaveBeenCalled();
    expect(repo.metric).toHaveBeenCalledWith(
      'nuri',
      'requests',
      'v1:37.68:126.76:d0.02',
      1,
    );
    expect(JSON.stringify(console.info.mock.calls)).not.toMatch(
      /37\.674|fixture-salt|Bearer|email/,
    );
  });
  it.each([
    [{ latitude: 100, longitude: 0 }, 400],
    [{ ...location, pet: 'private' }, 400],
  ])('rejects malformed inputs before storage %j', async (body, status) => {
    const repo = repository();
    const response = await handler(repo)(post(body));
    expect(response.status).toBe(status);
    expect(repo.consume).not.toHaveBeenCalled();
  });
  it('bounds body size and methods', async () => {
    const repo = repository();
    expect(
      (await handler(repo)(post({ padding: 'x'.repeat(1100) }))).status,
    ).toBe(413);
    expect(
      (
        await handler(repo)(
          new Request('https://fixture.invalid', { method: 'DELETE' }),
        )
      ).status,
    ).toBe(405);
  });
  it('uses shared rate state, fails closed and declares retry-after', async () => {
    const repo = repository();
    repo.consume.mockResolvedValue(false);
    const response = await handler(repo)(post(location));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect((await response.json()).data.freshness.state).toBe('UNAVAILABLE');
    expect(repo.find).not.toHaveBeenCalled();
  });
  it('retains the legacy wire format through the same protected boundary', async () => {
    const repo = repository();
    const h = createWeatherHandler({
      legacy: true,
      env: () => 'fixture',
      repositoryFactory: () => repo,
    });
    const result = await (await h(post(location))).json();
    expect(result).toMatchObject({ ok: true, source: 'fresh_cache' });
    expect(result.data.forecast.current.temperature_2m).toBe(12);
    expect(repo.consume).toHaveBeenCalled();
  });
  it('supports GET weather inputs without persisting raw coordinates', async () => {
    const repo = repository();
    const response = await handler(repo)(
      new Request(
        'https://fixture.invalid/v1/weather?latitude=37.674&longitude=126.769',
      ),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data.location.key).toBe(
      'v1:37.68:126.76:d0.02',
    );
  });
});

describe('domestic capability boundaries', () => {
  it.each(['kma-observation', 'kma-warning', 'airkorea', 'kma-nowcast'])(
    '%s is ready and explicitly unavailable without an authorized adapter',
    async source => {
      const registry = createWeatherProviderRegistry({});
      expect(registry.capabilities.find(c => c.source === source).state).toBe(
        'READY_INACTIVE',
      );
      expect(await registry.readRole(source, 'bucket')).toEqual({
        availability: 'unavailable',
        items: [],
      });
    },
  );
  it('does not accept a forecast as an official warning even if an adapter is supplied', async () => {
    const registry = createWeatherProviderRegistry(
      {},
      {
        'kma-warning': {
          read: async () => ({
            items: [{ id: 'rain', title: 'rain', meta: { kind: 'FORECAST' } }],
          }),
        },
      },
    );
    expect(
      (await registry.readRole('kma-warning', 'bucket')).availability,
    ).toBe('unavailable');
  });
});
