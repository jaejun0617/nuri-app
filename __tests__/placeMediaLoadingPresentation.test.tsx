import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { View } from 'react-native';

import AnimalHospitalCard from '../src/components/animalHospital/AnimalHospitalCard';
import AnimalHospitalDetailScreen from '../src/screens/AnimalHospital/AnimalHospitalDetailScreen';
import AnimalHospitalListScreen from '../src/screens/AnimalHospital/AnimalHospitalListScreen';
import { buildWalkingTravelLabel } from '../src/services/locationDiscovery/travelMetrics';
import LocationDiscoveryCard from '../src/components/locationDiscovery/LocationDiscoveryCard';
import type { AnimalHospitalDiscoveryState } from '../src/hooks/useAnimalHospitalDiscovery';
import type { AnimalHospitalPublicHospital } from '../src/domains/animalHospital/types';
import type { LocationDiscoveryItem } from '../src/services/locationDiscovery/types';

let mockRouteParams: { item?: AnimalHospitalPublicHospital } = {};
let mockHospitalDiscoveryState: AnimalHospitalDiscoveryState;
let mockRenderers: ReactTestRenderer.ReactTestRenderer[] = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: () => undefined,
}));

jest.mock('styled-components/native', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      border: '#E7EDF5',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      textMuted: '#7B8597',
      textPrimary: '#0B1220',
      textSecondary: '#6B7688',
    },
  }),
}));

jest.mock('../src/app/ui/AppText', () => {
  const ReactRuntime = jest.requireActual('react');
  const { Text: NativeText } = jest.requireActual('react-native');

  return function MockAppText({ children, ...props }: Record<string, unknown>) {
    return ReactRuntime.createElement(NativeText, props, children);
  };
});

jest.mock('../src/components/layout/Screen', () => {
  const ReactRuntime = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  return function MockScreen({ children }: { children: React.ReactNode }) {
    return ReactRuntime.createElement(NativeView, null, children);
  };
});

jest.mock('../src/components/images/OptimizedImage', () => {
  const ReactRuntime = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({ uri }: { uri: string }) =>
      ReactRuntime.createElement(NativeView, {
        testID: 'place-media-image',
        accessibilityLabel: uri,
      }),
  };
});

jest.mock('../src/components/maps/NativeLiteMapPreview', () => {
  const ReactRuntime = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  return function MockMapPreview() {
    return ReactRuntime.createElement(NativeView, { testID: 'map-preview' });
  };
});

jest.mock(
  '../src/components/locationDiscovery/LocationDiscoverySearchBar',
  () => {
    const ReactRuntime = jest.requireActual('react');
    const { Text: NativeText, View: NativeView } =
      jest.requireActual('react-native');

    return function MockSearchBar({
      loadingText,
    }: {
      loadingText?: string | null;
    }) {
      return ReactRuntime.createElement(
        NativeView,
        { testID: 'search-bar' },
        loadingText
          ? ReactRuntime.createElement(NativeText, null, loadingText)
          : null,
      );
    };
  },
);

jest.mock('../src/hooks/useLocationDiscoveryThumbnail', () => ({
  useLocationDiscoveryThumbnail: jest.fn(() => ({
    data: null,
    photoAttributionLabel: null,
  })),
  usePrefetchLocationDiscoveryThumbnails: jest.fn(),
}));

jest.mock('../src/hooks/useAnimalHospitalThumbnail', () => ({
  useAnimalHospitalEnrichedItem: jest.fn(
    (item: AnimalHospitalPublicHospital | null) => ({
      data: item,
      overlay: item?.thumbnailUrl
        ? { photoAttributionLabel: '공식 출처' }
        : null,
    }),
  ),
  usePrefetchAnimalHospitalThumbnails: jest.fn(),
}));

jest.mock('../src/hooks/useAnimalHospitalDiscovery', () => ({
  useAnimalHospitalDiscovery: jest.fn(() => mockHospitalDiscoveryState),
}));

jest.mock('../src/hooks/useEntryAwareBackAction', () => ({
  useEntryAwareBackAction: jest.fn(() => jest.fn()),
}));

jest.mock('../src/store/petStore', () => ({
  usePetStore: (
    selector: (state: { pets: never[]; selectedPetId: null }) => unknown,
  ) => selector({ pets: [], selectedPetId: null }),
}));

jest.mock('../src/store/uiStore', () => ({
  openMoreDrawer: jest.fn(),
}));

