/* global Deno, globalThis */
import { createClient } from 'npm:@supabase/supabase-js@2.97.0';
import {
  isPlaceEnrichmentProviderRuntimeDisabled,
  normalizeHardCap,
  PLACE_ENRICHMENT_PROVIDER_DISABLED_ERROR_CODE,
} from './place-enrichment-runtime-policy.js';

const CACHE_TTL_DAYS = 30;
const DEFAULT_LOCK_TTL_SECONDS = 45;
const MAX_TARGETS = 12;
const MAX_INLINE_WAIT_ATTEMPTS = 3;
const INLINE_WAIT_DELAY_MS = 250;
export const DEFAULT_BACKGROUND_LIMIT = 10;
export const DEFAULT_BACKGROUND_MAX_UNITS = 20;
const MAX_BACKGROUND_LIMIT = 25;
const MAX_BACKGROUND_MAX_UNITS = 50;
const DYNAMIC_STATUS_TTL_HOURS = 6;
const GOOGLE_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_TEXT_SEARCH_BASE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.googleMapsUri',
];
const GOOGLE_TEXT_SEARCH_PHONE_FIELD_MASK = [
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
];
const GOOGLE_TEXT_SEARCH_PHOTO_FIELD_MASK = [
  'places.photos.name',
  'places.photos.authorAttributions',
];
const GOOGLE_TEXT_SEARCH_HOURS_FIELD_MASK = [
  'places.businessStatus',
  'places.currentOpeningHours',
  'places.regularOpeningHours',
];
const GOOGLE_TEXT_SEARCH_WEBSITE_FIELD_MASK = ['places.websiteUri'];
const GOOGLE_PHOTO_WIDTH = 640;
const STRONG_MATCH_SCORE = 85;
const ALLOWED_FIELDS = ['phone', 'coordinates', 'thumbnail', 'hours', 'website'];

export function createWorkerContext() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const googleApiKey =
    Deno.env.get('GOOGLE_PLACES_API_KEY')?.trim() ||
    Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim() ||
    '';

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return {
    googleApiKey: googleApiKey || null,
    hardCap: normalizeHardCap(Deno.env.get('NURI_PLACE_ENRICHMENT_HARD_CAP')),
    provider: 'google-places',
    supabase,
  };
}

export function readJsonBody(request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return Promise.resolve({});
  }

  return request.json().catch(() => ({}));
}

