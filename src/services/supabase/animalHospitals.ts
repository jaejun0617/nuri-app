import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from './client';
import { createAnimalHospitalRepository } from '../animalHospital/repository';
import type {
  AnimalHospitalCanonicalHospital,
  AnimalHospitalCanonicalUpsertContract,
  AnimalHospitalSourceRecord,
} from '../../domains/animalHospital/types';
import {
  buildAnimalHospitalSearchTokens,
  buildAnimalHospitalSourceProvenance,
  createHiddenAnimalHospitalDetail,
} from '../animalHospital/mapper';
import {
  escapeIlikeQuery,
  normalizeAnimalHospitalAddress,
  normalizeWhitespace,
  parseNullableNumber,
} from '../animalHospital/normalization';

type AnimalHospitalRow = {
  id: string;
  official_source_key: string;
  primary_source_provider: string;
  primary_source_record_id: string;
  canonical_name: string;
  normalized_name: string;
  primary_address: string;
  road_address: string | null;
  lot_address: string | null;
  normalized_primary_address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  coordinate_source: string;
  coordinate_normalization_status: string;
  status_code: string;
  status_summary: string;
  license_status_text: string | null;
  operation_status_text: string | null;
  official_phone: string | null;
  normalized_phone: string | null;
  public_trust_status: string;
  freshness_status: string;
  requires_verification: boolean | null;
  has_source_conflict: boolean | null;
  source_updated_at: string | null;
  canonical_updated_at: string;
  reviewed_at: string | null;
  is_active: boolean | null;
  is_hidden: boolean | null;
  lifecycle_note: string | null;
  provider_place_id: string | null;
  provider_place_url: string | null;
};

type AnimalHospitalSourceRecordRow = {
  id: string;
  source_key: string;
  official_source_key: string | null;
  provider: string;
  source_kind: string;
  provider_record_id: string;
  name: string | null;
  normalized_name: string | null;
  lot_address: string | null;
  road_address: string | null;
  normalized_primary_address: string | null;
  license_status_text: string | null;
  operation_status_text: string | null;
  official_phone: string | null;
  normalized_phone: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  x5174: number | string | null;
  y5174: number | string | null;
  coordinate_crs: string;
  coordinate_source: string;
  coordinate_normalization_status: string;
  source_updated_at: string | null;
  ingested_at: string;
  snapshot_id: string | null;
  snapshot_fetched_at: string | null;
  ingest_mode: string;
  row_checksum: string | null;
  metadata: Record<string, unknown> | null;
  canonical_hospital_id: string | null;
  raw_payload: Record<string, unknown> | null;
};

const HOSPITAL_SELECT = [
  'id',
  'official_source_key',
  'primary_source_provider',
  'primary_source_record_id',
  'canonical_name',
  'normalized_name',
  'primary_address',
  'road_address',
  'lot_address',
  'normalized_primary_address',
  'latitude',
  'longitude',
  'coordinate_source',
  'coordinate_normalization_status',
  'status_code',
  'status_summary',
  'license_status_text',
  'operation_status_text',
  'official_phone',
  'normalized_phone',
  'public_trust_status',
  'freshness_status',
  'requires_verification',
  'has_source_conflict',
  'source_updated_at',
  'canonical_updated_at',
  'reviewed_at',
  'is_active',
  'is_hidden',
  'lifecycle_note',
  'provider_place_id',
  'provider_place_url',
].join(', ');

function isMissingRelationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ((error as { code?: string }).code === '42P01' ||
      (error as { code?: string }).code === 'PGRST205')
  );
}

