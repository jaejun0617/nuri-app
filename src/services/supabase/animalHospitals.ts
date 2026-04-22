import type { SupabaseClient } from '@supabase/supabase-js';

import { createAnimalHospitalRepository } from '../animalHospital/repository';
import type {
  AnimalHospitalAdminReviewQueueItem,
  AnimalHospitalCanonicalHospital,
  AnimalHospitalCanonicalUpsertContract,
  AnimalHospitalOpsDetail,
  AnimalHospitalOpsFieldFilter,
  AnimalHospitalOpsReviewItem,
  AnimalHospitalOpsStatusFilter,
  AnimalHospitalOpsSummary,
  AnimalHospitalRuntimeMatchSummary,
  AnimalHospitalSourceRecord,
  AnimalHospitalUserReportInput,
  AnimalHospitalUserReportRecord,
  AnimalHospitalVerificationRecord,
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

declare const require: (path: string) => { supabase: SupabaseClient };

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

type AnimalHospitalVerificationRow = {
  id: string;
  animal_hospital_id: string;
  field_key: string;
  status: string;
  verified_value: Record<string, unknown> | null;
  verification_source: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  note: string | null;
  evidence: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type AnimalHospitalUserReportRow = {
  id: string;
  animal_hospital_id: string | null;
  reporter_id: string | null;
  report_type: string;
  status: string;
  message: string | null;
  evidence: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type AnimalHospitalAdminReviewQueueRow = {
  animal_hospital_id: string;
  name: string;
  address: string;
  has_source_conflict: boolean | null;
  pending_report_count: number | string | null;
  pending_verification_count: number | string | null;
  latest_updated_at: string | null;
};

type AnimalHospitalOpsSummaryRow = {
  total_canonical: number | string | null;
  source_rows: number | string | null;
  public_visible: number | string | null;
  active_not_hidden: number | string | null;
  source_unlinked_rows: number | string | null;
  canonical_drift_suspected: number | string | null;
  pending_phone: number | string | null;
  pending_coordinates: number | string | null;
  pending_thumbnail: number | string | null;
  pending_open24_hours: number | string | null;
  provider_only_candidates: number | string | null;
  canonical_linked: number | string | null;
  hidden_count: number | string | null;
  inactive_count: number | string | null;
  approved_phone_coverage: number | string | null;
  approved_coordinates_coverage: number | string | null;
  approved_thumbnail_coverage: number | string | null;
  approved_open24_hours_coverage: number | string | null;
  latest_runtime_snapshot_at: string | null;
};

type AnimalHospitalOpsReviewRow = {
  animal_hospital_id: string;
  name: string;
  address: string;
  is_active: boolean | null;
  is_hidden: boolean | null;
  lifecycle_note: string | null;
  source_type: string | null;
  source_record_key: string | null;
  verification_id: string | null;
  field_key: string | null;
  verification_status: string | null;
  current_public_value: Record<string, unknown> | null;
  candidate_value: Record<string, unknown> | null;
  verification_source: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  note: string | null;
  evidence: Record<string, unknown> | null;
  updated_at: string;
};

type AnimalHospitalOpsDetailRow = {
  hospital: Record<string, unknown> | null;
  source_records: unknown;
  verifications: unknown;
  action_logs: unknown;
  public_projection: Record<string, unknown> | null;
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

const USER_REPORT_SELECT = [
  'id',
  'animal_hospital_id',
  'reporter_id',
  'report_type',
  'status',
  'message',
  'evidence',
  'created_at',
  'updated_at',
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

function mapHospitalRowToCanonical(
  row: AnimalHospitalRow,
): AnimalHospitalCanonicalHospital {
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
        (normalizeWhitespace(
          row.coordinate_source,
        ) as AnimalHospitalCanonicalHospital['coordinates']['source']) ??
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
    media: {
      thumbnailUrl: null,
      sourceId: null,
      verifiedAt: null,
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
        ) as AnimalHospitalCanonicalHospital['trust']['freshness']) ??
        'unknown',
      requiresVerification: row.requires_verification ?? true,
      hasSourceConflict: row.has_source_conflict ?? false,
      sourceUpdatedAt: row.source_updated_at,
      canonicalUpdatedAt: row.canonical_updated_at,
      reviewedAt: row.reviewed_at,
    },
    lifecycle: {
      status: row.is_hidden
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
      parking:
        createHiddenAnimalHospitalDetail<boolean>(
          '주차 정보는 확인이 필요해요.',
        ),
      equipmentSummary:
        createHiddenAnimalHospitalDetail<string>(
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

function mapSourceRecordRow(
  row: AnimalHospitalSourceRecordRow,
): AnimalHospitalSourceRecord {
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
    normalizedPrimaryAddress: normalizeWhitespace(
      row.normalized_primary_address,
    ),
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
      source:
        row.coordinate_source as AnimalHospitalSourceRecord['normalizedCoordinates']['source'],
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

function mapVerificationRow(
  row: AnimalHospitalVerificationRow,
): AnimalHospitalVerificationRecord {
  return {
    id: row.id,
    animalHospitalId: row.animal_hospital_id,
    fieldKey: row.field_key as AnimalHospitalVerificationRecord['fieldKey'],
    status: row.status as AnimalHospitalVerificationRecord['status'],
    verifiedValue: row.verified_value ?? {},
    verificationSource:
      row.verification_source as AnimalHospitalVerificationRecord['verificationSource'],
    reviewerId: row.reviewer_id,
    reviewedAt: row.reviewed_at,
    expiresAt: row.expires_at,
    note: normalizeWhitespace(row.note),
    evidence: row.evidence ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserReportRow(
  row: AnimalHospitalUserReportRow,
): AnimalHospitalUserReportRecord {
  return {
    id: row.id,
    animalHospitalId: normalizeWhitespace(row.animal_hospital_id),
    reporterId: row.reporter_id,
    reportType: row.report_type as AnimalHospitalUserReportRecord['reportType'],
    status: row.status as AnimalHospitalUserReportRecord['status'],
    message: normalizeWhitespace(row.message),
    evidence: row.evidence ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdminReviewQueueRow(
  row: AnimalHospitalAdminReviewQueueRow,
): AnimalHospitalAdminReviewQueueItem {
  return {
    animalHospitalId: row.animal_hospital_id,
    name: row.name,
    address: row.address,
    hasSourceConflict: row.has_source_conflict ?? false,
    pendingReportCount: Number(row.pending_report_count ?? 0),
    pendingVerificationCount: Number(row.pending_verification_count ?? 0),
    latestUpdatedAt: row.latest_updated_at,
  };
}

function toCount(value: number | string | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapOpsSummaryRow(row: AnimalHospitalOpsSummaryRow): AnimalHospitalOpsSummary {
  return {
    totalCanonical: toCount(row.total_canonical),
    sourceRows: toCount(row.source_rows),
    publicVisible: toCount(row.public_visible),
    activeNotHidden: toCount(row.active_not_hidden),
    sourceUnlinkedRows: toCount(row.source_unlinked_rows),
    canonicalDriftSuspected: toCount(row.canonical_drift_suspected),
    pendingPhone: toCount(row.pending_phone),
    pendingCoordinates: toCount(row.pending_coordinates),
    pendingThumbnail: toCount(row.pending_thumbnail),
    pendingOpen24Hours: toCount(row.pending_open24_hours),
    providerOnlyCandidates: toCount(row.provider_only_candidates),
    canonicalLinked: toCount(row.canonical_linked),
    hiddenCount: toCount(row.hidden_count),
    inactiveCount: toCount(row.inactive_count),
    approvedPhoneCoverage: toCount(row.approved_phone_coverage),
    approvedCoordinatesCoverage: toCount(row.approved_coordinates_coverage),
    approvedThumbnailCoverage: toCount(row.approved_thumbnail_coverage),
    approvedOpen24HoursCoverage: toCount(
      row.approved_open24_hours_coverage,
    ),
    latestRuntimeSnapshotAt: row.latest_runtime_snapshot_at,
  };
}

function mapOpsReviewRow(row: AnimalHospitalOpsReviewRow): AnimalHospitalOpsReviewItem {
  return {
    animalHospitalId: row.animal_hospital_id,
    name: row.name,
    address: row.address,
    isActive: row.is_active ?? false,
    isHidden: row.is_hidden ?? false,
    lifecycleNote: normalizeWhitespace(row.lifecycle_note),
    sourceType: row.source_type ?? 'unknown',
    sourceRecordKey: normalizeWhitespace(row.source_record_key),
    verificationId: normalizeWhitespace(row.verification_id),
    fieldKey: row.field_key as AnimalHospitalOpsReviewItem['fieldKey'],
    verificationStatus:
      row.verification_status as AnimalHospitalOpsReviewItem['verificationStatus'],
    currentPublicValue: row.current_public_value ?? {},
    candidateValue: row.candidate_value ?? {},
    verificationSource:
      row.verification_source as AnimalHospitalOpsReviewItem['verificationSource'],
    reviewerId: row.reviewer_id,
    reviewedAt: row.reviewed_at,
    note: normalizeWhitespace(row.note),
    evidence: row.evidence ?? {},
    updatedAt: row.updated_at,
  };
}

function readJsonArray(value: unknown): ReadonlyArray<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => {
        return typeof item === 'object' && item !== null && !Array.isArray(item);
      })
    : [];
}

function mapOpsDetailRow(row: AnimalHospitalOpsDetailRow): AnimalHospitalOpsDetail {
  return {
    hospital: row.hospital ?? {},
    sourceRecords: readJsonArray(row.source_records),
    verifications: readJsonArray(row.verifications),
    actionLogs: readJsonArray(row.action_logs),
    publicProjection: row.public_projection ?? {},
  };
}

function buildHospitalRow(contract: AnimalHospitalCanonicalUpsertContract) {
  return {
    id: contract.canonicalHospital.id,
    official_source_key: contract.officialSourceKey,
    primary_source_provider: contract.canonicalHospital.primarySource.provider,
    primary_source_record_id:
      contract.canonicalHospital.primarySource.providerRecordId,
    canonical_name: contract.canonicalHospital.canonicalName,
    normalized_name: contract.canonicalHospital.normalizedName,
    primary_address: contract.canonicalHospital.address.primary,
    road_address: contract.canonicalHospital.address.roadAddress,
    lot_address: contract.canonicalHospital.address.lotAddress,
    normalized_primary_address:
      contract.canonicalHospital.address.normalizedPrimary,
    latitude: contract.canonicalHospital.coordinates.latitude,
    longitude: contract.canonicalHospital.coordinates.longitude,
    coordinate_source: contract.canonicalHospital.coordinates.source,
    coordinate_normalization_status:
      contract.canonicalHospital.coordinates.normalizationStatus,
    status_code: contract.canonicalHospital.status.code,
    status_summary: contract.canonicalHospital.status.summary,
    license_status_text: contract.canonicalHospital.status.licenseStatusText,
    operation_status_text:
      contract.canonicalHospital.status.operationStatusText,
    official_phone:
      contract.canonicalHospital.contact.publicPhone?.value ?? null,
    normalized_phone: contract.canonicalHospital.searchTokens.normalizedPhone,
    public_trust_status: contract.canonicalHospital.trust.publicStatus,
    freshness_status: contract.canonicalHospital.trust.freshness,
    requires_verification:
      contract.canonicalHospital.trust.requiresVerification,
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
    latitude: contract.sourceRecord.normalizedCoordinates.latitude,
    longitude: contract.sourceRecord.normalizedCoordinates.longitude,
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
  client: SupabaseClient,
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
    getApprovedVerifications: async (hospitalIds: ReadonlyArray<string>) => {
      if (hospitalIds.length === 0) {
        return [];
      }

      try {
        const { data, error } = await client.rpc(
          'animal_hospital_approved_verifications',
          {
            hospital_ids: hospitalIds,
          },
        );

        if (error) {
          throw error;
        }

        return ((data ?? []) as AnimalHospitalVerificationRow[]).map(
          mapVerificationRow,
        );
      } catch (error) {
        if (!isMissingRelationError(error)) {
          console.warn(
            '[supabase/animalHospitals] Failed to load approved verifications',
            error,
          );
        }
        return [];
      }
    },
    createUserReport: async (input: AnimalHospitalUserReportInput) => {
      const { data: rawReportId, error: rpcError } = await client.rpc(
        'animal_hospital_create_user_report',
        {
          p_animal_hospital_id: input.animalHospitalId,
          p_report_type: input.reportType,
          p_message: input.message,
          p_evidence: input.evidence ?? {},
        },
      );

      if (rpcError) {
        throw rpcError;
      }

      const reportId = typeof rawReportId === 'string' ? rawReportId : null;
      if (!reportId) {
        throw new Error('animal hospital report id was not returned');
      }

      const { data, error } = await client
        .from('animal_hospital_user_reports')
        .select(USER_REPORT_SELECT)
        .eq('id', reportId)
        .single();

      if (error) {
        throw error;
      }

      return mapUserReportRow(data as unknown as AnimalHospitalUserReportRow);
    },
    listAdminReviewQueue: async (limit: number) => {
      const { data, error } = await client.rpc(
        'animal_hospital_admin_review_queue',
        {
          p_limit: limit,
        },
      );

      if (error) {
        throw error;
      }

      return ((data ?? []) as AnimalHospitalAdminReviewQueueRow[]).map(
        mapAdminReviewQueueRow,
      );
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

        return data
          ? mapSourceRecordRow(data as AnimalHospitalSourceRecordRow)
          : null;
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
    upsertCanonical: async (
      contract: AnimalHospitalCanonicalUpsertContract,
    ) => {
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
    upsertSourceRecord: async (
      contract: AnimalHospitalCanonicalUpsertContract,
    ) => {
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

type AnimalHospitalSupabaseRepository = ReturnType<
  typeof createAnimalHospitalRepository
>;

let defaultAnimalHospitalSupabaseRepository: AnimalHospitalSupabaseRepository | null =
  null;

function getDefaultAnimalHospitalSupabaseRepository(): AnimalHospitalSupabaseRepository {
  if (!defaultAnimalHospitalSupabaseRepository) {
    const { supabase } = require('./client');
    defaultAnimalHospitalSupabaseRepository = createAnimalHospitalRepository(
      createAnimalHospitalSupabasePersistence(supabase),
    );
  }

  return defaultAnimalHospitalSupabaseRepository;
}

function getDefaultAnimalHospitalSupabaseClient(): SupabaseClient {
  const { supabase } = require('./client');
  return supabase;
}

export async function fetchAnimalHospitalOpsSummary(): Promise<AnimalHospitalOpsSummary> {
  const { data, error } = await getDefaultAnimalHospitalSupabaseClient().rpc(
    'animal_hospital_ops_summary',
  );

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    throw new Error('animal hospital ops summary was not returned');
  }

  return mapOpsSummaryRow(row as AnimalHospitalOpsSummaryRow);
}

export async function listAnimalHospitalOpsReviewItems(input: {
  statusFilter: AnimalHospitalOpsStatusFilter;
  fieldFilter: AnimalHospitalOpsFieldFilter;
  sourceType: string | null;
  search: string;
  limit?: number;
}): Promise<AnimalHospitalOpsReviewItem[]> {
  const fieldFilter =
    input.fieldFilter === 'all' ? null : input.fieldFilter;
  const sourceType = normalizeWhitespace(input.sourceType);
  const search = normalizeWhitespace(input.search);
  const { data, error } = await getDefaultAnimalHospitalSupabaseClient().rpc(
    'animal_hospital_ops_review_items',
    {
      p_status_filter: input.statusFilter,
      p_field_filter: fieldFilter,
      p_source_type: sourceType,
      p_search: search,
      p_limit: input.limit ?? 80,
    },
  );

  if (error) {
    throw error;
  }

  return ((data ?? []) as AnimalHospitalOpsReviewRow[]).map(mapOpsReviewRow);
}

export async function fetchAnimalHospitalOpsDetail(
  animalHospitalId: string,
): Promise<AnimalHospitalOpsDetail> {
  const { data, error } = await getDefaultAnimalHospitalSupabaseClient().rpc(
    'animal_hospital_ops_detail',
    {
      p_animal_hospital_id: animalHospitalId,
    },
  );

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    throw new Error('animal hospital ops detail was not returned');
  }

  return mapOpsDetailRow(row as AnimalHospitalOpsDetailRow);
}

export async function reviewAnimalHospitalVerification(input: {
  verificationId: string;
  nextStatus: Exclude<AnimalHospitalVerificationRecord['status'], 'expired'>;
  note: string | null;
}): Promise<AnimalHospitalVerificationRecord> {
  const { data, error } = await getDefaultAnimalHospitalSupabaseClient().rpc(
    'animal_hospital_review_verification',
    {
      p_verification_id: input.verificationId,
      p_next_status: input.nextStatus,
      p_note: input.note,
    },
  );

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    throw new Error(
      'animal hospital verification review result was not returned',
    );
  }

  return mapVerificationRow(row as AnimalHospitalVerificationRow);
}

export async function recordAnimalHospitalRuntimeMatchSnapshot(
  summary: AnimalHospitalRuntimeMatchSummary,
): Promise<void> {
  const { error } = await getDefaultAnimalHospitalSupabaseClient()
    .from('animal_hospital_runtime_match_snapshots')
    .insert({
      snapshot_key: summary.snapshotKey,
      query: summary.query,
      runtime_candidate_count: summary.runtimeCandidateCount,
      canonical_result_count: summary.canonicalResultCount,
      canonical_linked_count: summary.canonicalLinkedCount,
      provider_only_count: summary.providerOnlyCount,
      deferred_count: summary.deferredCount,
      match_count: summary.matchCount,
      provider_only_ratio: summary.providerOnlyRatio,
      canonical_linked_ratio: summary.canonicalLinkedRatio,
      summary: {
        providerOnlyRatio: summary.providerOnlyRatio,
        canonicalLinkedRatio: summary.canonicalLinkedRatio,
      },
      created_at: summary.createdAt,
    });

  if (error) {
    throw error;
  }
}

export const animalHospitalSupabaseRepository: AnimalHospitalSupabaseRepository =
  {
    search: input => getDefaultAnimalHospitalSupabaseRepository().search(input),
    getApprovedVerifications: hospitalIds =>
      getDefaultAnimalHospitalSupabaseRepository().getApprovedVerifications?.(
        hospitalIds,
      ) ?? Promise.resolve([]),
    createUserReport: input =>
      getDefaultAnimalHospitalSupabaseRepository().createUserReport?.(input) ??
      Promise.reject(
        new Error('animal hospital user report repository unavailable'),
      ),
    listAdminReviewQueue: limit =>
      getDefaultAnimalHospitalSupabaseRepository().listAdminReviewQueue?.(
        limit,
      ) ?? Promise.resolve([]),
    upsertCanonical: contract =>
      getDefaultAnimalHospitalSupabaseRepository().upsertCanonical(contract),
    ingestOfficialSnapshot: input =>
      getDefaultAnimalHospitalSupabaseRepository().ingestOfficialSnapshot(
        input,
      ),
  };
