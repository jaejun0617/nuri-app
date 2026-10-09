import {
  buildHealthRecordMetadata,
  emptyHealthCareDetails,
  normalizeHealthCareDetails,
  normalizeMemoryRecordMetadata,
} from '../src/services/records/metadata';
import { updateMemoryFields } from '../src/services/supabase/memories';
import { invalidateMonthlyExpenses } from '../src/services/records/expenses';
const mockUpdate = jest.fn();
const mockEq = jest.fn();
jest.mock('../src/services/supabase/client', () => ({
  supabase: { from: () => ({ update: mockUpdate }) },
}));
jest.mock('../src/services/supabase/storageMemories', () => ({}));
jest.mock('../src/services/records/expenses', () => ({
  invalidateMonthlyExpenses: jest.fn(),
}));

describe('medical records reuse one total price and optional metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
  });
  it.each(['hospital', 'medicine'] as const)(
    'retains %s details without requiring a condition or weight',
    kind => {
      const care = {
        ...emptyHealthCareDetails(kind),
        hospitalName: ' 누리 동물병원 ',
        diagnosis: '정기 검진',
        medication: '복약 메모',
      };
      const metadata = buildHealthRecordMetadata({
        condition: null,
        weightKg: null,
        care,
      });
      expect(normalizeMemoryRecordMetadata(metadata)?.health).toEqual({
        condition: null,
        weightKg: null,
        care: { ...care, hospitalName: '누리 동물병원' },
      });
      expect(metadata).not.toHaveProperty('price');
    },
  );
  it('bounds optional text and rejects unknown kinds without breaking legacy records', () => {
    expect(
      normalizeHealthCareDetails({
        kind: 'hospital',
        hospitalName: 'a'.repeat(120),
        diagnosis: null,
        medication: 3,
      }),
    ).toEqual({
      kind: 'hospital',
      hospitalName: 'a'.repeat(100),
      diagnosis: '',
      medication: '',
    });
    expect(normalizeHealthCareDetails({ kind: 'invalid' })).toBeUndefined();
    expect(
      normalizeMemoryRecordMetadata({
        health: { condition: 'normal', weightKg: 4.22 },
      }),
    ).toEqual({ version: 1, health: { condition: 'normal', weightKg: 4.22 } });
  });
  it('updates medical details and the single total together, then invalidates the all-pet monthly summary', async () => {
    const metadata = buildHealthRecordMetadata({
      condition: 'normal',
      weightKg: 4.22,
      care: emptyHealthCareDetails('medicine'),
    });
    await updateMemoryFields({
      memoryId: 'm',
      title: '복약 기록',
      category: 'health',
      price: 12000,
      metadata,
      occurredAt: '2026-10-09',
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata,
        price: 12000,
        occurred_at: '2026-10-09',
      }),
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'm');
    expect(invalidateMonthlyExpenses).toHaveBeenCalledTimes(1);
  });
  it('does not erase metadata for callers that omit it and does not invalidate a failed write', async () => {
    await updateMemoryFields({ memoryId: 'm', title: '기존 기록' });
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('metadata');
    jest.mocked(invalidateMonthlyExpenses).mockClear();
    mockEq.mockResolvedValueOnce({ error: new Error('offline') });
    await expect(
      updateMemoryFields({ memoryId: 'm', title: '기존 기록' }),
    ).rejects.toThrow('offline');
    expect(invalidateMonthlyExpenses).not.toHaveBeenCalled();
  });
});