function mapHospitalRowToCanonical(row: AnimalHospitalRow): AnimalHospitalCanonicalHospital {
  const primaryAddress =
    normalizeWhitespace(row.primary_address) ?? '주소 확인 필요';
  const sourceProvider = normalizeWhitespace(row.primary_source_provider);
  const providerRecordId = normalizeWhitespace(row.primary_source_record_id);
  const officialPhone = normalizeWhitespace(row.official_phone);
  const provenance = buildAnimalHospitalSourceProvenance({
    provider:
      (sourceProvider as AnimalHospitalCanonicalHospital['primarySource']['provider']) ??
      'official-localdata',
    sourceKind: 'official-registry',
    providerRecordId: providerRecordId ?? row.id,
    sourceUpdatedAt: row.source_updated_at,
    ingestedAt: row.canonical_updated_at,
    rowChecksum: null,
    rawPayload: null,
  });

  return {
    id: row.id,
    domain: 'animalHospital',
    canonicalName: row.canonical_name,
    normalizedName: row.normalized_name,
    address: {
      primary: primaryAddress,
      roadAddress: normalizeWhitespace(row.road_address),
      lotAddress: normalizeWhitespace(row.lot_address),
      normalizedPrimary:
        normalizeAnimalHospitalAddress(row.normalized_primary_address) ??
        normalizeAnimalHospitalAddress(primaryAddress),
    },
    coordinates: {
      latitude: parseNullableNumber(row.latitude),
      longitude: parseNullableNumber(row.longitude),
      source:
        (normalizeWhitespace(row.coordinate_source) as AnimalHospitalCanonicalHospital['coordinates']['source']) ??
        'unknown',
      normalizationStatus:
        (normalizeWhitespace(
          row.coordinate_normalization_status,
        ) as AnimalHospitalCanonicalHospital['coordinates']['normalizationStatus']) ??
        'missing',
    },
    primarySource: {
      sourceId: provenance.sourceId,
      sourceKey: provenance.sourceKey,
      officialSourceKey: normalizeWhitespace(row.official_source_key),
      provider:
        (sourceProvider as AnimalHospitalCanonicalHospital['primarySource']['provider']) ??
        'official-localdata',
      providerRecordId,
    },
    status: {
      code:
        (normalizeWhitespace(
          row.status_code,
        ) as AnimalHospitalCanonicalHospital['status']['code']) ??
        'verification-required',
      summary:
        normalizeWhitespace(row.status_summary) ?? '인허가 상태 확인 필요',
      licenseStatusText: normalizeWhitespace(row.license_status_text),
      operationStatusText: normalizeWhitespace(row.operation_status_text),
      sourceId: provenance.sourceId,
    },
    contact: {
      publicPhone: officialPhone
        ? {
            value: officialPhone,
            verificationStatus: 'official',
            sourceId: provenance.sourceId,
            verifiedAt: row.source_updated_at,
          }
        : null,
      candidatePhones: [],
    },
    links: {
      providerPlaceId: normalizeWhitespace(row.provider_place_id),
      providerPlaceUrl: normalizeWhitespace(row.provider_place_url),
      externalMapLabel: row.canonical_name,
    },
    trust: {
      publicStatus:
        (normalizeWhitespace(
          row.public_trust_status,
        ) as AnimalHospitalCanonicalHospital['trust']['publicStatus']) ??
        'candidate',
      freshness:
        (normalizeWhitespace(
          row.freshness_status,
        ) as AnimalHospitalCanonicalHospital['trust']['freshness']) ?? 'unknown',
      requiresVerification: row.requires_verification ?? true,
      hasSourceConflict: row.has_source_conflict ?? false,
      sourceUpdatedAt: row.source_updated_at,
      canonicalUpdatedAt: row.canonical_updated_at,
      reviewedAt: row.reviewed_at,
    },
    lifecycle: {
      status:
        row.is_hidden
          ? 'hidden'
          : row.is_active === false
            ? 'inactive'
            : 'active',
      isActive: row.is_active ?? true,
      isHidden: row.is_hidden ?? false,
      conflictStatus: row.has_source_conflict ? 'unresolved' : 'none',
      statusReason: normalizeWhitespace(row.lifecycle_note),
    },
    searchTokens: buildAnimalHospitalSearchTokens({
      name: row.canonical_name,
      address: primaryAddress,
      phone: row.official_phone,
    }),
    sensitiveDetails: {
      operatingHours: createHiddenAnimalHospitalDetail<string>(
        '운영시간은 확인 후 방문해 주세요.',
      ),
      open24Hours: createHiddenAnimalHospitalDetail<boolean>(
        '24시간 여부는 전화 확인이 필요해요.',
      ),
      nightService: createHiddenAnimalHospitalDetail<boolean>(
        '야간 진료 여부는 확인이 필요해요.',
      ),
      weekendService: createHiddenAnimalHospitalDetail<boolean>(
        '주말 진료 여부는 방문 전 확인해 주세요.',
      ),
      exoticAnimalCare: createHiddenAnimalHospitalDetail<boolean>(
        '특수동물 진료는 직접 확인이 필요해요.',
      ),
      emergencyCare: createHiddenAnimalHospitalDetail<boolean>(
        '응급 대응 가능 여부는 바로 전화 확인해 주세요.',
      ),
      parking: createHiddenAnimalHospitalDetail<boolean>(
        '주차 정보는 확인이 필요해요.',
      ),
      equipmentSummary: createHiddenAnimalHospitalDetail<string>(
        '진료과목은 병원에 확인해 주세요.',
      ),
      homepageUrl: createHiddenAnimalHospitalDetail<string>(
        '홈페이지 정보는 아직 공개하지 않아요.',
      ),
      socialUrl: createHiddenAnimalHospitalDetail<string>(
        'SNS 정보는 아직 공개하지 않아요.',
      ),
    },
    sourceProvenance: [provenance],
  };
}

