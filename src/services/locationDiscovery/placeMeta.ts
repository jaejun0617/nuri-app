import type { LocationDiscoveryVerificationStatus } from './types';

export type ExternalPlaceProvider = 'kakao' | 'google-places' | 'tour-api';
export type PetPlaceMetaSourceType =
  | 'system-inference'
  | 'user-report'
  | 'admin-review';

export type PetFriendlyPlaceServiceMeta = {
  id: string;
  provider: ExternalPlaceProvider;
  providerPlaceId: string;
  verificationStatus: Exclude<
    LocationDiscoveryVerificationStatus,
    'service-ranked'
  >;
  sourceType: PetPlaceMetaSourceType;
  petPolicyText: string | null;
  adminNote: string | null;
  operatingStatusLabel: string | null;
  userReportCount: number;
  bookmarkedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PetFriendlyPlaceMetaLookupInput = {
  provider: ExternalPlaceProvider;
  providerPlaceIds: ReadonlyArray<string>;
};

export async function loadPetFriendlyPlaceServiceMeta(
  input: PetFriendlyPlaceMetaLookupInput,
): Promise<Map<string, PetFriendlyPlaceServiceMeta>> {
  if (!input.providerPlaceIds.length) {
    return new Map();
  }

  // 현재 Supabase 장소 메타 테이블이 없어 외부 후보만 사용한다.
  // 이후 `place_meta_sources` / `pet_place_service_meta` 계열 테이블이 생기면
  // provider + providerPlaceId 기준으로 이 경계에서 병합한다.
  return new Map();
}
