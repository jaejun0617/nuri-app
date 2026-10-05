import { resolveKeyboardBottomPadding } from '../src/hooks/useKeyboardBottomPadding';

describe('keyboard-owned bottom inset', () => {
  it.each([24, 48, 64])('retains the closed system inset %i', closed => {
    expect(resolveKeyboardBottomPadding(closed, 12, 0)).toBe(closed);
    expect(resolveKeyboardBottomPadding(closed, 12, 1)).toBe(12);
  });
  it('interpolates only the design gap, never adds keyboard height', () => {
    expect(resolveKeyboardBottomPadding(48, 12, 0.5)).toBe(30);
  });
  it('clamps animated overshoot at either endpoint', () => {
    expect(resolveKeyboardBottomPadding(48, 12, -0.5)).toBe(48);
    expect(resolveKeyboardBottomPadding(48, 12, 1.5)).toBe(12);
  });
  it('supports centered forms retaining their own design padding', () => {
    expect(resolveKeyboardBottomPadding(42, 18, 1)).toBe(18);
  });
});
