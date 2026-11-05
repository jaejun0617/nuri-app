import {
  NEUTRAL_UI_PALETTE,
  buildPetThemePalette,
  recommendPetThemeColor,
  resolvePetThemeColor,
} from '../src/services/pets/themePalette';
import { PRODUCT_ACCENT } from '../src/app/theme/tokens/productAccent';

describe('petThemePalette', () => {
  it.each([null, undefined, '', 'invalid', '#fff'])(
    'uses fixed lavender for unset/invalid %s without an identity seed', value => {
      expect(resolvePetThemeColor(value, { name: '누리', petId: 'pet-a' })).toBe(PRODUCT_ACCENT.primary);
      expect(resolvePetThemeColor(value, { name: '사랑', petId: 'pet-b' })).toBe(PRODUCT_ACCENT.primary);
    },
  );
  it('displays fixed lavender without rewriting any saved preference', () => {
    const pets = [{ themeColor: '#F97316' }, { themeColor: '#14b8a6' }];
    const before = JSON.stringify(pets);
    expect(pets.map(pet => resolvePetThemeColor(pet.themeColor))).toEqual([PRODUCT_ACCENT.primary, PRODUCT_ACCENT.primary]);
    expect(JSON.stringify(pets)).toBe(before);
    expect(NEUTRAL_UI_PALETTE.primary).toBe(PRODUCT_ACCENT.primary);
    expect(NEUTRAL_UI_PALETTE.deep).toBe(PRODUCT_ACCENT.ink);
  });
  it('이미지 시드가 같으면 같은 추천 색을 만든다', () => {
    const colorA = recommendPetThemeColor({
      imageBase64: 'abc123abc123abc123',
      name: '누리',
    });
    const colorB = recommendPetThemeColor({
      imageBase64: 'abc123abc123abc123',
      name: '누리',
    });

    expect(colorA).toBe(colorB);
    expect(colorA).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('keeps a legacy saved color inactive after point-color removal', () => {
    expect(resolvePetThemeColor('#112233', { name: '누리' })).toBe(PRODUCT_ACCENT.primary);
  });

  it('팔레트는 홈에서 바로 쓸 수 있는 파생값을 반환한다', () => {
    const palette = buildPetThemePalette('#336699');
    expect(palette.primary).toBe(PRODUCT_ACCENT.primary);
    expect(palette.deep).toMatch(/^#[0-9A-F]{6}$/);
    expect(palette.soft).toMatch(/^#[0-9A-F]{6}$/);
    expect(palette.ringGradient).toHaveLength(3);
  });
});
