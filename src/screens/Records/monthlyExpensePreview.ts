import type { MonthlyExpense } from '../../services/records/expenses';

// Reuse the existing development-only preview boundary. Never insert these rows into a store or DB.
// Metro QA can opt out without modifying data; release execution always ignores this flag.
type PreviewGlobal = typeof globalThis & { __NURI_MONTHLY_EXPENSE_PREVIEW__?: boolean };
export function isMonthlyExpensePreviewEnabled(development = __DEV__) {
  return development && (globalThis as PreviewGlobal).__NURI_MONTHLY_EXPENSE_PREVIEW__ !== false;
}
export const MONTHLY_EXPENSE_PREVIEW_MONTH = '2026-10';
export const MONTHLY_EXPENSE_PREVIEW_PETS = [{ id: 'expense-preview-nuri', name: '누리' }, { id: 'expense-preview-dubu', name: '두부' }];
export const MONTHLY_EXPENSE_PREVIEW_ITEMS: readonly MonthlyExpense[] = [
  { id: 'expense-preview-06', petId: 'expense-preview-nuri', petName: '누리', date: '2026-10-21', title: '예방접종·정기검진', kind: 'medical', price: 85000, legacyDate: false },
  { id: 'expense-preview-05', petId: 'expense-preview-dubu', petName: '두부', date: '2026-10-21', title: '사료와 간식', kind: 'shopping', price: 32000, legacyDate: false },
  { id: 'expense-preview-04', petId: 'expense-preview-nuri', petName: '누리', date: '2026-10-18', title: '전체 미용·털 정리', kind: 'grooming', price: 65000, legacyDate: false },
  { id: 'expense-preview-03', petId: 'expense-preview-dubu', petName: '두부', date: '2026-10-18', title: '피부 진료', kind: 'medical', price: 48000, legacyDate: false },
  { id: 'expense-preview-02', petId: 'expense-preview-nuri', petName: '누리', date: '2026-10-12', title: '배변패드·산책용품', kind: 'shopping', price: 25000, legacyDate: false },
  { id: 'expense-preview-01', petId: 'expense-preview-nuri', petName: '누리', date: '2026-10-08', title: '심장사상충 예방약', kind: 'medical', price: 35000, legacyDate: false },
];
export const MONTHLY_EXPENSE_PREVIEW_GROOMING = { version: 1, grooming: { careTypes: ['full_grooming', 'coat_care'] } } as const;