function mapSourceRecordRow(row: AnimalHospitalSourceRecordRow): AnimalHospitalSourceRecord {
  return {
    sourceId: row.id,
    sourceKey: row.source_key,
    officialSourceKey: normalizeWhitespace(row.official_source_key),
    provider: row.provider as AnimalHospitalSourceRecord['provider'],
    sourceKind: row.source_kind as AnimalHospitalSourceRecord['sourceKind'],
    providerRecordId: row.provider_record_id,
    name: normalizeWhitespace(row.name),
    normalizedName: normalizeWhitespace(row.normalized_name),
    lotAddress: normalizeWhitespace(row.lot_address),
    roadAddress: normalizeWhitespace(row.road_address),
    normalizedPrimaryAddress: normalizeWhitespace(row.normalized_primary_address),
    licenseStatusText: normalizeWhitespace(row.license_status_text),
    operationStatusText: normalizeWhitespace(row.operation_status_text),
    officialPhone: normalizeWhitespace(row.official_phone),
    normalizedPhone: normalizeWhitespace(row.normalized_phone),
    rawCoordinates: {
      latitude: parseNullableNumber(row.latitude),
      longitude: parseNullableNumber(row.longitude),
      x5174: parseNullableNumber(row.x5174),
      y5174: parseNullableNumber(row.y5174),
      crs: row.coordinate_crs as AnimalHospitalSourceRecord['rawCoordinates']['crs'],
    },
    normalizedCoordinates: {
      latitude: parseNullableNumber(row.latitude),
      longitude: parseNullableNumber(row.longitude),
      source: row.coordinate_source as AnimalHospitalSourceRecord['normalizedCoordinates']['source'],
      normalizationStatus:
        row.coordinate_normalization_status as AnimalHospitalSourceRecord['normalizedCoordinates']['normalizationStatus'],
    },
    sourceUpdatedAt: row.source_updated_at,
    ingestedAt: row.ingested_at,
    snapshotId: normalizeWhitespace(row.snapshot_id),
    snapshotFetchedAt: row.snapshot_fetched_at,
    ingestMode: row.ingest_mode as AnimalHospitalSourceRecord['ingestMode'],
    rowChecksum: normalizeWhitespace(row.row_checksum),
    metadata: row.metadata ?? null,
    canonicalHospitalId: normalizeWhitespace(row.canonical_hospital_id),
    rawPayload: row.raw_payload ?? null,
  };
}

