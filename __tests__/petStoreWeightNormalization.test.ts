import { normalizePersistedWeightKg } from '../src/store/petStore';

describe('normalizePersistedWeightKg', () => {
  it.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['   ', null],
    [4.3, 4.3],
    ['4.3', 4.3],
    [0, null],
    ['0', null],
    [-1, null],
    ['abc', null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
    [1000, null],
    ['1000', null],
  ])('정규화 입력 %p -> %p', (input, expected) => {
    expect(normalizePersistedWeightKg(input)).toBe(expected);
  });
});

