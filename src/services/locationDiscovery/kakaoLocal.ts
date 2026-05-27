import type { KakaoAddressDocument, KakaoPlaceDocument } from './types';
import type { LocationSearchProvider } from './provider';
import { supabase } from '../supabase/client';
import { LOCATION_DEFENSIVE_FALLBACK_TIMEOUT_MS } from '../location/currentPosition';

type LocationDiscoverySeedResponse = {
  ok?: boolean;
  documents?: unknown;
  error?: string;
};

const LOCATION_SEED_CACHE_TTL_MS = 10 * 60 * 1000;
const LOCATION_SEED_CACHE_MAX_ENTRIES = 120;

type LocationSeedCacheEntry = {
  documents: unknown[];
  expiresAt: number;
};

const locationSeedResponseCache = new Map<string, LocationSeedCacheEntry>();
const locationSeedInFlight = new Map<string, Promise<unknown[]>>();

function readSeedDocuments<TDocument>(
  response: LocationDiscoverySeedResponse,
): TDocument[] {
  if (!response.ok) {
    throw new Error(response.error || '주변 장소를 불러오지 못했어요.');
  }

  return Array.isArray(response.documents)
    ? (response.documents as TDocument[])
    : [];
}

function readCachedSeedDocuments<TDocument>(cacheKey: string): TDocument[] | null {
  const cached = locationSeedResponseCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    locationSeedResponseCache.delete(cacheKey);
    return null;
  }

  return cached.documents as TDocument[];
}

function writeSeedDocumentsCache(
  cacheKey: string,
  documents: ReadonlyArray<unknown>,
) {
  if (locationSeedResponseCache.size >= LOCATION_SEED_CACHE_MAX_ENTRIES) {
    const oldestKey = locationSeedResponseCache.keys().next().value;
    if (oldestKey) {
      locationSeedResponseCache.delete(oldestKey);
    }
  }

  locationSeedResponseCache.set(cacheKey, {
    documents: [...documents],
    expiresAt: Date.now() + LOCATION_SEED_CACHE_TTL_MS,
  });
}

async function invokeLocationSeed<TDocument>(
  body: Record<string, unknown>,
): Promise<TDocument[]> {
  const cacheKey = JSON.stringify(body);
  const cached = readCachedSeedDocuments<TDocument>(cacheKey);
  if (cached) {
    return cached;
  }

  const inFlight = locationSeedInFlight.get(cacheKey);
  if (inFlight) {
    return (await inFlight) as TDocument[];
  }

  console.info(
    '[NURI-DEBUG] location-discovery-seed called',
    JSON.stringify({
      action: body.action,
    }),
  );

  try {
    const task = Promise.race([
      supabase.functions.invoke('location-discovery-seed', {
        body,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('location discovery seed timeout'));
        }, LOCATION_DEFENSIVE_FALLBACK_TIMEOUT_MS);
      }),
    ]);
    const seedTask = task.then(({ data, error }) => {
      if (error) {
        throw new Error(error.message || '주변 장소를 불러오지 못했어요.');
      }

      const documents = readSeedDocuments<unknown>(
        data as LocationDiscoverySeedResponse,
      );
      writeSeedDocumentsCache(cacheKey, documents);
      return documents;
    });
    locationSeedInFlight.set(cacheKey, seedTask);
    const documents = (await seedTask) as TDocument[];

    console.info(
      '[NURI-DEBUG] location-discovery-seed completed',
      JSON.stringify({
        action: body.action,
        ok: true,
      }),
    );

    return documents;
  } catch (error: unknown) {
    console.info(
      '[NURI-DEBUG] location-discovery-seed failed',
      JSON.stringify({
        action: body.action,
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'unknown',
      }),
    );
    throw error;
  } finally {
    locationSeedInFlight.delete(cacheKey);
  }
}

export const kakaoLocalSearchProvider: LocationSearchProvider = {
  async searchKeyword(input) {
    return invokeLocationSeed<KakaoPlaceDocument>({
      action: 'keyword',
      input: {
        coordinates: input.coordinates,
        page: input.page,
        query: input.query,
        radiusMeters: input.radiusMeters,
        size: input.size,
      },
    });
  },
  async searchAddress(query) {
    return invokeLocationSeed<KakaoAddressDocument>({
      action: 'address',
      query,
    });
  },
};
