import type { DeviceCoordinates } from '../location/currentPosition';
import type { KakaoAddressDocument, KakaoPlaceDocument } from './types';

export type LocationSearchProviderInput = {
  query: string;
  coordinates: DeviceCoordinates | null;
  radiusMeters?: number;
  size?: number;
  page?: number;
};

export type LocationSearchProvider = {
  searchKeyword: (
    input: LocationSearchProviderInput,
  ) => Promise<ReadonlyArray<KakaoPlaceDocument>>;
  searchAddress: (
    query: string,
  ) => Promise<ReadonlyArray<KakaoAddressDocument>>;
};
