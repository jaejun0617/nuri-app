import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { StyleSheet } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { HomeHeroInfoPanel, HomeHeroContentSheet } from '../src/screens/Main/components/LoggedInHome/HomeHeroInfoPanel';
import { buildPetThemePalette } from '../src/services/pets/themePalette';
import { getHomeHeroColors, getHomeHeroSeasonCopy, getHomeHeroTypography, HOME_HERO_COLORS } from '../src/theme/home/heroLayout';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');

describe('approved open Home Hero information', () => {
  let renderer: Renderer.ReactTestRenderer;
  const select = jest.fn(), info = jest.fn(), edit = jest.fn();
  const withTheme = (children: React.ReactNode) => <ThemeProvider theme={createTheme('light')}>{children}</ThemeProvider>;
  const render = async (width = 426, name = '누리', badge: string | null = '산책 새싹', days: number | null = 8) => {
    await act(async () => {
      renderer = Renderer.create(withTheme(
        <HomeHeroInfoPanel containerWidth={width} petTheme={buildPetThemePalette('#7D5CE4')}
          profilePetName={name} titleBadge={badge} titleBadgeKey={badge === '산책 새싹' ? 'walk_sprout' : null} togetherDays={days} hasMultiplePets
          onPressPetSelect={select} onPressProfileInfo={info} onPressPetProfileEdit={edit} />,
      ));
    });
  };
  const node = (id: string) => renderer.root.findByProps({ testID: id });
  afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); jest.clearAllMocks(); });

  it('orders badge, selectable name, together-time and the two existing actions', async () => {
    await render();
    const root = renderer.root.findAllByProps({ testID: 'home-hero-info' }).slice(-1)[0];
    expect(root.children.filter((x): x is Renderer.ReactTestInstance => typeof x !== 'string').map(x => x.props.testID)).toEqual([
      'home-hero-title-slot', 'home-hero-pet-selector', 'home-hero-together', 'home-hero-profile-actions',
    ]);
    expect(StyleSheet.flatten(root.props.style)).toMatchObject({ width: '100%', paddingTop: 29, backgroundColor: 'transparent' });
    expect(StyleSheet.flatten(node('home-hero-profile-actions').props.style)).toMatchObject({ flexDirection: 'column', marginHorizontal: 16, gap: 7 });
    expect(StyleSheet.flatten(node('home-hero-pet-name').props.style)).toMatchObject({ fontSize: 33, lineHeight: 44, includeFontPadding: false });
    expect(StyleSheet.flatten(node('home-hero-together-label').props.style)).toMatchObject({ fontSize: 14, lineHeight: 20 });
    expect(StyleSheet.flatten(node('home-hero-profile-info-label').props.style)).toMatchObject({ fontSize: 14, lineHeight: 20, textAlign: 'center' });
    expect(StyleSheet.flatten(node('home-hero-day-value').props.style)).toMatchObject({ fontSize: 25, lineHeight: 32, color: HOME_HERO_COLORS.ink });
    expect(StyleSheet.flatten(node('home-hero-name-balance').props.style)).toMatchObject({ width: 36, flexShrink: 0 });
    expect(StyleSheet.flatten(node('home-hero-pet-selector').props.style)).toMatchObject({ alignSelf: 'stretch', justifyContent: 'center' });
    expect(StyleSheet.flatten(node('home-hero-profile-edit').props.style)).toMatchObject({ minHeight: 51 });
    expect(JSON.stringify(renderer.toJSON())).not.toContain('medal-outline');
    expect(node('home-hero-title-art').props.source).toBe(require('../src/assets/activity/titles-v2/wk02.png'));
    expect(JSON.stringify(renderer.toJSON())).not.toContain('HomeFloatingWidgetSurface');
    node('home-hero-pet-selector').props.onPress();
    node('home-hero-profile-info').props.onPress();
    node('home-hero-profile-edit').props.onPress();
    expect(select).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledTimes(1);
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it('uses the exact vault artwork by stable ID and never gives an unknown title a fake sprout', async () => {
    await render();
    expect(node('home-hero-title-art').props.source).toBe(require('../src/assets/activity/titles-v2/wk02.png'));
    await act(async () => renderer.update(withTheme(<HomeHeroInfoPanel containerWidth={426} petTheme={buildPetThemePalette('#7D5CE4')} profilePetName="누리" titleBadge="서버의 새 칭호" titleBadgeKey="unknown_future" togetherDays={8} hasMultiplePets={false} onPressPetSelect={select} onPressProfileInfo={info} onPressPetProfileEdit={edit} />)));
    expect(renderer.root.findAllByProps({testID:'home-hero-title-art'})).toHaveLength(0);
    expect(JSON.stringify(renderer.toJSON())).toContain('서버의 새 칭호');
  });

  it.each([320,360,393,412,430])('retains readable discrete type and 48 dp actions at %s dp', async width => {
    await render(width, '아주오래함께한사랑스러운반려동물', '오랫동안 차곡차곡 쌓은 실제 칭호', 123456);
    expect(node('home-hero-pet-selector').props.accessibilityLabel).toContain('아주오래함께한사랑스러운반려동물');
    expect(node('home-hero-pet-name').props.numberOfLines).toBe(2);
    expect(node('home-hero-pet-name').props.ellipsizeMode).toBe('tail');
    expect(node('home-hero-pet-name').props.allowFontScaling).not.toBe(false);
    const row = StyleSheet.flatten(node('home-hero-profile-actions').props.style);
    expect(row.flexDirection).toBe('column');
    for (const id of ['home-hero-profile-info','home-hero-profile-edit']) {
      const style = StyleSheet.flatten(node(id).props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(48);
      expect(style.height).toBeUndefined();
    }
    expect(StyleSheet.flatten(node('home-hero-together-copy').props.style)).toMatchObject({ flexWrap: 'wrap', flexShrink: 1 });
    expect(node('home-hero-together').props.accessibilityLabel).toBe('함께한 시간 123,456일');
    const together = renderer.root.findAllByProps({ testID: 'home-hero-together' }).slice(-1)[0];
    expect(together.children.filter((x): x is Renderer.ReactTestInstance => typeof x !== 'string').map(x => x.props.testID)).toEqual([
      'home-hero-together-heart-leading', 'home-hero-together-copy', 'home-hero-together-heart-trailing',
    ]);
    for (const position of ['leading', 'trailing']) {
      const heart = renderer.root.findAllByProps({ testID: `home-hero-together-heart-${position}` }).slice(-1)[0];
      expect(heart.props).toMatchObject({
        pointerEvents: 'none', accessible: false, importantForAccessibility: 'no-hide-descendants',
      });
    }
  });

  it('does not invent a title or day count for missing data', async () => {
    await render(412, '반려동물', null, null);
    expect(renderer.root.findAllByProps({ testID: 'home-hero-title-badge' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'home-hero-together' })).toHaveLength(0);
    expect(StyleSheet.flatten(node('home-hero-title-slot').props.style).minHeight).toBe(28);
  });

  it.each([320, 360, 384, 412])('reserves two separate profile actions at %s dp', async width => {
    const name = '오래함께한반려동물';
    await render(width, name, '산책 새싹', 1234);
    expect(StyleSheet.flatten(node('home-hero-profile-actions').props.style).flexDirection).toBe('column');
    expect(node('home-hero-profile-info-label').props.allowFontScaling).not.toBe(false);
    expect(node('home-hero-profile-info-label').props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(node('home-hero-profile-info-label').props.style).fontSize).toBe(width <= 360 ? 12 : 14);
    expect(node('home-hero-profile-info').props.accessibilityLabel).toBe(`${name} 더 알아보기`);
    expect(node('home-hero-profile-edit').props.accessibilityLabel).toBe(`${name} 프로필 편집하기`);
    expect(StyleSheet.flatten(node('home-hero-profile-edit').props.style).minHeight).toBe(51);
  });

  it('sizes title artwork with the name without changing vertical spacing or duplicating the pill image', async () => {
    await render();
    const art = node('home-hero-title-art');
    expect(StyleSheet.flatten(art.props.style)).toMatchObject({ width: 36, height: 36 });
    expect(node('home-hero-title-badge').findAllByProps({ testID: 'home-hero-title-art' })).toHaveLength(0);
    expect(node('home-hero-name-balance').findAllByProps({ testID: 'home-hero-title-art' }).length).toBeGreaterThan(0);
    expect(StyleSheet.flatten(node('home-hero-name-trailing').props.style).width).toBe(36);
    expect(StyleSheet.flatten(node('home-hero-pet-selector').props.style)).toMatchObject({ minHeight: 48, marginTop: 8, gap: 8 });
    expect(StyleSheet.flatten(node('home-hero-together').props.style).marginTop).toBe(4);
    const name = StyleSheet.flatten(node('home-hero-pet-name').props.style);
    expect(name.textAlign).toBe('center');
    await act(async () => renderer.unmount());
    await render(360);
    expect(StyleSheet.flatten(node('home-hero-title-art').props.style)).toMatchObject({ width: 28, height: 28 });
    expect(StyleSheet.flatten(node('home-hero-name-trailing').props.style).width).toBe(28);
  });

  it('retains the glass information action and renders a dedicated edit CTA', async () => {
    await render();
    const infoGlass = node('home-hero-profile-info-glass');
    expect(StyleSheet.flatten(infoGlass.props.style)).toMatchObject({ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, marginTop: 0 });
    expect(StyleSheet.flatten(infoGlass.props.style).width).toBe('auto');
    expect(StyleSheet.flatten(node('home-hero-profile-actions').props.style).marginHorizontal).toBe(16);
    expect(node('home-hero-profile-edit').props.role).toBe('primary');
    expect(node('home-hero-profile-edit-label').props.children).toBe('프로필 편집하기');
    expect(renderer.root.findAllByProps({ name: 'edit-2' })).toHaveLength(0);
    await act(async () => node('home-hero-profile-info').props.onPress());
    await act(async () => node('home-hero-profile-edit').props.onPress());
    expect(info).toHaveBeenCalledTimes(1);
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it('uses the fixed reference palette without a pet or dark-theme branch', () => {
    expect(getHomeHeroColors()).toBe(HOME_HERO_COLORS);
    const source = fs.readFileSync(path.join(__dirname, '../src/theme/home/heroLayout.ts'), 'utf8');
    expect(source).not.toContain('theme.mode');
    expect(getHomeHeroTypography(360, '누리')).toMatchObject({ nameSize: 25, labelSize: 12, buttonSize: 12, valueSize: 21, badgeSize: 10, badgeLineHeight: 16 });
    expect(getHomeHeroTypography(384, '누리')).toMatchObject({ badgeSize: 12, badgeLineHeight: 16 });
    expect(getHomeHeroTypography(384, '아주오래함께한사랑스러운아이')).toMatchObject({ nameSize: 25, actionInset: 16 });
    expect(getHomeHeroTypography(384, '누리')).toMatchObject({ actionInset: 16, valueSize: 25 });
  });

  it.each<SeasonKey>(['spring','summer','autumn','winter'])('uses the live pet and %s without changing geometry', async season => {
    await render();
    expect(getHomeHeroSeasonCopy('누리', season)).toBe(`누리와 함께하는 ${{spring:'봄',summer:'여름',autumn:'가을',winter:'겨울'}[season]}`);
    expect(getHomeHeroSeasonCopy('몽실', season)).toContain('몽실과');
    expect(getHomeHeroTypography(426, '누리')).toEqual(getHomeHeroTypography(426, '누리'));
    await act(async () => renderer.update(withTheme(<HomeHeroContentSheet season={season}><HomeHeroInfoPanel containerWidth={426} petTheme={buildPetThemePalette('#22C55E')} profilePetName="누리" titleBadge="실제 칭호" togetherDays={8} hasMultiplePets={false} onPressPetSelect={select} onPressProfileInfo={info} onPressPetProfileEdit={edit} /></HomeHeroContentSheet>)));
    expect(StyleSheet.flatten(node('home-hero-day-value').props.style).color).toBe(HOME_HERO_COLORS.ink);
    expect(StyleSheet.flatten(node('home-hero-content-sheet').props.style).backgroundColor).toBe('transparent');
    expect(StyleSheet.flatten(node('home-hero-info').props.style).backgroundColor).toBe('transparent');
    expect(node('home-hero-pet-selector').props.disabled).toBe(true);
  });

  it('keeps a full-bleed photo and single-inset fold ahead of the unchanged lower Home', () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx'), 'utf8');
    const photo = fs.readFileSync(path.join(__dirname, '../src/screens/Main/components/LoggedInHome/HomeHeroPhotoBackground.tsx'), 'utf8');
    expect(source).not.toContain('useHomeHeroPhoto');
    expect(source).not.toContain('heroPhoto.aspectRatio');
    expect(source).not.toContain('<SeasonalHomeAutumnStage');
    expect(source).not.toContain('<HomeHeroPhotoStarlights');
    expect(source).not.toContain('<HomeHeroFooterOrnaments');
    expect(source).toContain('paddingHorizontal: 0');
    expect(source).toContain('paddingTop: 0');
    expect(source).toContain('heroColors.statusBar');
    expect(source).toContain('useContext(ToolbarHeightContext)');
    expect(source.indexOf('testID="home-hero-fold"')).toBeLessThan(source.indexOf('<HomeWeatherSection', source.indexOf('testID="home-hero-fold"')));
    expect(photo).not.toContain('Image.getSize');
    expect(photo).toContain('resizeMode="cover"');
    expect(source).toContain('onPressRegisterPhoto={activePetId ? onPressPetProfileEdit : undefined}');
    expect(source).toContain('onPressProfileInfo={openProfileInfoSheet}');
    expect(source).toContain('onPressPetProfileEdit={onPressPetProfileEdit}');
    expect(source).toContain('onSelect={onPressPetChip}');
  });
});
