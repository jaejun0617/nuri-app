// 파일: src/services/location/district.ts
// 역할:
// - 좌표를 한국 행정동 이름으로 변환하는 역지오코딩 계층
// - Kakao Local API 연결 전에도 인터페이스를 먼저 고정해 재사용 가능하게 유지

import type { DeviceCoordinates } from './currentPosition';

export type DistrictResolveResult = {
  district: string;
  source: 'kakao' | 'fallback';
};

const KAKAO_REST_API_KEY = '';

function buildFallbackDistrict(coords: DeviceCoordinates) {
  const lat = Number(coords.latitude.toFixed(2));
  const lng = Number(coords.longitude.toFixed(2));

  if (lat >= 37.65 && lng >= 126.75 && lng <= 126.85) {
    return '일산동';
  }
  if (lat >= 37.45 && lat <= 37.52 && lng >= 127.0 && lng <= 127.08) {
    return '서초동';
  }
  return '현재 위치';
}

export async function resolveDistrictFromCoordinates(
  coords: DeviceCoordinates,
): Promise<DistrictResolveResult> {
  if (!KAKAO_REST_API_KEY) {
    return {
      district: buildFallbackDistrict(coords),
      source: 'fallback',
    };
  }

  const url =
    `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json` +
    `?x=${coords.longitude}` +
    `&y=${coords.latitude}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('행정동 정보를 불러오지 못했어요.');
  }

  const json = (await response.json()) as {
    documents?: Array<{
      region_type?: string;
      region_3depth_name?: string;
      address_name?: string;
    }>;
  };

  const docs = Array.isArray(json.documents) ? json.documents : [];
  const legalDong =
    docs.find(item => item.region_type === 'H') ??
    docs.find(item => !!item.region_3depth_name) ??
    null;

  const district =
    legalDong?.region_3depth_name?.trim() ||
    legalDong?.address_name?.trim() ||
    buildFallbackDistrict(coords);

  return {
    district,
    source: 'kakao',
  };
}
