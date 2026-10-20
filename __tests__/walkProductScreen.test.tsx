import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState, View } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../src/navigation/RootNavigator';
import { createTheme } from '../src/app/theme/theme';
import WalkProductScreen from '../src/screens/Walk/WalkProductScreen';
import { useAuthStore } from '../src/store/authStore';
import { usePetStore } from '../src/store/petStore';
import {
  getLocationPermissionGrant,
  requestLocationPermissionGrant,
} from '../src/services/location/permission';
import type { WalkProductCheckpoint } from '../src/services/walk/runtime/productNative';
import type { WalkNativeSnapshot } from '../src/services/walk/runtime/nativeWalk';
import type { WalkRoutePage } from '../src/services/walk/runtime/distanceProjection';
import { walkProductResultMetrics } from '../src/services/walk/product/resultMetrics';
import type { SeasonKey } from '../src/theme/seasonal/season';
import * as feedback from '../src/services/walk/product/feedback';

const owner = '11111111-1111-4111-8111-111111111111',
  pet = '22222222-2222-4222-8222-222222222222',
  session = '44444444-4444-4444-8444-444444444444';
let mockCp: WalkProductCheckpoint;
let mockSeason: SeasonKey = 'autumn';
let mockOverride: SeasonKey | null = null;
const mockService = {
  start: jest.fn(async () => mockCp),
  startPrepared: jest.fn(async () => mockCp),
  get: jest.fn(async () => mockCp),
  control: jest.fn(async () => mockCp),
  cancel: jest.fn(async () => mockCp),
  flush: jest.fn(async () => undefined),
};
const mockNative = {
  binding: jest.fn(async () => ({ ownerId: owner, epoch: '1' })),
  scan: jest.fn(
    async (): Promise<{
      entries: WalkProductCheckpoint[];
      nextCursor: string | null;
    }> => ({ entries: [], nextCursor: null }),
  ),
  snapshot: jest.fn(async (): Promise<WalkNativeSnapshot | null> => null),
  routePage: jest.fn(),
};
const mockObserve = jest.fn((_listener: unknown) => jest.fn());
const mockInitialTrees: string[] = [];
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  usePreventRemove: jest.fn(),
}));
jest.mock('../src/services/walk/runtime/productionWalkService', () => ({
  createProductionWalkService: () => mockService,
}));
jest.mock('../src/services/walk/runtime/productNative', () => ({
  ...jest.requireActual('../src/services/walk/runtime/productNative'),
  createWalkProductNativePort: () => mockNative,
}));
jest.mock('../src/services/walk/runtime/nativeWalk', () => ({
  observeNativeWalk: (listener: unknown) => mockObserve(listener),
}));
jest.mock('../src/screens/DevTest/walkPresentation/WalkView', () => ({
  __esModule: true,
  default: 'WalkView',
  WalkAction: 'WalkAction',
}));
jest.mock(
  '../src/screens/DevTest/walkPresentation/WalkMapStage',
  () => 'ProductMap',
);
jest.mock(
  '../src/screens/DevTest/walkPresentation/WalkNoticeSheet',
  () => 'WalkNotice',
);
jest.mock(
  '../src/screens/DevTest/walkPresentation/WalkRestSheet',
  () => 'WalkRest',
);
jest.mock(
  '../src/components/records/WalkResultIntegration',
  () => 'WalkResultIntegration',
);
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useSeasonPreference: () => ({ season: mockSeason, override: mockOverride }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 18 }),
}));
jest.mock('../src/services/location/permission', () => ({
  getLocationPermissionGrant: jest.fn(),
  requestLocationPermissionGrant: jest.fn(),
}));
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
function checkpoint(): WalkProductCheckpoint {
  return {
    productVersion: 1,
    clientSessionId: session,
    petId: pet,
    runtimeState: 'IDLE',
    phase: 'PREPARED',
    revision: '0',
    startedAt: null,
    finishedAt: null,
    payloadJson: null,
    payloadDigest: null,
    filteredDistanceM: null,
    receipt: null,
    routeErased: false,
    routeDeletePending: false,
    sessionDeletePending: false,
    lastErrorCode: null,
  };
}
const nav = { goBack: jest.fn(), replace: jest.fn() };
let tree: Renderer.ReactTestRenderer;
const host = (name: string) =>
  tree.root.findAll(n => typeof n.type === 'string' && n.type === name)[0];