const publicTrust = {
  publicLabel: 'needs_verification' as const,
  label: '확인 필요',
  shortReason: '기본 정보는 있지만 최신 확인이 더 필요해요.',
  description: '공개 가능한 기본 정보만 보여줘요.',
  guidance: '민감한 운영 정보는 아직 public에 열지 않았어요.',
  tone: 'caution' as const,
  sourceLabel: 'official-localdata',
  basisDate: '2026-04-16T00:00:00.000Z',
  basisDateLabel: '기준일 2026.04.16',
  isStale: false,
  hasConflict: false,
  layers: ['trust'] as const,
};

const hospital: AnimalHospitalPublicHospital = {
  id: 'animal-hospital:test',
  name: '누리동물병원',
  address: '서울특별시 중구 세종대로 1',
  roadAddress: '서울특별시 중구 세종대로 1',
  latitude: 37.5665,
  longitude: 126.978,
  distanceMeters: 250,
  distanceLabel: '250m',
  statusSummary: '인허가 기준 운영 병원으로 확인됐어요.',
  operatingBadge: null,
  officialPhone: '02-555-0101',
  thumbnailUrl: null,
  publicTrust,
  links: {
    externalMapUrl: 'https://maps.example.test',
    providerPlaceUrl: null,
    callUri: 'tel:025550101',
  },
};

const walkItem: LocationDiscoveryItem = {
  id: 'walk:test',
  domain: 'walk',
  kind: 'walk-spot',
  name: '누리 산책공원',
  description: '반려동물과 걸을 수 있는 공원이에요.',
  categoryLabel: '공원',
  address: '서울특별시 중구 세종대로 2',
  roadAddress: '서울특별시 중구 세종대로 2',
  distanceMeters: 320,
  distanceLabel: '320m',
  estimatedMinutes: 5,
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
  publicTrust,
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
  coordinateLabel: '37.5665, 126.9780',
  mapPreviewUrl: 'https://maps.example.test',
};

function countMediaImages(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node => node.type === View && node.props.testID === 'place-media-image',
  ).length;
}

function serialized(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

function hasText(renderer: ReactTestRenderer.ReactTestRenderer, text: string) {
  return renderer.root.findAllByProps({ children: text }).length > 0;
}

async function renderElement(element: React.ReactElement) {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(element);
  });
  mockRenderers.push(renderer!);
  return renderer!;
}

function setHospitalDiscoveryState(
  overrides: Partial<AnimalHospitalDiscoveryState> = {},
) {
  mockHospitalDiscoveryState = {
    loading: false,
    refreshing: false,
    searching: false,
    items: [],
    error: null,
    permission: 'granted',
    permissionAccuracy: 'precise',
    coordinates: {
      latitude: 37.5665,
      longitude: 126.978,
      accuracy: 12,
      capturedAt: Date.now(),
      source: 'gps',
    },
    district: '중구',
    normalizedDistrict: '중구',
    city: '서울특별시',
    hasFreshLocation: true,
    usingStaleLocation: false,
    hasPreciseLocation: true,
    hasWeakLocationSignal: false,
    scope: {
      displayLabel: '중구',
      queryLabel: '서울특별시 중구',
      anchorCoordinates: null,
      distanceLabel: '현재 위치 기준',
    },
    refresh: async () => {},
    requestPreciseRefresh: async () => true,
    ...overrides,
  };
}

