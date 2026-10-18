import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import React from 'react';
import * as ReactNative from 'react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import AppText from '../src/app/ui/AppText';
import { HOME_FLOATING_WIDGET_MATERIAL } from '../src/components/home/HomeWidgetMaterial';
import { buildPetThemePalette } from '../src/services/pets/themePalette';
import {
  HOME_SEASONAL_BACKGROUND_GRADIENTS,
  HOME_SEASONAL_BACKGROUND_LOCATIONS,
} from '../src/theme/home/seasonalAmbient';
import type { SeasonKey } from '../src/theme/seasonal/season';
import {
  HOME_HERO_PANEL_OVERLAP,
  HomeHeroContentSheet,
  HomeHeroInfoPanel,
} from '../src/screens/Main/components/LoggedInHome/HomeHeroInfoPanel';

jest.mock('../src/app/ui/AppText', () => 'AppText');

const homeSource = fs.readFileSync(
  path.join(
    __dirname,
    '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
  ),
  'utf8',
);
const panelPath = path.join(
  __dirname,
  '../src/screens/Main/components/LoggedInHome/HomeHeroInfoPanel.tsx',
);
const panelSource = fs.existsSync(panelPath)
  ? fs.readFileSync(panelPath, 'utf8')
  : '';

describe('approved Home Hero lower information sheet wiring', () => {
  it('places identity below the photo instead of painting it over the pet', () => {
    const stage = homeSource.slice(
      homeSource.indexOf('<SeasonalHomeAutumnStage'),
      homeSource.indexOf('</SeasonalHomeAutumnStage>'),
    );
    expect(stage).toContain('<HomeHeroPhotoBackground');
    expect(stage).not.toContain('<HomeHeroInfoPanel');
    expect(homeSource).toContain('<HomeHeroContentSheet');
    expect(homeSource).toContain('<HomeHeroInfoPanel');
    expect(homeSource).toContain('togetherDays={togetherDays}');
    expect(homeSource).toContain('onPressProfileInfo={openProfileInfoSheet}');
  });

  it('continues the same material through weather and the existing lower sections', () => {
    const sheet = homeSource.slice(
      homeSource.indexOf('<HomeHeroContentSheet'),
      homeSource.indexOf('</HomeHeroContentSheet>'),
    );
    expect(sheet).toContain('<HomeHeroInfoPanel');
    expect(sheet).toContain('<HomeWeatherSection');
    expect(sheet).toContain('{lowerHomeSections}');
    expect(sheet.indexOf('<HomeHeroInfoPanel')).toBeLessThan(
      sheet.indexOf('<HomeWeatherSection'),
    );
    expect(sheet).toContain('connectedToHero');
  });

  it('keeps the seasonal canvas and original hearts without the outer Hero glass', () => {
    expect(panelSource).toContain('HOME_SEASONAL_BACKGROUND_GRADIENTS[season]');
    expect(panelSource).not.toContain('HomeFrostedGlass');
    const canvas = panelSource.slice(panelSource.indexOf('export function HomeHeroContentSheet'), panelSource.indexOf('type Props ='));
    expect(canvas).not.toContain('HOME_FLOATING_WIDGET_MATERIAL');
    expect(panelSource).toContain('<NuriIcon name="heart"');
    expect(panelSource).not.toContain('name="heart-outline"');
    expect(panelSource).not.toContain('BlurView');
    expect(panelSource).not.toContain('HomeSectionGlass');
    expect(panelSource).toContain('<View testID="home-hero-info"');
  });

  it('uses a bounded wave transition instead of rounded-card corners', () => {
    expect(panelSource).toContain('HOME_HERO_PANEL_OVERLAP = 40');
    expect(panelSource).toContain('marginTop: -HOME_HERO_PANEL_OVERLAP');
    expect(panelSource).toContain('marginHorizontal: -16');
    expect(panelSource).toContain("width: 'auto'");
    expect(panelSource).not.toContain('borderTopLeftRadius: 28');
    expect(panelSource).not.toContain('borderTopRightRadius: 28');
    expect(panelSource).toContain('testID="home-hero-wave"');
  });

  it('keeps the background origin aligned after the wave consumes the photo overlap', () => {
    expect(homeSource).toContain('sectionOrigin={ambientContentY + ambientLowerY}');
    expect(homeSource).not.toContain('ambientLowerY - HOME_HERO_PANEL_OVERLAP');
    expect(panelSource.indexOf('testID="home-hero-wave"')).toBeLessThan(
      panelSource.indexOf('testID="home-hero-content-gradient"'),
    );
    expect(panelSource).not.toContain('MaskedView');
  });

  it('keeps the wave PNG reproducible from its checked source manifest', () => {
    const root = path.join(__dirname, '../src/assets/seasonal/home');
    const manifest: unknown = JSON.parse(fs.readFileSync(path.join(root, 'hero-wave-edge-v1.source.json'), 'utf8'));
    const hash = (file: string) => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    expect(manifest).toMatchObject({
      source: 'hero-wave-edge-v1.svg',
      asset: 'hero-wave-edge-v1.png',
      source_sha256: hash('hero-wave-edge-v1.svg'),
      asset_sha256: hash('hero-wave-edge-v1.png'),
      intrinsic_size: { width: 1600, height: 160 },
      bottom_row_opaque: true,
      generated_design_ornaments_imported: false,
    });
  });

  it('keeps compact identity above only the two profile actions', () => {
    expect(panelSource).toContain('testID="home-hero-footer"');
    expect(panelSource).toContain('testID="home-hero-together"');
    expect(panelSource).toContain("justifyContent: 'space-between'");
    expect(panelSource).toContain('testID="home-hero-identity"');
    expect(panelSource).not.toContain('testID="home-hero-memory"');
    expect(homeSource).not.toContain('buildHomeHeroMemoryChip');
    expect(homeSource).not.toContain('heroMemoryChip={');
    expect(panelSource).toContain("flexWrap: 'wrap'");
    expect(panelSource.match(/<NuriIcon name="heart"/g)).toHaveLength(2);
    expect(panelSource).toContain('togetherDays.toLocaleString');
    expect(panelSource).toContain('onPress={onPressPetSelect}');
    expect(panelSource).toContain('onPress={onPressProfileInfo}');
    expect(panelSource).not.toContain('3,517');
  });
});

