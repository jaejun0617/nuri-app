import type { LocationDiscoveryItem } from './types';

export type LocationDiscoveryThumbnailInput = {
  id: string;
  domain: LocationDiscoveryItem['domain'] | 'animalHospital';
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  thumbnailUrl: string | null;
};

export function isHttpUri(value: string | null | undefined): value is string {
  return /^https?:\/\//i.test(`${value ?? ''}`.trim());
}

export async function resolveLocationDiscoveryThumbnail(
  input: LocationDiscoveryThumbnailInput,
) {
  return isHttpUri(input.thumbnailUrl) ? input.thumbnailUrl : null;
}
