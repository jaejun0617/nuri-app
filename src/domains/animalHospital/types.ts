import type { DeviceCoordinates } from '../../services/location/currentPosition';
import type { PublicTrustInfo, PublicTrustLabel } from '../../services/trust/publicTrust';

export type AnimalHospitalSourceProvider =
  | 'official-localdata'
  | 'municipal-open-data'
  | 'kakao-place'
  | 'google-place'
  | 'naver-place'
  | 'operator-review';

export type AnimalHospitalSourceKind =
  | 'official-registry'
  | 'runtime-linkage'
  | 'review';

export type AnimalHospitalIngestMode = 'snapshot' | 'delta';

export type AnimalHospitalLifecycleStatus =
  | 'active'
  | 'inactive'
  | 'hidden';

export type AnimalHospitalConflictStatus = 'none' | 'unresolved';

export type AnimalHospitalCanonicalUpsertAction =
  | 'inserted'
  | 'updated'
  | 'unchanged';

export type AnimalHospitalCandidateMatchRule =
  | 'official-source-key'
  | 'name-address-exact'
  | 'name-phone-exact'
  | 'name-coordinate-near';

export type AnimalHospitalCoordinateCrs = 'WGS84' | 'EPSG:5174' | 'UNKNOWN';

export type AnimalHospitalCoordinateNormalizationStatus =
  | 'exact'
  | 'fallback'
  | 'missing'
  | 'conversion-required';

export type AnimalHospitalCoordinateSource =
  | 'official-wgs84'
  | 'epsg5174-pending'
  | 'external-fallback'
  | 'unknown';

export type AnimalHospitalFreshnessStatus = 'fresh' | 'stale' | 'unknown';

export type AnimalHospitalPhoneVerificationStatus =
  | 'official'
  | 'reviewed'
  | 'candidate'
  | 'unavailable';

export type AnimalHospitalSensitiveFieldVisibility =
  | 'hidden'
  | 'requires_verification'
  | 'visible';

export type AnimalHospitalStatusCode =
  | 'operating'
  | 'closed'
  | 'suspended'
  | 'verification-required';

export type AnimalHospitalTrustStatus = PublicTrustLabel;

export type AnimalHospitalRawCoordinates = {
  latitude: number | null;
  longitude: number | null;
  x5174: number | null;
  y5174: number | null;
  crs: AnimalHospitalCoordinateCrs;
};

export type AnimalHospitalNormalizedCoordinates = {
  latitude: number | null;
  longitude: number | null;
  source: AnimalHospitalCoordinateSource;
  normalizationStatus: AnimalHospitalCoordinateNormalizationStatus;
};

export type AnimalHospitalSourceProvenance = {
  sourceId: string;
  sourceKey: string;
  officialSourceKey: string | null;
  provider: AnimalHospitalSourceProvider;
  sourceKind: AnimalHospitalSourceKind;
  providerRecordId: string;
  sourceUpdatedAt: string | null;
  ingestedAt: string;
  snapshotId: string | null;
  snapshotFetchedAt: string | null;
  ingestMode: AnimalHospitalIngestMode;
  rowChecksum: string | null;
  metadata: Record<string, unknown> | null;
  rawPayload: Record<string, unknown> | null;
};

export type AnimalHospitalSourceRecord = {
  sourceId: string;
  sourceKey: string;
  officialSourceKey: string | null;
  provider: AnimalHospitalSourceProvider;
  sourceKind: AnimalHospitalSourceKind;
  providerRecordId: string;
  name: string | null;
  normalizedName: string | null;
  lotAddress: string | null;
  roadAddress: string | null;
  normalizedPrimaryAddress: string | null;
  licenseStatusText: string | null;
  operationStatusText: string | null;
  officialPhone: string | null;
  normalizedPhone: string | null;
  rawCoordinates: AnimalHospitalRawCoordinates;
  normalizedCoordinates: AnimalHospitalNormalizedCoordinates;
  sourceUpdatedAt: string | null;
  ingestedAt: string;
  snapshotId: string | null;
  snapshotFetchedAt: string | null;
  ingestMode: AnimalHospitalIngestMode;
  rowChecksum: string | null;
  metadata: Record<string, unknown> | null;
  canonicalHospitalId: string | null;
  rawPayload: Record<string, unknown> | null;
};

