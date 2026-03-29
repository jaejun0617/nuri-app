import { supabase } from '../supabase/client';
import type { LocationDiscoveryVerificationStatus } from './types';

export type PetPlaceMetaProvider =
  | 'kakao'
  | 'google-places'
  | 'tour-api'
  | 'public-data';
export type PetPlaceMetaSourceType =
  | 'system-inference'
  | 'user-report'
  | 'admin-review';
export type PetPlaceExternalSignalProvider =
  | 'google-places'
  | 'tour-api'
  | 'public-data';
export type PetPlaceExternalSignalKey =
  | 'allows-dogs'
  | 'outdoor-seating'
  | 'good-for-children'
  | 'official-pet-policy'
  | 'pet-travel-listing';

export type PetFriendlyPlaceSourceLink = {
  id: string;
  provider: PetPlaceMetaProvider;
  providerPlaceId: string;
  sourcePlaceName: string | null;
  sourceCategoryLabel: string | null;
  sourceAddress: string | null;
  sourceRoadAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  matchedAt: string;
  updatedAt: string;
};

export type PetFriendlyPlaceExternalSignal = {
  id: string;
  signalProvider: PetPlaceExternalSignalProvider;
  signalKey: PetPlaceExternalSignalKey;
  signalValueBoolean: boolean | null;
  signalValueText: string | null;
  signalScore: number;
  sourceNote: string | null;
  observedAt: string | null;
  updatedAt: string;
};

export type PetFriendlyPlaceServiceMeta = {
  id: string;
  verificationStatus: Exclude<
    LocationDiscoveryVerificationStatus,
    'service-ranked'
  >;
  sourceType: PetPlaceMetaSourceType;
  primarySourceProvider: PetPlaceMetaProvider | null;
  primarySourcePlaceId: string | null;
  petPolicyText: string | null;
  adminNote: string | null;
  operatingStatusLabel: string | null;
  userReportCount: number;
  bookmarkedCount: number;
  lastVerifiedAt: string | null;
  sourceLinks: ReadonlyArray<PetFriendlyPlaceSourceLink>;
  externalSignals: ReadonlyArray<PetFriendlyPlaceExternalSignal>;
  createdAt: string;
  updatedAt: string;
};

export type PetFriendlyPlaceMetaLookupInput = {
  provider: PetPlaceMetaProvider;
  providerPlaceIds: ReadonlyArray<string>;
};

