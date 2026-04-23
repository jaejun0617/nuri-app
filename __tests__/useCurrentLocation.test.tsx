import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { useCurrentLocation, type CurrentLocationState } from '../src/hooks/useCurrentLocation';
import type { DeviceCoordinates } from '../src/services/location/currentPosition';
import type { LocationPermissionGrant } from '../src/services/location/permission';

jest.mock('../src/services/location/currentPosition', () => {
  const actual = jest.requireActual('../src/services/location/currentPosition');
  return {
    ...actual,
    getLastCoordinates: jest.fn(),
    getPreciseCurrentCoordinates: jest.fn(),
    getQuickCurrentCoordinates: jest.fn(),
  };
});

jest.mock('../src/services/location/permission', () => {
  const actual = jest.requireActual('../src/services/location/permission');
  return {
    ...actual,
    getLocationPermissionGrant: jest.fn(),
    requestLocationPermissionGrant: jest.fn(),
  };
});

const currentPositionModule = jest.requireMock(
  '../src/services/location/currentPosition',
) as {
  getLastCoordinates: jest.Mock;
  getPreciseCurrentCoordinates: jest.Mock;
  getQuickCurrentCoordinates: jest.Mock;
};

const permissionModule = jest.requireMock(
  '../src/services/location/permission',
) as {
  getLocationPermissionGrant: jest.Mock;
  requestLocationPermissionGrant: jest.Mock;
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function coords(input: Partial<DeviceCoordinates>): DeviceCoordinates {
  return {
    latitude: input.latitude ?? 37.5,
    longitude: input.longitude ?? 127,
    accuracy: input.accuracy ?? 30,
    capturedAt: input.capturedAt ?? Date.now(),
    source: input.source ?? 'gps',
  };
}

let latestState: CurrentLocationState | null = null;

function HookHarness(props: { initialCoordinates: DeviceCoordinates | null }) {
  latestState = useCurrentLocation({
    initialCoordinates: props.initialCoordinates,
    autoRefreshOnMount: false,
    autoRefreshOnActive: false,
  });

  return null;
}

describe('useCurrentLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestState = null;
    currentPositionModule.getLastCoordinates.mockResolvedValue(null);
    currentPositionModule.getPreciseCurrentCoordinates.mockResolvedValue(
      coords({ source: 'gps', accuracy: 20 }),
    );
    permissionModule.getLocationPermissionGrant.mockResolvedValue({
      status: 'granted',
      accuracy: 'precise',
    } satisfies LocationPermissionGrant);
    permissionModule.requestLocationPermissionGrant.mockResolvedValue({
      status: 'granted',
      accuracy: 'precise',
    } satisfies LocationPermissionGrant);
  });

  it('기존 좌표가 있으면 refresh 중에도 loading을 다시 켜지 않는다', async () => {
    const deferred = createDeferred<DeviceCoordinates>();
    const initialCoordinates = coords({
      source: 'cached',
      accuracy: 180,
      capturedAt: Date.now() - 10 * 60 * 1000,
    });
    const refreshedCoordinates = coords({
      source: 'gps',
      accuracy: 25,
      capturedAt: Date.now(),
    });
    currentPositionModule.getQuickCurrentCoordinates.mockReturnValue(
      deferred.promise,
    );

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <HookHarness initialCoordinates={initialCoordinates} />,
      );
    });

    expect(latestState?.loading).toBe(false);

    let refreshPromise: Promise<DeviceCoordinates | null> | null = null;
    await act(async () => {
      refreshPromise = latestState?.refresh() ?? null;
      await Promise.resolve();
    });

    expect(latestState?.loading).toBe(false);
    expect(latestState?.isRefreshing).toBe(true);

    await act(async () => {
      deferred.resolve(refreshedCoordinates);
      await refreshPromise;
    });

    expect(latestState?.loading).toBe(false);
    expect(latestState?.coordinates?.source).toBe('gps');

    await act(async () => {
      renderer!.unmount();
    });
  });

  it('approximate 권한이면 정확한 위치 승격 요청을 다시 시도한다', async () => {
    permissionModule.getLocationPermissionGrant.mockResolvedValue({
      status: 'granted',
      accuracy: 'approximate',
    } satisfies LocationPermissionGrant);
    permissionModule.requestLocationPermissionGrant.mockResolvedValue({
      status: 'granted',
      accuracy: 'precise',
    } satisfies LocationPermissionGrant);
    currentPositionModule.getQuickCurrentCoordinates.mockResolvedValue(
      coords({
        source: 'gps',
        accuracy: 18,
        capturedAt: Date.now(),
      }),
    );

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <HookHarness
          initialCoordinates={coords({
            source: 'network',
            accuracy: 1400,
            capturedAt: Date.now(),
          })}
        />,
      );
    });

    let result:
      | Awaited<ReturnType<CurrentLocationState['requestPreciseRefresh']>>
      | undefined;
    await act(async () => {
      result = await latestState?.requestPreciseRefresh();
    });

    expect(permissionModule.requestLocationPermissionGrant).toHaveBeenCalledTimes(
      1,
    );
    expect(result?.grantedPrecise).toBe(true);
    expect(result?.permissionAccuracy).toBe('precise');

    await act(async () => {
      renderer!.unmount();
    });
  });
});