function buildHospitalRow(contract: AnimalHospitalCanonicalUpsertContract) {
  return {
    id: contract.canonicalHospital.id,
    official_source_key: contract.officialSourceKey,
    primary_source_provider: contract.canonicalHospital.primarySource.provider,
    primary_source_record_id: contract.canonicalHospital.primarySource.providerRecordId,
    canonical_name: contract.canonicalHospital.canonicalName,
    normalized_name: contract.canonicalHospital.normalizedName,
    primary_address: contract.canonicalHospital.address.primary,
    road_address: contract.canonicalHospital.address.roadAddress,
    lot_address: contract.canonicalHospital.address.lotAddress,
    normalized_primary_address: contract.canonicalHospital.address.normalizedPrimary,
    latitude: contract.canonicalHospital.coordinates.latitude,
    longitude: contract.canonicalHospital.coordinates.longitude,
    coordinate_source: contract.canonicalHospital.coordinates.source,
    coordinate_normalization_status:
      contract.canonicalHospital.coordinates.normalizationStatus,
    status_code: contract.canonicalHospital.status.code,
    status_summary: contract.canonicalHospital.status.summary,
    license_status_text: contract.canonicalHospital.status.licenseStatusText,
    operation_status_text: contract.canonicalHospital.status.operationStatusText,
    official_phone: contract.canonicalHospital.contact.publicPhone?.value ?? null,
    normalized_phone: contract.canonicalHospital.searchTokens.normalizedPhone,
    public_trust_status: contract.canonicalHospital.trust.publicStatus,
    freshness_status: contract.canonicalHospital.trust.freshness,
    requires_verification: contract.canonicalHospital.trust.requiresVerification,
    has_source_conflict: contract.canonicalHospital.trust.hasSourceConflict,
    source_updated_at: contract.canonicalHospital.trust.sourceUpdatedAt,
    canonical_updated_at: contract.canonicalUpdatedAt,
    reviewed_at: contract.canonicalHospital.trust.reviewedAt,
    is_active: contract.canonicalHospital.lifecycle.isActive,
    is_hidden: contract.canonicalHospital.lifecycle.isHidden,
    lifecycle_note: contract.canonicalHospital.lifecycle.statusReason,
    provider_place_id: contract.canonicalHospital.links.providerPlaceId,
    provider_place_url: contract.canonicalHospital.links.providerPlaceUrl,
  };
}

function buildSourceRecordRow(contract: AnimalHospitalCanonicalUpsertContract) {
  return {
    id: contract.sourceRecord.sourceId,
    source_key: contract.sourceRecord.sourceKey,
    official_source_key: contract.sourceRecord.officialSourceKey,
    provider: contract.sourceRecord.provider,
    source_kind: contract.sourceRecord.sourceKind,
    provider_record_id: contract.sourceRecord.providerRecordId,
    name: contract.sourceRecord.name,
    normalized_name: contract.sourceRecord.normalizedName,
    lot_address: contract.sourceRecord.lotAddress,
    road_address: contract.sourceRecord.roadAddress,
    normalized_primary_address: contract.sourceRecord.normalizedPrimaryAddress,
    license_status_text: contract.sourceRecord.licenseStatusText,
    operation_status_text: contract.sourceRecord.operationStatusText,
    official_phone: contract.sourceRecord.officialPhone,
    normalized_phone: contract.sourceRecord.normalizedPhone,
    latitude: contract.sourceRecord.rawCoordinates.latitude,
    longitude: contract.sourceRecord.rawCoordinates.longitude,
    x5174: contract.sourceRecord.rawCoordinates.x5174,
    y5174: contract.sourceRecord.rawCoordinates.y5174,
    coordinate_crs: contract.sourceRecord.rawCoordinates.crs,
    coordinate_source: contract.sourceRecord.normalizedCoordinates.source,
    coordinate_normalization_status:
      contract.sourceRecord.normalizedCoordinates.normalizationStatus,
    source_updated_at: contract.sourceRecord.sourceUpdatedAt,
    ingested_at: contract.sourceRecord.ingestedAt,
    snapshot_id: contract.sourceRecord.snapshotId,
    snapshot_fetched_at: contract.sourceRecord.snapshotFetchedAt,
    ingest_mode: contract.sourceRecord.ingestMode,
    row_checksum: contract.sourceRecord.rowChecksum,
    metadata: contract.sourceRecord.metadata,
    canonical_hospital_id: contract.sourceRecord.canonicalHospitalId,
    raw_payload: contract.sourceRecord.rawPayload,
  };
}

