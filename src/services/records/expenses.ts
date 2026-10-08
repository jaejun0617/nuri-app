import { supabase } from '../supabase/client';
import { appQueryClient } from '../query/appQueryClient';
import { buildHealthReportMonthBounds } from '../health-report/month';
import { getDateYmdInKst } from '../../utils/date';

export const MONTHLY_EXPENSE_QUERY_KEY = ['monthly-expenses'] as const;
export type ExpenseKind = 'shopping' | 'medical';
export type MonthlyExpense = {
  id: string;
  petId: string;
  petName: string;
  title: string;
  date: string;
  price: number;
  kind: ExpenseKind;
  legacyDate: boolean;
};
export type MonthlyExpenseSummary = {
  items: MonthlyExpense[];
  total: number;
  shopping: number;
  medical: number;
  legacyDateCount: number;
};

export function expenseKind(
  category: string | null,
  subCategory: string | null,
): ExpenseKind | null {
  if (
    category === 'health' ||
    (category === 'other' && subCategory === 'hospital')
  )
    return 'medical';
  return category === 'other' && subCategory === 'shopping' ? 'shopping' : null;
}

export function summarizeExpenses(
  items: readonly MonthlyExpense[],
): MonthlyExpenseSummary {
  const unique = [...new Map(items.map(item => [item.id, item])).values()];
  let shopping = 0;
  let medical = 0;
  for (const item of unique) {
    if (!Number.isSafeInteger(item.price) || item.price < 0)
      throw new Error('지출 금액을 확인하지 못했어요.');
    if (item.kind === 'shopping') shopping += item.price;
    else medical += item.price;
  }
  const total = shopping + medical;
  if (!Number.isSafeInteger(total))
    throw new Error('지출 합계가 표시 범위를 초과했어요.');
  return {
    items: unique.sort(
      (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    ),
    total,
    shopping,
    medical,
    legacyDateCount: unique.filter(item => item.legacyDate).length,
  };
}

export function invalidateMonthlyExpenses() {
  // All cached months are stale after a date/category/price change, including the old month.
  appQueryClient.invalidateQueries({ queryKey: MONTHLY_EXPENSE_QUERY_KEY });
}

function parseExpenseRow(row: unknown): MonthlyExpense | null {
  if (!row || typeof row !== 'object')
    throw new Error('지출 기록을 확인하지 못했어요.');
  const value = row as Record<string, unknown>;
  const category = typeof value.category === 'string' ? value.category : null;
  const subCategory =
    typeof value.sub_category === 'string' ? value.sub_category : null;
  const kind = expenseKind(category, subCategory);
  if (!kind) return null;
  const pet = value.pets;
  if (
    typeof value.id !== 'string' ||
    typeof value.pet_id !== 'string' ||
    typeof value.title !== 'string' ||
    !Number.isSafeInteger(value.price) ||
    typeof value.price !== 'number' ||
    value.price < 0 ||
    !pet ||
    typeof pet !== 'object' ||
    !('name' in pet) ||
    typeof pet.name !== 'string'
  ) {
    throw new Error('지출 기록을 확인하지 못했어요.');
  }
  const occurred =
    typeof value.occurred_at === 'string' ? value.occurred_at : null;
  const date =
    occurred ??
    (typeof value.created_at === 'string'
      ? getDateYmdInKst(value.created_at)
      : null);
  if (!date) throw new Error('지출 날짜를 확인하지 못했어요.');
  return {
    id: value.id,
    petId: value.pet_id,
    petName: pet.name,
    title: value.title,
    date,
    price: value.price,
    kind,
    legacyDate: occurred === null,
  };
}

/** Complete month, lean projection, keyset pages. RLS + explicit user ownership remain intact. */
export async function fetchMonthlyExpenses(
  userId: string,
  monthKey: string,
  signal?: AbortSignal,
): Promise<MonthlyExpenseSummary> {
  if (!userId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey))
    throw new Error('지출 조회 범위를 확인해 주세요.');
  const bounds = buildHealthReportMonthBounds(monthKey);
  const items: MonthlyExpense[] = [];
  let cursor: string | null = null;
  for (;;) {
    let query = supabase
      .from('memories')
      .select(
        'id,pet_id,title,category,sub_category,price,occurred_at,created_at,pets!inner(name)',
      )
      .eq('user_id', userId)
      .not('price', 'is', null)
      .in('category', ['health', 'other'])
      .or(
        `and(occurred_at.gte.${bounds.startYmd},occurred_at.lt.${bounds.endExclusiveYmd}),and(occurred_at.is.null,created_at.gte.${bounds.startIso},created_at.lt.${bounds.endExclusiveIso})`,
      )
      .order('id', { ascending: true })
      .limit(500);
    if (cursor) query = query.gt('id', cursor);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('지출 목록을 확인하지 못했어요.');
    for (const row of data) {
      const parsed = parseExpenseRow(row);
      if (parsed) items.push(parsed);
    }
    if (data.length === 0) break;
    const last: unknown = data[data.length - 1];
    if (
      !last ||
      typeof last !== 'object' ||
      !('id' in last) ||
      typeof last.id !== 'string' ||
      last.id === cursor
    ) {
      throw new Error('지출 목록의 다음 페이지를 확인하지 못했어요.');
    }
    cursor = last.id;
    // Do not assume the server's row cap equals our requested page size.
  }
  return summarizeExpenses(items);
}
