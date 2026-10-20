import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Button, Modal, Switch } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import Panel from '../src/screens/DevTest/WalkDistanceQaPanel';
import {
  getWalkSnapshot,
  observeNativeWalk,
} from '../src/services/walk/runtime/nativeWalk';
import {
  isWalkDistanceQaEnabled,
  noteWalkQaMapVisible,
  runWalkQaCommand,
} from '../src/services/walk/runtime/distanceProjection';

let mockOwner: string | null = 'public-test-owner';
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (
    selector: (state: { session: { user: { id: string } } | null }) => unknown,
  ) => selector({ session: mockOwner ? { user: { id: mockOwner } } : null }),
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriFeatherIcon', () => 'Feather');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'SemanticIcon');
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => 'autumn',
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: Object.assign(
    (selector: (s: unknown) => unknown) =>
      selector({
        pets: [],
        selectedPetId: '22222222-2222-4222-8222-222222222222',
      }),
    {
      getState: () => ({
        selectedPetId: '22222222-2222-4222-8222-222222222222',
      }),
    },
  ),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker',
  Polyline: 'Polyline',
  PROVIDER_GOOGLE: 'google',
}));
jest.mock('../src/services/walk/runtime/nativeWalk', () => ({
  createWalkCommandId: jest.fn(async () => 'public-command'),
  getWalkSnapshot: jest.fn(async () => null),
  mutateNativeWalk: jest.fn(),
  observeNativeWalk: jest.fn(() => jest.fn()),
}));
jest.mock('../src/services/walk/runtime/distanceProjection', () => ({
  ...jest.requireActual('../src/services/walk/runtime/distanceProjection'),
  isWalkDistanceQaEnabled: jest.fn(() => true),
  noteWalkQaMapVisible: jest.fn(),
  getWalkRoutePage: jest.fn(),
  runWalkQaCommand: jest.fn(async () => null),
}));

const enabled = jest.mocked(isWalkDistanceQaEnabled);
const command = jest.mocked(runWalkQaCommand);
const snapshot = jest.mocked(getWalkSnapshot);
const safeProtocol = {
  schemaVersion: 1,
  protocolId: '11111111-1111-4111-8111-111111111111',
  revision: '1',
  mode: 'READINESS',
  stepIndex: 0,
  cleaned: false,
  steps: [
    {
      stepType: 'READINESS',
      status: 'NOT_STARTED',
      error: null,
      receipt: null,
    },
    { stepType: 'CLEANUP', status: 'NOT_STARTED', error: null, receipt: null },
  ],
};
const nativeType = (r: Renderer.ReactTestRenderer, name: string) =>
  r.root.findAll(n => (n.type as unknown) === name);
const button = (r: Renderer.ReactTestRenderer, title: string) =>
  r.root.findAllByType(Button).find(n => n.props.title === title)!;
const receipt = (r: Renderer.ReactTestRenderer, id: string) =>
  nativeType(r, 'AppText').find(n => n.props.testID === id)!.props.children;
const tree = () => (
  <ThemeProvider theme={createTheme('light')}>
    <Panel />
  </ThemeProvider>
);
const press = async (r: Renderer.ReactTestRenderer, id: string) => {
  await act(async () => {
    await r.root.findAllByProps({ testID: id })[0].props.onPress();
  });
};

