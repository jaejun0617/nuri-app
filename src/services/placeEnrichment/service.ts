import type {
  AnimalHospitalOperatingBadge,
  AnimalHospitalPublicHospital,
} from '../../domains/animalHospital/types';
import { sanitizeAnimalHospitalDialUri } from '../../domains/animalHospital/trust';
import type { LocationDiscoveryItem } from '../locationDiscovery/types';
import { buildExternalMapUrl } from '../locationDiscovery/maps';
import { buildStaticMapPreviewUrl } from '../locationDiscovery/maps';
import { supabase } from '../supabase/client';

export type PlaceEnrichmentDomain = 'animalHospital' | 'walk';
export type PlaceEnrichmentField =
  | 'phone'
  | 'coordinates'
  | 'thumbnail'
  | 'hours'
  | 'website';
export type PlaceEnrichmentStatus =
  | 'cached'
  | 'enriched'
  | 'queued'
  | 'budget_blocked'
  | 'skipped'
  | 'error';
export type PlaceEnrichmentSource = 'existing' | 'cache' | 'provider' | 'none';

export type PlaceEnrichmentTarget = {
  domain: PlaceEnrichmentDomain;
  placeId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  thumbnailUrl: string | null;
  externalPlaceId: string | null;
  providerPlaceUrl: string | null;
  externalMapUrl: string | null;
  requestedFields: ReadonlyArray<PlaceEnrichmentField>;
};

export type PlaceEnrichmentOpeningHours = Record<string, unknown>;

export type PlaceEnrichmentResult = {
  businessStatus: string | null;
  domain: PlaceEnrichmentDomain;
  placeId: string;
  status: PlaceEnrichmentStatus;
  source: PlaceEnrichmentSource;
  currentOpeningHours: PlaceEnrichmentOpeningHours | null;
  dynamicStatusExpiresAt: string | null;
  phone: string | null;
  photoAttributionLabel: string | null;
  regularOpeningHours: PlaceEnrichmentOpeningHours | null;
  hoursFetchedAt: string | null;
  hoursExpiresAt: string | null;
  thumbnailUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  externalMapUrl: string | null;
  providerPlaceId: string | null;
  providerPlaceUrl: string | null;
  cacheExpiresAt: string | null;
  retryAfterMs: number | null;
  errorCode: string | null;
  websiteUri: string | null;
};

type PlaceEnrichmentResponse = {
  ok: boolean;
  requested?: number;
  results?: unknown;
};

const PLACE_ENRICHMENT_FUNCTION_NAME = 'place-enrichment-demand';
const MAX_BATCH_TARGETS = 12;

function normalizeString(value: string | null | undefined): string | null {
  const normalized = `${value ?? ''}`.trim();
  return normalized ? normalized : null;
}

function normalizeHttpUrl(value: string | null | undefined): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

function normalizeObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readNullableNumber(value: number | string | null | undefined): number | null {
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

function normalizeRequestedFields(
  fields: ReadonlyArray<PlaceEnrichmentField>,
): PlaceEnrichmentField[] {
  return [
    ...new Set(
      fields.filter(field =>
        ['phone', 'coordinates', 'thumbnail', 'hours', 'website'].includes(
          field,
        ),
      ),
    ),
  ];
}

function toRequestedFieldsFromSnapshot(input: {
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  thumbnailUrl: string | null;
}): PlaceEnrichmentField[] {
  const fields: PlaceEnrichmentField[] = [];
  if (!normalizeString(input.phone)) {
    fields.push('phone');
  }
  if (input.latitude === null || input.longitude === null) {
    fields.push('coordinates');
  }
  if (!normalizeHttpUrl(input.thumbnailUrl)) {
    fields.push('thumbnail');
  }
  return fields;
}

export function buildPlaceEnrichmentQueryKey(
  target: Pick<PlaceEnrichmentTarget, 'domain' | 'placeId'> &
    Partial<Pick<PlaceEnrichmentTarget, 'requestedFields'>>,
) {
  const requestedFields =
    'requestedFields' in target && Array.isArray(target.requestedFields)
      ? normalizeRequestedFields(target.requestedFields).sort().join(',')
      : 'default';
  return ['place-enrichment', target.domain, target.placeId, requestedFields] as const;
}

export function buildAnimalHospitalPlaceEnrichmentTarget(
  item: AnimalHospitalPublicHospital,
  options?: {
    includeDetails?: boolean;
  },
): PlaceEnrichmentTarget {
  const requestedFields = normalizeRequestedFields([
    ...toRequestedFieldsFromSnapshot({
      latitude: item.latitude,
      longitude: item.longitude,
      phone: item.officialPhone,
      thumbnailUrl: item.thumbnailUrl,
    }),
    ...(options?.includeDetails ? (['hours', 'website'] as const) : []),
  ]);

  return {
    address: item.address,
    domain: 'animalHospital',
    externalMapUrl: item.links.externalMapUrl,
    externalPlaceId: null,
    latitude: item.latitude,
    longitude: item.longitude,
    name: item.name,
    phone: item.officialPhone,
    placeId: item.id,
    providerPlaceUrl: item.links.providerPlaceUrl,
    requestedFields,
    thumbnailUrl: item.thumbnailUrl,
  };
}

export function buildLocationDiscoveryPlaceEnrichmentTarget(
  item: LocationDiscoveryItem,
): PlaceEnrichmentTarget {
  const isCanonicalWalkPoi = item.source.provider === 'walk_poi';

  return {
    address: item.address,
    domain: 'walk',
    externalMapUrl: isCanonicalWalkPoi ? null : item.placeUrl,
    externalPlaceId: isCanonicalWalkPoi ? null : item.source.externalPlaceId,
    latitude: item.latitude,
    longitude: item.longitude,
    name: item.name,
    phone: item.phone,
    placeId: item.id,
    providerPlaceUrl: isCanonicalWalkPoi ? null : item.placeUrl,
    requestedFields: isCanonicalWalkPoi
      ? []
      : normalizeRequestedFields(
          toRequestedFieldsFromSnapshot({
            latitude: item.latitude,
            longitude: item.longitude,
            phone: item.phone,
            thumbnailUrl: item.thumbnailUrl,
          }).filter(field => field === 'thumbnail'),
        ),
    thumbnailUrl: item.thumbnailUrl,
  };
}

export async function demandPlaceEnrichment(
  targets: ReadonlyArray<PlaceEnrichmentTarget>,
): Promise<PlaceEnrichmentResult[]> {
  const normalizedTargets = targets
    .slice(0, MAX_BATCH_TARGETS)
    .map(target => ({
      address: target.address,
      domain: target.domain,
      externalMapUrl: target.externalMapUrl,
      externalPlaceId: target.externalPlaceId,
      latitude: target.latitude,
      longitude: target.longitude,
      name: target.name,
      phone: target.phone,
      placeId: target.placeId,
      providerPlaceUrl: target.providerPlaceUrl,
      requestedFields: target.requestedFields,
      thumbnailUrl: target.thumbnailUrl,
    }))
    .filter(target => target.requestedFields.length > 0);

  if (normalizedTargets.length === 0) {
    return [];
  }

  const shouldLogDetailDemand = normalizedTargets.some(
    target =>
      target.domain === 'animalHospital' &&
      target.requestedFields.some(
        field => field === 'hours' || field === 'website',
      ),
  );

  if (shouldLogDetailDemand) {
    console.info(
      '[NURI-DEBUG] place-enrichment-demand called',
      JSON.stringify({
        fields: normalizedTargets.flatMap(target => target.requestedFields),
        targetCount: normalizedTargets.length,
      }),
    );
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      PLACE_ENRICHMENT_FUNCTION_NAME,
      {
        body: {
          targets: normalizedTargets,
        },
      },
    );

    if (error) {
      throw new Error(error.message || 'place enrichment demand failed');
    }

    const results = parsePlaceEnrichmentResults(data as PlaceEnrichmentResponse);

    if (shouldLogDetailDemand) {
      console.info(
        '[NURI-DEBUG] place-enrichment-demand completed',
        JSON.stringify({
          resultCount: results.length,
          statuses: results.map(result => result.status),
        }),
      );
    }

    return results;
  } catch (error: unknown) {
    console.info(
      '[NURI-DEBUG] place-enrichment-demand failed silently',
      JSON.stringify({
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'unknown',
        targetCount: normalizedTargets.length,
      }),
    );
    return [];
  }
}