export type AnimalHospitalContactChannel = {
  value: string;
  verificationStatus: AnimalHospitalPhoneVerificationStatus;
  sourceId: string;
  verifiedAt: string | null;
};

export type AnimalHospitalSensitiveField<T> = {
  value: T | null;
  visibility: AnimalHospitalSensitiveFieldVisibility;
  verificationStatus: 'official' | 'reviewed' | 'candidate' | 'unknown';
  sourceId: string | null;
  verifiedAt: string | null;
  fallbackText: string;
};

export type AnimalHospitalCanonicalHospital = {
  id: string;
  domain: 'animalHospital';
  canonicalName: string;
  normalizedName: string;
  address: {
    primary: string;
    roadAddress: string | null;
    lotAddress: string | null;
    normalizedPrimary: string | null;
  };
  coordinates: AnimalHospitalNormalizedCoordinates;
  primarySource: {
    sourceId: string | null;
    sourceKey: string | null;
    officialSourceKey: string | null;
    provider: AnimalHospitalSourceProvider | null;
    providerRecordId: string | null;
  };
  status: {
    code: AnimalHospitalStatusCode;
    summary: string;
    licenseStatusText: string | null;
    operationStatusText: string | null;
    sourceId: string | null;
  };
  contact: {
    publicPhone: AnimalHospitalContactChannel | null;
    candidatePhones: ReadonlyArray<AnimalHospitalContactChannel>;
  };
  links: {
    providerPlaceUrl: string | null;
    providerPlaceId: string | null;
    externalMapLabel: string;
  };
  trust: {
    publicStatus: AnimalHospitalTrustStatus;
    freshness: AnimalHospitalFreshnessStatus;
    requiresVerification: boolean;
    hasSourceConflict: boolean;
    sourceUpdatedAt: string | null;
    canonicalUpdatedAt: string;
    reviewedAt: string | null;
  };
  lifecycle: {
    status: AnimalHospitalLifecycleStatus;
    isActive: boolean;
    isHidden: boolean;
    conflictStatus: AnimalHospitalConflictStatus;
    statusReason: string | null;
  };
  searchTokens: {
    normalizedName: string;
    normalizedAddress: string | null;
    normalizedPhone: string | null;
  };
  sensitiveDetails: {
    operatingHours: AnimalHospitalSensitiveField<string>;
    open24Hours: AnimalHospitalSensitiveField<boolean>;
    nightService: AnimalHospitalSensitiveField<boolean>;
    weekendService: AnimalHospitalSensitiveField<boolean>;
    exoticAnimalCare: AnimalHospitalSensitiveField<boolean>;
    emergencyCare: AnimalHospitalSensitiveField<boolean>;
    parking: AnimalHospitalSensitiveField<boolean>;
    equipmentSummary: AnimalHospitalSensitiveField<string>;
    homepageUrl: AnimalHospitalSensitiveField<string>;
    socialUrl: AnimalHospitalSensitiveField<string>;
  };
  sourceProvenance: ReadonlyArray<AnimalHospitalSourceProvenance>;
};

export type AnimalHospitalSearchScope = {
  displayLabel: string;
  queryLabel: string | null;
  anchorCoordinates: DeviceCoordinates | null;
  distanceLabel: string;
};

export type AnimalHospitalOfficialSourceIngestInput = {
  provider: Extract<
    AnimalHospitalSourceProvider,
    'official-localdata' | 'municipal-open-data'
  >;
  providerRecordId: string;
  sourceUpdatedAt: string | null;
  ingestedAt?: string;
  snapshotId?: string | null;
  snapshotFetchedAt?: string | null;
  ingestMode?: AnimalHospitalIngestMode;
  name: string;
  lotAddress?: string | null;
  roadAddress?: string | null;
  licenseStatusText?: string | null;
  operationStatusText?: string | null;
  officialPhone?: string | null;
  coordinates: {
    latitude?: number | null;
    longitude?: number | null;
    x5174?: number | null;
    y5174?: number | null;
    crs: AnimalHospitalCoordinateCrs;
    fallbackLatitude?: number | null;
    fallbackLongitude?: number | null;
  };
  metadata?: Record<string, unknown> | null;
  rowChecksum?: string | null;
  rawPayload?: Record<string, unknown> | null;
};

