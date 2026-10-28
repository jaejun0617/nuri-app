import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import TimelineListFooter from '../src/screens/Records/TimelineListFooter';
import type { TimelineRecordsState } from '../src/store/recordStore';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'Feather');

function render(props: Partial<React.ComponentProps<typeof TimelineListFooter>> = {}) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<TimelineListFooter visibleCount={2} hasMore={false} status="ready" {...props} />);
  });
  return tree;
}

it('places a centered full-width CTA after the finished period list and clears it on press', () => {
  const onShowAllRecords = jest.fn();
  const tree = render({ onShowAllRecords });
  const footer = tree.root.findByProps({ testID: 'timeline-period-footer' });
  const button = tree.root.findByType(TouchableOpacity);
  expect(footer.props.style).toMatchObject({ paddingHorizontal: 18, paddingTop: 24, paddingBottom: 64 });
  expect(StyleSheet.flatten(button.props.style)).toMatchObject({ minHeight: 52, justifyContent: 'center' });
  expect(button.props.accessibilityLabel).toBe('전체 기록 보기');
  act(() => button.props.onPress());
  expect(onShowAllRecords).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

it('keeps the wider range available when the period itself contains no records', () => {
  const tree = render({ visibleCount: 0, onShowAllRecords: jest.fn() });
  expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(1);
  act(() => tree.unmount());
});

it.each<TimelineRecordsState['status']>(['idle', 'loading', 'refreshing', 'loadingMore', 'error'])('does not offer a misleading terminal CTA during %s', status => {
  const tree = render({ status, onShowAllRecords: jest.fn() });
  expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(status === 'loadingMore' ? 1 : 0);
  act(() => tree.unmount());
});

it('waits for remaining pages and preserves ordinary Timeline end clearance', () => {
  const paged = render({ hasMore: true, onShowAllRecords: jest.fn() });
  expect(paged.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  act(() => paged.unmount());
  const ordinary = render();
  expect(ordinary.root.findByProps({ testID: 'timeline-end-clearance' }).props.style).toEqual({ height: 48 });
  expect(ordinary.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  act(() => ordinary.unmount());
});
