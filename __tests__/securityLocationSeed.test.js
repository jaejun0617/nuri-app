import { TextDecoder, TextEncoder } from 'node:util';
jest.mock('npm:@supabase/supabase-js@2.97.0', () => ({ createClient: jest.fn() }), { virtual: true });
const { createClient } = require('npm:@supabase/supabase-js@2.97.0');
const originalDeno = global.Deno;
const originalResponse = global.Response;
const originalFetch = global.fetch;
const originalDecoder = global.TextDecoder;
global.TextDecoder = TextDecoder;
global.Deno = { serve: jest.fn(), env: { get: () => 'isolated-test-config' } };
global.Response = class {
  constructor(body, options) { this.body = JSON.parse(body); this.status = options.status; this.headers = options.headers; }
};
const { handleLocationSeed } = require('../supabase/functions/location-discovery-seed/index');
let client;
function request(body, headers = {}, omitLength = false) {
  const bytes = new TextEncoder().encode(typeof body === 'string' ? body : JSON.stringify(body));
  let done = false;
  return { method: 'POST', headers: { get: key => ({ authorization: 'Bearer isolated-test-session', 'content-type': 'application/json', ...(!omitLength ? { 'content-length': String(bytes.byteLength) } : {}), ...headers }[key] ?? null) },
    body: { getReader: () => ({ read: async () => { const result = done ? { done: true } : { done: false, value: bytes }; done = true; return result; }, cancel: jest.fn(), releaseLock: jest.fn() }) } };
}
beforeEach(() => {
  client = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null }) }, rpc: jest.fn().mockResolvedValue({ data: [{ allowed: true, retry_after_seconds: 0 }], error: null }) };
  createClient.mockReturnValue(client);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ documents: [{ id: 'fixture' }] }) });
});
afterAll(() => { global.Deno = originalDeno; global.Response = originalResponse; global.fetch = originalFetch; global.TextDecoder = originalDecoder; });
test('requires a verified non-anonymous caller before budget/provider use', async () => {
  client.auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'invalid' } });
  expect((await handleLocationSeed(request({ action: 'address', query: 'fixture' }))).status).toBe(401);
  expect(client.rpc).not.toHaveBeenCalled(); expect(global.fetch).not.toHaveBeenCalled();
  client.auth.getUser.mockResolvedValue({ data: { user: { id: 'anonymous', is_anonymous: true } }, error: null });
  expect((await handleLocationSeed(request({ action: 'address', query: 'fixture' }))).status).toBe(401);
});
test.each([false, true])('bounds declared and streamed body bytes (noLength=%s)', async noLength => {
  expect((await handleLocationSeed(request(' '.repeat(4097), {}, noLength))).status).toBe(413);
  expect(client.rpc).not.toHaveBeenCalled(); expect(global.fetch).not.toHaveBeenCalled();
});
test.each([
  { action: 'keyword', input: { query: 'a'.repeat(121) } },
  { action: 'keyword', input: { query: 'fixture', coordinates: { latitude: 91, longitude: 127 } } },
  { action: 'coord2region', coordinates: { latitude: 37, longitude: -181 } },
  { action: 'address', query: {} },
  { action: 'proxy', url: 'https://example.invalid' },
])('rejects invalid input without spending provider quota', async input => {
  expect((await handleLocationSeed(request(input))).status).toBe(400);
  expect(client.rpc).not.toHaveBeenCalled(); expect(global.fetch).not.toHaveBeenCalled();
});
test('binds budget to verified identity, bounds pagination and uses only fixed provider host', async () => {
  const result = await handleLocationSeed(request({ action: 'keyword', user_id: 'forged', input: { query: 'fixture', page: 999, size: 999 } }));
  expect(result.status).toBe(200);
  expect(client.rpc).toHaveBeenCalledWith('claim_location_discovery_budget', { p_user_id: 'verified-user' });
  const url = new URL(global.fetch.mock.calls[0][0]);
  expect(url.origin).toBe('https://dapi.kakao.com'); expect(url.searchParams.get('page')).toBe('45'); expect(url.searchParams.get('size')).toBe('15');
});
test('returns 429 with Retry-After and no provider call', async () => {
  client.rpc.mockResolvedValue({ data: [{ allowed: false, retry_after_seconds: 40 }], error: null });
  const result = await handleLocationSeed(request({ action: 'address', query: 'fixture-limit' }));
  expect(result.status).toBe(429); expect(result.body.error).toBe('location_rate_limited'); expect(result.headers['Retry-After']).toBe('40');
  expect(global.fetch).not.toHaveBeenCalled();
});
test('budget failures fail closed', async () => {
  client.rpc.mockResolvedValue({ data: null, error: { message: 'private upstream detail' } });
  expect((await handleLocationSeed(request({ action: 'address', query: 'fixture-budget-error' }))).status).toBe(503);
  expect(global.fetch).not.toHaveBeenCalled();
});
test('aborts slow provider calls and emits a stable error', async () => {
  jest.useFakeTimers();
  global.fetch.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('sensitive upstream detail'), { name: 'AbortError' })));
  }));
  const result = handleLocationSeed(request({ action: 'address', query: 'fixture-timeout' }));
  await jest.advanceTimersByTimeAsync(8001);
  expect((await result).status).toBe(504);
  jest.useRealTimers();
});
