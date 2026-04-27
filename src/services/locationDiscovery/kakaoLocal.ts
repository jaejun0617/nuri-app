import type { KakaoAddressDocument, KakaoPlaceDocument } from './types';
import type { LocationSearchProvider } from './provider';
import { supabase } from '../supabase/client';
import { LOCATION_DEFENSIVE_FALLBACK_TIMEOUT_MS } from '../location/currentPosition';

type LocationDiscoverySeedResponse = {
  ok?: boolean;
  documents?: unknown;
  error?: string;
};

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

async function invokeLocationSeed<TDocument>(
  body: Record<string, unknown>,
): Promise<TDocument[]> {
  console.info(
    '[NURI-DEBUG] location-discovery-seed called',
    JSON.stringify({
      action: body.action,
    }),
  );

  try {
    const { data, error } = await Promise.race([
      supabase.functions.invoke('location-discovery-seed', {
        body,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('location discovery seed timeout'));
        }, LOCATION_DEFENSIVE_FALLBACK_TIMEOUT_MS);
      }),
    ]);

    console.info(
      '[NURI-DEBUG] location-discovery-seed completed',
      JSON.stringify({
        action: body.action,
        ok: !error,
      }),
    );

    if (error) {
      throw new Error(error.message || '주변 장소를 불러오지 못했어요.');
    }

    return readSeedDocuments<TDocument>(data as LocationDiscoverySeedResponse);
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