beforeEach(() => {
  jest.clearAllMocks();
  mockInitialTrees.length = 0;
  mockCp = checkpoint();
  mockSeason = 'autumn';
  mockOverride = null;
  useAuthStore.setState({
    session: {
      access_token: 'fixture',
      refresh_token: 'fixture',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: owner,
        aud: 'authenticated',
        created_at: '2026-01-01',
        app_metadata: {},
        user_metadata: {},
      },
    },
    accountDeletionGate: null,
  });
  usePetStore.setState({
    pets: [
      {
        id: pet,
        name: 'fixture pet',
        avatarUrl: 'https://example.invalid/pet.png',
      },
    ],
    selectedPetId: pet,
  });
  jest
    .mocked(getLocationPermissionGrant)
    .mockResolvedValue({ status: 'granted', accuracy: 'precise' });
  jest
    .mocked(requestLocationPermissionGrant)
    .mockResolvedValue({ status: 'denied', accuracy: 'unknown' });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  jest.restoreAllMocks();
});
async function open(strict = false) {
  const props = {
    route: { key: 'product', name: 'WalkProduct', params: { petId: pet } },
    navigation: nav,
  } as unknown as NativeStackScreenProps<RootStackParamList, 'WalkProduct'>;
  const content = (
    <ThemeProvider theme={createTheme('light')}>
      <React.Profiler
        id="screen"
        onRender={() => {
          mockInitialTrees.push(
            tree.root
              .findAll(n => typeof n.type === 'string')
              .map(n => n.props.testID ?? n.props.label ?? n.type)
              .join(','),
          );
        }}
      >
        <WalkProductScreen {...props} />
      </React.Profiler>
    </ThemeProvider>
  );
  await act(async () => {
    tree = Renderer.create(
      strict ? <React.StrictMode>{content}</React.StrictMode> : content,
    );
  });
}
test('ordinary production entry initializes truthfully, no QA control, permission request or GPS start; real photo/route source retained', async () => {
  await open();
  expect(mockInitialTrees[0]).toContain('walk-product-initializing');
  expect(mockInitialTrees[0]).not.toContain('아이 프로필 확인');
  expect(host('WalkView').props.state).toBe('PRE_WALK');
  expect(host('WalkView').props.onQa).toBeUndefined();
  expect(mockService.start).not.toHaveBeenCalled();
  expect(getLocationPermissionGrant).not.toHaveBeenCalled();
  expect(requestLocationPermissionGrant).not.toHaveBeenCalled();
  const map = host('WalkView').props.map;
  expect(map.props).toMatchObject({
    preview: false,
    image: 'https://example.invalid/pet.png',
    page: null,
  });
});
test('explicit primary opens JIT explanation; denied permission cannot call product Start', async () => {
  jest
    .mocked(getLocationPermissionGrant)
    .mockResolvedValue({ status: 'denied', accuracy: 'unknown' });
  await open();
  await act(async () => host('WalkView').props.onPrimary());
  expect(host('WalkNotice').props.kind).toBe('LOCATION_EXPLANATION');
  expect(requestLocationPermissionGrant).not.toHaveBeenCalled();
  expect(mockService.start).not.toHaveBeenCalled();
  await act(async () => host('WalkNotice').props.onPrimary());
  expect(host('WalkNotice').props.kind).toBe('PERMISSION_REQUIRED');
  expect(mockService.start).not.toHaveBeenCalled();
});
test('existing precise grant starts in one tap with fixed pet, no redundant explanation or QA controller', async () => {
  await open();
  await act(async () => host('WalkView').props.onPrimary());
  expect(mockService.start).toHaveBeenCalledWith(pet);
  expect(requestLocationPermissionGrant).not.toHaveBeenCalled();
  expect(host('WalkNotice').props.visible).toBe(false);
  expect(mockObserve).not.toHaveBeenCalledTimes(0);
  await act(async () => usePetStore.setState({ selectedPetId: 'other' }));
  expect(host('WalkView').props.petName).toBe('fixture pet');
});
test('Strict Effects replay initializes once alive without auto start or stale observer resurrection', async () => {
  await open(true);
  expect(host('WalkView').props.state).toBe('PRE_WALK');
  expect(mockService.start).not.toHaveBeenCalled();
});
test('explicit Start captures cached level without a fetch and supplies it only after acceptance of that exact session', async () => {
  const baseline = jest.spyOn(feedback, 'cachedWalkLevel').mockReturnValue('1');
  await open();
  mockCp = { ...checkpoint(), runtimeState: 'WALKING', phase: 'RUNNING' };
  await act(async () => host('WalkView').props.onPrimary());
  expect(baseline).toHaveBeenCalledWith(owner, pet);
  mockCp = {
    ...mockCp,
    runtimeState: 'FINISHED_LOCAL',
    phase: 'FINISH_PENDING',
  };
  await act(async () => host('WalkView').props.onFinish());
  await act(async () => host('WalkView').props.onFinish());
  expect(host('WalkView').props.productContent.props.children[0].props.previousLevel).toBeUndefined();
  mockCp = {
    ...mockCp,
    phase: 'RESOLVED',
    receipt: {
      clientSessionId: session,
      petId: pet,
      state: 'ACCEPTED_SERVER',
      payloadDigest: null,
      deletedAt: null,
      recordClaimExists: false,
      summary: null,
      rejectionCode: null,
    },
  };
  await act(async () => host('WalkView').props.productContent.props.children[2].props.onPress());
  expect(host('WalkView').props.productContent.props.children[0].props.previousLevel).toBe('1');
  expect(baseline).toHaveBeenCalledTimes(1);
});
test('foreground listeners and Native observer are disposed; removed pet cannot retain old map UI', async () => {
  await open();
  const listeners = jest
    .mocked(AppState.addEventListener)
    .mock.results.filter(r => r.type === 'return');
  await act(async () => usePetStore.setState({ pets: [] }));
  expect(
    tree.root.findAll(
      n => n.type === View && n.props.testID === 'walk-product-initializing',
    ),
  ).toHaveLength(0);
  await act(async () => tree.unmount());
  for (const r of listeners) expect(r.value.remove).toHaveBeenCalled();
});
test('FREE_LOOK native map element/geometry survives same-owner background/foreground without recenter', async () => {
  mockCp = { ...checkpoint(), runtimeState: 'WALKING', phase: 'RUNNING' };
  const page: WalkRoutePage = {
    routeRevision: '1',
    current: null,
    segments: [],
    filteredPointCount: '0',
    startCursor: '-1',
    endCursor: '-1',
    hasEarlier: false,
    hasLater: false,
  };
  mockNative.scan.mockResolvedValueOnce({
    entries: [mockCp],
    nextCursor: null,
  });
  mockNative.snapshot.mockResolvedValue({
    sessionId: session,
    petId: pet,
    runtimeState: 'WALKING',
    revision: '0',
    distanceSummary: { routeRevision: '1' },
  } as WalkNativeSnapshot);
  mockNative.routePage.mockResolvedValue(page);
  await open();
  await act(async () => host('WalkView').props.map.props.onDrag());
  const map = host('WalkView').props.map;
  expect(map.props.mode).toBe('FREE_LOOK');
  const callback = jest
    .mocked(AppState.addEventListener)
    .mock.calls.find(c => c[0] === 'change')![1];
  await act(async () => callback('background'));
  expect(host('WalkView').props.map).toBe(map);
  expect(host('WalkView').props.clockRunning).toBe(false);
  await act(async () => callback('active'));
  expect(host('WalkView').props.map).toBe(map);
  expect(map.props.recenterRevision).toBe(0);
  expect(mockNative.routePage).toHaveBeenCalledTimes(1);
});
test.each(['WALKING', 'FINISHED_LOCAL'] as const)(
  'overnight %s retains Native start-derived KST Autumn after the provider advances to Winter',
  async runtimeState => {
    const startedAt = '2026-11-30T14:59:00.000Z';
    mockCp = {
      ...checkpoint(),
      runtimeState,
      phase: runtimeState === 'WALKING' ? 'RUNNING' : 'FINISH_PENDING',
      startedAt,
      finishedAt:
        runtimeState === 'FINISHED_LOCAL' ? '2026-11-30T15:05:00.000Z' : null,
    };
    mockSeason = 'winter';
    mockNative.scan.mockResolvedValueOnce({
      entries: [mockCp],
      nextCursor: null,
    });
    await open();
    expect(host('WalkView').props.season).toBe('autumn');
    expect(mockCp.startedAt).toBe(startedAt);
    expect(mockService.start).not.toHaveBeenCalled();
  },
);
test('explicit device QA season overrides only presentation without rewriting Native start or result identity', async () => {
  const startedAt = '2026-11-30T14:59:00.000Z';
  mockCp = {
    ...checkpoint(),
    runtimeState: 'WALKING',
    phase: 'RUNNING',
    startedAt,
  };
  mockNative.scan.mockResolvedValueOnce({
    entries: [mockCp],
    nextCursor: null,
  });
  mockSeason = 'winter';
  mockOverride = 'spring';
  await open();
  expect(host('WalkView').props.season).toBe('spring');
  expect(mockCp.startedAt).toBe(startedAt);
  expect(mockService.control).not.toHaveBeenCalled();
  expect(mockService.start).not.toHaveBeenCalled();
});
test('result metrics use accepted canonical summary only; deleted/final-cancelled never fall back to old device measurements', () => {
  for (const state of ['DELETED', 'NOT_ACCEPTED_FINAL'] as const) {
    const c = {
      ...checkpoint(),
      filteredDistanceM: '1234',
      receipt: { state },
    } as WalkProductCheckpoint;
    expect(walkProductResultMetrics(c, null)).toEqual({
      distanceM: null,
      activeMs: '0',
    });
  }
  const c = {
    ...checkpoint(),
    filteredDistanceM: '1234',
    receipt: {
      state: 'ACCEPTED_SERVER',
      summary: { acceptedDistanceM: '900', activeDurationMs: '60000' },
    },
  } as WalkProductCheckpoint;
  expect(walkProductResultMetrics(c, null)).toEqual({
    distanceM: '900',
    activeMs: '60000',
  });
});
