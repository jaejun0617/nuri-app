import {
  expenseKind,
  fetchMonthlyExpenses,
  summarizeExpenses,
  type MonthlyExpense,
} from '../src/services/records/expenses';
import {
  isExpenseRecordCategory,
  parseRecordPrice,
} from '../src/services/records/form';

const mockPages: unknown[][] = [];
const mockQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  not: jest.fn(),
  in: jest.fn(),
  or: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  gt: jest.fn(),
  abortSignal: jest.fn(),
  then: (resolve: (result: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data: mockPages.shift() ?? [], error: null })),
};
jest.mock('../src/services/supabase/client', () => ({
  supabase: { from: () => mockQuery },
}));

const item: MonthlyExpense = {
  id: '1',
  petId: 'pet-a',
  petName: '누리',
  title: '용품',
  date: '2026-10-04',
  price: 12000,
  kind: 'shopping',
  legacyDate: false,
};
function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    pet_id: 'pet-a',
    pets: { name: '누리' },
    title: 'QA',
    category: 'other',
    sub_category: 'shopping',
    price: 12000,
    occurred_at: '2026-10-04',
    created_at: '2026-10-04T01:00:00Z',
    ...overrides,
  };
}
describe('account-wide monthly recorded expenses', () => {
  beforeEach(() => {
    mockPages.length = 0;
    Object.entries(mockQuery).forEach(([key, fn]) => {
      if (key !== 'then')
        (fn as jest.Mock).mockReset().mockReturnValue(mockQuery);
    });
  });
  it('adds both pets and both expense types exactly once, including zero', () => {
    const result = summarizeExpenses([
      item,
      item,
      { ...item, id: '2', petId: 'pet-b', kind: 'medical', price: 35000 },
      { ...item, id: '3', price: 0 },
    ]);
    expect(result.total).toBe(47000);
    expect(result.shopping).toBe(12000);
    expect(result.medical).toBe(35000);
    expect(result.items).toHaveLength(3);
  });
  it('does not cap the sum at a timeline page or 1000 rows', () => {
    const result = summarizeExpenses(
      Array.from({ length: 1111 }, (_, index) => ({
        ...item,
        id: String(index),
        price: 100,
      })),
    );
    expect(result.total).toBe(111100);
  });
  it('shares nullable price fields for shopping and health without treating missing as zero', () => {
    expect(parseRecordPrice('')).toBeNull();
    expect(parseRecordPrice('0')).toBe(0);
    expect(isExpenseRecordCategory('health', null)).toBe(true);
    expect(isExpenseRecordCategory('other', 'hospital')).toBe(true);
    expect(isExpenseRecordCategory('other', 'shopping')).toBe(true);
    expect(isExpenseRecordCategory('diary', null)).toBe(false);
    expect(expenseKind('other', 'grooming')).toBeNull();
  });
  it('reads every keyset page under owner RLS, using date boundaries and KST legacy dates', async () => {
    mockPages.push(
      [row('01')],
      [
        row('02', {
          pet_id: 'pet-b',
          pets: { name: '초코' },
          category: 'health',
          sub_category: null,
          price: 35000,
          occurred_at: null,
          created_at: '2026-09-30T15:00:00Z',
        }),
      ],
      [],
    );
    const signal = new AbortController().signal;
    const result = await fetchMonthlyExpenses('qa-user', '2026-10', signal);
    expect(result.total).toBe(47000);
    expect(result.items[1].date).toBe('2026-10-01');
    expect(result.legacyDateCount).toBe(1);
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'qa-user');
    expect(mockQuery.eq).not.toHaveBeenCalledWith('pet_id', expect.anything());
    expect(mockQuery.gt).toHaveBeenCalledWith('id', '01');
    expect(mockQuery.gt).toHaveBeenCalledWith('id', '02');
    expect(mockQuery.or).toHaveBeenCalledWith(
      expect.stringContaining(
        'occurred_at.gte.2026-10-01,occurred_at.lt.2026-11-01',
      ),
    );
    expect(mockQuery.or).toHaveBeenCalledWith(
      expect.stringContaining('created_at.gte.2026-09-30T15:00:00.000Z'),
    );
    expect(mockQuery.abortSignal).toHaveBeenCalledWith(signal);
  });
  it('rejects malformed price rows rather than silently understating the total', async () => {
    mockPages.push([row('01', { price: -1 })]);
    await expect(fetchMonthlyExpenses('qa-user', '2026-10')).rejects.toThrow(
      '지출 기록',
    );
  });
  it('rejects non-advancing pages and invalid month/auth boundaries', async () => {
    mockPages.push([row('01')], [row('01')]);
    await expect(fetchMonthlyExpenses('qa-user', '2026-10')).rejects.toThrow(
      '다음 페이지',
    );
    await expect(fetchMonthlyExpenses('', '2026-10')).rejects.toThrow(
      '조회 범위',
    );
    await expect(fetchMonthlyExpenses('qa-user', '2026-13')).rejects.toThrow(
      '조회 범위',
    );
  });
});
