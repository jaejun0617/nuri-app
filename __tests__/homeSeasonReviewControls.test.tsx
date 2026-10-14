import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import {
  SeasonReviewControls,
  styles,
} from '../src/components/common/SeasonReviewControls';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');

function toggle(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node => node.props.testID === 'home-review-season-toggle' &&
      typeof node.props.onPress === 'function',
  );
}

it.each([
  ['autumn', '가을'], ['winter', '겨울'], ['spring', '봄'], ['summer', '여름'],
] as const)('starts collapsed with the current %s season and no hidden selection targets', async (season, label) => {
  const changed = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<SeasonReviewControls season={season} onChange={changed} />);
  });
  expect(toggle(renderer).props.accessibilityState).toEqual({ expanded: false });
  expect(toggle(renderer).props.accessibilityRole).toBe('button');
  expect(toggle(renderer).props.accessibilityLabel).toContain(label);
  expect(renderer.root.findAll(node =>
    typeof node.props.testID === 'string' &&
    /^home-review-season-(autumn|winter|spring|summer)$/.test(node.props.testID),
  )).toHaveLength(0);
  expect(styles.toggle.minHeight).toBeGreaterThanOrEqual(44);
  expect(changed).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});

it('provides four review selections inline without remounting surrounding content', async () => {
  const changed = jest.fn();
  const mounted = jest.fn();
  function Content() {
    React.useEffect(() => {
      mounted();
    }, []);
    return <View testID="content-preserved" />;
  }
  function Harness() {
    const [season, setSeason] = useState<SeasonKey>('autumn');
    return (
      <>
        <SeasonReviewControls
          season={season}
          onChange={next => {
            changed(next);
            setSeason(next);
          }}
        />
        <Content />
      </>
    );
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Harness />);
  });
  await act(async () => toggle(renderer).props.onPress());
  expect(toggle(renderer).props.accessibilityState.expanded).toBe(true);
  for (const season of ['autumn', 'winter', 'spring', 'summer']) {
    await act(async () => {
      renderer.root
        .find(
          node =>
            node.props.testID === `home-review-season-${season}` &&
            typeof node.props.onPress === 'function',
        )
        .props.onPress();
    });
    expect(
      renderer.root.find(
        node =>
          node.props.testID === `home-review-season-${season}` &&
          typeof node.props.onPress === 'function',
      ).props.accessibilityState.selected,
    ).toBe(true);
  }
  expect(changed.mock.calls.map(call => call[0])).toEqual([
    'autumn',
    'winter',
    'spring',
    'summer',
  ]);
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(styles.shelf).toMatchObject({ width: '100%' });
  expect(styles.shelf).not.toHaveProperty('position');
  expect(renderer.root.findByProps({ testID: 'home-season-review-controls' }).props.pointerEvents).toBe('box-none');
  expect(StyleSheet.flatten(renderer.root.findByProps({ testID: 'home-season-review-controls' }).props.style).top).toBeUndefined();
  expect(styles.option.minHeight).toBeGreaterThanOrEqual(38);
  await act(async () => toggle(renderer).props.onPress());
  expect(toggle(renderer).props.accessibilityState.expanded).toBe(false);
  expect(toggle(renderer).props.accessibilityLabel).toContain('여름');
  await act(async () => toggle(renderer).props.onPress());
  expect(renderer.root.find(node =>
    node.props.testID === 'home-review-season-summer' &&
    typeof node.props.onPress === 'function',
  ).props.accessibilityState.selected).toBe(true);
  expect(changed).toHaveBeenCalledTimes(4);
  expect(mounted).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

it('updates the collapsed season label without opening or changing the preference', async () => {
  const changed = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<SeasonReviewControls season="spring" onChange={changed} />);
  });
  await act(async () => {
    renderer.update(<SeasonReviewControls season="winter" onChange={changed} />);
  });
  expect(toggle(renderer).props.accessibilityLabel).toContain('겨울');
  expect(toggle(renderer).props.accessibilityState.expanded).toBe(false);
  expect(changed).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});
