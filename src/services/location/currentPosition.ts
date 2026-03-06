// 파일: src/services/location/currentPosition.ts
// 역할:
// - 현재 위도/경도를 Promise 형태로 가져오는 공용 서비스
// - 날씨/위치 기반 기능이 같은 옵션을 재사용할 수 있도록 중앙화

import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

export type DeviceCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const LAST_COORDINATES_KEY = '@nuri/location/lastCoordinates';

function requestCoordinates(options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}): Promise<DeviceCoordinates> {
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
        ...options,
      },
    );
  });
}

async function loadLastCoordinates(): Promise<DeviceCoordinates | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_COORDINATES_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DeviceCoordinates | null;
    if (!parsed) return null;
    if (
      typeof parsed.latitude !== 'number' ||
      typeof parsed.longitude !== 'number'
    ) {
      return null;
    }

    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      accuracy:
        typeof parsed.accuracy === 'number' ? parsed.accuracy : null,
    };
  } catch {
    return null;
  }
}

async function saveLastCoordinates(coords: DeviceCoordinates) {
  try {
    await AsyncStorage.setItem(LAST_COORDINATES_KEY, JSON.stringify(coords));
  } catch {
    // noop
  }
}

export async function getCurrentCoordinates(): Promise<DeviceCoordinates> {
  try {
    const precise = await requestCoordinates({
      enableHighAccuracy: true,
      timeout: 18000,
      maximumAge: 0,
    });
    await saveLastCoordinates(precise);
    return precise;
  } catch {
    try {
      const balanced = await requestCoordinates({
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000,
      });
      await saveLastCoordinates(balanced);
      return balanced;
    } catch (fallbackError) {
      const cached = await loadLastCoordinates();
      if (cached) {
        return cached;
      }
      throw fallbackError;
    }
  }
}