type PetPlaceServiceMetaRow = {
  id: string;
  verification_status: string;
  source_type: string;
  primary_source_provider: string | null;
  primary_source_place_id: string | null;
  pet_policy_text: string | null;
  admin_note: string | null;
  operating_status_label: string | null;
  user_report_count: number | null;
  bookmarked_count: number | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

type PetPlaceSourceLinkRow = {
  id: string;
  pet_place_meta_id: string;
  provider: string;
  provider_place_id: string;
  source_place_name: string | null;
  source_category_label: string | null;
  source_address: string | null;
  source_road_address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  matched_at: string;
  updated_at: string;
};

type PetPlaceExternalSignalRow = {
  id: string;
  pet_place_meta_id: string;
  signal_provider: string;
  signal_key: string;
  signal_value_boolean: boolean | null;
  signal_value_text: string | null;
  signal_score: number | null;
  source_note: string | null;
  observed_at: string | null;
  updated_at: string;
};

type MappedPetPlaceSourceLink = PetFriendlyPlaceSourceLink & {
  petPlaceMetaId: string;
};

type MappedPetPlaceExternalSignal = PetFriendlyPlaceExternalSignal & {
  petPlaceMetaId: string;
};

const VALID_VERIFICATION_STATUSES = new Set<
  Exclude<LocationDiscoveryVerificationStatus, 'service-ranked'>
>([
  'unknown',
  'keyword-inferred',
  'user-reported',
  'admin-verified',
  'rejected',
]);

const VALID_SOURCE_TYPES = new Set<PetPlaceMetaSourceType>([
  'system-inference',
  'user-report',
  'admin-review',
]);

const VALID_META_PROVIDERS = new Set<PetPlaceMetaProvider>([
  'kakao',
  'google-places',
  'tour-api',
  'public-data',
]);

const VALID_SIGNAL_PROVIDERS = new Set<PetPlaceExternalSignalProvider>([
  'google-places',
  'tour-api',
  'public-data',
]);

const VALID_SIGNAL_KEYS = new Set<PetPlaceExternalSignalKey>([
  'allows-dogs',
  'outdoor-seating',
  'good-for-children',
  'official-pet-policy',
  'pet-travel-listing',
]);

function normalizeString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toVerificationStatus(
  value: string,
): Exclude<LocationDiscoveryVerificationStatus, 'service-ranked'> | null {
  return VALID_VERIFICATION_STATUSES.has(
    value as Exclude<LocationDiscoveryVerificationStatus, 'service-ranked'>,
  )
    ? (value as Exclude<LocationDiscoveryVerificationStatus, 'service-ranked'>)
    : null;
}

function toMetaSourceType(value: string): PetPlaceMetaSourceType | null {
  return VALID_SOURCE_TYPES.has(value as PetPlaceMetaSourceType)
    ? (value as PetPlaceMetaSourceType)
    : null;
}

function toMetaProvider(value: string | null): PetPlaceMetaProvider | null {
  if (!value) {
    return null;
  }

  return VALID_META_PROVIDERS.has(value as PetPlaceMetaProvider)
    ? (value as PetPlaceMetaProvider)
    : null;
}

function toExternalSignalProvider(
  value: string,
): PetPlaceExternalSignalProvider | null {
  return VALID_SIGNAL_PROVIDERS.has(value as PetPlaceExternalSignalProvider)
    ? (value as PetPlaceExternalSignalProvider)
    : null;
}

function toExternalSignalKey(value: string): PetPlaceExternalSignalKey | null {
  return VALID_SIGNAL_KEYS.has(value as PetPlaceExternalSignalKey)
    ? (value as PetPlaceExternalSignalKey)
    : null;
}

function mapServiceMetaRow(
  row: PetPlaceServiceMetaRow,
): PetFriendlyPlaceServiceMeta | null {
  const verificationStatus = toVerificationStatus(row.verification_status);
  const sourceType = toMetaSourceType(row.source_type);
  if (!verificationStatus || !sourceType) {
    return null;
  }

  return {
    id: row.id,
    verificationStatus,
    sourceType,
    primarySourceProvider: toMetaProvider(row.primary_source_provider),
    primarySourcePlaceId: normalizeString(row.primary_source_place_id),
    petPolicyText: normalizeString(row.pet_policy_text),
    adminNote: normalizeString(row.admin_note),
    operatingStatusLabel: normalizeString(row.operating_status_label),
    userReportCount: row.user_report_count ?? 0,
    bookmarkedCount: row.bookmarked_count ?? 0,
    lastVerifiedAt: row.last_verified_at,
    sourceLinks: [],
    externalSignals: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSourceLinkRow(
  row: PetPlaceSourceLinkRow,
): MappedPetPlaceSourceLink | null {
  const provider = toMetaProvider(row.provider);
  const providerPlaceId = normalizeString(row.provider_place_id);
  if (!provider || !providerPlaceId) {
    return null;
  }

  return {
    id: row.id,
    petPlaceMetaId: row.pet_place_meta_id,
    provider,
    providerPlaceId,
    sourcePlaceName: normalizeString(row.source_place_name),
    sourceCategoryLabel: normalizeString(row.source_category_label),
    sourceAddress: normalizeString(row.source_address),
    sourceRoadAddress: normalizeString(row.source_road_address),
    latitude: toFiniteNumber(row.latitude),
    longitude: toFiniteNumber(row.longitude),
    matchedAt: row.matched_at,
    updatedAt: row.updated_at,
  };
}

function mapExternalSignalRow(
  row: PetPlaceExternalSignalRow,
): MappedPetPlaceExternalSignal | null {
  const signalProvider = toExternalSignalProvider(row.signal_provider);
  const signalKey = toExternalSignalKey(row.signal_key);
  if (!signalProvider || !signalKey) {
    return null;
  }

  return {
    id: row.id,
    petPlaceMetaId: row.pet_place_meta_id,
    signalProvider,
    signalKey,
    signalValueBoolean: row.signal_value_boolean,
    signalValueText: normalizeString(row.signal_value_text),
    signalScore: row.signal_score ?? 0,
    sourceNote: normalizeString(row.source_note),
    observedAt: row.observed_at,
    updatedAt: row.updated_at,
  };
}

export function buildPetPlaceSourceLookupKey(
  provider: PetPlaceMetaProvider,
  providerPlaceId: string,
): string {
  return `${provider}:${providerPlaceId}`;
}

export async function loadPetFriendlyPlaceServiceMeta(
  input: PetFriendlyPlaceMetaLookupInput,
): Promise<Map<string, PetFriendlyPlaceServiceMeta>> {
  const providerPlaceIds = [...new Set(input.providerPlaceIds.map(normalizeString).filter(Boolean))];
  if (!providerPlaceIds.length) {
    return new Map();
  }

  try {
    const { data: sourceLinkRows, error: sourceLinkError } = await supabase
      .from('pet_place_source_links')
      .select(
        'id, pet_place_meta_id, provider, provider_place_id, source_place_name, source_category_label, source_address, source_road_address, latitude, longitude, matched_at, updated_at',
      )
      .eq('provider', input.provider)
      .in('provider_place_id', providerPlaceIds);

    if (sourceLinkError) {
      throw sourceLinkError;
    }

    const sourceLinks = (sourceLinkRows ?? [])
      .map(row => mapSourceLinkRow(row as PetPlaceSourceLinkRow))
      .filter((row): row is MappedPetPlaceSourceLink => Boolean(row));

    if (!sourceLinks.length) {
      return new Map();
    }

    const metaIds = [...new Set(sourceLinks.map(row => row.petPlaceMetaId))];

    const [
      { data: serviceMetaRows, error: serviceMetaError },
      { data: externalSignalRows, error: externalSignalError },
    ] = await Promise.all([
      supabase
        .from('pet_place_service_meta')
        .select(
          'id, verification_status, source_type, primary_source_provider, primary_source_place_id, pet_policy_text, admin_note, operating_status_label, user_report_count, bookmarked_count, last_verified_at, created_at, updated_at',
        )
        .in('id', metaIds),
      supabase
        .from('pet_place_external_signals')
        .select(
          'id, pet_place_meta_id, signal_provider, signal_key, signal_value_boolean, signal_value_text, signal_score, source_note, observed_at, updated_at',
        )
        .in('pet_place_meta_id', metaIds),
    ]);

    if (serviceMetaError) {
      throw serviceMetaError;
    }
    if (externalSignalError) {
      throw externalSignalError;
    }

    const metaById = new Map<string, PetFriendlyPlaceServiceMeta>();

    (serviceMetaRows ?? []).forEach(row => {
      const mapped = mapServiceMetaRow(row as PetPlaceServiceMetaRow);
      if (mapped) {
        metaById.set(mapped.id, mapped);
      }
    });

    sourceLinks.forEach(sourceLink => {
      const meta = metaById.get(sourceLink.petPlaceMetaId);
      if (!meta) {
        return;
      }

      meta.sourceLinks = [...meta.sourceLinks, sourceLink];
    });

    (externalSignalRows ?? [])
      .map(row => mapExternalSignalRow(row as PetPlaceExternalSignalRow))
      .filter((row): row is MappedPetPlaceExternalSignal => Boolean(row))
      .forEach(signal => {
        const meta = metaById.get(signal.petPlaceMetaId);
        if (!meta) {
          return;
        }

        meta.externalSignals = [...meta.externalSignals, signal];
      });

    const lookupMap = new Map<string, PetFriendlyPlaceServiceMeta>();

    sourceLinks.forEach(sourceLink => {
      const meta = metaById.get(sourceLink.petPlaceMetaId);
      if (!meta) {
        return;
      }

      lookupMap.set(
        buildPetPlaceSourceLookupKey(sourceLink.provider, sourceLink.providerPlaceId),
        meta,
      );
    });

    return lookupMap;
  } catch (error) {
    console.warn('[locationDiscovery/placeMeta] Failed to load service meta', {
      provider: input.provider,
      providerPlaceIds,
      error,
    });
    return new Map();
  }
}

export function getPetFriendlyPlacePrimarySource(
  meta: PetFriendlyPlaceServiceMeta | undefined,
): PetFriendlyPlaceSourceLink | null {
  if (!meta) {
    return null;
  }

  if (meta.primarySourceProvider && meta.primarySourcePlaceId) {
    return (
      meta.sourceLinks.find(
        sourceLink =>
          sourceLink.provider === meta.primarySourceProvider &&
          sourceLink.providerPlaceId === meta.primarySourcePlaceId,
      ) ?? null
    );
  }

  return meta.sourceLinks[0] ?? null;
}
