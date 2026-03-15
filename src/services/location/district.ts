// 파일: src/services/location/district.ts
// 역할:
// - 좌표를 한국 행정동 이름으로 변환하는 역지오코딩 계층
// - Kakao Local API 연결 전에도 인터페이스를 먼저 고정해 재사용 가능하게 유지

import { KAKAO_REST_API_KEY } from '../../config/runtime';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeviceCoordinates } from './currentPosition';

export type DistrictResolveResult = {
  province: string | null;
  city: string | null;
  district: string;
  source: 'kakao' | 'fallback';
};
export type WalkDistrictOption = {
  value: string;
  label: string;
};

const GOYANG_ILSAN_WALK_DISTRICTS = [
  '일산1동',
  '일산2동',
  '일산3동',
  '장항동',
  '정발산동',
  '마두동',
  '백석동',
  '주엽동',
  '대화동',
  '탄현동',
  '식사동',
  '풍동',
  '중산동',
] as const;

const DISTRICT_CACHE_PREFIX = '@nuri/location/district:';

function toDistrictCacheKey(coords: DeviceCoordinates) {
  return `${DISTRICT_CACHE_PREFIX}${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`;
}

async function loadCachedDistrict(coords: DeviceCoordinates) {
  try {
    const cached = await AsyncStorage.getItem(toDistrictCacheKey(coords));
    return cached?.trim() || null;
  } catch {
    return null;
  }
}

async function saveCachedDistrict(
  coords: DeviceCoordinates,
  district: string,
) {
  try {
    await AsyncStorage.setItem(toDistrictCacheKey(coords), district);
  } catch {
    // noop
  }
}

export function getFallbackDistrictLabel(coords: DeviceCoordinates) {
  const lat = Number(coords.latitude.toFixed(3));
  const lng = Number(coords.longitude.toFixed(3));

  if (lat >= 37.675 && lat <= 37.691 && lng >= 126.765 && lng <= 126.781) {
    return '일산2동';
  }
  if (lat >= 37.484 && lat <= 37.496 && lng >= 127.01 && lng <= 127.025) {
    return '서초1동';
  }

  if (lat >= 37.65 && lng >= 126.75 && lng <= 126.85) {
    return '일산동';
  }
  if (lat >= 37.45 && lat <= 37.52 && lng >= 127.0 && lng <= 127.08) {
    return '서초동';
  }
  return '현재 위치';
}

export function normalizeDistrictLabel(value: string | null | undefined): string | null {
  const district = (value ?? '').trim();
  if (!district) return null;
  if (district === '현재 위치') return district;

  const normalizedDongMatch = district.match(/^(.+?)(\d+)동$/);
  if (normalizedDongMatch) {
    return `${normalizedDongMatch[1]}동`;
  }

  return district;
}

export function getWalkDistrictOptions(
  value: string | null | undefined,
): WalkDistrictOption[] {
  const district = (value ?? '').trim();
  if (!district || district === '현재 위치') {
    return [];
  }

  const normalizedDistrict = normalizeDistrictLabel(district);
  if (
    normalizedDistrict === '일산동' ||
    GOYANG_ILSAN_WALK_DISTRICTS.includes(
      district as (typeof GOYANG_ILSAN_WALK_DISTRICTS)[number],
    )
  ) {
    return GOYANG_ILSAN_WALK_DISTRICTS.map(option => ({
      value: option,
      label: option,
    }));
  }

  return [
    {
      value: district,
      label: district,
    },
  ];
}

export async function resolveDistrictFromCoordinates(
  coords: DeviceCoordinates,
): Promise<DistrictResolveResult> {
  const cachedDistrict = await loadCachedDistrict(coords);

  if (!KAKAO_REST_API_KEY) {
    return {
      province: null,
      city: null,
      district: cachedDistrict ?? getFallbackDistrictLabel(coords),
      source: 'fallback',
    };
  }

  const url =
    `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json` +
    `?x=${coords.longitude}` +
    `&y=${coords.latitude}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });

    if (!response.ok) {
      return {
        province: null,
        city: null,
        district: cachedDistrict ?? getFallbackDistrictLabel(coords),
        source: 'fallback',
      };
    }

    const json = (await response.json()) as {
      documents?: Array<{
        region_type?: string;
        region_1depth_name?: string;
        region_2depth_name?: string;
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
      cachedDistrict ||
      getFallbackDistrictLabel(coords);

    if (legalDong && district) {
      await saveCachedDistrict(coords, district);
    }

    return {
      province: legalDong?.region_1depth_name?.trim() || null,
      city: legalDong?.region_2depth_name?.trim() || null,
      district,
      source: legalDong ? 'kakao' : 'fallback',
    };
  } catch {
    return {
      province: null,
      city: null,
      district: cachedDistrict ?? getFallbackDistrictLabel(coords),
      source: 'fallback',
    };
  }
}
