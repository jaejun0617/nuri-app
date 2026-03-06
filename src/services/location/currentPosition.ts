// 파일: src/services/location/currentPosition.ts
// 역할:
// - 현재 위도/경도를 Promise 형태로 가져오는 공용 서비스
// - 날씨/위치 기반 기능이 같은 옵션을 재사용할 수 있도록 중앙화

import Geolocation from '@react-native-community/geolocation';

export type DeviceCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export function getCurrentCoordinates(): Promise<DeviceCoordinates> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
      },
      error => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      },
    );
  });
}
