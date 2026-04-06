import type { DeviceCoordinates } from '../location/currentPosition';
import type { PublicTrustInfo } from '../trust/publicTrust';

export type LocationDiscoveryDomain = 'walk' | 'pet-friendly-place';
export type LocationDiscoverySource = 'kakao' | 'supabase';
export type LocationDiscoveryVerificationStatus =
  | 'service-ranked'
  | 'unknown'
  | 'keyword-inferred'
  | 'user-reported'
  | 'admin-verified'
  | 'rejected';
export type LocationDiscoveryVerificationTone =
  | 'neutral'
  | 'caution'
  | 'positive'
  | 'critical';
export type LocationDiscoverySortOption =
  | 'recommended'
  | 'distance-asc'
  | 'distance-desc';
export type LocationDiscoveryItemKind =
  | 'walk-spot'
  | 'cafe'
  | 'restaurant'
  | 'indoor-space'
  | 'outdoor-space'
  | 'pet-friendly-place';
export type LocationDiscoverySourceType = 'external-api' | 'service-meta';

export type LocationDiscoverySearchScope = {
  displayLabel: string;
  queryLabel: string | null;
  anchorCoordinates: DeviceCoordinates | null;
  distanceLabel: string;
};

export type LocationDiscoverySearchInput = {
  query: string | null;
  scope: LocationDiscoverySearchScope;
  useNearbySearch?: boolean;
};

export type LocationDiscoveryItem = {
  id: string;
  domain: LocationDiscoveryDomain;
  kind: LocationDiscoveryItemKind;
  name: string;
  description: string;
  categoryLabel: string;
  address: string;
  roadAddress: string | null;
  distanceMeters: number | null;
  distanceLabel: string;
  estimatedMinutes: number | null;
  latitude: number;
  longitude: number;
  placeUrl: string | null;
  phone: string | null;
  operatingStatusLabel: string | null;
  source: {
    provider: LocationDiscoverySource;
    providerLabel: string;
    type: LocationDiscoverySourceType;
    externalPlaceId: string | null;
  };
  verification: {
    status: LocationDiscoveryVerificationStatus;
    label: string;
    description: string;
    tone: LocationDiscoveryVerificationTone;
    sourceLabel: string;
    requiresConfirmation: boolean;
  };
  publicTrust: PublicTrustInfo;
  userLayer: {
    targetId: string | null;
    supportsBookmark: boolean;
    supportsReport: boolean;
  };
  petPolicy: {
    summaryLabel: string | null;
    detail: string | null;
  };
  thumbnailUrl: string | null;
  coordinateLabel: string;
  mapPreviewUrl: string;
};

export type LocationDiscoveryResponse = {
  items: LocationDiscoveryItem[];
  query: string | null;
  source: LocationDiscoverySource;
  verificationStatus: LocationDiscoveryVerificationStatus;
  scope: LocationDiscoverySearchScope;
};

export type KakaoPlaceDocument = {
  id?: string;
  place_name?: string;
  category_name?: string;
  category_group_code?: string;
  category_group_name?: string;
  phone?: string;
  address_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
  place_url?: string;
  distance?: string;
};

export type KakaoAddressDocument = {
  address_name?: string;
  x?: string;
  y?: string;
};
