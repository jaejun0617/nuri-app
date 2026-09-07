import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  useLocationDiscovery,
  type LocationDiscoveryState,
} from '../src/hooks/useLocationDiscovery';
import type {
  LocationDiscoveryItem,
  LocationDiscoverySearchScope,
} from '../src/services/locationDiscovery/types';

type FocusEffect = () => void | (() => void);

let mockFocusCallbacks: FocusEffect[] = [];
let latestDiscoveryState: LocationDiscoveryState | null = null;

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

const { useCurrentLocation } = jest.requireMock(
  '../src/hooks/useCurrentLocation',
) as {
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
const walkItem: LocationDiscoveryItem = {
  id: 'walk:loading-contract',
  domain: 'walk',
  kind: 'walk-spot',
  name: '누리 산책공원',
  description: '반려동물과 함께 걷는 산책 장소예요.',
  categoryLabel: '공원',
  address: '서울특별시 중구 세종대로 1',
  roadAddress: '서울특별시 중구 세종대로 1',
  distanceMeters: 320,
  distanceLabel: '320m',
  estimatedMinutes: 15,
  latitude: 37.5665,
  longitude: 126.978,
  placeUrl: null,
  phone: null,
  operatingStatusLabel: null,
  source: {
    provider: 'walk_poi',
    providerLabel: 'NURI 산책 장소',
    type: 'canonical-poi',
    externalPlaceId: null,
  },
  verification: {
    status: 'unknown',
    label: '확인 필요',
    description: '기본 장소 정보만 제공해요.',
    tone: 'neutral',
    sourceLabel: 'NURI',
    requiresConfirmation: true,
  },
  publicTrust: {
    publicLabel: 'needs_verification',
    label: '확인 필요',
    shortReason: '기본 정보는 있지만 최신 확인이 더 필요해요.',
    description: '공개 가능한 기본 정보만 보여줘요.',
    guidance: '방문 전에 최신 정보를 확인해 주세요.',
    tone: 'caution',
    sourceLabel: 'walk_poi',
    basisDate: '2026-09-07T00:00:00.000Z',
    basisDateLabel: '기준일 2026.09.07',
    isStale: false,
    hasConflict: false,
    layers: ['candidate'],
  },
  userLayer: {
    targetId: null,
    supportsBookmark: false,
    supportsReport: true,
  },
  petPolicy: {
    summaryLabel: null,
    detail: null,
  },
  thumbnailUrl: null,
  coordinateLabel: '37.56650, 126.97800',
  mapPreviewUrl: 'https://maps.example.test/walk-loading-contract',
};

const walkResult = {
  items: [walkItem],
  query: null,
  source: 'walk_poi' as const,
  verificationStatus: 'unknown' as const,
  scope,
};

function Harness() {
  latestDiscoveryState = useLocationDiscovery({
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
    latestDiscoveryState = null;
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

  it('첫 결과가 대기 중이면 empty보다 loading 상태를 유지한다', async () => {
    let resolveSearch: ((value: typeof walkResult) => void) | null = null;
    searchLocationDiscovery.mockImplementationOnce(
      () =>
        new Promise<typeof walkResult>(resolve => {
          resolveSearch = resolve;
        }),
    );

    const client = createClient();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
    });
    await waitFor(() => latestDiscoveryState !== null);

    expect(latestDiscoveryState?.loading).toBe(true);
    expect(latestDiscoveryState?.items).toEqual([]);

    await ReactTestRenderer.act(async () => {
      resolveSearch?.(walkResult);
    });
    await waitFor(() => latestDiscoveryState?.items.length === 1);

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
    client.clear();
  });

  it('새로고침 중에도 정착된 Walk 결과를 보존한다', async () => {
    const refreshLocation = jest.fn().mockResolvedValue(coordinates);
    useCurrentLocation.mockReturnValue({
      loading: false,
      permission: 'granted',
      coordinates,
      source: 'gps',
      isFresh: true,
      isStale: false,
      lastUpdatedAt: coordinates.capturedAt,
      error: null,
      refresh: refreshLocation,
    });

    let resolveRefresh: ((value: typeof walkResult) => void) | null = null;
    searchLocationDiscovery
      .mockResolvedValueOnce(walkResult)
      .mockImplementationOnce(
        () =>
          new Promise<typeof walkResult>(resolve => {
            resolveRefresh = resolve;
          }),
      );

    const client = createClient();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
    });
    await waitFor(() => latestDiscoveryState?.items.length === 1);

    let pendingRefresh: Promise<void> | null = null;
    await ReactTestRenderer.act(async () => {
      pendingRefresh = latestDiscoveryState?.refresh() ?? null;
      await Promise.resolve();
    });
    await waitFor(() => latestDiscoveryState?.refreshing === true);

    expect(latestDiscoveryState?.items.map(item => item.id)).toEqual([
      walkItem.id,
    ]);

    await ReactTestRenderer.act(async () => {
      resolveRefresh?.(walkResult);
      await pendingRefresh;
    });
    await waitFor(() => latestDiscoveryState?.refreshing === false);

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
    client.clear();
  });
});
