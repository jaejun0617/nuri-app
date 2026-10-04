import { resolveHomePopulatedLayout } from '../src/screens/Main/components/LoggedInHome/homePopulatedLayout';

describe('Home populated layout', () => {
  it.each([360, 384, 400, 430])(
    'keeps the approved photo viewport at %sdp',
    width => {
      for (const scale of [1, 1.3, 1.5, 2]) {
        expect(resolveHomePopulatedLayout(width, scale).photoHeight).toBe(250);
      }
    },
  );

  it.each([360, 384, 400, 430])(
    'stacks date metadata at large text on %sdp',
    width => {
      for (const scale of [1.3, 1.5, 2]) {
        expect(resolveHomePopulatedLayout(width, scale).stackedMetadata).toBe(
          true,
        );
      }
      expect(resolveHomePopulatedLayout(width, 1).stackedMetadata).toBe(false);
    },
  );

  it('stacks at narrow widths and respects the AppText maximum scale', () => {
    expect(resolveHomePopulatedLayout(320, 1).stackedMetadata).toBe(true);
    expect(resolveHomePopulatedLayout(430, 3)).toEqual(
      resolveHomePopulatedLayout(430, 2),
    );
  });
});
