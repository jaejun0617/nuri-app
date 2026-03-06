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

export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  if (Platform.OS === 'ios') {
    return 'granted';
  }

  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  return granted ? 'granted' : 'denied';
}

export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  if (Platform.OS === 'ios') {
    return 'granted';
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: '위치 권한이 필요해요',
      message: '현재 위치를 기준으로 날씨와 산책 가이드를 보여드릴게요.',
      buttonPositive: '허용',
      buttonNegative: '나중에',
      buttonNeutral: '닫기',
    },
  );

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'blocked';
  }

  if (result === PermissionsAndroid.RESULTS.DENIED) {
    return 'denied';
  }

  return 'unavailable';
}
