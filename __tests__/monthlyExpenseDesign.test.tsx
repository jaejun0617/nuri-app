import React from 'react';
import { FlatList, Text, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import MonthlyExpensesScreen from '../src/screens/Records/MonthlyExpensesScreen';
import { MONTHLY_EXPENSE_PREVIEW_ITEMS as fixtures, isMonthlyExpensePreviewEnabled } from '../src/screens/Records/monthlyExpensePreview';
import { monthlyExpenseLayout, presentMonthlyExpenses } from '../src/screens/Records/monthlyExpensePresentation';
import { summarizeExpenses } from '../src/services/records/expenses';
import { usePetStore } from '../src/store/petStore';
import { buildHealthReportMonthBounds, addMonthsToHealthReportMonthKey } from '../src/services/health-report/month';
import { styles } from '../src/screens/Records/MonthlyExpensesScreen.styles';
import PremiumNoticeModal from '../src/components/common/PremiumNoticeModal';
import { ASSETS } from '../src/assets';

const mockNavigate = jest.fn();
const mockRefetch = jest.fn();
let mockData: ReturnType<typeof summarizeExpenses> | undefined;
let mockError = false;
let mockFetching = false;
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { monthKey: '2026-10' } }),
  useFocusEffect: jest.fn(),
}));
jest.mock('../src/hooks/useMonthlyExpenses', () => ({ useMonthlyExpenses: () => ({ data: mockData, isError: mockError, isFetching: mockFetching, refetch: mockRefetch }) }));
type PreviewGlobal = typeof globalThis & { __NURI_MONTHLY_EXPENSE_PREVIEW__?: boolean };
const previewGlobal = globalThis as PreviewGlobal;
// Inspect the notice's screen-owned open/close contract without replacing the native Modal host.
jest.mock('../src/components/common/PremiumNoticeModal', () => 'PremiumNoticeModal');
function text(node: TestRenderer.ReactTestInstance): string {
  return node.children.map(child => typeof child === 'string' ? child : text(child)).join('');
}
async function render() {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><MonthlyExpensesScreen /></ThemeProvider>); });
  return tree;
}
async function press(tree: TestRenderer.ReactTestRenderer, label: string) {
  const node = tree.root.findAllByType(TouchableOpacity).find(item => item.props.accessibilityLabel === label);
  expect(node).toBeDefined();
  await act(async () => node?.props.onPress());
}

