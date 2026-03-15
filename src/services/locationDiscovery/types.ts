import type { DeviceCoordinates } from '../location/currentPosition';

export type LocationDiscoveryDomain = 'walk' | 'pet-friendly-place';

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
  petNotice: string | null;
  mapPreviewUrl: string;
};

export type LocationDiscoveryResponse = {
  items: LocationDiscoveryItem[];
  query: string | null;
  source: 'kakao';
  verificationStatus: 'verified' | 'unverified';
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
