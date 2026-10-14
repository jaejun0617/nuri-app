import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { getLocationPermissionGrant } from '../../../services/location/permission';
import { isValidGeographicCoordinate } from '../../../services/location/coordinates';
import type { WalkMapPoint } from '../../../services/walk/runtime/distanceProjection';

type Status =
  | 'IDLE'
  | 'LOCATING'
  | 'READY'
  | 'PERMISSION_REQUIRED'
  | 'UNAVAILABLE';
const MESSAGES: Record<Status, string> = {
  IDLE: '산책 기록은 시작하지 않았어요',
  LOCATING: '현재 위치를 확인하고 있어요',
  READY: '산책 기록은 시작하지 않았어요',
  PERMISSION_REQUIRED: '위치 권한이 필요해요. 기기 설정에서 허용해 주세요.',
  UNAVAILABLE: '현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

/** Explicit one-shot map review only: no watch, persistence, walk command or export. */
export function useWalkDesignLocation(enabled: boolean, owner: string | null) {
  const [point, setPoint] = useState<WalkMapPoint | null>(null);
  const [status, setStatus] = useState<Status>('IDLE');
  const epoch = useRef(0),
    pending = useRef(false);
  const clear = useCallback(() => {
    epoch.current++;
    pending.current = false;
    setPoint(null);
    setStatus('IDLE');
  }, []);
  useEffect(() => {
    clear();
    if (!enabled) return;
    const activeEpoch = epoch,
      inFlight = pending;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') clear();
    });
    return () => {
      activeEpoch.current++;
      inFlight.current = false;
      subscription.remove();
    };
  }, [clear, enabled, owner]);
  const request = useCallback(async () => {
    if (
      !enabled ||
      !owner ||
      pending.current ||
      AppState.currentState !== 'active'
    )
      return;
    const token = ++epoch.current;
    pending.current = true;
    setPoint(null);
    setStatus('LOCATING');
    const valid = () =>
      token === epoch.current && AppState.currentState === 'active';
    try {
      const grant = await getLocationPermissionGrant();
      if (!valid()) return;
      if (grant.status !== 'granted') {
        setStatus('PERMISSION_REQUIRED');
        return;
      }
      const value = await new Promise<WalkMapPoint>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          position => {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            if (isValidGeographicCoordinate(coords)) resolve(coords);
            else reject(new Error('MAP_LOCATION_UNAVAILABLE'));
          },
          () => reject(new Error('MAP_LOCATION_UNAVAILABLE')),
          // A map-only indoor review may use a fresh OS network fix, never a cached/default point.
          { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 },
        );
      });
      if (!valid()) return;
      setPoint(value);
      setStatus('READY');
    } catch {
      if (valid()) setStatus('UNAVAILABLE');
    } finally {
      if (token === epoch.current) pending.current = false;
    }
  }, [enabled, owner]);
  return { point, request, clear, message: MESSAGES[status] };
}
