import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildLocationCoordinateKey,
  getFreshDeviceCoordinates,
  getLastCoordinates,
  isPreciseLocationCoordinates,
  isWeakLocationSignal,
  reconcileLocationCoordinates,
  shouldPromoteLocationCoordinates,
  type DeviceCoordinates,
} from '../src/services/location/currentPosition';

function coords(input: Partial<DeviceCoordinates>): DeviceCoordinates {
  return {
    latitude: input.latitude ?? 37.5,
    longitude: input.longitude ?? 127,
    accuracy: input.accuracy ?? 30,
    capturedAt: input.capturedAt ?? Date.now(),
    source: input.source ?? 'gps',
  };
}

describe('currentPosition quality helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stale cached coordinate보다 fresh network coordinate를 승격한다', () => {
    const stale = coords({
      accuracy: 20,
      capturedAt: Date.now() - 10 * 60 * 1000,
      source: 'gps',
    });
    const freshNetwork = coords({
      accuracy: 80,
      capturedAt: Date.now(),
      source: 'network',
    });

    expect(shouldPromoteLocationCoordinates(stale, freshNetwork)).toBe(true);
  });

  it('약신호와 precise coordinate를 분리한다', () => {
    expect(isWeakLocationSignal(coords({ accuracy: 1500 }))).toBe(true);
    expect(isPreciseLocationCoordinates(coords({ accuracy: 30 }))).toBe(true);
    expect(
      isPreciseLocationCoordinates(coords({ accuracy: 30, source: 'network' })),
    ).toBe(false);
  });

  it('저장소에서 복원한 GPS 좌표도 cached로 격하한다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(
        coords({
          latitude: 35.1796,
          longitude: 129.0756,
          source: 'gps',
        }),
      ),
    );

    const restored = await getLastCoordinates();

    expect(restored?.source).toBe('cached');
    expect(getFreshDeviceCoordinates(restored)).toBeNull();
  });

  it('cached/default 좌표는 최신 timestamp여도 거리 origin으로 열지 않는다', () => {
    const capturedAt = Date.now();

    expect(
      getFreshDeviceCoordinates(coords({ source: 'cached', capturedAt })),
    ).toBeNull();
    expect(
      getFreshDeviceCoordinates(coords({ source: 'default', capturedAt })),
    ).toBeNull();
  });

  it('늦게 도착한 과거 live sample은 현재 좌표를 덮지 않는다', () => {
    const current = coords({ capturedAt: 10_000, source: 'gps' });
    const delayed = coords({
      latitude: 37.51,
      capturedAt: 5_000,
      source: 'network',
    });

    expect(shouldPromoteLocationCoordinates(current, delayed)).toBe(false);
    expect(reconcileLocationCoordinates(current, delayed)).toBe(current);
  });

  it('새 fallback sample은 이미 확보한 live 좌표를 덮지 않는다', () => {
    const current = coords({
      latitude: 35.1796,
      longitude: 129.0756,
      capturedAt: 10_000,
      source: 'gps',
    });
    const fallback = coords({
      latitude: 37.5665,
      longitude: 126.978,
      capturedAt: 20_000,
      source: 'default',
    });

    expect(shouldPromoteLocationCoordinates(current, fallback)).toBe(false);
    expect(reconcileLocationCoordinates(current, fallback)).toBe(current);
  });

  it('같은 지역의 현저히 부정확한 GPS sample은 정확한 network 좌표를 바꾸지 않는다', () => {
    const current = coords({
      accuracy: 10,
      capturedAt: 10_000,
      source: 'network',
    });
    const inaccurateGps = coords({
      latitude: 37.5001,
      accuracy: 500,
      capturedAt: 20_000,
      source: 'gps',
    });

    const reconciled = reconcileLocationCoordinates(current, inaccurateGps);

    expect(reconciled?.latitude).toBe(current.latitude);
    expect(reconciled?.source).toBe('network');
    expect(reconciled?.capturedAt).toBe(20_000);
  });

  it('50m 미만 jitter는 query 좌표를 유지하고 sample age만 갱신한다', () => {
    const current = coords({
      latitude: 37.5,
      capturedAt: 10_000,
      source: 'gps',
    });
    const jitter = coords({
      latitude: 37.5001,
      capturedAt: 20_000,
      source: 'gps',
    });

    const reconciled = reconcileLocationCoordinates(current, jitter);

    expect(buildLocationCoordinateKey(reconciled)).toBe(
      buildLocationCoordinateKey(current),
    );
    expect(reconciled?.capturedAt).toBe(20_000);
  });

  it('50m 이상 이동은 새 query 좌표로 승격한다', () => {
    const current = coords({
      latitude: 37.5,
      capturedAt: 10_000,
      source: 'gps',
    });
    const moved = coords({
      latitude: 37.501,
      capturedAt: 20_000,
      source: 'gps',
    });

    expect(reconcileLocationCoordinates(current, moved)).toBe(moved);
    expect(buildLocationCoordinateKey(moved)).not.toBe(
      buildLocationCoordinateKey(current),
    );
  });
});
