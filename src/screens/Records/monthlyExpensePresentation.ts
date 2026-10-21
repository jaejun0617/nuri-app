import { summarizeExpenses, type ExpenseKind, type MonthlyExpense } from '../../services/records/expenses';

export const EXPENSE_GROUPS = [
  { key: 'medical', label: '병원·건강', icon: 'plus-outline', color: '#7858BC', tint: '#EEE7FF' },
  { key: 'grooming', label: '미용', icon: 'scissors', color: '#AD4D77', tint: '#FBE7EF' },
  { key: 'shopping', label: '생활·용품', icon: 'shopping-outline', color: '#4B7342', tint: '#E9F4E4' },
] as const satisfies ReadonlyArray<{ key: ExpenseKind; label: string; icon: string; color: string; tint: string }>;
export type ExpenseFilter = ExpenseKind | 'all';
export type ExpenseListRow =
  | { type: 'date'; key: string; date: string; total: number }
  | { type: 'expense'; key: string; item: MonthlyExpense };

/** One full-month source owns the top total; category selection only derives the lower list. */
export function presentMonthlyExpenses(items: readonly MonthlyExpense[], petId: string | null, filter: ExpenseFilter) {
  const summary = summarizeExpenses(petId ? items.filter(item => item.petId === petId) : items);
  const selected = summary.items.filter(item => filter === 'all' || item.kind === filter);
  const days = new Map<string, MonthlyExpense[]>();
  for (const item of selected) days.set(item.date, [...(days.get(item.date) ?? []), item]);
  const rows: ExpenseListRow[] = [];
  for (const [date, entries] of days) {
    rows.push({ type: 'date', key: `date:${date}`, date, total: entries.reduce((sum, item) => sum + item.price, 0) });
    rows.push(...entries.map(item => ({ type: 'expense' as const, key: item.id, item })));
  }
  return { summary, selected, rows, selectedTotal: selected.reduce((sum, item) => sum + item.price, 0) };
}

export function monthlyExpenseLayout(width: number, fontScale: number, amountCharacters = 0) {
  return {
    gutter: width < 360 ? 16 : 18,
    compact: width < 370,
    verticalSummary: fontScale >= 1.3 || amountCharacters > 10,
    stackedRow: fontScale >= 1.3 || width < 350,
    summaryIcon: width < 400 ? 28 : 36,
    totalFontSize: width < 360 ? 33 : 39,
  };
}
