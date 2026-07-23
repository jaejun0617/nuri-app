import {
  hasPositiveRecordNumber,
  normalizePositiveDecimalInput,
  parsePositiveRecordNumber,
} from '../src/services/records/form';
import {
  buildGroomingRecordMetadata,
  buildHealthRecordMetadata,
  buildMealRecordMetadata,
  normalizeMemoryRecordMetadata,
} from '../src/services/records/metadata';

describe('structured record field helpers', () => {
  it('accepts valid positive amounts and rejects empty or non-positive values', () => {
    expect(hasPositiveRecordNumber('180')).toBe(true);
    expect(hasPositiveRecordNumber('0')).toBe(false);
    expect(hasPositiveRecordNumber('')).toBe(false);
    expect(parsePositiveRecordNumber('180', '급여량')).toBe(180);
    expect(() => parsePositiveRecordNumber('0', '급여량')).toThrow();
    expect(() => parsePositiveRecordNumber('-1', '급여량')).toThrow();
  });

  it('keeps decimal weight input safe and bounded', () => {
    expect(normalizePositiveDecimalInput('4.8kg')).toBe('4.8');
    expect(normalizePositiveDecimalInput('4..899')).toBe('4.89');
    expect(() => parsePositiveRecordNumber('4.8', '체중', 200)).not.toThrow();
    expect(() => parsePositiveRecordNumber('201', '체중', 200)).toThrow();
  });

  it('builds and normalizes meal, health, and grooming metadata', () => {
    expect(
      buildMealRecordMetadata({ foodType: 'dry_food', amountGrams: 180 }),
    ).toEqual({
      version: 1,
      meal: { foodType: 'dry_food', amountGrams: 180 },
    });
    expect(
      buildHealthRecordMetadata({ condition: 'needs_attention', weightKg: 4.8 }),
    ).toEqual({
      version: 1,
      health: { condition: 'needs_attention', weightKg: 4.8 },
    });
    expect(
      buildGroomingRecordMetadata(['bath', 'coat_care']),
    ).toEqual({
      version: 1,
      grooming: { careTypes: ['bath', 'coat_care'] },
    });
    expect(normalizeMemoryRecordMetadata({ version: 1, unknown: true })).toBeNull();
  });
});
