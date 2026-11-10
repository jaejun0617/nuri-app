import React, { useState } from 'react';
import { View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import CtaButton, { CtaText } from '../src/app/ui/CtaButton';
import { createTheme } from '../src/app/theme/theme';
import TimelineMonthPicker from '../src/screens/Records/TimelineMonthPicker';

it('steps the year and month independently and wraps months in both directions', () => {
  const change = jest.fn();
  const close = jest.fn();
  const showAll = jest.fn();
  function PickerHarness() {
    const [monthKey, setMonthKey] = useState('2026-12');
    return (
      <TimelineMonthPicker
        monthKey={monthKey}
        currentYear={2026}
        availableMonths={['2025-12', '2026-11']}
        onMonthChange={next => {
          change(next);
          setMonthKey(next);
        }}
        onClose={close}
        onShowAll={showAll}
      />
    );
  }
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <PickerHarness />
      </ThemeProvider>,
    );
  });
  try {
    const button = (testID: string) => {
      const node = tree.root.findAllByProps({ testID })
        .find(candidate => typeof candidate.props.onPress === 'function');
      if (!node) throw new Error(`Missing picker action ${testID}`);
      return node;
    };
    const press = (testID: string) => TestRenderer.act(() => button(testID).props.onPress());
    expect(change).not.toHaveBeenCalled();

    press('timeline-year-previous');
    press('timeline-year-next');
    press('timeline-year-next');
    expect(button('timeline-year-next').props.disabled).toBe(true);
    press('timeline-month-next');
    press('timeline-month-previous');
    expect(change.mock.calls).toEqual([
      ['2025-12'], ['2026-12'], ['2027-12'], ['2027-01'], ['2027-12'],
    ]);

    press('timeline-month-close');
    expect(close).toHaveBeenCalledTimes(1);
    expect(showAll).not.toHaveBeenCalled();
    expect(change).toHaveBeenCalledTimes(5);

    const actions = tree.root.findAllByType(CtaButton);
    expect(actions.map(action => action.props.testID)).toEqual(['timeline-month-show-all']);
    expect(actions[0].findByType(CtaText).props.children).toBe('전체 기록 모아보기');
    TestRenderer.act(() => actions[0].props.onPress());
    expect(showAll).toHaveBeenCalledTimes(1);
  } finally {
    TestRenderer.act(() => tree.unmount());
  }
});

it('renders the year and month rows inline without a dialog close action', () => {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <TimelineMonthPicker
          monthKey="2026-10"
          currentYear={2026}
          availableMonths={['2026-10']}
          onMonthChange={jest.fn()}
        />
      </ThemeProvider>,
    );
  });
  try {
    const steppers = tree.root.findAllByType(View).find(node => node.props.testID === 'timeline-month-steppers');
    expect(steppers).toBeDefined();
    const rowValues = steppers?.findAll(node =>
      node.props.testID === 'timeline-year-value' || node.props.testID === 'timeline-month-value',
    ) ?? [];
    expect(rowValues.map(node => node.props.testID).filter((id, index, ids) => ids.indexOf(id) === index))
      .toEqual(['timeline-year-value', 'timeline-month-value']);
    expect(tree.root.findAllByProps({ testID: 'timeline-month-close' })).toHaveLength(0);
    expect(tree.root.findAllByType(CtaButton)).toHaveLength(0);
  } finally {
    TestRenderer.act(() => tree.unmount());
  }
});