describe('monthly expenses design and scope', () => {
  beforeEach(() => { mockData = summarizeExpenses([...fixtures]); mockError = false; mockFetching = false; jest.clearAllMocks(); previewGlobal.__NURI_MONTHLY_EXPENSE_PREVIEW__ = false; });
  afterEach(() => { delete previewGlobal.__NURI_MONTHLY_EXPENSE_PREVIEW__; });
  it('keeps the top total independent of all three category tabs and groups every real entry', () => {
    const all = presentMonthlyExpenses(fixtures, null, 'all');
    expect(all.summary).toMatchObject({ total: 290000, medical: 168000, grooming: 65000, shopping: 57000 });
    expect(all.selected).toHaveLength(6);
    expect(all.rows.filter(row => row.type === 'date').map(row => row.type === 'date' && row.total)).toEqual([117000, 113000, 25000, 35000]);
    for (const [filter, count, total] of [['medical', 3, 168000], ['grooming', 1, 65000], ['shopping', 2, 57000]] as const) {
      const view = presentMonthlyExpenses(fixtures, null, filter);
      expect(view.summary.total).toBe(290000); expect(view.selected).toHaveLength(count); expect(view.selectedTotal).toBe(total);
    }
  });
  it.each([['expense-preview-nuri', 4, 210000, 2, 120000], ['expense-preview-dubu', 2, 80000, 1, 48000]] as const)('intersects %s with the category, without duplicating multiple care choices', (petId, count, total, healthCount, healthTotal) => {
    expect(presentMonthlyExpenses(fixtures, petId, 'all').selected).toHaveLength(count);
    const view = presentMonthlyExpenses([...fixtures, fixtures[2]], petId, 'medical');
    expect(view.summary.total).toBe(total); expect(view.selected).toHaveLength(healthCount); expect(view.selectedTotal).toBe(healthTotal);
  });
  it('uses real record IDs for detail and preserves the global pet selection', async () => {
    const before = usePetStore.getState();
    usePetStore.setState({ pets: [{ id: 'expense-preview-nuri', name: '누리' }, { id: 'expense-preview-dubu', name: '두부' }], selectedPetId: 'expense-preview-nuri' });
    const tree = await render();
    await press(tree, '병원·건강');
    expect(text(tree.root.findByProps({ testID: 'expense-month-total' }))).toBe('290,000원');
    expect(text(tree.root.findByProps({ testID: 'expense-selected-total' }))).toBe('168,000원');
    await press(tree, '아이 필터'); await press(tree, '두부');
    expect(text(tree.root.findByProps({ testID: 'expense-month-total' }))).toBe('80,000원');
    expect(text(tree.root.findByProps({ testID: 'expense-selected-total' }))).toBe('48,000원');
    expect(usePetStore.getState().selectedPetId).toBe('expense-preview-nuri');
    const row = tree.root.findByProps({ testID: 'expense-row-expense-preview-03' });
    await act(async () => row.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('RecordDetail', { petId: 'expense-preview-dubu', memoryId: 'expense-preview-03' });
    await act(async () => { tree.unmount(); }); usePetStore.setState(before, true);
  });
  it('does not disguise loading or an error as an empty month and retries without changing scope', async () => {
    mockData = undefined; mockFetching = true;
    const tree = await render();
    expect(text(tree.root.findByProps({ testID: 'expense-month-total' }))).toBe('불러오는 중');
    expect(tree.root.findAllByType(Text).some(node => text(node) === '이달에 기록한 지출이 없어요')).toBe(false);
    mockFetching = false; mockError = true;
    await act(async () => tree.update(<ThemeProvider theme={createTheme('light')}><MonthlyExpensesScreen /></ThemeProvider>));
    expect(text(tree.root.findByProps({ testID: 'expense-month-total' }))).toBe('조회하지 못했어요');
    await press(tree, '지출 다시 시도'); expect(mockRefetch).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
  });
  it('renders the development preview in the actual screen without mixing query rows, and disables it for release', async () => {
    previewGlobal.__NURI_MONTHLY_EXPENSE_PREVIEW__ = true;
    mockData = summarizeExpenses([{ ...fixtures[0], id: 'real', price: 1 }]);
    const tree = await render();
    expect(text(tree.root.findByProps({ testID: 'expense-month-total' }))).toBe('290,000원');
    expect(tree.root.findByType(FlatList).props.data.filter((row: { type: string }) => row.type === 'expense')).toHaveLength(6);
    expect(isMonthlyExpensePreviewEnabled(false)).toBe(false);
    await press(tree, '이전 달');
    expect(text(tree.root.findByProps({ testID: 'expense-month-total' }))).toBe('0원');
    expect(tree.root.findByType(FlatList).props.data).toHaveLength(0);
    await act(async () => tree.unmount());
  });
  it('executes the real non-development boundary even when the preview flag is true', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
    previewGlobal.__NURI_MONTHLY_EXPENSE_PREVIEW__ = true;
    mockData = summarizeExpenses([{ ...fixtures[0], id: 'real-release-scope', price: 123 }]);
    let tree: TestRenderer.ReactTestRenderer | undefined;
    try {
      Object.defineProperty(globalThis, '__DEV__', { configurable: true, writable: true, value: false });
      expect(isMonthlyExpensePreviewEnabled()).toBe(false);
      tree = await render();
      expect(tree.root.findByProps({ testID: 'monthly-expenses-live' })).toBeDefined();
      expect(text(tree.root.findByProps({ testID: 'expense-month-total' }))).toBe('123원');
      expect(tree.root.findAllByProps({ testID: 'monthly-expenses-preview' })).toHaveLength(0);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, '__DEV__', descriptor);
      else Reflect.deleteProperty(globalThis, '__DEV__');
      if (tree) await act(async () => tree?.unmount());
    }
  });
  it.each([320, 360, 393, 412, 430])('provides responsive geometry at width %i without shrinking the touch target', width => {
    const normal = monthlyExpenseLayout(width, 1);
    expect(width - 2 * normal.gutter).toBeGreaterThan(280);
    expect(monthlyExpenseLayout(width, 1.5).verticalSummary).toBe(true);
    expect(monthlyExpenseLayout(width, 1.5).stackedRow).toBe(true);
    expect(monthlyExpenseLayout(width, 1, 13).verticalSummary).toBe(true);
  });
  it('applies the PO-approved 3sp reduction to every local text role, including compact totals', () => {
    expect(createTheme('light').typography.preset.unifiedTitle.fontSize).toBe(18);
    expect(styles.month.fontSize).toBe(17);
    expect(styles.total.fontSize).toBe(39);
    expect(styles.unit.fontSize).toBe(25);
    expect(styles.summaryAmount.fontSize).toBe(12);
    expect(styles.rowTitle.fontSize).toBe(13);
    expect(styles.rowAmount.fontSize).toBe(15);
    expect(styles.footerText.fontSize).toBe(9);
    expect(monthlyExpenseLayout(320, 1).totalFontSize).toBe(33);
    expect(styles.tool.minHeight).toBe(48);
    expect(styles.closeTotalSpacing.marginTop).toBe(-10);
    expect(styles.categorySeparator.borderRightWidth).toBe(1);
    expect(styles.dateRow.borderWidth).toBe(1);
    expect(styles.dateRow.borderRadius).toBe(10);
    expect(styles.petMetaDivider.borderRightWidth).toBe(1);
    expect(styles.monthRow.paddingVertical).toBe(0);
    expect(styles.summary.paddingVertical).toBe(12);
    expect(styles.summaryCopy.alignItems).toBe('center');
    expect(styles.summaryLabel.textAlign).toBe('center');
    expect(styles.summaryAmount.textAlign).toBe('center');
  });
  it('uses the NURI notice modal and the reference-shaped paired pet icon', async () => {
    const tree = await render();
    await press(tree, '월별 지출 안내');
    expect(tree.root.findByType(PremiumNoticeModal).props.visible).toBe(true);
    expect(tree.root.findByProps({ testID: 'expense-pet-scope-icon' }).props.source).toBeDefined();
    await act(async () => tree.root.findByType(PremiumNoticeModal).props.onClose());
    expect(tree.root.findByType(PremiumNoticeModal).props.visible).toBe(false);
    await act(async () => tree.unmount());
  });
  it('opens a full-screen dim overlay with NURI pet symbols and closes through the backdrop or Android Back', async () => {
    previewGlobal.__NURI_MONTHLY_EXPENSE_PREVIEW__ = true;
    const tree = await render();
    await press(tree, '아이 필터');
    const modal = () => tree.root.findByProps({ testID: 'expense-pet-picker-modal' });
    expect(modal().props).toMatchObject({ visible: true, transparent: true, statusBarTranslucent: true, navigationBarTranslucent: true });
    expect(tree.root.findByProps({ testID: 'expense-pet-picker-overlay' }).props.style).toBe(styles.pickerScrim);
    expect(styles.pickerScrim).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(25,21,47,0.4)' });
    for (const index of [1, 2]) {
      expect(tree.root.findByProps({ testID: 'expense-pet-symbol-' + index }).props.source).toBe(ASSETS.logo);
    }
    await act(async () => tree.root.findByProps({ testID: 'expense-pet-picker-overlay' }).props.onPress());
    expect(modal().props.visible).toBe(false);
    await press(tree, '아이 필터');
    await act(async () => modal().props.onRequestClose());
    expect(modal().props.visible).toBe(false);
    await act(async () => tree.unmount());
  });
  it('uses the same rounded date border and lavender background in every category tab', async () => {
    const tree = await render();
    for (const label of ['전체', '병원·건강', '미용', '생활·용품']) {
      await press(tree, label);
      const list = tree.root.findByType(FlatList);
      const row = list.props.data.find((item: { type: string }) => item.type === 'date');
      const rendered = list.props.renderItem({ item: row, index: 0 });
      expect(rendered.props.children.props.style).toBe(styles.dateRow);
      expect(styles.dateRow.backgroundColor).toBe('#F5F2FC');
      expect(styles.dateRow.borderRadius).toBe(10);
    }
    await act(async () => tree.unmount());
  });
  it('keeps KST/date-only boundaries correct through leap years and December', () => {
    expect(buildHealthReportMonthBounds('2024-02')).toMatchObject({ daysInMonth: 29, startIso: '2024-01-31T15:00:00.000Z', endExclusiveIso: '2024-02-29T15:00:00.000Z' });
    expect(buildHealthReportMonthBounds('2026-12').endExclusiveYmd).toBe('2027-01-01');
    expect(addMonthsToHealthReportMonthKey('2026-01', -1)).toBe('2025-12');
  });
});
