import { KAKAO_REST_API_KEY } from '../../config/runtime';
import type { KakaoAddressDocument, KakaoPlaceDocument } from './types';
import type {
  LocationSearchProvider,
  LocationSearchProviderInput,
} from './provider';

type KakaoKeywordSearchResponse = {
  documents?: KakaoPlaceDocument[];
};

type KakaoAddressSearchResponse = {
  documents?: KakaoAddressDocument[];
};

function buildKeywordSearchUrl(input: LocationSearchProviderInput): string {
  const params = new URLSearchParams();
  params.set('query', input.query);
  params.set('size', String(Math.min(15, Math.max(1, input.size ?? 10))));
  params.set('page', String(Math.min(45, Math.max(1, input.page ?? 1))));

  if (input.coordinates) {
    params.set('x', String(input.coordinates.longitude));
    params.set('y', String(input.coordinates.latitude));
    params.set(
      'radius',
      String(Math.min(20000, Math.max(500, input.radiusMeters ?? 3000))),
    );
    params.set('sort', 'distance');
  }

  return `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`;
}

function buildAddressSearchUrl(query: string): string {
  const params = new URLSearchParams();
  params.set('query', query);
  params.set('size', '10');
  params.set('analyze_type', 'exact');
  return `https://dapi.kakao.com/v2/local/search/address.json?${params.toString()}`;
}

export const kakaoLocalSearchProvider: LocationSearchProvider = {
  async searchKeyword(input) {
    if (!KAKAO_REST_API_KEY) {
      throw new Error('Kakao REST API 키가 없어 위치 기반 검색을 진행할 수 없어요.');
    }

    const response = await fetch(buildKeywordSearchUrl(input), {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('주변 장소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }

    const json = (await response.json()) as KakaoKeywordSearchResponse;
    return Array.isArray(json.documents) ? json.documents : [];
  },
  async searchAddress(query) {
    if (!KAKAO_REST_API_KEY) {
      throw new Error('Kakao REST API 키가 없어 위치 기반 검색을 진행할 수 없어요.');
    }

    const response = await fetch(buildAddressSearchUrl(query), {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('선택한 지역 기준 좌표를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }

    const json = (await response.json()) as KakaoAddressSearchResponse;
    return Array.isArray(json.documents) ? json.documents : [];
  },
};
