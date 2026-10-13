import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Button, Modal, Switch, Text } from 'react-native';
import Panel from '../src/screens/DevTest/WalkDistanceQaPanel';
import { getWalkSnapshot, observeNativeWalk } from '../src/services/walk/runtime/nativeWalk';
import { isWalkDistanceQaEnabled, noteWalkQaMapVisible, runWalkQaCommand } from '../src/services/walk/runtime/distanceProjection';

let mockOwner: string | null = 'public-test-owner';
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: (state: { session: { user: { id: string } } | null }) => unknown) => selector({ session: mockOwner ? { user: { id: mockOwner } } : null }),
}));
jest.mock('../src/store/petStore', () => ({ usePetStore: { getState: () => ({ selectedPetId: '22222222-2222-4222-8222-222222222222' }) } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: 'MapView', Marker: 'Marker', Polyline: 'Polyline', PROVIDER_GOOGLE: 'google' }));
jest.mock('../src/services/walk/runtime/nativeWalk', () => ({
  createWalkCommandId: jest.fn(async () => 'public-command'), getWalkSnapshot: jest.fn(async () => null),
  mutateNativeWalk: jest.fn(), observeNativeWalk: jest.fn(() => jest.fn()),
}));
jest.mock('../src/services/walk/runtime/distanceProjection', () => ({
  ...jest.requireActual('../src/services/walk/runtime/distanceProjection'),
  isWalkDistanceQaEnabled: jest.fn(() => true), noteWalkQaMapVisible: jest.fn(),
  getWalkRoutePage: jest.fn(), runWalkQaCommand: jest.fn(async () => null),
}));

const enabled = jest.mocked(isWalkDistanceQaEnabled);
const command = jest.mocked(runWalkQaCommand);
const snapshot = jest.mocked(getWalkSnapshot);
const safeProtocol = { schemaVersion: 1, protocolId: '11111111-1111-4111-8111-111111111111', revision: '1', mode: 'READINESS', stepIndex: 0, cleaned: false,
  steps: [{ stepType: 'READINESS', status: 'NOT_STARTED', error: null, receipt: null }, { stepType: 'CLEANUP', status: 'NOT_STARTED', error: null, receipt: null }] };
const nativeType = (r: Renderer.ReactTestRenderer, name: string) => r.root.findAll(n => (n.type as unknown) === name);
const button = (r: Renderer.ReactTestRenderer, title: string) => r.root.findAllByType(Button).find(n => n.props.title === title)!;
const receipt = (r: Renderer.ReactTestRenderer, id: string) => r.root.findAllByType(Text).find(n => n.props.testID === id)!.props.children;

describe('Phase 3 QA map and native wizard UI', () => {
  let r: Renderer.ReactTestRenderer;
  beforeEach(() => { jest.clearAllMocks(); mockOwner = 'public-test-owner'; enabled.mockReturnValue(true); snapshot.mockResolvedValue(null); command.mockResolvedValue(null); });
  afterEach(async () => { if (r) await act(async () => r.unmount()); });
  const open = async () => {
    await act(async () => { r = Renderer.create(<Panel />); });
    await act(async () => { button(r, 'Walk Phase 3 Map / Wizard').props.onPress(); });
  };
  test('Store gate renders no panel, map, location subscription, or wizard call', async () => {
    enabled.mockReturnValue(false); await act(async () => { r = Renderer.create(<Panel />); });
    expect(r.toJSON()).toBeNull(); expect(observeNativeWalk).not.toHaveBeenCalled(); expect(command).not.toHaveBeenCalled();
  });
  test('map uses existing Google provider and never starts the map SDK location source', async () => {
    await open(); const map = nativeType(r, 'MapView')[0];
    expect(map.props.provider).toBe('google'); expect(map.props.showsUserLocation).toBe(false); expect(map.props.showsMyLocationButton).toBe(false);
    expect(nativeType(r, 'Polyline')).toHaveLength(1); expect(command).toHaveBeenCalledWith('GET');
    expect(command.mock.calls.some(([op]) => op === 'START_STEP')).toBe(false);
  });
  test('public rendering control and map loading receipt contain no coordinate fields', async () => {
    await open(); const map = nativeType(r, 'MapView')[0];
    await act(async () => { map.props.onMapReady(); map.props.onMapLoaded(); });
    const value = JSON.parse(receipt(r, 'walk-map-receipt'));
    expect(value).toMatchObject({ mapReady: true, mapLoaded: true, preview: true, renderedPointCount: 4, markerPresent: true });
    expect(Object.keys(value)).not.toContain('latitude'); expect(Object.keys(value)).not.toContain('longitude');
  });
  test('drag enables free-look until explicit recenter', async () => {
    await open(); await act(async () => nativeType(r, 'MapView')[0].props.onPanDrag());
    expect(JSON.parse(receipt(r, 'walk-map-receipt')).mode).toBe('FREE_LOOK');
    await act(async () => button(r, '내 위치').props.onPress());
    expect(JSON.parse(receipt(r, 'walk-map-receipt')).mode).toBe('FOLLOW');
  });
  test('readiness configuration preserves pet but cannot invent a physical reference', async () => {
    await open(); command.mockResolvedValue(safeProtocol);
    await act(async () => { await button(r, '준비 점검 프로토콜 만들기').props.onPress(); });
    expect(command).toHaveBeenCalledWith('CONFIGURE', expect.objectContaining({ mode: 'READINESS', openMeters: 0, urbanMeters: 0, scenario: 'ALL' }));
  });
  test('physical mode requires independent distance input before sending configure', async () => {
    await open(); await act(async () => r.root.findAllByType(Switch).at(-1)!.props.onValueChange(true));
    await act(async () => { await button(r, '실제 보행 프로토콜 준비').props.onPress(); });
    expect(command.mock.calls.some(([op]) => op === 'CONFIGURE')).toBe(false);
    expect(receipt(r, 'walk-distance-error')).toBe('WALK_QA_PROTOCOL_INVALID');
  });
  test('owner replacement hides map and discards a delayed previous-owner receipt', async () => {
    let resolve: (value: unknown) => void = () => {};
    command.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    await open(); mockOwner = 'different-public-owner'; await act(async () => r.update(<Panel />));
    await act(async () => resolve(safeProtocol));
    expect(r.root.findByType(Modal).props.visible).toBe(false);
    expect(noteWalkQaMapVisible).toHaveBeenLastCalledWith(false);
  });
  test('closing the modal unsubscribes the native projection and clears sensitive map page', async () => {
    await open(); await act(async () => button(r, '닫기').props.onPress());
    expect(r.root.findByType(Modal).props.visible).toBe(false);
    expect(noteWalkQaMapVisible).toHaveBeenLastCalledWith(false);
  });
});
