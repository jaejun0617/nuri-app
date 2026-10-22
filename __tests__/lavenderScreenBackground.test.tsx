import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { LavenderScreenBackground } from '../src/components/common/LavenderScreenBackground';
import { LAVENDER_CANVAS } from '../src/theme/lavenderCanvas';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));

it('paints the same static lavender stops without owning layout, gestures, or focus', async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<LavenderScreenBackground testID="canvas" />);
  });
  const layer = tree.root.findAll(
    n => typeof n.type === 'string' && n.props.testID === 'canvas',
  )[0];
  expect(layer.props.colors).toEqual(['#F8F7FD', '#ECE7F5', '#F4EEF7']);
  expect(layer.props.locations).toBe(LAVENDER_CANVAS.locations);
  expect(layer.props.pointerEvents).toBe('none');
  expect(layer.props.accessible).toBe(false);
  expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(StyleSheet.flatten(layer.props.style)).toEqual({
    position: 'absolute',
    top: 24,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const statusBar = tree.root.findAll(
    n => typeof n.type === 'string' && n.props.testID === 'canvas-status-bar',
  )[0];
  expect(StyleSheet.flatten(statusBar.props.style)).toMatchObject({
    height: 24,
    backgroundColor: '#FFFFFF',
  });
  await act(async () =>
    tree.update(
      <LavenderScreenBackground testID="canvas" statusBarInset={0} />,
    ),
  );
  expect(
    tree.root.findAll(
      n => typeof n.type === 'string' && n.props.testID === 'canvas-status-bar',
    ),
  ).toHaveLength(0);
  const parentInsetLayer = tree.root.findAll(
    n => typeof n.type === 'string' && n.props.testID === 'canvas',
  )[0];
  expect(StyleSheet.flatten(parentInsetLayer.props.style).top).toBe(0);
  await act(async () => tree.unmount());
});

it.each([
  [
    'screens/Pets/PetActivityAchievementsScreen.tsx',
    'activity-background-gradient',
  ],
  [
    'screens/Pets/PetManagementScreen.tsx',
    'pet-management-background-gradient',
  ],
  [
    'screens/Records/MonthlyExpensesScreen.tsx',
    'monthly-expenses-background-gradient',
  ],
  [
    'screens/Main/components/LoggedInHome/LoggedInHome.tsx',
    'home-background-gradient',
  ],
])('connects the shared canvas exactly once in %s', (file, id) => {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  expect(
    source.match(new RegExp(`<LavenderScreenBackground testID="${id}"`, 'g')),
  ).toHaveLength(1);
});
