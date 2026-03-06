import {
  buildPetThemePalette,
  recommendPetThemeColor,
  resolvePetThemeColor,
} from '../src/services/pets/themePalette';

describe('petThemePalette', () => {
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

  it('저장된 색이 있으면 그대로 우선 사용한다', () => {
    expect(resolvePetThemeColor('#112233', { name: '누리' })).toBe('#112233');
  });

  it('팔레트는 홈에서 바로 쓸 수 있는 파생값을 반환한다', () => {
    const palette = buildPetThemePalette('#336699');
    expect(palette.primary).toBe('#336699');
    expect(palette.deep).toMatch(/^#[0-9A-F]{6}$/);
    expect(palette.soft).toMatch(/^#[0-9A-F]{6}$/);
    expect(palette.ringGradient).toHaveLength(3);
  });
});
