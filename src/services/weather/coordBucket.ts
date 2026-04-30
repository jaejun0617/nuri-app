// 파일: src/services/weather/coordBucket.ts
// 역할:
// - 클라이언트 캐시/query key에서도 서버 weather-cache와 같은 지역 bucket 기준을 사용한다.
// - 정밀 좌표 변화로 홈/상세 왕복마다 불필요한 weather-cache 호출이 생기지 않게 한다.

import type { DeviceCoordinates } from '../location/currentPosition';

export const WEATHER_COORD_BUCKET_SIZE_DEGREES = 0.02;

function normalizeBucketNumber(value: number) {
  const normalized = Math.round(value * 100) / 100;
  return Object.is(normalized, -0) ? 0 : normalized;
}

function formatBucketNumber(value: number) {
  return normalizeBucketNumber(value).toFixed(2);
}

export function createWeatherCoordBucket(coords: DeviceCoordinates) {
  // 서버 Edge Function도 같은 0.02도 bucket을 사용한다.
  // 날씨는 초정밀 좌표보다 지역 단위 재사용이 맞아 provider 호출과 로컬 캐시 churn을 줄인다.
  const latitude = normalizeBucketNumber(
    Math.round(coords.latitude / WEATHER_COORD_BUCKET_SIZE_DEGREES) *
      WEATHER_COORD_BUCKET_SIZE_DEGREES,
  );
  const longitude = normalizeBucketNumber(
    Math.round(coords.longitude / WEATHER_COORD_BUCKET_SIZE_DEGREES) *
      WEATHER_COORD_BUCKET_SIZE_DEGREES,
  );

  return {
    latitude,
    longitude,
    key: `v1:${formatBucketNumber(latitude)}:${formatBucketNumber(
      longitude,
    )}:d${WEATHER_COORD_BUCKET_SIZE_DEGREES.toFixed(2)}`,
  };
}

export function getWeatherCoordBucketKey(coords: DeviceCoordinates) {
  return createWeatherCoordBucket(coords).key;
}