export function jsonResponse(body, status = 200) {
  return new globalThis.Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function normalizePositiveInteger(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export function normalizeBackgroundLimit(value) {
  return normalizePositiveInteger(
    value,
    DEFAULT_BACKGROUND_LIMIT,
    MAX_BACKGROUND_LIMIT,
  );
}

export function normalizeBackgroundMaxUnits(value) {
  return normalizePositiveInteger(
    value,
    DEFAULT_BACKGROUND_MAX_UNITS,
    MAX_BACKGROUND_MAX_UNITS,
  );
}

export function verifyCronRequest(request, envKey) {
  const configuredSecret = Deno.env.get(envKey)?.trim() ?? '';
  if (!configuredSecret) {
    return true;
  }

  const headerSecret =
    request.headers.get('x-cron-secret')?.trim() ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    '';

  return headerSecret === configuredSecret;
}

export function normalizeTargets(rawTargets) {
  if (!Array.isArray(rawTargets)) {
    return [];
  }

  const uniqueTargets = new Map();
  for (const rawTarget of rawTargets.slice(0, MAX_TARGETS)) {
    const normalized = normalizeTarget(rawTarget);
    if (!normalized) {
      continue;
    }

    uniqueTargets.set(`${normalized.domain}:${normalized.placeId}`, normalized);
  }

  return [...uniqueTargets.values()];
}

function normalizeTarget(rawTarget) {
  if (!rawTarget || typeof rawTarget !== 'object') {
    return null;
  }

  const domain = normalizeString(rawTarget.domain);
  const placeId = normalizeString(rawTarget.placeId);
  const name = normalizeString(rawTarget.name);
  const address = normalizeString(rawTarget.address);

  if (!domain || !placeId || !name || !address) {
    return null;
  }

  const latitude = readNullableNumber(rawTarget.latitude);
  const longitude = readNullableNumber(rawTarget.longitude);
  const requestedFields = normalizeRequestedFields(
    Array.isArray(rawTarget.requestedFields) ? rawTarget.requestedFields : null,
    {
      latitude,
      longitude,
      phone: normalizeString(rawTarget.phone),
      thumbnailUrl: normalizeHttpUrl(rawTarget.thumbnailUrl),
    },
  );

  if (requestedFields.length === 0) {
    return {
      address,
      domain,
      externalMapUrl: normalizeHttpUrl(rawTarget.externalMapUrl),
      externalPlaceId: normalizeString(rawTarget.externalPlaceId),
      latitude,
      longitude,
      name,
      phone: normalizeString(rawTarget.phone),
      placeId,
      providerPlaceUrl: normalizeHttpUrl(rawTarget.providerPlaceUrl),
      requestedFields: [],
      thumbnailUrl: normalizeHttpUrl(rawTarget.thumbnailUrl),
    };
  }

  return {
    address,
    domain,
    externalMapUrl: normalizeHttpUrl(rawTarget.externalMapUrl),
    externalPlaceId: normalizeString(rawTarget.externalPlaceId),
    latitude,
    longitude,
    name,
    phone: normalizeString(rawTarget.phone),
    placeId,
    providerPlaceUrl: normalizeHttpUrl(rawTarget.providerPlaceUrl),
    requestedFields,
    thumbnailUrl: normalizeHttpUrl(rawTarget.thumbnailUrl),
  };
}

function normalizeRequestedFields(rawFields, fallback) {
  if (!rawFields || rawFields.length === 0) {
    const inferred = [];
    if (!fallback.phone) inferred.push('phone');
    if (fallback.latitude === null || fallback.longitude === null) {
      inferred.push('coordinates');
    }
    if (!fallback.thumbnailUrl) inferred.push('thumbnail');
    return inferred;
  }

  return [...new Set(rawFields.map(normalizeString).filter(field => ALLOWED_FIELDS.includes(field)))];
}

export async function processDemandTargets(context, targets) {
  const results = [];

  for (const target of targets) {
    results.push(await processTarget(context, target, 'demand'));
  }

  return {
    providerRuntimeDisabled: isPlaceEnrichmentProviderRuntimeDisabled(
      context.hardCap,
    ),
    requested: targets.length,
    results,
  };
}

export async function processBackgroundBatch(context, options = {}) {
  const limit = normalizeBackgroundLimit(options.limit);
  const maxUnits = normalizeBackgroundMaxUnits(options.maxUnits);
  const summary = {
    budgetBlocked: 0,
    cached: 0,
    chargedUnits: 0,
    enriched: 0,
    errors: 0,
    limit,
    maxUnits,
    processed: 0,
    providerRuntimeDisabled: isPlaceEnrichmentProviderRuntimeDisabled(
      context.hardCap,
    ),
    queued: 0,
    remainingUnits: maxUnits,
    requested: 0,
    results: [],
    skipped: 0,
  };

  if (summary.providerRuntimeDisabled) {
    summary.remainingUnits = maxUnits;
    return summary;
  }

  const targets = await fetchBackgroundTargets(
    context.supabase,
    context.provider,
    limit,
  );
  summary.requested = targets.length;

  for (const target of targets) {
    const estimatedUnits = estimateBudgetUnits(target.requestedFields);
    if (summary.remainingUnits < estimatedUnits) {
      summary.results.push({
        domain: target.domain,
        errorCode: 'run_cap_reached',
        placeId: target.placeId,
        requestedFields: target.requestedFields,
        source: 'none',
        status: 'skipped',
      });
      summary.skipped += 1;
      continue;
    }

    const result = await processTarget(context, target, 'cron');
    const chargedUnits = readNullableNumber(result.chargedUnits) ?? 0;
    summary.chargedUnits += chargedUnits;
    summary.processed += 1;
    summary.remainingUnits = Math.max(summary.remainingUnits - chargedUnits, 0);
    summary.results.push(result);

    switch (result.status) {
      case 'enriched':
        summary.enriched += 1;
        break;
      case 'cached':
        summary.cached += 1;
        break;
      case 'queued':
        summary.queued += 1;
        break;
      case 'budget_blocked':
        summary.budgetBlocked += 1;
        break;
      case 'error':
        summary.errors += 1;
        break;
      default:
        summary.skipped += 1;
        break;
    }

    if (result.status === 'budget_blocked') {
      break;
    }
  }

  return summary;
}

async function processTarget(context, target, budgetTrack) {
  const baseResult = buildBaseResult(target);
  if (target.requestedFields.length === 0) {
    return {
      ...baseResult,
      chargedUnits: 0,
      source: 'existing',
      status: 'skipped',
    };
  }

  if (isPlaceEnrichmentProviderRuntimeDisabled(context.hardCap)) {
    return {
      ...baseResult,
      chargedUnits: 0,
      errorCode: PLACE_ENRICHMENT_PROVIDER_DISABLED_ERROR_CODE,
      source: 'existing',
      status: 'skipped',
    };
  }

  const freshCache = await getFreshCacheRow(context.supabase, context.provider, target);
  if (freshCache && cacheCoversRequestedFields(freshCache, target.requestedFields)) {
    return {
      ...buildCacheResult(target, freshCache),
      chargedUnits: 0,
    };
  }

  const workerId = globalThis.crypto.randomUUID();
  const claim = await claimJob(context.supabase, target, context.provider, workerId);
  if (!claim.claimGranted) {
    const polledCache = await waitForPeerResult(context.supabase, context.provider, target);
    if (polledCache && cacheCoversRequestedFields(polledCache, target.requestedFields)) {
      return {
        ...buildCacheResult(target, polledCache),
        chargedUnits: 0,
      };
    }

    return {
      ...baseResult,
      chargedUnits: 0,
      retryAfterMs: INLINE_WAIT_DELAY_MS * MAX_INLINE_WAIT_ATTEMPTS,
      source: 'none',
      status: 'queued',
    };
  }

  const requestedFields = claim.requestedFields;

  if (!context.googleApiKey) {
    await completeJob(context.supabase, claim.jobId, 'failed', baseResult, 'provider_unconfigured', 'GOOGLE_PLACES_API_KEY is not configured');
    return {
      ...baseResult,
      chargedUnits: 0,
      errorCode: 'provider_unconfigured',
      source: 'none',
      status: 'error',
    };
  }

  const estimatedUnits = estimateBudgetUnits(requestedFields);
  const budget = await claimBudget(
    context.supabase,
    context.provider,
    budgetTrack,
    estimatedUnits,
    context.hardCap,
  );
  if (!budget.allowed) {
    await completeJob(context.supabase, claim.jobId, 'budget_blocked', baseResult, 'budget_blocked', 'place enrichment budget exhausted');
    return {
      ...baseResult,
      chargedUnits: 0,
      errorCode: 'budget_blocked',
      retryAfterMs: 15 * 60 * 1000,
      source: 'none',
      status: 'budget_blocked',
    };
  }

  try {
    const providerPayload = await fetchGooglePlaceCandidate(
      target,
      requestedFields,
      context.googleApiKey,
    );
    const enrichment = await buildProviderResult(target, requestedFields, providerPayload, context.googleApiKey);
    await upsertProviderCache(context.supabase, context.provider, target, requestedFields, enrichment, providerPayload);
    await completeJob(context.supabase, claim.jobId, 'completed', enrichment, null, null);

    return {
      ...baseResult,
      ...pickOverlayFields(enrichment),
      cacheExpiresAt: enrichment.cacheExpiresAt,
      chargedUnits: estimatedUnits,
      providerPlaceId: enrichment.providerPlaceId,
      providerPlaceUrl: enrichment.providerPlaceUrl,
      retryAfterMs: null,
      source: enrichment.source,
      status: 'enriched',
    };
  } catch (error) {
    const normalized = normalizeWorkerError(error);
    const fallbackCache = await getFreshCacheRow(context.supabase, context.provider, target);
    const fallbackResult =
      fallbackCache && cacheCoversRequestedFields(fallbackCache, target.requestedFields)
        ? buildCacheResult(target, fallbackCache)
        : baseResult;

    await completeJob(
      context.supabase,
      claim.jobId,
      'failed',
      fallbackResult,
      normalized.code,
      normalized.message,
    );

    return {
      ...fallbackResult,
      chargedUnits: estimatedUnits,
      errorCode: normalized.code,
      source: fallbackResult.source ?? 'none',
      status: 'error',
    };
  }
}

function buildBaseResult(target) {
  return {
    businessStatus: null,
    cacheExpiresAt: null,
    currentOpeningHours: null,
    domain: target.domain,
    dynamicStatusExpiresAt: null,
    errorCode: null,
    externalMapUrl: target.externalMapUrl,
    hoursExpiresAt: null,
    hoursFetchedAt: null,
    latitude: target.latitude,
    longitude: target.longitude,
    phone: target.phone,
    placeId: target.placeId,
    photoAttributionLabel: null,
    providerPlaceId: target.externalPlaceId,
    providerPlaceUrl: target.providerPlaceUrl,
    regularOpeningHours: null,
    retryAfterMs: null,
    source: 'existing',
    thumbnailUrl: target.thumbnailUrl,
    websiteUri: null,
  };
}

function buildCacheResult(target, cacheRow) {
  return {
    ...buildBaseResult(target),
    ...pickOverlayFields({
      businessStatus: normalizeString(cacheRow.business_status),
      currentOpeningHours: normalizeJsonObject(cacheRow.current_opening_hours),
      dynamicStatusExpiresAt: normalizeString(cacheRow.dynamic_status_expires_at),
      externalMapUrl: normalizeHttpUrl(cacheRow.google_maps_uri),
      hoursExpiresAt: normalizeString(cacheRow.hours_expires_at),
      hoursFetchedAt: normalizeString(cacheRow.hours_fetched_at),
      latitude: readNullableNumber(cacheRow.latitude),
      longitude: readNullableNumber(cacheRow.longitude),
      phone: normalizeString(cacheRow.phone),
      photoAttributionLabel: resolvePhotoAttributionLabel(cacheRow.photo_attributions),
      providerPlaceId: normalizeString(cacheRow.provider_place_id),
      providerPlaceUrl: normalizeHttpUrl(cacheRow.google_maps_uri),
      regularOpeningHours: normalizeJsonObject(cacheRow.regular_opening_hours),
      thumbnailUrl: normalizeHttpUrl(cacheRow.photo_uri),
      websiteUri: normalizeHttpUrl(cacheRow.website_uri),
    }),
    cacheExpiresAt: normalizeString(cacheRow.cache_expires_at),
    source: 'cache',
    status: 'cached',
  };
}

function cacheCoversRequestedFields(cacheRow, requestedFields) {
  const attemptedFields = Array.isArray(cacheRow.attempted_fields)
    ? cacheRow.attempted_fields.map(normalizeString).filter(Boolean)
    : [];

  return requestedFields.every(field => {
    if (!attemptedFields.includes(field)) {
      return false;
    }

    if (field === 'hours') {
      const dynamicStatusExpiresAt = Date.parse(`${cacheRow.dynamic_status_expires_at ?? ''}`);
      return Number.isFinite(dynamicStatusExpiresAt) && dynamicStatusExpiresAt > Date.now();
    }

    return true;
  });
}

async function getFreshCacheRow(supabase, provider, target) {
  const { data, error } = await supabase
    .from('nuri_place_provider_cache')
    .select('*')
    .eq('domain', target.domain)
    .eq('place_key', target.placeId)
    .eq('provider', provider)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const cacheExpiresAt = Date.parse(`${data.cache_expires_at ?? ''}`);
  if (!Number.isFinite(cacheExpiresAt) || cacheExpiresAt <= Date.now()) {
    return null;
  }

  return data;
}

async function waitForPeerResult(supabase, provider, target) {
  for (let index = 0; index < MAX_INLINE_WAIT_ATTEMPTS; index += 1) {
    await sleep(INLINE_WAIT_DELAY_MS);
    const cacheRow = await getFreshCacheRow(supabase, provider, target);
    if (cacheRow) {
      return cacheRow;
    }
  }

  return null;
}

async function claimJob(supabase, target, provider, workerId) {
  const { data, error } = await supabase.rpc('claim_nuri_place_enrichment_job', {
    p_cache_key: buildCacheKey(target),
    p_dedupe_key: buildDedupeKey(target, provider),
    p_domain: target.domain,
    p_lock_ttl_seconds: DEFAULT_LOCK_TTL_SECONDS,
    p_place_key: target.placeId,
    p_provider: provider,
    p_requested_fields: target.requestedFields,
    p_worker_id: workerId,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    throw new Error('place enrichment job claim returned empty result');
  }

  return {
    cacheKey: normalizeString(row.cache_key) ?? buildCacheKey(target),
    claimGranted: Boolean(row.claim_granted),
    jobId: normalizeString(row.job_id),
    requestedFields: Array.isArray(row.requested_fields)
      ? row.requested_fields.map(normalizeString).filter(Boolean)
      : target.requestedFields,
  };
}

async function claimBudget(supabase, provider, track, units, hardCap) {
  const { data, error } = await supabase.rpc('claim_nuri_place_enrichment_budget', {
    p_hard_cap: hardCap,
    p_provider: provider,
    p_track: track,
    p_units: units,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    throw new Error('place enrichment budget claim returned empty result');
  }

  return {
    allowed: Boolean(row.allowed),
    budgetMonth: normalizeString(row.usage_month ?? row.budget_month),
    hardCap: readNullableNumber(row.hard_cap),
    remainingUnits: readNullableNumber(row.remaining_units),
    usedUnits: readNullableNumber(row.used_units),
  };
}

async function fetchBackgroundTargets(supabase, provider, limit) {
  const { data, error } = await supabase.rpc(
    'claim_nuri_place_enrichment_worker_targets',
    {
      p_limit: limit,
      p_provider: provider,
    },
  );

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map(row =>
      normalizeTarget({
        address: row.address,
        domain: row.domain,
        externalMapUrl: row.external_map_url,
        externalPlaceId: row.external_place_id,
        latitude: row.latitude,
        longitude: row.longitude,
        name: row.name,
        phone: row.phone,
        placeId: row.place_key,
        providerPlaceUrl: row.provider_place_url,
        requestedFields: Array.isArray(row.requested_fields)
          ? row.requested_fields
          : [],
        thumbnailUrl: row.thumbnail_url,
      }),
    )
    .filter(Boolean);
}

async function completeJob(supabase, jobId, status, resultSnapshot, errorCode, errorMessage) {
  if (!jobId) {
    return null;
  }

  const { error } = await supabase.rpc('complete_nuri_place_enrichment_job', {
    p_error_code: errorCode,
    p_error_message: errorMessage,
    p_job_id: jobId,
    p_result_snapshot: resultSnapshot ?? {},
    p_status: status,
  });

  if (error) {
    console.error(
      JSON.stringify({
        scope: 'place-enrichment-demand',
        event: 'job_complete_failed',
        error: error.message,
        jobId,
        status,
      }),
    );
  }

  return null;
}

function estimateBudgetUnits(requestedFields) {
  let units = 1;
  if (requestedFields.includes('thumbnail')) {
    units += 1;
  }
  if (requestedFields.includes('hours') || requestedFields.includes('website')) {
    units += 1;
  }
  return units;
}

function buildGoogleTextSearchFieldMask(requestedFields) {
  const fields = new Set(GOOGLE_TEXT_SEARCH_BASE_FIELD_MASK);

  if (requestedFields.includes('phone')) {
    GOOGLE_TEXT_SEARCH_PHONE_FIELD_MASK.forEach(field => fields.add(field));
  }

  if (requestedFields.includes('thumbnail')) {
    GOOGLE_TEXT_SEARCH_PHOTO_FIELD_MASK.forEach(field => fields.add(field));
  }

  if (requestedFields.includes('hours')) {
    GOOGLE_TEXT_SEARCH_HOURS_FIELD_MASK.forEach(field => fields.add(field));
  }

  if (requestedFields.includes('website')) {
    GOOGLE_TEXT_SEARCH_WEBSITE_FIELD_MASK.forEach(field => fields.add(field));
  }

  return [...fields].join(',');
}

async function fetchGooglePlaceCandidate(target, requestedFields, apiKey) {
  const response = await fetch(GOOGLE_TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': buildGoogleTextSearchFieldMask(requestedFields),
    },
    body: JSON.stringify(buildGoogleSearchBody(target)),
  });

  if (!response.ok) {
    throw new Error(`google_text_search_failed:${response.status}`);
  }

  const json = await response.json();
  const places = Array.isArray(json.places) ? json.places : [];
  const ranked = places
    .map(place => ({
      match: scoreGooglePlace(target, place),
      place,
    }))
    .sort((left, right) => right.match.score - left.match.score);

  return {
    best: ranked[0] ?? null,
    places,
  };
}

function buildGoogleSearchBody(target) {
  const body = {
    languageCode: 'ko',
    maxResultCount: 5,
    textQuery: `${target.name} ${target.address}`.trim(),
  };

  if (target.latitude !== null && target.longitude !== null) {
    body.locationBias = {
      circle: {
        center: {
          latitude: target.latitude,
          longitude: target.longitude,
        },
        radius: 800,
      },
    };
  }

  return body;
}

function scoreGooglePlace(target, place) {
  const targetName = normalizeForSimilarity(target.name);
  const placeName = normalizeForSimilarity(place.displayName?.text ?? '');
  const targetAddress = normalizeForSimilarity(target.address);
  const placeAddress = normalizeForSimilarity(place.formattedAddress ?? '');
  const exactName = Boolean(targetName && placeName && targetName === placeName);
  const exactAddress = Boolean(targetAddress && placeAddress && targetAddress === placeAddress);
  const looseNameMatch =
    Boolean(targetName && placeName) &&
    (targetName.includes(placeName) || placeName.includes(targetName));
  const distance =
    typeof place.location?.latitude === 'number' &&
    typeof place.location?.longitude === 'number' &&
    target.latitude !== null &&
    target.longitude !== null
      ? calculateDistanceMeters(
          {
            latitude: target.latitude,
            longitude: target.longitude,
          },
          {
            latitude: place.location.latitude,
            longitude: place.location.longitude,
          },
        )
      : null;
  const near = distance !== null && distance <= 120;

  return {
    distanceMeters: distance,
    exactAddress,
    exactName,
    looseNameMatch,
    score:
      (exactName ? 60 : 0) +
      (exactAddress ? 35 : 0) +
      (looseNameMatch ? 10 : 0) +
      (near ? 20 : 0) +
      (normalizeKrPhone(place.nationalPhoneNumber ?? place.internationalPhoneNumber) ? 5 : 0) +
      ((place.photos?.length ?? 0) > 0 ? 3 : 0),
  };
}

async function buildProviderResult(target, requestedFields, providerPayload, apiKey) {
  const best = providerPayload.best;
  const place = best?.place ?? null;
  const match = best?.match ?? null;
  const cacheExpiresAt = buildCacheExpiresAt();
  const hoursRequested = requestedFields.includes('hours');
  const hoursFetchedAt = hoursRequested ? new Date().toISOString() : null;
  const dynamicStatusExpiresAt = hoursRequested ? buildDynamicStatusExpiresAt() : null;

  if (!place || !match || match.score < STRONG_MATCH_SCORE) {
    return {
      businessStatus: null,
      cacheExpiresAt,
      currentOpeningHours: null,
      dynamicStatusExpiresAt,
      externalMapUrl: target.externalMapUrl,
      hoursExpiresAt: hoursRequested ? cacheExpiresAt : null,
      hoursFetchedAt,
      latitude: target.latitude,
      longitude: target.longitude,
      phone: target.phone,
      photoAttributionLabel: null,
      providerPlaceId: null,
      providerPlaceUrl: target.providerPlaceUrl,
      regularOpeningHours: null,
      source: 'none',
      thumbnailUrl: target.thumbnailUrl,
      websiteUri: null,
    };
  }

  const photoResult = requestedFields.includes('thumbnail')
    ? await resolvePhoto(place, apiKey)
    : {
        attributionLabel: null,
        photoAttributions: [],
        thumbnailUrl: target.thumbnailUrl,
      };

  const phone = requestedFields.includes('phone')
    ? normalizeKrPhone(place.nationalPhoneNumber ?? place.internationalPhoneNumber) ?? target.phone
    : target.phone;
  const latitude =
    requestedFields.includes('coordinates') &&
    typeof place.location?.latitude === 'number'
      ? place.location.latitude
      : target.latitude;
  const longitude =
    requestedFields.includes('coordinates') &&
    typeof place.location?.longitude === 'number'
      ? place.location.longitude
      : target.longitude;
  const thumbnailUrl =
    requestedFields.includes('thumbnail')
      ? photoResult.thumbnailUrl ?? target.thumbnailUrl
      : target.thumbnailUrl;
  const websiteUri = requestedFields.includes('website')
    ? normalizeHttpUrl(place.websiteUri)
    : null;

  return {
    businessStatus: hoursRequested ? normalizeString(place.businessStatus) : null,
    cacheExpiresAt,
    currentOpeningHours: hoursRequested ? normalizeJsonObject(place.currentOpeningHours) : null,
    dynamicStatusExpiresAt,
    externalMapUrl: normalizeHttpUrl(place.googleMapsUri) ?? target.externalMapUrl,
    hoursExpiresAt: hoursRequested ? cacheExpiresAt : null,
    hoursFetchedAt,
    latitude,
    longitude,
    phone,
    photoAttributionLabel: photoResult.attributionLabel,
    photoAttributions: photoResult.photoAttributions,
    providerPlaceId: normalizeString(place.id),
    providerPlaceUrl: normalizeHttpUrl(place.googleMapsUri) ?? target.providerPlaceUrl,
    regularOpeningHours: hoursRequested ? normalizeJsonObject(place.regularOpeningHours) : null,
    source: 'provider',
    thumbnailUrl,
    websiteUri,
  };
}

async function resolvePhoto(place, apiKey) {
  const photos = Array.isArray(place.photos) ? place.photos : [];
  const eligiblePhoto = photos.find(photo => Boolean(normalizeString(photo?.name)));

  const photoName = normalizeString(eligiblePhoto?.name);
  if (!photoName) {
    return {
      attributionLabel: null,
      photoAttributions: [],
      thumbnailUrl: null,
    };
  }
  const photoAttributions = Array.isArray(eligiblePhoto?.authorAttributions)
    ? eligiblePhoto.authorAttributions
    : [];

  const params = new URLSearchParams({
    key: apiKey,
    maxWidthPx: String(GOOGLE_PHOTO_WIDTH),
    skipHttpRedirect: 'true',
  });
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?${params.toString()}`,
  );

  if (!response.ok) {
    return {
      attributionLabel: resolvePhotoAttributionLabel(photoAttributions),
      photoAttributions,
      thumbnailUrl: null,
    };
  }

  const json = await response.json();
  return {
    attributionLabel: resolvePhotoAttributionLabel(photoAttributions),
    photoAttributions,
    thumbnailUrl: normalizeHttpUrl(json.photoUri),
  };
}

async function upsertProviderCache(
  supabase,
  provider,
  target,
  requestedFields,
  enrichment,
  providerPayload,
) {
  const best = providerPayload.best;
  const place = best?.place ?? null;
  const match = best?.match ?? null;
  const photoAttributions = Array.isArray(enrichment.photoAttributions)
    ? enrichment.photoAttributions
    : [];

  const row = {
    attempted_fields: requestedFields,
    business_status: enrichment.businessStatus,
    cache_expires_at: enrichment.cacheExpiresAt,
    cache_key: buildCacheKey(target),
    current_opening_hours: enrichment.currentOpeningHours,
    domain: target.domain,
    dynamic_status_expires_at: enrichment.dynamicStatusExpiresAt,
    fetched_at: new Date().toISOString(),
    google_maps_uri: enrichment.providerPlaceUrl,
    hours_expires_at: enrichment.hoursExpiresAt,
    hours_fetched_at: enrichment.hoursFetchedAt,
    last_error_code: null,
    latitude: enrichment.latitude,
    longitude: enrichment.longitude,
    match_score: match?.score ?? 0,
    matched_address: normalizeString(place?.formattedAddress),
    matched_name: normalizeString(place?.displayName?.text),
    phone: enrichment.phone,
    photo_attributions: photoAttributions,
    photo_uri: enrichment.thumbnailUrl,
    place_key: target.placeId,
    provider,
    provider_place_id: enrichment.providerPlaceId,
    regular_opening_hours: enrichment.regularOpeningHours,
    raw_payload: buildRawPayloadSnapshot(providerPayload),
    website_uri: enrichment.websiteUri,
  };

  const { error } = await supabase
    .from('nuri_place_provider_cache')
    .upsert(row, {
      onConflict: 'domain,place_key,provider',
    });

  if (error) {
    throw error;
  }
}

function buildRawPayloadSnapshot(providerPayload) {
  const best = providerPayload.best;
  const place = best?.place ?? null;
  const match = best?.match ?? null;

  return {
    fetchedAt: new Date().toISOString(),
    match,
    place: place
      ? {
          formattedAddress: normalizeString(place.formattedAddress),
          googleMapsUri: normalizeHttpUrl(place.googleMapsUri),
          id: normalizeString(place.id),
          location:
            typeof place.location?.latitude === 'number' &&
            typeof place.location?.longitude === 'number'
              ? {
                  latitude: place.location.latitude,
                  longitude: place.location.longitude,
        }
              : null,
          businessStatus: normalizeString(place.businessStatus),
          name: normalizeString(place.displayName?.text),
          phone: normalizeString(place.nationalPhoneNumber ?? place.internationalPhoneNumber),
          photoCount: Array.isArray(place.photos) ? place.photos.length : 0,
          websiteUri: normalizeHttpUrl(place.websiteUri),
        }
      : null,
    totalCandidates: providerPayload.places.length,
  };
}

function pickOverlayFields(enrichment) {
  return {
    businessStatus: normalizeString(enrichment.businessStatus),
    currentOpeningHours: normalizeJsonObject(enrichment.currentOpeningHours),
    dynamicStatusExpiresAt: normalizeString(enrichment.dynamicStatusExpiresAt),
    externalMapUrl: normalizeHttpUrl(enrichment.externalMapUrl),
    hoursExpiresAt: normalizeString(enrichment.hoursExpiresAt),
    hoursFetchedAt: normalizeString(enrichment.hoursFetchedAt),
    latitude: readNullableNumber(enrichment.latitude),
    longitude: readNullableNumber(enrichment.longitude),
    phone: normalizeString(enrichment.phone),
    photoAttributionLabel: normalizeString(enrichment.photoAttributionLabel),
    providerPlaceId: normalizeString(enrichment.providerPlaceId),
    providerPlaceUrl: normalizeHttpUrl(enrichment.providerPlaceUrl),
    regularOpeningHours: normalizeJsonObject(enrichment.regularOpeningHours),
    thumbnailUrl: normalizeHttpUrl(enrichment.thumbnailUrl),
    websiteUri: normalizeHttpUrl(enrichment.websiteUri),
  };
}

function resolvePhotoAttributionLabel(rawAttributions) {
  if (!Array.isArray(rawAttributions) || rawAttributions.length === 0) {
    return null;
  }

  return (
    rawAttributions
      .map(attribution => normalizeString(attribution?.displayName))
      .find(Boolean) ?? null
  );
}

function buildCacheKey(target) {
  return `${target.domain}:${target.placeId}`;
}

function buildDedupeKey(target, provider) {
  return `${provider}:${target.domain}:${target.placeId}`;
}

function buildCacheExpiresAt() {
  return new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function buildDynamicStatusExpiresAt() {
  return new Date(Date.now() + DYNAMIC_STATUS_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

function normalizeKrPhone(input) {
  const trimmed = normalizeString(input);
  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/[^0-9]/g, '');
  if (!digits) {
    return null;
  }

  if (digits.startsWith('82') && digits.length >= 10) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

function normalizeForSimilarity(value) {
  return `${value ?? ''}`
    .replace(/[\s\-()]/g, '')
    .trim()
    .toLowerCase();
}

function calculateDistanceMeters(left, right) {
  const toRadians = value => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDiff = toRadians(right.latitude - left.latitude);
  const lngDiff = toRadians(right.longitude - left.longitude);
  const leftLat = toRadians(left.latitude);
  const rightLat = toRadians(right.latitude);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(lngDiff / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeString(value) {
  const normalized = `${value ?? ''}`.trim();
  return normalized ? normalized : null;
}

function normalizeHttpUrl(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

function normalizeJsonObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value;
}

function readNullableNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeWorkerError(error) {
  if (error instanceof Error) {
    const [code, ...rest] = error.message.split(':');
    return {
      code: normalizeString(code) ?? 'place_enrichment_failed',
      message: rest.length > 0 ? rest.join(':').trim() : error.message,
    };
  }

  return {
    code: 'place_enrichment_failed',
    message: 'unknown place enrichment error',
  };
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function requireEnv(name) {
  const value = Deno.env.get(name)?.trim() ?? '';
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}