function parsePlaceEnrichmentResults(
  response: PlaceEnrichmentResponse,
): PlaceEnrichmentResult[] {
  if (!response?.ok) {
    throw new Error('place enrichment response is not ok');
  }

  if (!Array.isArray(response.results)) {
    return [];
  }

  return response.results
    .map(result => parsePlaceEnrichmentResult(result))
    .filter((result): result is PlaceEnrichmentResult => result !== null);
}

function parsePlaceEnrichmentResult(
  rawResult: unknown,
): PlaceEnrichmentResult | null {
  if (!rawResult || typeof rawResult !== 'object') {
    return null;
  }

  const domain = normalizeString((rawResult as { domain?: string }).domain);
  const placeId = normalizeString((rawResult as { placeId?: string }).placeId);
  const status = normalizeString((rawResult as { status?: string }).status);
  const source = normalizeString((rawResult as { source?: string }).source);

  if (!domain || !placeId || !status || !source) {
    return null;
  }

  return {
    businessStatus: normalizeString(
      (rawResult as { businessStatus?: string | null }).businessStatus,
    ),
    cacheExpiresAt: normalizeString(
      (rawResult as { cacheExpiresAt?: string | null }).cacheExpiresAt,
    ),
    currentOpeningHours: normalizeObject(
      (rawResult as { currentOpeningHours?: unknown }).currentOpeningHours,
    ),
    domain: domain as PlaceEnrichmentDomain,
    dynamicStatusExpiresAt: normalizeString(
      (rawResult as { dynamicStatusExpiresAt?: string | null })
        .dynamicStatusExpiresAt,
    ),
    errorCode: normalizeString(
      (rawResult as { errorCode?: string | null }).errorCode,
    ),
    externalMapUrl: normalizeHttpUrl(
      (rawResult as { externalMapUrl?: string | null }).externalMapUrl,
    ),
    latitude: readNullableNumber(
      (rawResult as { latitude?: number | string | null }).latitude,
    ),
    hoursExpiresAt: normalizeString(
      (rawResult as { hoursExpiresAt?: string | null }).hoursExpiresAt,
    ),
    hoursFetchedAt: normalizeString(
      (rawResult as { hoursFetchedAt?: string | null }).hoursFetchedAt,
    ),
    longitude: readNullableNumber(
      (rawResult as { longitude?: number | string | null }).longitude,
    ),
    phone: normalizeString((rawResult as { phone?: string | null }).phone),
    placeId,
    photoAttributionLabel: normalizeString(
      (rawResult as { photoAttributionLabel?: string | null })
        .photoAttributionLabel,
    ),
    providerPlaceId: normalizeString(
      (rawResult as { providerPlaceId?: string | null }).providerPlaceId,
    ),
    providerPlaceUrl: normalizeHttpUrl(
      (rawResult as { providerPlaceUrl?: string | null }).providerPlaceUrl,
    ),
    regularOpeningHours: normalizeObject(
      (rawResult as { regularOpeningHours?: unknown }).regularOpeningHours,
    ),
    retryAfterMs: readNullableNumber(
      (rawResult as { retryAfterMs?: number | string | null }).retryAfterMs,
    ),
    source: source as PlaceEnrichmentSource,
    status: status as PlaceEnrichmentStatus,
    thumbnailUrl: normalizeHttpUrl(
      (rawResult as { thumbnailUrl?: string | null }).thumbnailUrl,
    ),
    websiteUri: normalizeHttpUrl(
      (rawResult as { websiteUri?: string | null }).websiteUri,
    ),
  };
}

