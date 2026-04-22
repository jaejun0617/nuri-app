// 파일: src/services/location/permission.ts
// 역할:
// - 플랫폼별 위치 권한 상태 확인 및 요청 로직 제공
// - 날씨/위치 기능에서 공통으로 재사용할 수 있는 얇은 권한 계층

import { PermissionsAndroid, Platform } from 'react-native';

export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';

export type LocationPermissionAccuracy =
  | 'precise'
  | 'approximate'
  | 'unknown';

export type LocationPermissionGrant = {
  status: LocationPermissionStatus;
  accuracy: LocationPermissionAccuracy;
};

const FINE_LOCATION = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
const COARSE_LOCATION = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

async function checkAndroidLocationPermission(): Promise<LocationPermissionGrant> {
  const [fineGranted, coarseGranted] = await Promise.all([
    PermissionsAndroid.check(FINE_LOCATION),
    PermissionsAndroid.check(COARSE_LOCATION),
  ]);

  if (fineGranted) {
    return { status: 'granted', accuracy: 'precise' };
  }

  if (coarseGranted) {
    return { status: 'granted', accuracy: 'approximate' };
  }

  return { status: 'denied', accuracy: 'unknown' };
}

export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  const grant = await getLocationPermissionGrant();
  return grant.status;
}

export async function getLocationPermissionGrant(): Promise<LocationPermissionGrant> {
  if (Platform.OS === 'ios') {
    return { status: 'granted', accuracy: 'precise' };
  }

  return checkAndroidLocationPermission();
}

export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const grant = await requestLocationPermissionGrant();
  return grant.status;
}

export async function requestLocationPermissionGrant(): Promise<LocationPermissionGrant> {
  if (Platform.OS === 'ios') {
    return { status: 'granted', accuracy: 'precise' };
  }

  const result = await PermissionsAndroid.requestMultiple([
    FINE_LOCATION,
    COARSE_LOCATION,
  ]);

  if (result[FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED) {
    return { status: 'granted', accuracy: 'precise' };
  }

  if (result[COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED) {
    return { status: 'granted', accuracy: 'approximate' };
  }

  if (
    result[FINE_LOCATION] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
    result[COARSE_LOCATION] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
  ) {
    return { status: 'blocked', accuracy: 'unknown' };
  }

  if (
    result[FINE_LOCATION] === PermissionsAndroid.RESULTS.DENIED ||
    result[COARSE_LOCATION] === PermissionsAndroid.RESULTS.DENIED
  ) {
    return { status: 'denied', accuracy: 'unknown' };
  }

  return { status: 'unavailable', accuracy: 'unknown' };
}
