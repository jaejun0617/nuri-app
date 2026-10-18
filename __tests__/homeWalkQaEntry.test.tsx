import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import HomeWalkQaEntry from '../src/screens/Main/components/LoggedInHome/HomeWalkQaEntry';
import { isWalkDistanceQaEnabled } from '../src/services/walk/runtime/distanceProjection';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';

const mockQaHost = jest.fn();
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/home/HomeWidgetMaterial', () => ({
  HOME_FLOATING_WIDGET_MATERIAL: {},
  HomeFloatingWidgetSurface: 'Glass',
}));
jest.mock('../src/services/walk/runtime/distanceProjection', () => ({
  isWalkDistanceQaEnabled: jest.fn(() => true),
}));
jest.mock('../src/screens/DevTest/WalkDistanceQaPanel', () => ({
  __esModule: true,
  default: (props: { initialMode: 'ACTUAL'; onClose: () => void }) => {
    mockQaHost(props);
    return jest.requireActual<typeof import('react')>('react').createElement('QaPanel', props);
  },
}));

describe('temporary PO Home Walk QA entry', () => {
  let renderer: Renderer.ReactTestRenderer;
  const render = async (available = true, ownerKey = 'owner-a') => {
    await act(async () => {
      renderer = Renderer.create(<HomeWalkQaEntry key={ownerKey} available={available} season="autumn" />);
    });
  };
  const hosts = () => renderer.root.findAll(node => (node.type as unknown) === 'QaPanel');
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isWalkDistanceQaEnabled).mockReturnValue(true);
  });
  afterEach(async () => {
    if (renderer) await act(async () => renderer.unmount());
  });
  test('is absent in Store mode and cannot mount the QA host', async () => {
    jest.mocked(isWalkDistanceQaEnabled).mockReturnValue(false);
    await render();
    expect(renderer.toJSON()).toBeNull();
    expect(mockQaHost).not.toHaveBeenCalled();
  });
  test('is absent without an authenticated selected pet', async () => {
    await render(false);
    expect(renderer.toJSON()).toBeNull();
    expect(mockQaHost).not.toHaveBeenCalled();
  });
  test('preserves small seasonal glass styling and a 48 dp target', async () => {
    await render();
    const button = renderer.root.findAllByProps({ testID: 'home-walk-qa-entry' })[0];
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({ minHeight: 48, width: '100%' });
    expect(button.props.accessibilityRole).toBe('button');
    const text = renderer.root.findAll(node => (node.type as unknown) === 'AppText')[0];
    expect(StyleSheet.flatten(text.props.style)).toMatchObject({
      fontSize: 12, lineHeight: 18, textAlign: 'center', color: SEASON_CTA.autumn.primary,
    });
    expect(mockQaHost).not.toHaveBeenCalled();
  });
  test('mounts one actual host on tap, closes, and can reopen', async () => {
    await render();
    const press = () => renderer.root.findAllByProps({ testID: 'home-walk-qa-entry' })[0].props.onPress();
    await act(async () => { press(); press(); });
    expect(hosts()).toHaveLength(1);
    expect(hosts()[0].props.initialMode).toBe('ACTUAL');
    await act(async () => hosts()[0].props.onClose());
    expect(hosts()).toHaveLength(0);
    await act(async () => press());
    expect(hosts()).toHaveLength(1);
  });
  test('drops the modal when Home changes account identity', async () => {
    await render();
    await act(async () => renderer.root.findAllByProps({ testID: 'home-walk-qa-entry' })[0].props.onPress());
    expect(hosts()).toHaveLength(1);
    await act(async () => renderer.update(<HomeWalkQaEntry key="owner-b" available season="autumn" />));
    expect(hosts()).toHaveLength(0);
  });
});
