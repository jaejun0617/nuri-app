const {
  densityFor,
  parseDisplay,
} = require('../scripts/qa/device-layout-usb.cjs');

describe('USB device layout host', () => {
  test.each([
    ['320', '540'],
    ['360', '480'],
    ['384', '450'],
    ['412', '419'],
    ['default', 'reset'],
  ])('selects %s at physical width 1080', (preset, density) =>
    expect(densityFor(1080, preset)).toBe(density),
  );

  test('rejects arbitrary display sizes and density commands', () => {
    expect(() => densityFor(1080, '480')).toThrow();
    expect(() => densityFor(0, '320')).toThrow();
    expect(() => densityFor(1080, 'reset')).toThrow();
  });

  test('distinguishes the operating-system default from a forced density', () => {
    expect(parseDisplay('Physical density: 450', 'density', Number)).toEqual({
      physical: 450,
      active: 450,
      overridden: false,
    });
    expect(
      parseDisplay(
        'Physical density: 450\nOverride density: 450',
        'density',
        Number,
      ),
    ).toEqual({
      physical: 450,
      active: 450,
      overridden: true,
    });
  });
});