describe('Home Hero lower panel presentation and actions', () => {
  const theme = createTheme('light');
  const petTheme = buildPetThemePalette('#22C55E');
  const onPressPetSelect = jest.fn();
  const onPressProfileInfo = jest.fn();
  const onPressPetProfileEdit = jest.fn();
  const renderers: TestRenderer.ReactTestRenderer[] = [];

  async function renderPanel(
    overrides: Partial<React.ComponentProps<typeof HomeHeroInfoPanel>> = {},
  ) {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={theme}>
          <HomeHeroInfoPanel
            petTheme={petTheme}
            profilePetName="누리"
            titleBadge="산책 새싹"
            togetherDays={3517}
            hasMultiplePets
            onPressPetSelect={onPressPetSelect}
            onPressProfileInfo={onPressProfileInfo}
            onPressPetProfileEdit={onPressPetProfileEdit}
            {...overrides}
          />
        </ThemeProvider>,
      );
      renderers.push(renderer);
    });
    return renderer!;
  }

  it('places the temporary Walk QA entry directly below more information', async () => {
    const renderer = await renderPanel({
      walkQaEntry: <View testID="walk-home-entry-probe" />,
    });
    const actions = renderer.root.findAllByProps({
      testID: 'home-hero-profile-actions',
    }).slice(-1)[0];
    const ids = actions.children
      .filter((child): child is TestRenderer.ReactTestInstance => typeof child !== 'string')
      .map(child => child.props.testID);
    expect(ids).toEqual([
      'home-hero-profile-info',
      'walk-home-entry-probe',
      'home-hero-profile-edit',
    ]);
  });

  beforeEach(() => {
    jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
      width: 384,
      height: 800,
      scale: 3,
      fontScale: 1,
    });
    onPressPetSelect.mockClear();
    onPressProfileInfo.mockClear();
    onPressPetProfileEdit.mockClear();
  });
  afterEach(async () => {
    for (const renderer of renderers.splice(0)) {
      await act(async () => renderer.unmount());
    }
    jest.restoreAllMocks();
  });

  it('keeps only the two profile CTAs without a record row or replacement prompt', async () => {
    const renderer = await renderPanel();
    const footer = renderer.root.findByProps({ testID: 'home-hero-footer' });
    expect(footer.findAllByType(TouchableOpacity).map(node => node.props.testID)).toEqual([
      'home-hero-profile-info', 'home-hero-profile-edit',
    ]);
    expect(renderer.root.findAllByProps({ testID: 'home-hero-memory' })).toHaveLength(0);
    expect(renderer.root.findAllByType(AppText).some(node =>
      typeof node.props.children === 'string' &&
      /건강 기록이 있어요|오늘의 첫 순간/.test(node.props.children),
    )).toBe(false);
  });

  it('keeps only the profile action group without reserving the removed record height', async () => {
    const renderer = await renderPanel();
    const footer = renderer.root.findAll(node =>
      typeof node.type === 'string' && node.props.testID === 'home-hero-footer',
    )[0];
    expect(footer).toBeDefined();
    const children = footer.children.filter(child => typeof child !== 'string');
    expect(children.map(child => child.props.testID)).toEqual(['home-hero-profile-actions']);
    for (const id of ['home-hero-info', 'home-hero-footer']) {
      const style = StyleSheet.flatten(renderer.root.findByProps({ testID: id }).props.style);
      expect(style).not.toHaveProperty('height');
      expect(style).not.toHaveProperty('minHeight');
    }
  });

  it.each<SeasonKey>(['spring', 'summer', 'autumn', 'winter'])(
    'keeps the %s continuous gradient with a shallow full-width wave',
    async season => {
      let renderer: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeHeroContentSheet season={season}>
            <View testID="identity-probe" />
            <TouchableOpacity
              testID="weather-probe"
              onPress={onPressProfileInfo}
            />
            <View testID="lower-sections-probe" />
          </HomeHeroContentSheet>,
        );
        renderers.push(renderer);
      });
      const gradient = renderer!.root.findByType(LinearGradient);
      expect(gradient.props.colors).toEqual([
        ...HOME_SEASONAL_BACKGROUND_GRADIENTS[season],
      ]);
      expect(gradient.props.locations).toEqual([
        ...HOME_SEASONAL_BACKGROUND_LOCATIONS,
      ]);
      const wave = renderer!.root.findAllByProps({ testID: 'home-hero-wave' })[0];
      expect(wave).toBeDefined();
      expect(wave.props.resizeMode).toBe('stretch');
      expect(wave.props.tintColor).toBe(HOME_SEASONAL_BACKGROUND_GRADIENTS[season][0]);
      expect(wave.props.pointerEvents).toBe('none');
      expect(wave.props.accessible).toBe(false);
      expect(wave.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(StyleSheet.flatten(wave.props.style)).toMatchObject({
        width: '100%', height: 40,
      });
      const sheet = renderer!.root.findByProps({ testID: 'home-hero-content-sheet' });
      const style = StyleSheet.flatten(sheet.props.style);
      expect(HOME_HERO_PANEL_OVERLAP).toBe(40);
      expect(style).toMatchObject({
        width: 'auto',
        marginHorizontal: -16,
        marginTop: -40,
        borderWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      });
      expect(style).not.toHaveProperty('borderTopLeftRadius');
      expect(style).not.toHaveProperty('borderTopRightRadius');
      expect(style).not.toHaveProperty('backgroundColor');
      expect(StyleSheet.flatten(gradient.props.style)).toMatchObject({
        paddingHorizontal: 16,
        backgroundColor: HOME_SEASONAL_BACKGROUND_GRADIENTS[season][0],
      });
      expect(sheet.props.pointerEvents).toBe('box-none');
      renderer!.root.findByProps({ testID: 'weather-probe' }).props.onPress();
      expect(onPressProfileInfo).toHaveBeenCalledTimes(1);
      expect(
        renderer!.root.findByProps({ testID: 'lower-sections-probe' }),
      ).toBeDefined();
    },
  );

  it.each<SeasonKey>(['spring', 'summer', 'autumn', 'winter'])(
    'shows the top autumn ornaments only in autumn, not other seasons: %s',
    async season => {
      let renderer: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeHeroContentSheet season={season}>
            <View testID="identity-probe" />
          </HomeHeroContentSheet>,
        );
        renderers.push(renderer);
      });
      const ornaments = renderer!.root.findAll(node =>
        typeof node.type === 'string' &&
        node.props.testID === 'home-hero-autumn-ornaments',
      );
      expect(ornaments).toHaveLength(season === 'autumn' ? 1 : 0);
    },
  );

  it('anchors non-interactive glass ornaments above the information without adding layout height', async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <HomeHeroContentSheet season="autumn">
          <View testID="identity-probe" />
          <TouchableOpacity testID="weather-probe" onPress={onPressProfileInfo} />
        </HomeHeroContentSheet>,
      );
      renderers.push(renderer);
    });
    const overlay = renderer!.root.findAll(node =>
      typeof node.type === 'string' &&
      node.props.testID === 'home-hero-autumn-ornaments',
    )[0];
    expect(overlay).toBeDefined();
    expect(overlay.props).toMatchObject({
      pointerEvents: 'none',
      accessible: false,
      importantForAccessibility: 'no-hide-descendants',
    });
    const overlayStyle = StyleSheet.flatten(overlay.props.style);
    expect(overlayStyle).toMatchObject({ position: 'absolute', left: 0, right: 0, top: 0, height: 40 });
    const left = overlay.findByProps({ testID: 'home-hero-wave-left-ornaments' });
    expect(StyleSheet.flatten(left.props.style)).toMatchObject({ top: -40 });
    expect(overlay.findByProps({ testID: 'home-hero-wave-right-ornaments' })).toBeDefined();
    const images = overlay.findAllByType(ReactNative.Image);
    expect(images.map(node => node.props.testID)).toEqual([
      'home-hero-glass-leaves',
      'home-hero-glass-pearl',
      'home-hero-starlight-upper',
      'home-hero-starlight-lower',
      'home-hero-starlight-left-edge',
      'home-hero-glass-maple',
      'home-hero-starlight-right-upper',
      'home-hero-starlight-right-lower',
    ]);
    expect(images.map(node => node.props.source)).toEqual([
      require('../src/assets/seasonal/home/autumn/glass/autumn-glass-hero-leaf-cluster-v1.png'),
      require('../src/assets/seasonal/home/autumn/glass/autumn-glass-pearl-apricot-v1.png'),
      require('../src/assets/seasonal/home/autumn/glass/autumn-starlight-four-point-v1.png'),
      require('../src/assets/seasonal/home/autumn/glass/autumn-starlight-four-point-v1.png'),
      require('../src/assets/seasonal/home/autumn/glass/autumn-starlight-four-point-v1.png'),
      require('../src/assets/seasonal/home/autumn/glass/autumn-glass-maple-coral-v1.png'),
      require('../src/assets/seasonal/home/autumn/glass/autumn-starlight-four-point-v1.png'),
      require('../src/assets/seasonal/home/autumn/glass/autumn-starlight-four-point-v1.png'),
    ]);
    for (const image of images) {
      expect(image.props).toMatchObject({
        resizeMode: 'contain',
        resizeMethod: 'resize',
        pointerEvents: 'none',
        accessible: false,
        importantForAccessibility: 'no-hide-descendants',
        fadeDuration: 0,
      });
      expect(image.props.tintColor).toBeUndefined();
      const style = StyleSheet.flatten(image.props.style);
      expect(style.position).toBe('absolute');
      expect(style.width).toBeLessThanOrEqual(108);
      expect(style.height).toBeLessThanOrEqual(102);
      expect(style.top + style.height).toBeLessThanOrEqual(106);
    }
    const sheet = renderer!.root.findByProps({ testID: 'home-hero-content-sheet' });
    expect(StyleSheet.flatten(sheet.props.style).overflow).toBe('visible');
    expect(StyleSheet.flatten(sheet.props.style)).not.toHaveProperty('height');
    const body = renderer!.root.findByType(LinearGradient);
    expect(StyleSheet.flatten(body.props.style)).toMatchObject({ paddingHorizontal: 16 });
    expect(StyleSheet.flatten(body.props.style)).not.toHaveProperty('paddingTop');
    renderer!.root.findByProps({ testID: 'weather-probe' }).props.onPress();
    expect(onPressProfileInfo).toHaveBeenCalledTimes(1);
  });

  it('preserves the generated PNG bytes and documents all three runtime copies', () => {
    const assetRoot = path.join(__dirname, '../src/assets/seasonal/home/autumn/glass');
    const manifestPath = path.join(assetRoot, 'autumn-glass-hero-top-v1.source.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const files = [
      'autumn-glass-hero-leaf-cluster-v1.png',
      'autumn-glass-pearl-apricot-v1.png',
      'autumn-starlight-four-point-v1.png',
    ];
    const sourceRoot = path.join(__dirname, '../output/imagegen/nuri-autumn-glass-v1-20261017');
    const hash = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    expect(manifest).toMatchObject({
      classification: 'CURRENT_DESIGN_REFERENCE',
      status: 'METRO_CANDIDATE_PENDING_PO_VISUAL_REVIEW',
      season: 'autumn',
      source_bytes_preserved: true,
      assets: files.map(file => ({
        file,
        sha256: hash(path.join(sourceRoot, file)),
        source: `../../../../../../output/imagegen/nuri-autumn-glass-v1-20261017/${file}`,
      })),
    });
    for (const file of files) {
      expect(hash(path.join(assetRoot, file))).toBe(hash(path.join(sourceRoot, file)));
    }
    expect(panelSource).not.toContain("require('../../../../../output/");
    expect(panelSource).not.toContain('autumn-glass-acorn-pair-v1.png');
  });

  it('keeps the footer ornaments between the profile action and weather without changing the 52 dp gap', () => {
    const panel = homeSource.indexOf('<HomeHeroInfoPanel');
    const footer = homeSource.indexOf('<HomeHeroFooterOrnaments', panel);
    const weather = homeSource.indexOf('<HomeWeatherSection', panel);
    expect(footer).toBeGreaterThan(panel);
    expect(footer).toBeLessThan(weather);
    expect(homeSource.slice(footer, weather)).toContain('season={ambientSeason}');
  });

  it('places the actual together time inline under pet metadata and outside the action footer', async () => {
    const renderer = await renderPanel();
    const identity = renderer.root.findByProps({ testID: 'home-hero-identity' });
    const row = identity.findByProps({ testID: 'home-hero-together' });
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    });
    expect(renderer.root.findByProps({ testID: 'home-hero-footer' }).findAllByProps({ testID: 'home-hero-together' })).toHaveLength(0);
    expect(row.props.accessibilityLabel).toBe('함께한 시간 3,517일');
    const hearts = renderer.root.findAll(node => node.props.name === 'heart');
    expect(hearts).toHaveLength(2);
    for (const heart of hearts) {
      expect(heart.props).toMatchObject({ name: 'heart', size: 14 });
      expect(heart.props.colorMode).toBeUndefined();
      expect(heart.props.color).toBeUndefined();
    }
    expect(
      renderer.root
        .findAllByType(AppText)
        .some(
          node =>
            Array.isArray(node.props.children) &&
            node.props.children[0] === '3,517',
        ),
    ).toBe(true);
    const days = row.findAllByType(AppText).find(node => Array.isArray(node.props.children) && node.props.children[0] === '3,517');
    expect(StyleSheet.flatten(days?.props.style)).toMatchObject({ fontSize: 13, lineHeight: 18 });
  });

  it('removes the outer identity glass while preserving its full-width content inset', async () => {
    const renderer = await renderPanel();
    const card = renderer.root.findAll(node => node.type === View && node.props.testID === 'home-hero-info')[0];
    expect(card).toBeDefined();
    expect(StyleSheet.flatten(card.props.style)).toMatchObject({
      width: 'auto',
      marginHorizontal: -16,
      marginTop: 0,
      paddingHorizontal: 30,
      paddingTop: 18,
      paddingBottom: 18,
    });
    const fills = card.findAll(node => node.type === View && node.props.testID === 'home-reflective-fill');
    expect(fills).toHaveLength(0);
    for (const id of ['home-hero-title-badge', 'home-hero-pet-selector', 'home-hero-together', 'home-hero-profile-info']) {
      expect(card.findByProps({ testID: id })).toBeDefined();
    }
    expect(card.findAllByProps({ testID: 'home-reflective-glass-reflection' })).toHaveLength(0);
    expect(card.findAllByProps({ testID: 'home-reflective-glass-glint' })).toHaveLength(0);
    const cardStyle = StyleSheet.flatten(card.props.style);
    expect(cardStyle.backgroundColor).toBeUndefined();
    expect(cardStyle.borderColor).toBeUndefined();
    expect(cardStyle.marginHorizontal + cardStyle.paddingHorizontal).toBe(14);
  });

  it('stacks the glass profile actions one full-width button per line', async () => {
    const renderer = await renderPanel();
    const footer = renderer.root.findByProps({ testID: 'home-hero-footer' });
    expect(StyleSheet.flatten(footer.props.style)).toMatchObject({
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 10,
    });
    const row = renderer.root.findByProps({ testID: 'home-hero-profile-actions' });
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({ flexDirection: 'column', alignItems: 'stretch', gap: 10 });
    for (const id of ['home-hero-profile-info', 'home-hero-profile-edit']) {
      const action = row.findByProps({ testID: id });
      expect(StyleSheet.flatten(action.props.style)).toMatchObject({
        ...HOME_FLOATING_WIDGET_MATERIAL,
        width: '100%', minWidth: 0, minHeight: 48, justifyContent: 'space-between',
      });
      expect(StyleSheet.flatten(action.props.style)).not.toHaveProperty('flex');
      const text = action.findAllByType(AppText)[0];
      expect(StyleSheet.flatten(text.props.style)).toMatchObject({ fontSize: 12, lineHeight: 18, textAlign: 'center' });
      expect(text.props.numberOfLines).toBeUndefined();
    }
    row.findByProps({ testID: 'home-hero-profile-edit' }).props.onPress();
    expect(onPressPetProfileEdit).toHaveBeenCalledTimes(1);
    expect(onPressProfileInfo).not.toHaveBeenCalled();
    expect(onPressPetSelect).not.toHaveBeenCalled();
    const actionText = renderer.root
      .findAllByType(AppText)
      .find(
        node =>
          Array.isArray(node.props.children) &&
          node.props.children.includes(' 더 알아보기'),
      );
    expect(actionText).toBeDefined();
    expect(StyleSheet.flatten(actionText?.props.style).textAlign).toBe('center');
    expect(footer.findAllByProps({ testID: 'home-hero-action-divider' })).toHaveLength(0);
  });

  it('labels the existing edit action as profile editing in visible and accessible copy', async () => {
    const renderer = await renderPanel();
    const action = renderer.root.findByProps({ testID: 'home-hero-profile-edit' });
    expect(action.findAllByType(AppText)[0].props.children).toBe('프로필 수정하기');
    expect(action.props.accessibilityLabel).toBe('누리 프로필 수정하기');
    expect(action.props.onPress).toBe(onPressPetProfileEdit);
  });

  it('centers both labels within equal leading and trailing icon slots', async () => {
    const renderer = await renderPanel();
    for (const id of ['home-hero-profile-info', 'home-hero-profile-edit']) {
      const button = renderer.root.findByProps({ testID: id });
      const leading = button.findByProps({ testID: `${id}-leading` });
      const trailing = button.findByProps({ testID: `${id}-trailing` });
      const leadingStyle = StyleSheet.flatten(leading.props.style);
      expect(leadingStyle).toMatchObject({ width: 20, height: 20, flexShrink: 0 });
      expect(StyleSheet.flatten(trailing.props.style)).toEqual(leadingStyle);
      const label = button.findAllByType(AppText)[0];
      expect(StyleSheet.flatten(label.props.style)).toMatchObject({
        flex: 1,
        minWidth: 0,
        textAlign: 'center',
      });
      expect(label.props.numberOfLines).toBeUndefined();
      expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(48);
    }
  });

  it('opens pet selection from the name while preserving the introduction callback', async () => {
    const renderer = await renderPanel();
    for (const id of ['home-hero-pet-selector', 'home-hero-profile-info']) {
      const action = renderer.root.findByProps({ testID: id });
      expect(action.props.accessibilityRole).toBe('button');
      expect(
        StyleSheet.flatten(action.props.style).minHeight,
      ).toBeGreaterThanOrEqual(48);
      action.props.onPress();
    }
    expect(onPressPetSelect).toHaveBeenCalledTimes(1);
    expect(onPressProfileInfo).toHaveBeenCalledTimes(1);
    const selector = renderer.root.findByProps({ testID: 'home-hero-pet-selector' });
    expect(selector.props.accessibilityLabel).toBe('누리, 아이 선택');
    expect(selector.findAll(node => node.props.name === 'chevron-down').length).toBeGreaterThan(0);
    expect(renderer.root.findByProps({ testID: 'home-hero-profile-edit' }).props.onPress).toBe(onPressPetProfileEdit);
  });

  it('keeps a single pet identity readable without a false selection affordance', async () => {
    const renderer = await renderPanel({ hasMultiplePets: false });
    const selector = renderer.root.findByProps({ testID: 'home-hero-pet-selector' });
    expect(selector.props.disabled).toBe(true);
    expect(selector.props.accessibilityRole).toBeUndefined();
    expect(selector.props.accessibilityLabel).toBe('누리');
    expect(selector.findAll(node => node.props.name === 'chevron-down')).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'home-hero-profile-info' }).props.disabled).not.toBe(true);
  });

  it('shows the title icon and text without a background or border', async () => {
    const renderer = await renderPanel();
    const badge = renderer.root.findByProps({
      testID: 'home-hero-title-badge',
    });
    expect(
      StyleSheet.flatten(badge.props.style).backgroundColor,
    ).toBeUndefined();
    expect(StyleSheet.flatten(badge.props.style).borderColor).toBeUndefined();
    expect(StyleSheet.flatten(badge.props.style).borderWidth).toBe(0);
    expect(
      renderer.root
        .findAllByType(AppText)
        .some(node => node.props.children === '산책 새싹'),
    ).toBe(true);
  });

  it('joins the title and name with a middle dot inside the existing profile-edit action', async () => {
    const renderer = await renderPanel();
    const action = renderer.root.findByProps({ testID: 'home-hero-pet-selector' });
    expect(action.findByProps({ testID: 'home-hero-title-badge' })).toBeDefined();
    expect(action.findAllByType(AppText).map(node => node.props.children)).toEqual(['산책 새싹', '·', '누리']);
    expect(StyleSheet.flatten(action.props.style).flexWrap).toBe('wrap');
    const separator = action.findByProps({ testID: 'home-hero-title-separator' });
    expect(separator.props.accessible).toBe(false);
  });

  it('matches the title typography and medal size to the pet name', async () => {
    const renderer = await renderPanel();
    const action = renderer.root.findByProps({ testID: 'home-hero-pet-selector' });
    const texts = action.findAllByType(AppText);
    const title = texts.find(node => node.props.children === '산책 새싹');
    const name = texts.find(node => node.props.children === '누리');
    const nameStyle = StyleSheet.flatten(name?.props.style);
    expect(StyleSheet.flatten(title?.props.style)).toMatchObject({
      fontSize: nameStyle.fontSize,
      lineHeight: nameStyle.lineHeight,
      fontWeight: nameStyle.fontWeight,
    });
    const medals = action.findAll(node => node.props.name === 'medal-outline');
    expect(medals.length).toBeGreaterThan(0);
    for (const medal of medals) expect(medal.props.size).toBe(nameStyle.fontSize);
  });

  it('keeps the identity group and CTA labels centered', async () => {
    const renderer = await renderPanel();
    const identity = renderer.root.findByProps({ testID: 'home-hero-identity' });
    expect(StyleSheet.flatten(identity.props.style).alignItems).toBe('center');
    const name = identity.findByProps({ testID: 'home-hero-pet-selector' });
    expect(StyleSheet.flatten(name.props.style)).toMatchObject({ alignSelf: 'center', justifyContent: 'center' });
    expect(StyleSheet.flatten(name.findByProps({ testID: 'home-hero-title-badge' }).props.style).alignSelf).toBe('center');
    expect(identity.findAllByType(AppText).some(node => node.props.children === '아이 정보를 채우면 더 예쁘게 보여요')).toBe(false);
    expect(StyleSheet.flatten(identity.findByProps({ testID: 'home-hero-together' }).props.style).justifyContent).toBe('center');
    expect(StyleSheet.flatten(renderer.root.findByProps({ testID: 'home-hero-profile-info' }).props.style).justifyContent).toBe('space-between');
  });

  it('brings together time 4 dp closer without shrinking the profile-edit target', async () => {
    const renderer = await renderPanel();
    const identity = renderer.root.findByProps({ testID: 'home-hero-identity' });
    const together = identity.findByProps({ testID: 'home-hero-together' });
    expect(StyleSheet.flatten(identity.props.style).gap).toBe(0);
    expect(StyleSheet.flatten(together.props.style).marginTop).toBe(-4);
    expect(together.props.pointerEvents).toBe('none');
    expect(together.props.accessible).toBe(true);
    expect(StyleSheet.flatten(identity.findByProps({ testID: 'home-hero-pet-selector' }).props.style).minHeight).toBe(48);
  });

  it('keeps both CTAs arrow-free while retaining the pet selection chevron', async () => {
    const renderer = await renderPanel();
    for (const id of ['home-hero-profile-info', 'home-hero-profile-edit']) {
      const button = renderer.root.findByProps({ testID: id });
      expect(button.findAll(node => /^chevron-/.test(String(node.props.name)))).toHaveLength(0);
      expect(button.findByProps({ testID: `${id}-trailing` }).props.children).toBeUndefined();
    }
    const selector = renderer.root.findByProps({ testID: 'home-hero-pet-selector' });
    const arrow = selector.findAll(node => node.props.name === 'chevron-down')[0];
    expect(arrow.props.size).toBe(18);
    expect(arrow.props.accessible).toBe(false);
  });

  it('uses the quick-record widget material and reflections on each button without separator rules', async () => {
    const renderer = await renderPanel();
    expect(panelSource).not.toContain('styles.divider');
    expect(panelSource).not.toContain('styles.actionDivider');
    for (const [id, prefix] of [
      ['home-hero-profile-info', 'home-hero-profile-glass'],
      ['home-hero-profile-edit', 'home-hero-edit-glass'],
    ]) {
      const button = renderer.root.findByProps({ testID: id });
      expect(StyleSheet.flatten(button.props.style)).toMatchObject({
        ...HOME_FLOATING_WIDGET_MATERIAL,
        minHeight: 48,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 12,
        overflow: 'hidden',
      });
      expect(StyleSheet.flatten(button.props.style).width).toBe('100%');
      for (const effect of ['reflection', 'glint']) {
        const decoration = button.findByProps({ testID: `${prefix}-${effect}` });
        expect(decoration.props.pointerEvents).toBe('none');
        expect(decoration.props.accessible).toBe(false);
        expect(decoration.props.importantForAccessibility).toBe('no-hide-descendants');
      }
    }
  });

  it('does not invent a badge, metadata or day total when source information is missing', async () => {
    const renderer = await renderPanel({
      titleBadge: null,
      togetherDays: null,
    });
    expect(
      renderer.root.findAllByProps({ testID: 'home-hero-title-badge' }),
    ).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'home-hero-title-separator' })).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'home-hero-together' }),
    ).toHaveLength(0);
    expect(
      renderer.root
        .findAllByType(AppText)
        .some(
          node => node.props.children === '아이 정보를 채우면 더 예쁘게 보여요',
        ),
    ).toBe(false);
  });

  it.each(
    [320, 384, 430].flatMap(width =>
      [1, 1.3].map(fontScale => ({ width, fontScale })),
    ),
  )(
    'keeps small scalable text and flexible rows at $width dp / $fontScale',
    async ({ width, fontScale }) => {
      jest
        .spyOn(ReactNative, 'useWindowDimensions')
        .mockReturnValue({ width, height: 800, scale: 3, fontScale });
      const longName = '아주아주 긴 이름을 가진 우리 집 사랑스러운 누리';
      const renderer = await renderPanel({
        profilePetName: longName,
        togetherDays: 123456,
      });
      const texts = renderer.root.findAllByType(AppText);
      const name = texts.find(node => node.props.children === longName);
      expect(name).toBeDefined();
      expect(StyleSheet.flatten(name?.props.style)).toMatchObject({
        fontSize: 20,
        lineHeight: 28,
        flexShrink: 1,
      });
      for (const text of texts) {
        expect(text.props.allowFontScaling).not.toBe(false);
        expect(text.props.numberOfLines).toBeUndefined();
        expect(
          StyleSheet.flatten(text.props.style).fontSize,
        ).toBeLessThanOrEqual(20);
      }
      expect(
        renderer.root.findByProps({ testID: 'home-hero-together' }).props
          .accessibilityLabel,
      ).toBe('함께한 시간 123,456일');
    },
  );
});
