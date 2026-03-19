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
  sourceLinks: ReadonlyArray<PetFriendlyPlaceSourceLink>;
  externalSignals: ReadonlyArray<PetFriendlyPlaceExternalSignal>;
  createdAt: string;
  updatedAt: string;
};

export type PetFriendlyPlaceMetaLookupInput = {
  provider: PetPlaceMetaProvider;
  providerPlaceIds: ReadonlyArray<string>;
};

export function buildPetPlaceSourceLookupKey(
  provider: PetPlaceMetaProvider,
  providerPlaceId: string,
): string {
  return `${provider}:${providerPlaceId}`;
}

export async function loadPetFriendlyPlaceServiceMeta(
  input: PetFriendlyPlaceMetaLookupInput,
): Promise<Map<string, PetFriendlyPlaceServiceMeta>> {
  if (!input.providerPlaceIds.length) {
    return new Map();
  }

  // 현재 Supabase 장소 메타 테이블이 없어 외부 후보만 사용한다.
  // 다음 단계에서는 아래 조합으로 실제 조회를 붙인다.
  // 1. `pet_place_source_links`에서 provider + provider_place_id로 source link를 조회한다.
  // 2. `pet_place_service_meta`를 join해서 canonical verification / pet_policy를 가져온다.
  // 3. `pet_place_external_signals`를 같이 읽어 Google / TourAPI 보조 신호를 병합한다.
  // 반환 Map의 key는 `provider:provider_place_id` lookup key를 사용한다.
  return new Map();
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
