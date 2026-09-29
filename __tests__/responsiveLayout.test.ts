import {
  getResponsiveBottomSheetMaxHeight,
  getResponsiveOverlayMaxHeight,
  getResponsivePickerVisibleRows,
} from '../src/services/app/responsiveLayout';

describe('responsive overlay layout', () => {
  it('keeps centered content inside safe areas and vertical margins', () => {
    expect(
      getResponsiveOverlayMaxHeight({
        windowHeight: 800,
        topInset: 24,
        bottomInset: 24,
        verticalMargin: 20,
      }),
    ).toBe(712);
  });

  it('recalculates from a short multi-window height without a device branch', () => {
    expect(
      getResponsiveOverlayMaxHeight({
        windowHeight: 430,
        topInset: 24,
        bottomInset: 20,
        verticalMargin: 16,
      }),
    ).toBe(354);
  });

  it('caps bottom sheets by both the live window ratio and top clearance', () => {
    expect(
      getResponsiveBottomSheetMaxHeight({
        windowHeight: 800,
        bottomInset: 24,
      }),
    ).toBe(688);

    expect(
      getResponsiveBottomSheetMaxHeight({
        windowHeight: 430,
        bottomInset: 20,
      }),
    ).toBe(322);
  });

  it('sanitizes invalid metrics instead of producing NaN or negative sizes', () => {
    expect(
      getResponsiveOverlayMaxHeight({
        windowHeight: Number.NaN,
        topInset: -10,
        bottomInset: Number.POSITIVE_INFINITY,
      }),
    ).toBe(0);
    expect(
      getResponsiveBottomSheetMaxHeight({
        windowHeight: -1,
        bottomInset: 20,
      }),
    ).toBe(0);
  });

  it('compacts picker rows only when the live window height is constrained', () => {
    expect(getResponsivePickerVisibleRows({ availableHeight: 780 })).toBe(5);
    expect(getResponsivePickerVisibleRows({ availableHeight: 520 })).toBe(3);
  });
});
