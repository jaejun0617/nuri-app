import {
  normalizeDateInput,
  parseDateInputParts,
  validateDateParts,
} from '../src/components/date-picker/datePickerUtils';

describe('date picker direct input', () => {
  it.each([
    ['1996 06 06', '1996-06-06'],
    ['1996 6 6', '1996-06-06'],
    ['1996-10-14', '1996-10-14'],
    ['1996-10-6', '1996-10-06'],
    ['1996-6-6', '1996-06-06'],
    ['2011-10-28', '2011-10-28'],
    ['2011 10 28', '2011-10-28'],
    ['2011-10-8', '2011-10-08'],
    ['20111028', '2011-10-28'],
    ['1996/6/6', '1996-06-06'],
    ['1996.6.6', '1996-06-06'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeDateInput(input)).toBe(expected);
  });

  it.each([
    '',
    '1',
    '19',
    '199',
    '1996',
    '1996-',
    '1996-0',
    '1996-06',
    '1996-06-',
    '2011-10',
    '2011-10-',
    '96-06-06',
    'abcd-ef-gh',
  ])(
    'keeps incomplete or malformed input invalid: %s',
    input => {
      expect(parseDateInputParts(input)).toBeNull();
      expect(normalizeDateInput(input)).toBeNull();
    },
  );

  it('keeps a zero day as editable input until final validation', () => {
    expect(parseDateInputParts('1996-06-0')).toEqual({
      year: 1996,
      month: 6,
      day: 0,
    });
    expect(normalizeDateInput('1996-06-0')).toBeNull();
  });

  it.each(['1996-00-06', '1996-13-06', '1996-02-30', '1996-04-31'])(
    'rejects a nonexistent date: %s',
    input => {
      expect(normalizeDateInput(input)).toBeNull();
    },
  );

  it.each([
    ['2024-02-29', '2024-02-29'],
    ['2000-02-29', '2000-02-29'],
  ])('accepts leap day %s', (input, expected) => {
    const parts = parseDateInputParts(input);
    expect(parts).toEqual({
      year: Number(input.slice(0, 4)),
      month: 2,
      day: 29,
    });
    expect(validateDateParts(parts!)).toBeNull();
    expect(normalizeDateInput(input)).toBe(expected);
  });

  it('rejects February 29 in a non-leap year', () => {
    const parts = parseDateInputParts('2023-02-29');
    expect(parts).not.toBeNull();
    expect(validateDateParts(parts!)).toContain('1~28');
    expect(normalizeDateInput('2023-02-29')).toBeNull();
  });
});
