/* global Deno, globalThis */
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';

const KAKAO_KEYWORD_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const KAKAO_ADDRESS_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/address.json';
const KAKAO_COORD_TO_REGION_URL = 'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json';
const KAKAO_PROVIDER_CACHE_TTL_MS = 10 * 60 * 1000;
const KAKAO_PROVIDER_CACHE_MAX_ENTRIES = 200;
const MAX_BODY_BYTES = 4096;
const MAX_QUERY_LENGTH = 120;
const PROVIDER_TIMEOUT_MS = 8000;

const kakaoProviderCache = new Map();

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new globalThis.Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

async function readJsonBody(request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('invalid_json_body');
  }
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new Error('body_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_json_body');
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error('body_too_large');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const value = JSON.parse(new globalThis.TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new Error('invalid_json_body'); }
}

function normalizeString(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized ? normalized : null;
}

function validCoordinates(value) {
  return value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
    && value.latitude >= -90 && value.latitude <= 90
    && value.longitude >= -180 && value.longitude <= 180;
}

function readFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeKeywordInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'object') {
    return null;
  }

  const query = normalizeString(rawInput.query);
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return null;
  }

  const coordinates =
    rawInput.coordinates && typeof rawInput.coordinates === 'object'
      ? {
          latitude: readFiniteNumber(rawInput.coordinates.latitude),
          longitude: readFiniteNumber(rawInput.coordinates.longitude),
        }
      : null;
  const hasCoordinates = validCoordinates(coordinates);
  if (rawInput.coordinates != null && !hasCoordinates) return null;

  return {
    coordinates: hasCoordinates ? coordinates : null,
    page: Math.min(45, Math.max(1, Math.trunc(readFiniteNumber(rawInput.page) ?? 1))),
    query,
    radiusMeters: Math.min(
      20000,
      Math.max(500, Math.trunc(readFiniteNumber(rawInput.radiusMeters) ?? 3000)),
    ),
    size: Math.min(15, Math.max(1, Math.trunc(readFiniteNumber(rawInput.size) ?? 10))),
  };
}

function buildKeywordUrl(input) {
  const params = new URLSearchParams();
  params.set('query', input.query);
  params.set('size', String(input.size));
  params.set('page', String(input.page));

  if (input.coordinates) {
    params.set('x', String(input.coordinates.longitude));
    params.set('y', String(input.coordinates.latitude));
    params.set('radius', String(input.radiusMeters));
    params.set('sort', 'distance');
  }

  return `${KAKAO_KEYWORD_SEARCH_URL}?${params.toString()}`;
}

function buildAddressUrl(query) {
  const params = new URLSearchParams();
  params.set('query', query);
  params.set('size', '10');
  params.set('analyze_type', 'exact');
  return `${KAKAO_ADDRESS_SEARCH_URL}?${params.toString()}`;
}

function buildCoordToRegionUrl(rawCoordinates) {
  if (!rawCoordinates || typeof rawCoordinates !== 'object') {
    return null;
  }

  const latitude = readFiniteNumber(rawCoordinates.latitude);
  const longitude = readFiniteNumber(rawCoordinates.longitude);
  if (!validCoordinates({ latitude, longitude })) {
    return null;
  }

  const params = new URLSearchParams();
  params.set('x', String(longitude));
  params.set('y', String(latitude));
  return `${KAKAO_COORD_TO_REGION_URL}?${params.toString()}`;
}

async function fetchKakao(url, apiKey) {
  const cached = readKakaoProviderCache(url);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  let json;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('provider_unavailable');
    json = await response.json();
  } finally { clearTimeout(timeout); }
  const documents = Array.isArray(json.documents) ? json.documents : [];
  writeKakaoProviderCache(url, documents);
  return documents;
}

function readKakaoProviderCache(url) {
  const cached = kakaoProviderCache.get(url);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    kakaoProviderCache.delete(url);
    return null;
  }

  return cached.documents;
}

function writeKakaoProviderCache(url, documents) {
  if (kakaoProviderCache.size >= KAKAO_PROVIDER_CACHE_MAX_ENTRIES) {
    const oldestKey = kakaoProviderCache.keys().next().value;
    if (oldestKey) {
      kakaoProviderCache.delete(oldestKey);
    }
  }

  kakaoProviderCache.set(url, {
    documents,
    expiresAt: Date.now() + KAKAO_PROVIDER_CACHE_TTL_MS,
  });
}

export async function handleLocationSeed(request) {
  if (request.method === 'GET') {
    return jsonResponse({
      ok: true,
      scope: 'location-discovery-seed',
      message: 'ready',
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
  }

  try {
    const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearer) return jsonResponse({ ok: false, error: 'authentication_required' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: identity, error: authError } = await client.auth.getUser(bearer);
    if (authError || !identity?.user || identity.user.is_anonymous) {
      return jsonResponse({ ok: false, error: 'authentication_required' }, 401);
    }
    const body = await readJsonBody(request);
    const action = normalizeString(body.action);
    let providerUrl;
    if (action === 'keyword') {
      const input = normalizeKeywordInput(body.input);
      if (!input) return jsonResponse({ ok: false, error: 'invalid_keyword_input' }, 400);
      providerUrl = buildKeywordUrl(input);
    } else if (action === 'address') {
      const query = normalizeString(body.query);
      if (!query || query.length > MAX_QUERY_LENGTH) return jsonResponse({ ok: false, error: 'invalid_address_query' }, 400);
      providerUrl = buildAddressUrl(query);
    } else if (action === 'coord2region') {
      providerUrl = buildCoordToRegionUrl(body.coordinates);
      if (!providerUrl) return jsonResponse({ ok: false, error: 'invalid_coordinates' }, 400);
    } else {
      return jsonResponse({ ok: false, error: 'unsupported_action' }, 400);
    }
    const apiKey = normalizeString(Deno.env.get('KAKAO_REST_API_KEY'));
    if (!apiKey) {
      return jsonResponse(
        {
          ok: false,
          error: 'provider_unconfigured',
        },
        500,
      );
    }

    const { data: budget, error: budgetError } = await client.rpc('claim_location_discovery_budget', { p_user_id: identity.user.id });
    if (budgetError || !Array.isArray(budget) || !budget[0]) {
      return jsonResponse({ ok: false, error: 'budget_unavailable' }, 503);
    }
    if (!budget[0].allowed) {
      return jsonResponse({ ok: false, error: 'location_rate_limited', retryAfterSeconds: budget[0].retry_after_seconds }, 429,
        { 'Retry-After': String(budget[0].retry_after_seconds) });
    }
    return jsonResponse({ ok: true, documents: await fetchKakao(providerUrl, apiKey) });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'body_too_large') return jsonResponse({ ok: false, error: code }, 413);
    if (code === 'invalid_json_body') return jsonResponse({ ok: false, error: code }, 400);
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return jsonResponse({ ok: false, error: timedOut ? 'provider_timeout' : 'provider_unavailable' }, timedOut ? 504 : 502);
  }
}

Deno.serve(handleLocationSeed);