describe('Phase 3 QA map and native wizard UI', () => {
  let r: Renderer.ReactTestRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    mockOwner = 'public-test-owner';
    enabled.mockReturnValue(true);
    snapshot.mockResolvedValue(null);
    command.mockResolvedValue(null);
  });
  afterEach(async () => {
    if (r) await act(async () => r.unmount());
  });
  const open = async () => {
    await act(async () => {
      r = Renderer.create(tree());
    });
    await act(async () => {
      button(r, 'Walk Phase 3 Map / Wizard').props.onPress();
    });
  };
  test('Store gate renders no panel, map, location subscription, or wizard call', async () => {
    enabled.mockReturnValue(false);
    await act(async () => {
      r = Renderer.create(tree());
    });
    expect(r.toJSON()).toBeNull();
    expect(observeNativeWalk).not.toHaveBeenCalled();
    expect(command).not.toHaveBeenCalled();
  });
  test('map uses existing Google provider and never starts the map SDK location source', async () => {
    await open();
    const map = nativeType(r, 'MapView')[0];
    expect(map.props.provider).toBe('google');
    expect(map.props.showsUserLocation).toBe(false);
    expect(map.props.showsMyLocationButton).toBe(false);
    expect(nativeType(r, 'Polyline')).toHaveLength(2);
    expect(command).toHaveBeenCalledWith('GET');
    expect(command.mock.calls.some(([op]) => op === 'START_STEP')).toBe(false);
  });
  test('public rendering control and map loading receipt contain no coordinate fields', async () => {
    await open();
    const map = nativeType(r, 'MapView')[0];
    await act(async () => {
      map.props.onMapReady();
      map.props.onMapLoaded();
    });
    await press(r, 'walk-qa-open');
    expect(receipt(r, 'walk-diagnostic-지도 준비')).toBe('true');
    expect(receipt(r, 'walk-diagnostic-지도 로드')).toBe('true');
    expect(receipt(r, 'walk-diagnostic-지도 지점 수')).toBe('4');
    expect(receipt(r, 'walk-diagnostic-마커')).toBe('true');
    expect(nativeType(r, 'MapView')).toHaveLength(0);
    expect(
      nativeType(r, 'AppText')
        .map(n => n.props.children)
        .join(' '),
    ).not.toMatch(/latitude|longitude|public-test-owner/);
  });
  test('drag enables free-look until explicit recenter', async () => {
    await open();
    await act(async () => nativeType(r, 'MapView')[0].props.onPanDrag());
    await press(r, 'walk-qa-open');
    expect(receipt(r, 'walk-diagnostic-카메라')).toBe('FREE_LOOK');
    await press(r, 'walk-qa-close');
    await press(r, 'walk-recenter');
    await press(r, 'walk-qa-open');
    expect(receipt(r, 'walk-diagnostic-카메라')).toBe('FOLLOW');
  });
  test.each([
    'onRegionChangeStart',
    'onRegionChange',
    'onRegionChangeComplete',
  ])(
    '%s preserves free-look across zoom events until explicit recenter',
    async event => {
      await open();
      await act(async () =>
        nativeType(r, 'MapView')[0].props[event](undefined, {
          isGesture: true,
        }),
      );
      await press(r, 'walk-qa-open');
      expect(receipt(r, 'walk-diagnostic-카메라')).toBe('FREE_LOOK');
      await press(r, 'walk-qa-close');
      await press(r, 'walk-recenter');
      await press(r, 'walk-qa-open');
      expect(receipt(r, 'walk-diagnostic-카메라')).toBe('FOLLOW');
      expect(command.mock.calls.some(([op]) => op === 'START_STEP')).toBe(
        false,
      );
    },
  );
  test('readiness configuration preserves pet but cannot invent a physical reference', async () => {
    await open();
    await press(r, 'walk-qa-open');
    command.mockResolvedValue(safeProtocol);
    await act(async () => {
      await button(r, '준비 점검 프로토콜 만들기').props.onPress();
    });
    expect(command).toHaveBeenCalledWith(
      'CONFIGURE',
      expect.objectContaining({
        mode: 'READINESS',
        openMeters: 0,
        urbanMeters: 0,
        scenario: 'ALL',
      }),
    );
  });
  test('physical mode requires independent distance input before sending configure', async () => {
    await open();
    await press(r, 'walk-qa-open');
    await act(async () =>
      r.root.findAllByType(Switch).at(-1)!.props.onValueChange(true),
    );
    await act(async () => {
      await button(r, '실제 보행 프로토콜 준비').props.onPress();
    });
    expect(command.mock.calls.some(([op]) => op === 'CONFIGURE')).toBe(false);
    expect(receipt(r, 'walk-distance-error')).toBe('WALK_QA_PROTOCOL_INVALID');
  });
  test('owner replacement hides map and discards a delayed previous-owner receipt', async () => {
    let resolve: (value: unknown) => void = () => {};
    command.mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    await open();
    mockOwner = 'different-public-owner';
    await act(async () => r.update(tree()));
    await act(async () => resolve(safeProtocol));
    expect(r.root.findByType(Modal).props.visible).toBe(false);
    expect(noteWalkQaMapVisible).toHaveBeenLastCalledWith(false);
  });
  test('closing the modal unsubscribes the native projection and clears sensitive map page', async () => {
    await open();
    await press(r, 'walk-close');
    expect(r.root.findByType(Modal).props.visible).toBe(false);
    expect(noteWalkQaMapVisible).toHaveBeenLastCalledWith(false);
  });
});
