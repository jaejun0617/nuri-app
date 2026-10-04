import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import {
  HomeSeasonReviewControls,
  styles,
} from '../src/screens/Main/components/LoggedInHome/HomeSeasonReviewControls';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));

it('provides four review selections without remounting or shifting Home content', async () => {
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
        <HomeSeasonReviewControls
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
  expect(styles.shelf).toMatchObject({ position: 'absolute', top: 0 });
  expect(renderer.root.findByProps({ testID: 'home-season-review-controls' }).props.pointerEvents).toBe('box-none');
  expect(StyleSheet.flatten(renderer.root.findByProps({ testID: 'home-season-review-controls' }).props.style).top).toBe(24);
  expect(styles.option.minHeight).toBeGreaterThanOrEqual(38);
  await act(async () => renderer.unmount());
});
