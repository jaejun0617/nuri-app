import { GOOGLE_MAPS_ANDROID_API_KEY } from '../../config/runtime';
import type { LocationDiscoveryItem } from './types';

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_PLACES_FIELD_MASK =
  'places.id,places.displayName,places.location,places.photos';
const THUMBNAIL_CACHE_TTL_MS = 30 * 60 * 1000;
const THUMBNAIL_MAX_WIDTH_PX = 480;
const THUMBNAIL_LOCATION_BIAS_RADIUS_METERS = 500;

type GooglePlacesSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: {
      text?: string;
    };
    location?: {
      latitude?: number;
      longitude?: number;
    };
    photos?: Array<{
      name?: string;
    }>;
  }>;
};

type GooglePlacePhotoResponse = {
  photoUri?: string;
};

type LocationDiscoveryThumbnailDomain =
  | LocationDiscoveryItem['domain']
  | 'animalHospital';

export type LocationDiscoveryThumbnailInput = {
  id: string;
  domain: LocationDiscoveryThumbnailDomain;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  thumbnailUrl: string | null;
};

type ThumbnailCacheEntry = {
  expiresAt: number;
  uri: string | null;
};

const thumbnailMemoryCache = new Map<string, ThumbnailCacheEntry>();
const thumbnailInflightCache = new Map<string, Promise<string | null>>();

function getThumbnailCacheKey(input: LocationDiscoveryThumbnailInput) {
  return [
    input.domain,
    input.id,
    input.name.trim().toLowerCase(),
    input.latitude.toFixed(4),
    input.longitude.toFixed(4),
  ].join(':');
}

function getConfiguredGooglePlacesApiKey() {
  const normalized = GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  return normalized ? normalized : null;
}

function isHttpUri(value: string | null | undefined): value is string {
  return /^https?:\/\//i.test(`${value ?? ''}`.trim());
}

function normalizeForSimilarity(value: string) {
  return value.replace(/\s+/g, '').trim().toLowerCase();
}

function calculateDistanceMeters(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDiff = toRadians(right.latitude - left.latitude);
  const lngDiff = toRadians(right.longitude - left.longitude);
  const leftLat = toRadians(left.latitude);
  const rightLat = toRadians(right.latitude);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(lngDiff / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreGooglePlaceCandidate(
  input: LocationDiscoveryThumbnailInput,
  place: NonNullable<GooglePlacesSearchResponse['places']>[number],
) {
  const placeName = place.displayName?.text?.trim() || '';
  const normalizedInputName = normalizeForSimilarity(input.name);
  const normalizedPlaceName = normalizeForSimilarity(placeName);
  const exactNameMatch = normalizedInputName === normalizedPlaceName;
  const looseNameMatch =
    normalizedInputName.includes(normalizedPlaceName) ||
    normalizedPlaceName.includes(normalizedInputName);

  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  const distanceMeters =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? calculateDistanceMeters(
          { latitude: input.latitude, longitude: input.longitude },
          { latitude, longitude },
        )
      : Number.MAX_SAFE_INTEGER;

  const distanceScore = Math.max(0, 1000 - Math.min(distanceMeters, 1000));

  return (
    (exactNameMatch ? 5000 : 0) +
    (looseNameMatch ? 1500 : 0) +
    distanceScore +
    ((place.photos?.length ?? 0) > 0 ? 250 : 0)
  );
}

async function searchGooglePlacesPhotoName(
  input: LocationDiscoveryThumbnailInput,
  apiKey: string,
) {
  const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${input.name} ${input.address}`.trim(),
      languageCode: 'ko',
      maxResultCount: 5,
      locationBias: {
        circle: {
          center: {
            latitude: input.latitude,
            longitude: input.longitude,
          },
          radius: THUMBNAIL_LOCATION_BIAS_RADIUS_METERS,
        },
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as GooglePlacesSearchResponse;
  const candidates = (json.places ?? []).filter(
    candidate => (candidate.photos?.length ?? 0) > 0,
  );
  if (!candidates.length) {
    return null;
  }

  const bestCandidate = [...candidates].sort(
    (left, right) =>
      scoreGooglePlaceCandidate(input, right) -
      scoreGooglePlaceCandidate(input, left),
  )[0];

  return bestCandidate?.photos?.[0]?.name?.trim() || null;
}

async function fetchGooglePlacePhotoUri(photoName: string, apiKey: string) {
  const params = new URLSearchParams({
    maxWidthPx: String(THUMBNAIL_MAX_WIDTH_PX),
    skipHttpRedirect: 'true',
    key: apiKey,
  });

  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?${params.toString()}`,
  );
  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as GooglePlacePhotoResponse;
  return isHttpUri(json.photoUri) ? json.photoUri : null;
}

async function resolveLocationDiscoveryThumbnailInternal(
  input: LocationDiscoveryThumbnailInput,
) {
  if (isHttpUri(input.thumbnailUrl)) {
    return input.thumbnailUrl;
  }

  if (input.domain !== 'walk' && input.domain !== 'animalHospital') {
    return null;
  }

  const apiKey = getConfiguredGooglePlacesApiKey();
  if (!apiKey) {
    return null;
  }

  const photoName = await searchGooglePlacesPhotoName(input, apiKey);
  if (!photoName) {
    return null;
  }

  return fetchGooglePlacePhotoUri(photoName, apiKey);
}

export async function resolveLocationDiscoveryThumbnail(
  input: LocationDiscoveryThumbnailInput,
) {
  const cacheKey = getThumbnailCacheKey(input);
  const now = Date.now();
  const cachedEntry = thumbnailMemoryCache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.uri;
  }

  const inflight = thumbnailInflightCache.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const promise = resolveLocationDiscoveryThumbnailInternal(input)
    .then(uri => {
      thumbnailMemoryCache.set(cacheKey, {
        uri,
        expiresAt: Date.now() + THUMBNAIL_CACHE_TTL_MS,
      });
      return uri;
    })
    .catch(() => {
      thumbnailMemoryCache.set(cacheKey, {
        uri: null,
        expiresAt: Date.now() + THUMBNAIL_CACHE_TTL_MS,
      });
      return null;
    })
    .finally(() => {
      thumbnailInflightCache.delete(cacheKey);
    });

  thumbnailInflightCache.set(cacheKey, promise);
  return promise;
}
