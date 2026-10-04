import {
  buildRegistrationActionLayout,
  clampRegistrationScrollOffset,
  getRegistrationAddedItemScrollOffset,
  getProfileRegistrationSeasonalPresentation,
} from '../src/screens/Pets/profileRegistrationPresentation';

describe('profile registration presentation', () => {
  it('reveals new chips and a little space below with only the required movement', () => {
    expect(getRegistrationAddedItemScrollOffset({
      offsetY: 300, inputTop: 250, viewportTop: 100,
      fieldBottom: 590, visibleBottom: 540, previewGap: 12,
    })).toBe(362);
  });

  it('does not move an already visible field or scroll a tall chip list past its input', () => {
    const metrics = {
      offsetY: 300, inputTop: 250, viewportTop: 100,
      fieldBottom: 500, visibleBottom: 540, previewGap: 12,
    };
    expect(getRegistrationAddedItemScrollOffset(metrics)).toBe(300);
    expect(getRegistrationAddedItemScrollOffset({ ...metrics, fieldBottom: 1000 })).toBe(438);
    expect(getRegistrationAddedItemScrollOffset({ ...metrics, inputTop: 90, fieldBottom: 1000 })).toBe(300);
    expect(getRegistrationAddedItemScrollOffset({ ...metrics, fieldBottom: Number.NaN })).toBe(300);
  });

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

  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'uses the approved %s asset and palette without geometry tokens',
    season => {
      const presentation = getProfileRegistrationSeasonalPresentation(season);

      expect(presentation.season).toBe(season);
      expect(presentation.backgroundSource).toBeDefined();
      expect(presentation.continuationColors).toHaveLength(4);
      expect(presentation.readabilityVeilColors).toHaveLength(4);
      expect(presentation).not.toHaveProperty('marginTop');
      expect(presentation).not.toHaveProperty('paddingTop');
      expect(presentation).not.toHaveProperty('translateY');
      expect(presentation).not.toHaveProperty('height');
    },
  );

  it('returns to the resolver season when the QA override is AUTO', () => {
    expect(
      getProfileRegistrationSeasonalPresentation('autumn', 'winter').season,
    ).toBe('winter');
    expect(
      getProfileRegistrationSeasonalPresentation('autumn', 'spring').season,
    ).toBe('spring');
    expect(
      getProfileRegistrationSeasonalPresentation('autumn', 'summer').season,
    ).toBe('summer');
    expect(
      getProfileRegistrationSeasonalPresentation('autumn', 'auto').season,
    ).toBe('autumn');
  });
});
