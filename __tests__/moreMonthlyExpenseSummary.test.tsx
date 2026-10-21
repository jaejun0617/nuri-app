import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import MoreMonthlyExpenseSummary from '../src/components/MoreDrawer/MoreMonthlyExpenseSummary';
import type { MonthlyExpenseSummary } from '../src/services/records/expenses';

let mockData: MonthlyExpenseSummary | undefined;
let mockIsError = false;
let mockDimensions = { width: 384, height: 832, scale: 2.8125, fontScale: 1 };
const mockUseMonthlyExpenses = jest.fn();
jest.mock('../src/hooks/useMonthlyExpenses', () => ({
  useMonthlyExpenses: (month: string) => {
    mockUseMonthlyExpenses(month);
    return { data: mockData, isError: mockIsError };
  },
}));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => 'autumn',
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));

async function render(onPress = jest.fn()) {
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <MoreMonthlyExpenseSummary onPress={onPress} />
      </ThemeProvider>,
    );
  });
  return tree;
}
function text(tree: TestRenderer.ReactTestRenderer) {
  return tree.root.findAll(node => typeof node.props.preset === 'string').map(node => node.props.children);
}

describe('More monthly expense summary', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-30T15:00:00Z'));
    mockData = { items: [], total: 42300, shopping: 12000, medical: 30300, grooming: 0, legacyDateCount: 0 };
    mockIsError = false;
    mockDimensions = { width: 384, height: 832, scale: 2.8125, fontScale: 1 };
    mockUseMonthlyExpenses.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('uses the current KST month, actual total and all-pet scope for the whole-row action', async () => {
    const onPress = jest.fn();
    const tree = await render(onPress);
    expect(mockUseMonthlyExpenses).toHaveBeenCalledWith('2026-10');
    expect(text(tree)).toEqual(['이번 달 기록한 지출', '42,300원']);
    const button = tree.root.find(node => node.props.testID === 'more-monthly-expenses' && typeof node.props.onPress === 'function');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toContain('42,300원');
    expect(button.props.accessibilityLabel).not.toContain('전체 펫');
    expect(tree.root.findAll(node => node.props.name === 'chevron-right').length).toBeGreaterThan(0);
    expect(tree.root.findAll(node => node.props.testID === 'more-monthly-expenses-summary' && node.props.borderRadius === 8).length).toBeGreaterThan(0);
    await TestRenderer.act(async () => button.props.onPress());
    expect(onPress).toHaveBeenCalledWith('2026-10');
    await TestRenderer.act(async () => tree.unmount());
  });

  it.each([
    ['zero', 0, false, '0원'],
    ['loading', undefined, false, '불러오는 중'],
    ['error with cached data', 42300, true, '조회하지 못했어요'],
  ] as const)('keeps %s truthful without a fixture amount', async (_state, total, error, expected) => {
    mockData = total === undefined ? undefined : { items: [], total, shopping: total, medical: 0, grooming: 0, legacyDateCount: 0 };
    mockIsError = error;
    const tree = await render();
    expect(text(tree)).toContain(expected);
    if (error) expect(text(tree)).not.toContain('42,300원');
    await TestRenderer.act(async () => tree.unmount());
  });

  it.each([320, 360, 384, 430])('keeps title and total in the same row at %sdp with accessible text wrapping', async width => {
    mockData = { items: [], total: Number.MAX_SAFE_INTEGER, shopping: Number.MAX_SAFE_INTEGER, medical: 0, grooming: 0, legacyDateCount: 0 };
    for (const fontScale of [1, 1.3, 1.5]) {
      mockDimensions = { ...mockDimensions, width, fontScale };
      const tree = await render();
      const button = tree.root.find(node => node.props.testID === 'more-monthly-expenses' && typeof node.props.onPress === 'function');
      const style = StyleSheet.flatten(button.props.style);
      expect(style.flexDirection).toBe('row');
      expect(style.alignItems).toBe('center');
      expect(style.height).toBeUndefined();
      expect(style.minHeight).toBeGreaterThanOrEqual(48);
      const amount = tree.root.findAll(node => typeof node.props.preset === 'string').find(node => node.props.children === '9,007,199,254,740,991원');
      expect(amount).toBeDefined();
      expect(amount?.props.numberOfLines).toBeUndefined();
      expect(amount?.props.allowFontScaling).not.toBe(false);
      expect(StyleSheet.flatten(amount?.props.style).fontSize).toBe(20);
      await TestRenderer.act(async () => tree.unmount());
    }
  });
});