export function createAnimalHospitalSupabasePersistence(
  client: SupabaseClient = supabase,
) {
  return {
    search: async (input: {
      query: string | null;
      coordinates: { latitude: number; longitude: number } | null;
      radiusMeters: number;
    }) => {
      try {
        let query = client
          .from('animal_hospitals')
          .select(HOSPITAL_SELECT)
          .eq('is_active', true)
          .eq('is_hidden', false);

        if (input.coordinates) {
          const latDelta = input.radiusMeters / 111000;
          const lngDelta =
            input.radiusMeters /
            (111000 *
              Math.max(
                Math.cos((input.coordinates.latitude * Math.PI) / 180),
                0.2,
              ));

          query = query
            .gte('latitude', input.coordinates.latitude - latDelta)
            .lte('latitude', input.coordinates.latitude + latDelta)
            .gte('longitude', input.coordinates.longitude - lngDelta)
            .lte('longitude', input.coordinates.longitude + lngDelta);
        }

        if (input.query) {
          const escaped = escapeIlikeQuery(input.query);
          query = query.or(
            `canonical_name.ilike.%${escaped}%,primary_address.ilike.%${escaped}%`,
          );
        }

        const { data, error } = await query
          .order('canonical_updated_at', { ascending: false })
          .limit(40);

        if (error) {
          throw error;
        }

        return (data ?? []).map(row =>
          mapHospitalRowToCanonical(row as unknown as AnimalHospitalRow),
        );
      } catch (error) {
        if (!isMissingRelationError(error)) {
          console.warn(
            '[supabase/animalHospitals] Failed to search canonical hospitals',
            error,
          );
        }
        return [];
      }
    },
    getSourceRecordByKey: async (sourceKey: string) => {
      try {
        const { data, error } = await client
          .from('animal_hospital_source_records')
          .select('*')
          .eq('source_key', sourceKey)
          .maybeSingle();

        if (error) {
          throw error;
        }

        return data ? mapSourceRecordRow(data as AnimalHospitalSourceRecordRow) : null;
      } catch (error) {
        if (!isMissingRelationError(error)) {
          console.warn(
            '[supabase/animalHospitals] Failed to load source record',
            error,
          );
        }
        return null;
      }
    },
    upsertCanonical: async (contract: AnimalHospitalCanonicalUpsertContract) => {
      const { data, error } = await client
        .from('animal_hospitals')
        .upsert(buildHospitalRow(contract), {
          onConflict: 'id',
        })
        .select(HOSPITAL_SELECT)
        .single();

      if (error) {
        throw error;
      }

      return mapHospitalRowToCanonical(data as unknown as AnimalHospitalRow);
    },
    upsertSourceRecord: async (contract: AnimalHospitalCanonicalUpsertContract) => {
      const { data, error } = await client
        .from('animal_hospital_source_records')
        .upsert(buildSourceRecordRow(contract), {
          onConflict: 'source_key',
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return mapSourceRecordRow(data as AnimalHospitalSourceRecordRow);
    },
    appendChangeLog: async (input: {
      canonicalId: string;
      sourceId: string;
      changeType: 'inserted' | 'updated' | 'unchanged' | 'failed';
      summary: string;
      payload: Record<string, unknown>;
    }) => {
      const { error } = await client.from('animal_hospital_change_log').insert({
        canonical_hospital_id: input.canonicalId,
        source_record_id: input.sourceId,
        change_type: input.changeType,
        summary: input.summary,
        payload: input.payload,
      });

      if (error) {
        throw error;
      }
    },
  };
}

export const animalHospitalSupabaseRepository = createAnimalHospitalRepository(
  createAnimalHospitalSupabasePersistence(),
);
