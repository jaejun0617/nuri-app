/* global Deno, globalThis */

const KAKAO_KEYWORD_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const KAKAO_ADDRESS_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/address.json';
const KAKAO_COORD_TO_REGION_URL = 'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json';

function jsonResponse(body, status = 200) {
  return new globalThis.Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
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
  if (!query) {
    return null;
  }

  const coordinates =
    rawInput.coordinates && typeof rawInput.coordinates === 'object'
      ? {
          latitude: readFiniteNumber(rawInput.coordinates.latitude),
          longitude: readFiniteNumber(rawInput.coordinates.longitude),
        }
      : null;
  const hasCoordinates =
    coordinates?.latitude !== null && coordinates?.longitude !== null;

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
  if (latitude === null || longitude === null) {
    return null;
  }

  const params = new URLSearchParams();
  params.set('x', String(longitude));
  params.set('y', String(latitude));
  return `${KAKAO_COORD_TO_REGION_URL}?${params.toString()}`;
}

async function fetchKakao(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`kakao_seed_failed:${response.status}`);
  }

  const json = await response.json();
  return Array.isArray(json.documents) ? json.documents : [];
}

Deno.serve(async request => {
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
    const body = await readJsonBody(request);
    const action = normalizeString(body.action);
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

    if (action === 'keyword') {
      const input = normalizeKeywordInput(body.input);
      if (!input) {
        return jsonResponse({ ok: false, error: 'invalid_keyword_input' }, 400);
      }

      return jsonResponse({
        ok: true,
        documents: await fetchKakao(buildKeywordUrl(input), apiKey),
      });
    }

    if (action === 'address') {
      const query = normalizeString(body.query);
      if (!query) {
        return jsonResponse({ ok: false, error: 'invalid_address_query' }, 400);
      }

      return jsonResponse({
        ok: true,
        documents: await fetchKakao(buildAddressUrl(query), apiKey),
      });
    }

    if (action === 'coord2region') {
      const url = buildCoordToRegionUrl(body.coordinates);
      if (!url) {
        return jsonResponse({ ok: false, error: 'invalid_coordinates' }, 400);
      }

      return jsonResponse({
        ok: true,
        documents: await fetchKakao(url, apiKey),
      });
    }

    return jsonResponse({ ok: false, error: 'unsupported_action' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown location seed error';

    console.error(
      JSON.stringify({
        scope: 'location-discovery-seed',
        event: 'request_failed',
        message,
      }),
    );

    return jsonResponse(
      {
        ok: false,
        error: message,
      },
      500,
    );
  }
});
