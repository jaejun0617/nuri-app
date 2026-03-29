import { supabase } from './client';
import type {
  PetTravelDbPolicyStatus,
  PetTravelPolicySourceType,
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

function normalizeString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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
