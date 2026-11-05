import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import MarkerText from '../src/app/ui/MarkerText';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => 'autumn',
}));

async function render(variant?: 'underline' | 'wash') {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <MarkerText testID="text" markerColor="#DED0F4" variant={variant}>
        첫 산책 친구
      </MarkerText>,
    );
  });
  const text = tree.root.findAll(
    n => typeof n.type === 'string' && n.props.testID === 'text',
  )[0];
  return {
    tree,
    measure: (
      lines: { x: number; y: number; width: number; height: number }[],
    ) => act(async () => text.props.onTextLayout({ nativeEvent: { lines } })),
  };
}
const strokes = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    n => typeof n.type === 'string' && n.props.testID === 'marker-text-line',
  );

it('preserves the existing underline geometry for callers that do not opt in', async () => {
  const { tree, measure } = await render();
  await measure([{ x: 4, y: 10, width: 100, height: 20 }]);
  expect(StyleSheet.flatten(strokes(tree)[0].props.style)).toMatchObject({
    left: 4,
    top: 24.6,
    width: 100,
    height: 4,
    borderRadius: 0,
  });
  await act(async () => tree.unmount());
});
it('uses the measured name lines for a rounded wash, including wrapped text', async () => {
  const { tree, measure } = await render('wash');
  await measure([
    { x: 0, y: 0, width: 150, height: 25 },
    { x: 0, y: 25, width: 60, height: 25 },
  ]);
  expect(strokes(tree)).toHaveLength(2);
  expect(StyleSheet.flatten(strokes(tree)[0].props.style)).toMatchObject({
    top: 4,
    width: 150,
    height: 18.5,
    borderRadius: 4.5,
    backgroundColor: '#DED0F4',
  });
  expect(StyleSheet.flatten(strokes(tree)[1].props.style)).toMatchObject({
    top: 29,
    width: 60,
    height: 18.5,
  });
  expect(strokes(tree)[0].props.pointerEvents).toBe('none');
  expect(strokes(tree)[0].props.importantForAccessibility).toBe(
    'no-hide-descendants',
  );
  await act(async () => tree.unmount());
});
it('does not create duplicate strokes when native measurement reports the same lines again', async () => {
  const { tree, measure } = await render('wash');
  const lines = [{ x: 0, y: 0, width: 120, height: 24 }];
  await measure(lines);
  await measure(lines);
  expect(strokes(tree)).toHaveLength(1);
  await act(async () => tree.unmount());
});
it('ignores legacy pet color changes and preserves explicit semantic color overrides', async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  const renderScope = (petColor: string, markerColor?: string) => <MarkerText testID="pet-marker" variant="wash" petColor={petColor} markerColor={markerColor}>누리의 소개</MarkerText>;
  await act(async () => { tree = TestRenderer.create(renderScope('#F97316')); });
  const measure = async () => {
    const text = tree.root.findAll(n => typeof n.type === 'string' && n.props.testID === 'pet-marker')[0];
    await act(async () => text.props.onTextLayout({ nativeEvent: { lines: [{x:0,y:0,width:120,height:24}] } }));
  };
  await measure();
  const orange = StyleSheet.flatten(strokes(tree)[0].props.style).backgroundColor;
  await act(async () => tree.update(renderScope('#14B8A6')));
  expect(StyleSheet.flatten(strokes(tree)[0].props.style).backgroundColor).toBe(orange);
  await act(async () => tree.update(renderScope('#14B8A6', '#FBE3DF')));
  expect(StyleSheet.flatten(strokes(tree)[0].props.style).backgroundColor).toBe('#FBE3DF');
  await act(async () => tree.unmount());
});