function readOpeningOpenNow(
  currentOpeningHours: PlaceEnrichmentOpeningHours | null,
): boolean | null {
  const value = currentOpeningHours?.openNow;
  return typeof value === 'boolean' ? value : null;
}

function isFreshIsoTimestamp(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const expiresAt = Date.parse(value);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function resolveProviderOperatingBadge(
  enrichment: PlaceEnrichmentResult,
): AnimalHospitalOperatingBadge | null {
  if (!isFreshIsoTimestamp(enrichment.dynamicStatusExpiresAt)) {
    return null;
  }

  const openNow = readOpeningOpenNow(enrichment.currentOpeningHours);
  if (openNow === true) {
    return {
      expiresAt: enrichment.dynamicStatusExpiresAt,
      kind: 'open',
      label: '영업 중',
      source: 'provider',
    };
  }

  if (
    openNow === false ||
    enrichment.businessStatus === 'CLOSED_TEMPORARILY' ||
    enrichment.businessStatus === 'CLOSED_PERMANENTLY'
  ) {
    return {
      expiresAt: enrichment.dynamicStatusExpiresAt,
      kind: 'closed',
      label: '영업 종료',
      source: 'provider',
    };
  }

  return null;
}

export function mergeAnimalHospitalPlaceEnrichment(
  item: AnimalHospitalPublicHospital,
  enrichment: PlaceEnrichmentResult | null | undefined,
): AnimalHospitalPublicHospital {
  if (!enrichment || enrichment.domain !== 'animalHospital') {
    return item;
  }

  const latitude = enrichment.latitude ?? item.latitude;
  const longitude = enrichment.longitude ?? item.longitude;
  const externalMapUrl =
    enrichment.externalMapUrl ??
    (latitude !== null && longitude !== null
      ? buildExternalMapUrl({
          label: item.name,
          latitude,
          longitude,
        })
      : item.links.externalMapUrl);
  const providerPlaceUrl = enrichment.providerPlaceUrl ?? item.links.providerPlaceUrl;
  const officialPhone = enrichment.phone ?? item.officialPhone;
  const operatingBadge =
    item.operatingBadge?.kind === 'open24'
      ? item.operatingBadge
      : resolveProviderOperatingBadge(enrichment) ?? item.operatingBadge;

  return {
    ...item,
    latitude,
    links: {
      callUri: sanitizeAnimalHospitalDialUri(officialPhone),
      externalMapUrl,
      providerPlaceUrl,
    },
    longitude,
    officialPhone,
    operatingBadge,
    thumbnailUrl: enrichment.thumbnailUrl ?? item.thumbnailUrl,
  };
}

export function mergeLocationDiscoveryPlaceEnrichment(
  item: LocationDiscoveryItem,
  enrichment: PlaceEnrichmentResult | null | undefined,
): LocationDiscoveryItem {
  if (!enrichment || enrichment.domain !== 'walk') {
    return item;
  }

  const latitude = enrichment.latitude ?? item.latitude;
  const longitude = enrichment.longitude ?? item.longitude;

  return {
    ...item,
    latitude,
    longitude,
    mapPreviewUrl: buildStaticMapPreviewUrl({ latitude, longitude }),
    phone: enrichment.phone ?? item.phone,
    placeUrl: enrichment.providerPlaceUrl ?? enrichment.externalMapUrl ?? item.placeUrl,
    thumbnailUrl: enrichment.thumbnailUrl ?? item.thumbnailUrl,
  };
}
