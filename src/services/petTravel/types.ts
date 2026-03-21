export type PetTravelRegion = {
  id: string;
  label: string;
  areaCode: string;
  sigunguCode: string | null;
  description: string;
  aliases: ReadonlyArray<string>;
  addressKeywords: ReadonlyArray<string>;
  scope: 'broad' | 'local';
};

export type PetTravelRegionIntent = {
  normalizedKeyword: string;
  region: PetTravelRegion;
  matchedAlias: string;
  isRegionOnlyQuery: boolean;
};

export type PetTravelCategory = {
  id: 'all' | 'attraction' | 'stay' | 'restaurant' | 'experience' | 'outdoor';
  label: string;
  description: string;
  contentTypeId: string | null;
};

export type PetTravelPlaceType =
  | 'travel-attraction'
  | 'outdoor'
  | 'stay'
  | 'restaurant'
  | 'experience'
  | 'pet-venue'
  | 'shopping'
  | 'mixed';

export type PetTravelPetAllowed =
  | 'confirmed'
  | 'possible'
  | 'check-required';

export type PetTravelTrustSource =
  | 'place-search-api'
  | 'tour-api-raw'
  | 'pet-policy-db'
  | 'user-report'
  | 'admin-review';

export type PetTravelPolicySourceType =
  | 'tour-api'
  | 'user-report'
  | 'admin-review'
  | 'system-inference';

export type PetTravelDbPolicyStatus =
  | 'unknown'
  | 'allowed'
  | 'restricted'
  | 'not_allowed';

export type PetTravelUserReportType =
  | 'pet_allowed'
  | 'pet_restricted'
  | 'info_outdated';

export type PetTravelTrustStage =
  | 'raw-layer'
  | 'candidate-layer'
  | 'trust-layer'
  | 'aggregation-layer';

export type PetTravelPetPolicyStatus =
  | 'unknown'
  | 'tour-api-positive'
  | 'db-verified'
  | 'user-reported'
  | 'rejected';

export type PetTravelPetPolicyEvidence = {
  source: PetTravelTrustSource;
  label: string;
  detail: string;
};

export type PetTravelPetPolicy = {
  status: PetTravelPetPolicyStatus;
  trustStage: PetTravelTrustStage;
  petAllowed: PetTravelPetAllowed;
  confidence: number;
  requiresOnsiteCheck: boolean;
  evidence: ReadonlyArray<PetTravelPetPolicyEvidence>;
};

export type PetTravelScoreBreakdown = {
  travelScore: number;
  petScore: number;
  commercialPenalty: number;
  finalScore: number;
};

export type PetTravelAggregationMeta = {
  trustStage: PetTravelTrustStage;
  rawSources: ReadonlyArray<PetTravelTrustSource>;
  score: PetTravelScoreBreakdown;
};

export type PetTravelPlaceRecord = {
  placeId: string;
  canonicalName: string;
  address: string;
  latitude: number;
  longitude: number;
  placeType: PetTravelPlaceType;
  primarySource: PetTravelPolicySourceType;
  primarySourcePlaceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PetTravelPetPolicyRecord = {
  id: string;
  placeId: string;
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

export type PetTravelUserReportRecord = {
  id: string;
  placeId: string;
  userId: string;
  reportType: PetTravelUserReportType;
  reportNote: string | null;
  evidencePayload: Record<string, unknown>;
  reportStatus: 'submitted' | 'reviewed' | 'dismissed';
  createdAt: string;
  updatedAt: string;
};

export type PetTravelSource = {
  provider: 'tour-api';
  providerLabel: string;
  contentId: string;
  contentTypeId: string;
  areaCode: string;
  sigunguCode: string | null;
  sourceLabel: string;
  sourceUpdatedAt: string;
};

export type PetTravelItem = {
  id: string;
  name: string;
  regionId: string;
  categoryId: PetTravelCategory['id'];
  categoryLabel: string;
  placeType: PetTravelPlaceType;
  petAllowed: PetTravelPetAllowed;
  summary: string;
  address: string;
  latitude: number;
  longitude: number;
  kakaoMapUrl: string | null;
  kakaoMapWebUrl: string | null;
  phone: string | null;
  operatingHours: string | null;
  petNotice: string;
  petConfidenceLabel: string;
  facilityHighlights: ReadonlyArray<string>;
  thumbnailUrl: string | null;
  source: PetTravelSource;
  petPolicy: PetTravelPetPolicy;
  aggregation: PetTravelAggregationMeta;
};

export type PetTravelListResult = {
  items: PetTravelItem[];
  totalCount: number;
  apiTotalCount: number;
};

export type PetTravelDetail = PetTravelItem & {
  overview: string | null;
  homepage: string | null;
  parkingInfo: string | null;
  restDate: string | null;
  usageInfo: string | null;
  sourceUpdatedAt: string | null;
};
