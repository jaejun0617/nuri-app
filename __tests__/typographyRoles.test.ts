import {
  typography,
  TYPOGRAPHY_SEMANTIC_ROLES,
} from '../src/app/theme/tokens/typography';

describe('user-selectable app typography', () => {
  it('maps Jisu mode to the registered single-weight family', () => {
    expect(typography.appFontMode.jisu).toEqual({
      fontFamily: 'insungitCutelivelyjisu',
      fontWeight: '400',
    });
  });

  it('maps Pretendard mode to the production sans family', () => {
    expect(typography.appFontMode.pretendard).toEqual({
      fontFamily: typography.family.sans,
    });
  });

  it('keeps semantic roles without assigning a family', () => {
    expect(TYPOGRAPHY_SEMANTIC_ROLES).toContain('screenTitle');
    expect(TYPOGRAPHY_SEMANTIC_ROLES).toContain('metadata');
    expect(TYPOGRAPHY_SEMANTIC_ROLES).toContain('navigation');
    expect(typography).not.toHaveProperty('familyRole');
  });

  it('keeps canonical presets on Pretendard for fixed exclusions', () => {
    expect(typography.role.screenTitle.fontFamily).toBe(typography.family.sans);
    expect(typography.preset.titleSm.fontFamily).toBe(typography.family.sans);
  });
});
