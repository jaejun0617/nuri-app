import {
  HOME_SECTION_GLASS_HIGHLIGHT_STYLE,
  HOME_SECTION_GLASS_MATERIAL_STYLE,
  HOME_SECTION_GLASS_SHADOW_EVALUATION_STYLE,
  HOME_SECTION_ROOT_STYLE,
  resolveHomeSectionGlassMaterial,
} from '../src/components/home/HomeSectionGlass';
import { getSeasonalProfileEditVisual } from '../src/theme/seasonal/profileEdit';
import type { SeasonKey } from '../src/theme/seasonal/season';

describe('Home section glass', () => {
  it.each<SeasonKey>(['autumn', 'winter', 'spring', 'summer'])(
    'reuses the %s Profile Edit canonical edge treatment without a tinted backing fill',
    season => {
      const palette = getSeasonalProfileEditVisual(season).palette;

      expect(resolveHomeSectionGlassMaterial(season)).toEqual({
        borderColor: palette.controlBorderColor,
        highlightColor: palette.sectionBorderColor,
      });
    },
  );

  it('keeps the section root transparent and the glass as the only outer surface', () => {
    expect(HOME_SECTION_ROOT_STYLE).toMatchObject({
      backgroundColor: 'transparent',
      overflow: 'visible',
    });
    expect(HOME_SECTION_GLASS_MATERIAL_STYLE).toMatchObject({
      position: 'absolute',
      borderRadius: 22,
      borderWidth: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.015)',
      overflow: 'hidden',
    });
    expect(HOME_SECTION_GLASS_MATERIAL_STYLE.backgroundColor).not.toMatch(
      /255, 252|255, 249|250, 255, 247|248, 252, 255/,
    );
    expect(HOME_SECTION_GLASS_MATERIAL_STYLE).not.toHaveProperty(
      'shadowOpacity',
    );
    expect(HOME_SECTION_GLASS_HIGHLIGHT_STYLE).toMatchObject({
      position: 'absolute',
      top: 1,
      left: 14,
      right: 14,
    });
    expect(HOME_SECTION_GLASS_SHADOW_EVALUATION_STYLE).toMatchObject({
      shadowColor: '#64748B',
      shadowOpacity: 0,
      shadowRadius: 16,
      elevation: 0,
    });
  });
});
