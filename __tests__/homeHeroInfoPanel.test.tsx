import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { StyleSheet } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { HomeHeroInfoPanel, HomeHeroContentSheet } from '../src/screens/Main/components/LoggedInHome/HomeHeroInfoPanel';
import { buildPetThemePalette } from '../src/services/pets/themePalette';
import { getHomeHeroColors, getHomeHeroSeasonCopy, getHomeHeroTypography, HOME_HERO_COLORS, HOME_HERO_ACCENT } from '../src/theme/home/heroLayout';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');

describe('approved open Home Hero information', () => {
  let renderer: Renderer.ReactTestRenderer;
  const select = jest.fn(), info = jest.fn(), edit = jest.fn();
  const render = async (width = 426, name = '누리', badge: string | null = '산책 새싹', days: number | null = 8) => {
    await act(async () => {
      renderer = Renderer.create(
        <HomeHeroInfoPanel containerWidth={width} petTheme={buildPetThemePalette('#7D5CE4')}
          profilePetName={name} titleBadge={badge} togetherDays={days} hasMultiplePets
          onPressPetSelect={select} onPressProfileInfo={info} onPressPetProfileEdit={edit} />,
      );
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
    expect(StyleSheet.flatten(root.props.style)).toMatchObject({ width: '100%', paddingTop: 29, backgroundColor: HOME_HERO_COLORS.surface });
    expect(StyleSheet.flatten(node('home-hero-profile-actions').props.style)).toMatchObject({ flexDirection: 'row', marginHorizontal: 50, gap: 7 });
    expect(StyleSheet.flatten(node('home-hero-pet-name').props.style)).toMatchObject({ fontSize: 33, lineHeight: 44, includeFontPadding: false });
    expect(StyleSheet.flatten(node('home-hero-together-label').props.style)).toMatchObject({ fontSize: 14, lineHeight: 20 });
    expect(StyleSheet.flatten(node('home-hero-profile-info-label').props.style)).toMatchObject({ fontSize: 14, lineHeight: 20, textAlign: 'center' });
    expect(StyleSheet.flatten(node('home-hero-day-value').props.style)).toMatchObject({ fontSize: 25, lineHeight: 32, color: HOME_HERO_ACCENT.primary });
    expect(StyleSheet.flatten(node('home-hero-name-balance').props.style)).toMatchObject({ width: 24, flexShrink: 0 });
    expect(StyleSheet.flatten(node('home-hero-pet-selector').props.style)).toMatchObject({ alignSelf: 'stretch', justifyContent: 'center' });
    expect(StyleSheet.flatten(node('home-hero-profile-edit').props.style)).toMatchObject({ backgroundColor: HOME_HERO_ACCENT.editSurface, borderColor: HOME_HERO_ACCENT.border });
    expect(JSON.stringify(renderer.toJSON())).not.toContain('medal-outline');
    expect(JSON.stringify(renderer.toJSON())).toContain('sprout');
    expect(JSON.stringify(renderer.toJSON())).not.toContain('HomeFloatingWidgetSurface');
    node('home-hero-pet-selector').props.onPress();
    node('home-hero-profile-info').props.onPress();
    node('home-hero-profile-edit').props.onPress();
    expect(select).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledTimes(1);
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it.each([320,360,393,412,430])('retains readable discrete type and 48 dp actions at %s dp', async width => {
    await render(width, '아주오래함께한사랑스러운반려동물', '오랫동안 차곡차곡 쌓은 실제 칭호', 123456);
    expect(node('home-hero-pet-selector').props.accessibilityLabel).toContain('아주오래함께한사랑스러운반려동물');
    expect(node('home-hero-pet-name').props.numberOfLines).toBe(2);
    expect(node('home-hero-pet-name').props.ellipsizeMode).toBe('tail');
    expect(node('home-hero-pet-name').props.allowFontScaling).not.toBe(false);
    const row = StyleSheet.flatten(node('home-hero-profile-actions').props.style);
    const available = width - row.marginHorizontal * 2 - row.gap - 54;
    expect(available).toBeGreaterThan(140);
    for (const id of ['home-hero-profile-info','home-hero-profile-edit']) {
      const style = StyleSheet.flatten(node(id).props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(48);
      expect(style.height).toBeUndefined();
    }
    expect(StyleSheet.flatten(node('home-hero-together').props.style).flexWrap).toBe('wrap');
    expect(node('home-hero-together').props.accessibilityLabel).toBe('함께한 시간 123,456일');
  });

  it('does not invent a title or day count for missing data', async () => {
    await render(412, '반려동물', null, null);
    expect(renderer.root.findAllByProps({ testID: 'home-hero-title-badge' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'home-hero-together' })).toHaveLength(0);
    expect(StyleSheet.flatten(node('home-hero-title-slot').props.style).minHeight).toBe(28);
  });

  it('uses the fixed reference palette without a pet or dark-theme branch', () => {
    expect(getHomeHeroColors()).toBe(HOME_HERO_COLORS);
    const source = fs.readFileSync(path.join(__dirname, '../src/theme/home/heroLayout.ts'), 'utf8');
    expect(source).not.toContain('theme.mode');
    expect(getHomeHeroTypography(360, '누리')).toMatchObject({ nameSize: 25, labelSize: 12, buttonSize: 12, valueSize: 21, badgeSize: 10, badgeLineHeight: 16 });
    expect(getHomeHeroTypography(384, '누리')).toMatchObject({ badgeSize: 12, badgeLineHeight: 16 });
    expect(getHomeHeroTypography(384, '아주오래함께한사랑스러운아이')).toMatchObject({ nameSize: 25, actionInset: 16 });
    expect(getHomeHeroTypography(384, '누리')).toMatchObject({ actionInset: 50, valueSize: 25 });
  });

  it.each<SeasonKey>(['spring','summer','autumn','winter'])('uses the live pet and %s without changing geometry', async season => {
    await render();
    expect(getHomeHeroSeasonCopy('누리', season)).toBe(`누리와 함께하는 ${{spring:'봄',summer:'여름',autumn:'가을',winter:'겨울'}[season]}`);
    expect(getHomeHeroSeasonCopy('몽실', season)).toContain('몽실과');
    expect(getHomeHeroTypography(426, '누리')).toEqual(getHomeHeroTypography(426, '누리'));
    await act(async () => renderer.update(<HomeHeroContentSheet season={season}><HomeHeroInfoPanel containerWidth={426} petTheme={buildPetThemePalette('#22C55E')} profilePetName="누리" titleBadge="실제 칭호" togetherDays={8} hasMultiplePets={false} onPressPetSelect={select} onPressProfileInfo={info} onPressPetProfileEdit={edit} /></HomeHeroContentSheet>));
    expect(StyleSheet.flatten(node('home-hero-day-value').props.style).color).toBe(HOME_HERO_ACCENT.primary);
    expect(StyleSheet.flatten(node('home-hero-content-sheet').props.style).backgroundColor).toBe(HOME_HERO_COLORS.surface);
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
    expect(source).toContain('onPressProfileInfo={openProfileInfoSheet}');
    expect(source).toContain('onPressPetProfileEdit={onPressPetProfileEdit}');
    expect(source).toContain('onSelect={onPressPetChip}');
  });
});
