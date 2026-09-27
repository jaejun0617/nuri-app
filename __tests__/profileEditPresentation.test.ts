import {
  buildStickyActionPadding,
  buildProfileEditMetadata,
  clampStoryFieldHeight,
} from '../src/screens/Pets/profileEditPresentation';
import {
  getProfileEditSeason,
  getSeasonalProfileEditVisual,
} from '../src/theme/seasonal/profileEdit';

describe('profile edit presentation', () => {
  it('builds metadata from only the available profile values', () => {
    expect(
      buildProfileEditMetadata({
        speciesLabel: '도마뱀',
        ageLabel: '7살',
        weightKg: 5,
        gender: 'male',
      }),
    ).toBe('도마뱀 · 7살 · 5kg · 남아');

    expect(
      buildProfileEditMetadata({
        speciesLabel: '강아지',
        ageLabel: '4살',
        weightKg: null,
        gender: 'female',
      }),
    ).toBe('강아지 · 4살 · 여아');
  });

  it('keeps story fields compact and bounded as content grows', () => {
    expect(clampStoryFieldHeight(12)).toBe(58);
    expect(clampStoryFieldHeight(64)).toBe(86);
    expect(clampStoryFieldHeight(180)).toBe(108);
  });

  it('keeps the sticky action zone balanced across safe-area and keyboard states', () => {
    expect(
      buildStickyActionPadding({
        safeAreaBottom: 24,
        actionZonePadding: 12,
      }),
    ).toEqual({ closedBottom: 24, openBottom: 12 });

    expect(
      buildStickyActionPadding({
        safeAreaBottom: -8,
        actionZonePadding: 12,
      }),
    ).toEqual({ closedBottom: 12, openBottom: 12 });
  });

  it.each([
    ['spring', '2026-04-15T03:00:00.000Z'],
    ['summer', '2026-07-15T03:00:00.000Z'],
    ['autumn', '2026-09-27T03:00:00.000Z'],
    ['winter', '2026-12-27T03:00:00.000Z'],
  ] as const)(
    'maps the %s resolver window to its profile edit skin',
    (season, iso) => {
      const resolvedSeason = getProfileEditSeason(new Date(iso));

      expect(resolvedSeason).toBe(season);
      expect(getSeasonalProfileEditVisual(resolvedSeason).season).toBe(season);
    },
  );

  it('supports bounded device-QA overrides and returns to AUTO', () => {
    expect(getSeasonalProfileEditVisual('autumn', 'winter').season).toBe(
      'winter',
    );
    expect(getSeasonalProfileEditVisual('autumn', 'spring').season).toBe(
      'spring',
    );
    expect(getSeasonalProfileEditVisual('autumn', 'summer').season).toBe(
      'summer',
    );
    expect(getSeasonalProfileEditVisual('autumn', 'auto').season).toBe(
      'autumn',
    );
  });

  it('preserves the approved autumn presentation tokens', () => {
    expect(getSeasonalProfileEditVisual('autumn')).toEqual(
      expect.objectContaining({
        season: 'autumn',
        palette: expect.objectContaining({
          pageBackgroundColor: '#FBF3E7',
          ambientOverlayColor: 'rgba(255, 248, 237, 0.06)',
          sectionSurfaceColor: 'rgba(255, 252, 246, 0.70)',
          controlSurfaceColor: 'rgba(255, 253, 249, 0.78)',
          stickySurfaceColor: 'rgba(255, 249, 239, 0.92)',
        }),
      }),
    );
  });
});
