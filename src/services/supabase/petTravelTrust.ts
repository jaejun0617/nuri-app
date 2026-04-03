import { supabase } from './client';
import type {
  PetTravelDbPolicyStatus,
  PetTravelPlaceType,
  PetTravelPolicySourceType,
  PetTravelUserReportType,
} from '../petTravel/types';

export type PetTravelTrustPolicySnapshot = {
  id: string;
  sourceType: PetTravelPolicySourceType;
  policyStatus: PetTravelDbPolicyStatus;
  policyNote: string | null;
  confidence: number;
  requiresOnsiteCheck: boolean;
  evidenceSummary: string | null;
  evidencePayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PetTravelTrustPlaceSnapshot = {
  placeId: string;
  canonicalName: string;
  primarySourcePlaceId: string;
  updatedAt: string;
  activePolicies: ReadonlyArray<PetTravelTrustPolicySnapshot>;
};

type MappedPolicy = PetTravelTrustPolicySnapshot & {
  placeId: string;
};

type PetTravelPlaceRow = {
  id: string;
  canonical_name: string;
  primary_source_place_id: string;
  updated_at: string;
};

type PetTravelPolicyRow = {
  id: string;
  place_id: string;
  source_type: string;
  policy_status: string;
  policy_note: string | null;
  confidence: number | null;
  requires_onsite_check: boolean | null;
  evidence_summary: string | null;
  evidence_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type SubmitPetTravelTrustReportRow = {
  place_id: string;
  user_report_id: string;
  policy_id: string | null;
  report_status: string;
  policy_status: string;
  source_type: string;
};

export type SubmitPetTravelTrustReportInput = {
  sourceContentId: string;
  canonicalName: string;
  address: string;
  latitude: number;
  longitude: number;
  placeType: PetTravelPlaceType;
  reportType: PetTravelUserReportType;
  reportNote?: string | null;
  evidencePayload?: Record<string, unknown> | null;
};

export type SubmitPetTravelTrustReportResult = {
  placeId: string;
  userReportId: string;
  policyId: string | null;
  reportStatus: 'submitted' | 'reviewed' | 'dismissed';
  policyStatus: PetTravelDbPolicyStatus;
  sourceType: PetTravelPolicySourceType;
};

const VALID_POLICY_SOURCE_TYPES = new Set<PetTravelPolicySourceType>([
  'tour-api',
  'user-report',
  'admin-review',
  'system-inference',
]);

const VALID_POLICY_STATUSES = new Set<PetTravelDbPolicyStatus>([
  'unknown',
  'allowed',
  'restricted',
  'not_allowed',
]);
const VALID_PLACE_TYPES = new Set<PetTravelPlaceType>([
  'travel-attraction',
  'outdoor',
  'stay',
  'restaurant',
  'experience',
  'pet-venue',
  'shopping',
  'mixed',
]);
const VALID_USER_REPORT_TYPES = new Set<PetTravelUserReportType>([
  'pet_allowed',
  'pet_restricted',
  'info_outdated',
]);
const VALID_REPORT_STATUSES = new Set(['submitted', 'reviewed', 'dismissed']);

function normalizeString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeEvidencePayload(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value;
}

function mapPolicyRow(row: PetTravelPolicyRow): MappedPolicy | null {
  const sourceType = normalizeString(row.source_type);
  const policyStatus = normalizeString(row.policy_status);
  if (
    !sourceType ||
    !policyStatus ||
    !VALID_POLICY_SOURCE_TYPES.has(sourceType as PetTravelPolicySourceType) ||
    !VALID_POLICY_STATUSES.has(policyStatus as PetTravelDbPolicyStatus)
  ) {
    return null;
  }

  return {
    id: row.id,
    placeId: row.place_id,
    sourceType: sourceType as PetTravelPolicySourceType,
    policyStatus: policyStatus as PetTravelDbPolicyStatus,
    policyNote: normalizeString(row.policy_note),
    confidence: row.confidence ?? 0,
    requiresOnsiteCheck: row.requires_onsite_check ?? true,
    evidenceSummary: normalizeString(row.evidence_summary),
    evidencePayload: row.evidence_payload ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadPetTravelTrustSnapshotsBySourceIds(
  sourcePlaceIds: ReadonlyArray<string>,
): Promise<Map<string, PetTravelTrustPlaceSnapshot>> {
  const normalizedIds = [
    ...new Set(sourcePlaceIds.map(id => normalizeString(id)).filter(Boolean)),
  ];
  if (!normalizedIds.length) {
    return new Map();
  }

  try {
    const { data: placeRows, error: placeError } = await supabase
      .from('pet_travel_places')
      .select('id, canonical_name, primary_source_place_id, updated_at')
      .eq('primary_source', 'tour-api')
      .in('primary_source_place_id', normalizedIds);

    if (placeError) {
      throw placeError;
    }

    const mappedPlaces = (placeRows ?? [])
      .map(row => row as PetTravelPlaceRow)
      .filter(row => Boolean(normalizeString(row.primary_source_place_id)));

    if (!mappedPlaces.length) {
      return new Map();
    }

    const placeIds = mappedPlaces.map(row => row.id);
    const { data: policyRows, error: policyError } = await supabase
      .from('pet_travel_pet_policies')
      .select(
        'id, place_id, source_type, policy_status, policy_note, confidence, requires_onsite_check, evidence_summary, evidence_payload, created_at, updated_at',
      )
      .eq('is_active', true)
      .in('place_id', placeIds);

    if (policyError) {
      throw policyError;
    }

    const policiesByPlaceId = new Map<string, PetTravelTrustPolicySnapshot[]>();

    (policyRows ?? [])
      .map(row => row as PetTravelPolicyRow)
      .map(mapPolicyRow)
      .filter((policy): policy is MappedPolicy => Boolean(policy))
      .forEach(policy => {
        const current = policiesByPlaceId.get(policy.placeId) ?? [];
        policiesByPlaceId.set(policy.placeId, [...current, policy]);
      });

    const snapshots = new Map<string, PetTravelTrustPlaceSnapshot>();

    mappedPlaces.forEach(place => {
      const sourcePlaceId = normalizeString(place.primary_source_place_id);
      if (!sourcePlaceId) {
        return;
      }

      snapshots.set(sourcePlaceId, {
        placeId: place.id,
        canonicalName: place.canonical_name,
        primarySourcePlaceId: sourcePlaceId,
        updatedAt: place.updated_at,
        activePolicies: policiesByPlaceId.get(place.id) ?? [],
      });
    });

    return snapshots;
  } catch (error) {
    console.warn('[supabase/petTravelTrust] Failed to load trust snapshots', {
      sourcePlaceIds: normalizedIds,
      error,
    });
    return new Map();
  }
}

function mapSubmitTrustReportRow(
  row: SubmitPetTravelTrustReportRow | null | undefined,
): SubmitPetTravelTrustReportResult | null {
  if (!row) {
    return null;
  }

  const sourceType = normalizeString(row.source_type);
  const policyStatus = normalizeString(row.policy_status);
  const reportStatus = normalizeString(row.report_status);
  const placeId = normalizeString(row.place_id);
  const userReportId = normalizeString(row.user_report_id);

  if (
    !placeId ||
    !userReportId ||
    !sourceType ||
    !policyStatus ||
    !reportStatus ||
    !VALID_POLICY_SOURCE_TYPES.has(sourceType as PetTravelPolicySourceType) ||
    !VALID_POLICY_STATUSES.has(policyStatus as PetTravelDbPolicyStatus) ||
    !VALID_REPORT_STATUSES.has(reportStatus)
  ) {
    return null;
  }

  return {
    placeId,
    userReportId,
    policyId: normalizeString(row.policy_id),
    reportStatus: reportStatus as 'submitted' | 'reviewed' | 'dismissed',
    policyStatus: policyStatus as PetTravelDbPolicyStatus,
    sourceType: sourceType as PetTravelPolicySourceType,
  };
}

export async function submitPetTravelTrustReport(
  input: SubmitPetTravelTrustReportInput,
): Promise<SubmitPetTravelTrustReportResult> {
  const sourceContentId = normalizeString(input.sourceContentId);
  const canonicalName = normalizeString(input.canonicalName);
  const address = normalizeString(input.address);
  const placeType = normalizeString(input.placeType);

  if (!sourceContentId) {
    throw new Error('TourAPI contentId가 없어 제보를 저장할 수 없어요.');
  }
  if (!canonicalName) {
    throw new Error('장소 이름이 없어 제보를 저장할 수 없어요.');
  }
  if (!address) {
    throw new Error('장소 주소가 없어 제보를 저장할 수 없어요.');
  }
  if (
    !placeType ||
    !VALID_PLACE_TYPES.has(placeType as PetTravelPlaceType) ||
    !VALID_USER_REPORT_TYPES.has(input.reportType)
  ) {
    throw new Error('유효하지 않은 제보 요청이에요.');
  }
  if (!isFiniteNumber(input.latitude) || !isFiniteNumber(input.longitude)) {
    throw new Error('유효한 위치 좌표가 없어 제보를 저장할 수 없어요.');
  }

  const { data, error } = await supabase.rpc('submit_pet_travel_user_report', {
    p_primary_source_place_id: sourceContentId,
    p_canonical_name: canonicalName,
    p_address: address,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_place_type: placeType,
    p_report_type: input.reportType,
    p_report_note: normalizeString(input.reportNote),
    p_evidence_payload: normalizeEvidencePayload(input.evidencePayload),
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data)
    ? mapSubmitTrustReportRow(data[0] as SubmitPetTravelTrustReportRow | undefined)
    : mapSubmitTrustReportRow(data as SubmitPetTravelTrustReportRow | null);
  if (!row) {
    throw new Error('제보 저장 결과를 확인하지 못했어요.');
  }

  return row;
}