export type AnimalHospitalCanonicalUpsertContract = {
  canonicalId: string;
  officialSourceKey: string;
  sourceKey: string;
  rowChecksum: string | null;
  canonicalHospital: AnimalHospitalCanonicalHospital;
  sourceRecord: AnimalHospitalSourceRecord;
  sourceUpdatedAt: string | null;
  canonicalUpdatedAt: string;
};

export type AnimalHospitalCanonicalUpsertResult = {
  canonicalId: string;
  sourceId: string;
  officialSourceKey: string;
  action: AnimalHospitalCanonicalUpsertAction;
  sourceUpdatedAt: string | null;
  canonicalUpdatedAt: string;
  warnings: string[];
};

export type AnimalHospitalIngestIssue = {
  providerRecordId: string | null;
  code:
    | 'invalid-row'
    | 'missing-required-field'
    | 'coordinate-fallback'
    | 'upsert-failed';
  message: string;
};

export type AnimalHospitalIngestSummary = {
  provider: Extract<
    AnimalHospitalSourceProvider,
    'official-localdata' | 'municipal-open-data'
  >;
  snapshotId: string;
  fetchedAt: string;
  ingestMode: AnimalHospitalIngestMode;
  totalRows: number;
  inserted: number;
  updated: number;
  unchanged: number;
  failed: number;
  issues: AnimalHospitalIngestIssue[];
  results: AnimalHospitalCanonicalUpsertResult[];
};

export type AnimalHospitalOfficialSourceSnapshotInput = {
  provider: Extract<
    AnimalHospitalSourceProvider,
    'official-localdata' | 'municipal-open-data'
  >;
  rows: ReadonlyArray<Record<string, unknown>>;
  fetchedAt?: string;
  snapshotId?: string;
  ingestMode?: AnimalHospitalIngestMode;
  defaultSourceUpdatedAt?: string | null;
};

export type AnimalHospitalOfficialSourceNormalizedRow = {
  providerRecordId: string;
  input: AnimalHospitalOfficialSourceIngestInput;
  warnings: AnimalHospitalIngestIssue[];
};

export type AnimalHospitalCandidateMatch = {
  canonicalId: string;
  candidateId: string;
  rule: AnimalHospitalCandidateMatchRule;
  score: number;
};

export type AnimalHospitalPublicHospital = {
  id: string;
  name: string;
  address: string;
  roadAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  distanceLabel: string;
  statusSummary: string;
  officialPhone: string | null;
  publicTrust: PublicTrustInfo;
  links: {
    externalMapUrl: string | null;
    providerPlaceUrl: string | null;
    callUri: string | null;
  };
};

export type AnimalHospitalInternalHospital = {
  id: string;
  canonicalName: string;
  address: AnimalHospitalCanonicalHospital['address'];
  coordinates: AnimalHospitalNormalizedCoordinates;
  distanceMeters: number | null;
  primarySource: AnimalHospitalCanonicalHospital['primarySource'];
  status: AnimalHospitalCanonicalHospital['status'];
  trust: AnimalHospitalCanonicalHospital['trust'];
  lifecycle: AnimalHospitalCanonicalHospital['lifecycle'];
  contact: AnimalHospitalCanonicalHospital['contact'];
  links: AnimalHospitalCanonicalHospital['links'];
  sensitiveDetails: AnimalHospitalCanonicalHospital['sensitiveDetails'];
  sourceProvenance: ReadonlyArray<AnimalHospitalSourceProvenance>;
  withheldFields: ReadonlyArray<keyof AnimalHospitalCanonicalHospital['sensitiveDetails']>;
};

export type AnimalHospitalSearchResult = {
  items: AnimalHospitalPublicHospital[];
  internalItems: AnimalHospitalInternalHospital[];
  query: string | null;
  scope: AnimalHospitalSearchScope;
};