describe('NURI-08 place media and initial loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockRenderers = [];
    setHospitalDiscoveryState();
  });

  afterEach(async () => {
    await ReactTestRenderer.act(async () => {
      mockRenderers.forEach(renderer => renderer.unmount());
    });
  });

  it('Walk compact card는 이미지 데이터와 무관하게 미디어 영역을 렌더하지 않는다', async () => {
    const renderer = await renderElement(
      <LocationDiscoveryCard
        item={{
          ...walkItem,
          thumbnailUrl: 'https://cdn.example.test/walk.jpg',
        }}
        onPress={jest.fn()}
        layout="compact"
      />,
    );

    expect(countMediaImages(renderer)).toBe(0);
    expect(serialized(renderer)).toContain('도보 약 5분 · 320m');
    expect(serialized(renderer)).not.toContain('walk.jpg');
  });

  it('Walk related card도 빈 이미지 슬롯 없이 이동 정보를 같은 row에 유지한다', async () => {
    const renderer = await renderElement(
      <LocationDiscoveryCard item={walkItem} onPress={jest.fn()} />,
    );

    expect(countMediaImages(renderer)).toBe(0);
    expect(
      renderer.root.findAll(
        node =>
          node.type === View && node.props.testID === 'walking-travel-meta',
      ),
    ).toHaveLength(1);
    expect(serialized(renderer)).toContain('도보 약 5분 · 320m');
  });

  it('Walk card의 이미지 제거는 특정 사용자나 QA row 조건에 의존하지 않는다', async () => {
    const renderer = await renderElement(
      <LocationDiscoveryCard item={walkItem} onPress={jest.fn()} />,
    );

    expect(countMediaImages(renderer)).toBe(0);
    expect(serialized(renderer)).toContain('도보 약 5분 · 320m');
  });

  it('photo 없는 Hospital card는 회색 placeholder를 예약하지 않는다', async () => {
    const renderer = await renderElement(
      <AnimalHospitalCard item={hospital} onOpenDetail={jest.fn()} />,
    );

    expect(countMediaImages(renderer)).toBe(0);
    expect(serialized(renderer)).not.toContain('shield');
  });

  it('Hospital card는 유효한 이미지 URI가 있어도 정보형 레이아웃만 렌더한다', async () => {
    const renderer = await renderElement(
      <AnimalHospitalCard
        item={{
          ...hospital,
          thumbnailUrl: 'https://cdn.example.test/hospital.jpg',
        }}
        onOpenDetail={jest.fn()}
      />,
    );

    expect(countMediaImages(renderer)).toBe(0);
    expect(serialized(renderer)).toContain(hospital.address);
    expect(serialized(renderer)).toContain('도보 약 15분 · 250m');
    expect(serialized(renderer)).toContain('02-555-0101');
  });

  it('photo 없는 Hospital detail은 placeholder 없이 정보와 지도 계약을 유지한다', async () => {
    mockRouteParams = { item: hospital };
    const renderer = await renderElement(<AnimalHospitalDetailScreen />);

    expect(countMediaImages(renderer)).toBe(0);
    expect(serialized(renderer)).not.toContain('shield');
    expect(serialized(renderer)).toContain('위치');
  });

  it('Hospital detail은 유효한 이미지 URI가 있어도 미디어 영역을 렌더하지 않는다', async () => {
    mockRouteParams = {
      item: {
        ...hospital,
        thumbnailUrl: 'https://cdn.example.test/hospital.jpg',
      },
    };
    const renderer = await renderElement(<AnimalHospitalDetailScreen />);

    expect(countMediaImages(renderer)).toBe(0);
    expect(serialized(renderer)).toContain('도보 약 15분 · 250m');
  });

  it('위치가 없으면 거리와 예상 시간을 0으로 만들지 않는다', () => {
    expect(
      buildWalkingTravelLabel({
        distanceMeters: null,
        estimatedMinutes: null,
      }),
    ).toBe('거리 확인 중');
  });

  it('Hospital no-data pending 상태는 empty copy보다 stable loading을 먼저 보여준다', async () => {
    setHospitalDiscoveryState({ loading: true });
    const renderer = await renderElement(<AnimalHospitalListScreen />);
    const output = serialized(renderer);

    expect(output).toContain('병원 목록을 준비하고 있어요');
    expect(output).not.toContain('병원을 찾지 못했어요');
    expect(output).toContain('불러오는 중');
  });

  it('Hospital loaded row는 refreshing 중에도 기존 결과를 유지한다', async () => {
    setHospitalDiscoveryState({
      items: [hospital],
      refreshing: true,
    });
    const renderer = await renderElement(<AnimalHospitalListScreen />);

    expect(hasText(renderer, '누리동물병원')).toBe(true);
    expect(hasText(renderer, '병원 목록을 준비하고 있어요')).toBe(false);
    expect(hasText(renderer, '병원을 찾지 못했어요')).toBe(false);
  });

  it('Hospital loaded row는 searching 중에도 기존 결과와 검색 상태를 유지한다', async () => {
    setHospitalDiscoveryState({
      items: [hospital],
      searching: true,
    });
    const renderer = await renderElement(<AnimalHospitalListScreen />);

    expect(hasText(renderer, '누리동물병원')).toBe(true);
    expect(hasText(renderer, '검색 중')).toBe(true);
    expect(hasText(renderer, '병원 목록을 준비하고 있어요')).toBe(false);
    expect(hasText(renderer, '검색 결과가 없어요')).toBe(false);
  });
});
