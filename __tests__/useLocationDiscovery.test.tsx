import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useLocationDiscovery } from '../src/hooks/useLocationDiscovery';
import type { LocationDiscoverySearchScope } from '../src/services/locationDiscovery/types';

type FocusEffect = () => void | (() => void);

let mockFocusCallbacks: FocusEffect[] = [];

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (effect: FocusEffect) => {
      mockFocusCallbacks.push(effect);
    },
  };
});

jest.mock('../src/hooks/useCurrentLocation', () => ({
  useCurrentLocation: jest.fn(),
}));

jest.mock('../src/hooks/useDistrict', () => ({
  useDistrict: jest.fn(),
}));

jest.mock('../src/services/locationDiscovery/service', () => ({
  searchLocationDiscovery: jest.fn(),
}));

const { useCurrentLocation } = jest.requireMock('../src/hooks/useCurrentLocation') as {
  useCurrentLocation: jest.Mock;
};
const { useDistrict } = jest.requireMock('../src/hooks/useDistrict') as {
  useDistrict: jest.Mock;
};
const { searchLocationDiscovery } = jest.requireMock(
  '../src/services/locationDiscovery/service',
) as {
  searchLocationDiscovery: jest.Mock;
};

const coordinates = {
  latitude: 37.5665,
  longitude: 126.978,
  accuracy: 12,
  capturedAt: Date.now(),
  source: 'gps' as const,
};
const scope: LocationDiscoverySearchScope = {
  displayLabel: '현재 위치',
  queryLabel: null,
  anchorCoordinates: coordinates,
  distanceLabel: '현재 위치 기준',
};

function Harness() {
  useLocationDiscovery({
    domain: 'walk',
    query: '',
  });
  return null;
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

async function flush() {
  await ReactTestRenderer.act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

async function waitFor(check: () => boolean, attempts = 10) {
  for (let index = 0; index < attempts; index += 1) {
    await flush();
    if (check()) return;
  }

  throw new Error('조건이 충족되지 않았어요.');
}

describe('useLocationDiscovery focus lifecycle', () => {
  beforeEach(() => {
    mockFocusCallbacks = [];
    jest.clearAllMocks();
    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'granted',
      coordinates,
      source: 'gps',
      isFresh: true,
      isStale: false,
      lastUpdatedAt: coordinates.capturedAt,
      error: null,
      refresh: jest.fn(),
    });
    useDistrict.mockReturnValue({
      loading: false,
      district: '중구',
      normalizedDistrict: '중구',
      city: '서울특별시',
      source: 'cached',
      error: null,
    });
    searchLocationDiscovery.mockResolvedValue({
      items: [],
      query: null,
      source: 'walk_poi',
      verificationStatus: 'unknown',
      scope,
    });
  });

  it('query 결과가 정착해도 focused callback identity를 재생성하지 않는다', async () => {
    const client = createClient();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
    });

    await waitFor(() => mockFocusCallbacks.length >= 2);

    expect(mockFocusCallbacks[0]).toBe(mockFocusCallbacks.at(-1));

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
    client.clear();
  });

  it('새 좌표가 반환되면 이전 좌표 query를 다시 호출하지 않는다', async () => {
    const staleCoordinates = {
      ...coordinates,
      capturedAt: Date.now() - 60_000,
      source: 'cached' as const,
    };
    const nextCoordinates = {
      ...coordinates,
      latitude: 37.5705,
      source: 'gps' as const,
      capturedAt: Date.now(),
    };
    const refreshLocation = jest.fn().mockResolvedValue(nextCoordinates);
    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'granted',
      coordinates: staleCoordinates,
      source: 'cached',
      isFresh: false,
      isStale: true,
      lastUpdatedAt: staleCoordinates.capturedAt,
      error: null,
      refresh: refreshLocation,
    });

    const client = createClient();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
    });
    await waitFor(() => searchLocationDiscovery.mock.calls.length >= 1);

    const focusedEffect = mockFocusCallbacks[0];
    expect(focusedEffect).toBeDefined();
    await ReactTestRenderer.act(async () => {
      await focusedEffect?.();
    });

    expect(refreshLocation).toHaveBeenCalledTimes(1);
    expect(searchLocationDiscovery).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
    client.clear();
  });
});
