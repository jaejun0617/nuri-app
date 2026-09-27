import {
  buildRegistrationActionLayout,
  clampRegistrationScrollOffset,
} from '../src/screens/Pets/profileRegistrationPresentation';

describe('profile registration presentation', () => {
  it('uses the canonical safe-area rhythm for closed and keyboard states', () => {
    expect(
      buildRegistrationActionLayout({
        safeAreaBottom: 24,
        actionZonePadding: 12,
        measuredActionZoneHeight: 78,
      }),
    ).toEqual({
      closedBottom: 24,
      openBottom: 12,
      focusedInputBottomOffset: 102,
    });
  });

  it('sanitizes invalid device metrics without introducing offsets', () => {
    expect(
      buildRegistrationActionLayout({
        safeAreaBottom: -8,
        actionZonePadding: 12,
        measuredActionZoneHeight: Number.NaN,
      }),
    ).toEqual({
      closedBottom: 12,
      openBottom: 12,
      focusedInputBottomOffset: 24,
    });
  });

  it('clamps keyboard-expanded scroll offsets to natural content bounds', () => {
    expect(
      clampRegistrationScrollOffset({
        contentHeight: 1400,
        offsetY: 980,
        viewportHeight: 720,
      }),
    ).toBe(680);
  });

  it('preserves valid offsets and sanitizes invalid scroll metrics', () => {
    expect(
      clampRegistrationScrollOffset({
        contentHeight: 1400,
        offsetY: 520,
        viewportHeight: 720,
      }),
    ).toBe(520);
    expect(
      clampRegistrationScrollOffset({
        contentHeight: Number.NaN,
        offsetY: Number.POSITIVE_INFINITY,
        viewportHeight: -10,
      }),
    ).toBe(0);
  });
});
