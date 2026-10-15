import fs from 'node:fs';
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

  it('keeps the seasonal canvas and original heart while grouping identity in the shared Home glass', () => {
    expect(panelSource).toContain('HOME_SEASONAL_BACKGROUND_GRADIENTS[season]');
    expect(panelSource).not.toContain('HomeFrostedGlass');
    const canvas = panelSource.slice(panelSource.indexOf('export function HomeHeroContentSheet'), panelSource.indexOf('type Props ='));
    expect(canvas).not.toContain('HOME_FLOATING_WIDGET_MATERIAL');
    expect(panelSource).toContain('<NuriIcon name="heart"');
    expect(panelSource).not.toContain('name="heart-outline"');
    expect(panelSource).not.toContain('BlurView');
    expect(panelSource).toContain('<HomeSectionGlass testID="home-hero-info"');
  });

  it('uses only top round corners and a bounded overlap, without a floating bottom edge', () => {
    expect(panelSource).toContain('HOME_HERO_PANEL_OVERLAP = 40');
    expect(panelSource).toContain('marginTop: -HOME_HERO_PANEL_OVERLAP');
    expect(panelSource).toContain('marginHorizontal: -16');
    expect(panelSource).toContain("width: 'auto'");
    expect(panelSource).toContain('borderBottomLeftRadius: 0');
    expect(panelSource).toContain('borderBottomRightRadius: 0');
  });

  it('keeps compact identity above the record and profile actions', () => {
    expect(panelSource).toContain('testID="home-hero-footer"');
    expect(panelSource).toContain('testID="home-hero-together"');
    expect(panelSource).toContain("justifyContent: 'space-between'");
    expect(panelSource).toContain('testID="home-hero-identity"');
    expect(panelSource).toContain('testID="home-hero-memory"');
    expect(panelSource).toContain("flexWrap: 'wrap'");
    expect(panelSource.match(/<NuriIcon name="heart"/g)).toHaveLength(2);
    expect(panelSource).toContain('togetherDays.toLocaleString');
    expect(panelSource).toContain('onPress={onPressPetProfileEdit}');
    expect(panelSource).toContain('onPress={onPressProfileInfo}');
    expect(panelSource).not.toContain('3,517');
  });
});

describe('Home Hero lower panel presentation and actions', () => {
  const theme = createTheme('light');
  const petTheme = buildPetThemePalette('#22C55E');
  const onPressPetProfileEdit = jest.fn();
  const onPressProfileInfo = jest.fn();
  const onPressMemoryChip = jest.fn();
  const onPressCreateMemory = jest.fn();
  const heroMemoryChip = {
    recordId: 'latest-health-memory',
    label: '7일 전, 누리의 건강 기록이 있어요',
    accessibilityLabel: '7일 전, 누리의 건강 기록이 있어요, 기록 상세 보기',
  };
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
            heroMemoryChip={heroMemoryChip}
            onPressPetProfileEdit={onPressPetProfileEdit}
            onPressProfileInfo={onPressProfileInfo}
            onPressMemoryChip={onPressMemoryChip}
            onPressCreateMemory={onPressCreateMemory}
            {...overrides}
          />
        </ThemeProvider>,
      );
      renderers.push(renderer);
    });
    return renderer!;
  }

  beforeEach(() => {
    jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
      width: 384,
      height: 800,
      scale: 3,
      fontScale: 1,
    });
    onPressPetProfileEdit.mockClear();
    onPressProfileInfo.mockClear();
    onPressMemoryChip.mockClear();
    onPressCreateMemory.mockClear();
  });
  afterEach(async () => {
    for (const renderer of renderers.splice(0)) {
      await act(async () => renderer.unmount());
    }
    jest.restoreAllMocks();
  });

  it.each<SeasonKey>(['spring', 'summer', 'autumn', 'winter'])(
    'uses the existing %s gradient with identical full-width top-only rounding',
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
      const style = StyleSheet.flatten(gradient.props.style);
      expect(HOME_HERO_PANEL_OVERLAP).toBe(40);
      expect(style).toMatchObject({
        width: 'auto',
        marginHorizontal: -16,
        marginTop: -40,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      });
      expect(gradient.props.pointerEvents).toBe('box-none');
      renderer!.root.findByProps({ testID: 'weather-probe' }).props.onPress();
      expect(onPressProfileInfo).toHaveBeenCalledTimes(1);
      expect(
        renderer!.root.findByProps({ testID: 'lower-sections-probe' }),
      ).toBeDefined();
    },
  );

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

  it('extends only the identity glass to the sheet edges while preserving its content inset', async () => {
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
      borderRadius: 22,
      borderWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
    });
    const fills = card.findAll(node => node.type === View && node.props.testID === 'home-reflective-fill');
    expect(fills).toHaveLength(1);
    expect(StyleSheet.flatten(fills[0].props.style)).toMatchObject(HOME_FLOATING_WIDGET_MATERIAL);
    expect(fills[0].props.pointerEvents).toBe('none');
    expect(fills[0].props.accessible).toBe(false);
    for (const id of ['home-hero-title-badge', 'home-hero-profile-edit', 'home-hero-together', 'home-hero-profile-info']) {
      expect(card.findByProps({ testID: id })).toBeDefined();
    }
    expect(card.findAllByProps({ testID: 'home-reflective-glass-reflection' })).toHaveLength(1);
    expect(card.findAllByProps({ testID: 'home-reflective-glass-glint' })).toHaveLength(1);
    const cardStyle = StyleSheet.flatten(card.props.style);
    expect(cardStyle.marginHorizontal + cardStyle.paddingHorizontal).toBe(14);
  });

  it('stacks the two actions in full-width rows instead of equal-width columns', async () => {
    const renderer = await renderPanel();
    const footer = renderer.root.findByProps({ testID: 'home-hero-footer' });
    expect(StyleSheet.flatten(footer.props.style)).toMatchObject({
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 10,
    });
    const action = renderer.root.findByProps({
      testID: 'home-hero-profile-info',
    });
    expect(StyleSheet.flatten(action.props.style)).toMatchObject({
      width: '100%',
      minWidth: 0,
      minHeight: 48,
      justifyContent: 'space-between',
    });
    expect(StyleSheet.flatten(action.props.style).flex).toBeUndefined();
    expect(StyleSheet.flatten(action.props.style)).toMatchObject(HOME_FLOATING_WIDGET_MATERIAL);
    const actionText = renderer.root
      .findAllByType(AppText)
      .find(
        node =>
          Array.isArray(node.props.children) &&
          node.props.children.includes(' 더 알아보기'),
      );
    expect(actionText).toBeDefined();
    expect(StyleSheet.flatten(actionText?.props.style).textAlign).toBe('left');
    expect(footer.findAllByProps({ testID: 'home-hero-action-divider' })).toHaveLength(0);
  });

  it('keeps the actual record in the first full-width row and opens its exact detail', async () => {
    const renderer = await renderPanel();
    const footer = renderer.root.findByProps({ testID: 'home-hero-footer' });
    expect(footer.findAllByType(TouchableOpacity).map(node => node.props.testID)).toEqual(['home-hero-memory', 'home-hero-profile-info']);
    const memory = footer.findByProps({ testID: 'home-hero-memory' });
    expect(memory.props.accessibilityLabel).toBe(heroMemoryChip.accessibilityLabel);
    expect(StyleSheet.flatten(memory.props.style)).toMatchObject({ width: '100%', minWidth: 0, minHeight: 48, justifyContent: 'space-between' });
    expect(StyleSheet.flatten(memory.props.style).flex).toBeUndefined();
    const text = memory.findAllByType(AppText).find(node => node.props.children === heroMemoryChip.label);
    expect(text).toBeDefined();
    expect(text?.props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(text?.props.style)).toMatchObject({ fontSize: 12, lineHeight: 18 });
    memory.props.onPress();
    expect(onPressMemoryChip).toHaveBeenCalledWith('latest-health-memory');
    expect(onPressMemoryChip).toHaveBeenCalledTimes(1);
    expect(onPressCreateMemory).not.toHaveBeenCalled();
    expect(onPressProfileInfo).not.toHaveBeenCalled();
  });

  it('preserves first-record creation when no previous memory exists', async () => {
    const renderer = await renderPanel({ heroMemoryChip: {
      recordId: null,
      label: '오늘의 첫 순간을 남겨볼까요?',
      accessibilityLabel: '오늘의 첫 순간을 남겨볼까요?, 기록 작성하기',
    } });
    renderer.root.findByProps({ testID: 'home-hero-memory' }).props.onPress();
    expect(onPressCreateMemory).toHaveBeenCalledTimes(1);
    expect(onPressMemoryChip).not.toHaveBeenCalled();
  });

  it('hides an unavailable record action without inventing health history', async () => {
    const renderer = await renderPanel({ heroMemoryChip: null });
    expect(renderer.root.findAllByProps({ testID: 'home-hero-memory' })).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'home-hero-profile-info' })).toBeDefined();
    expect(renderer.root.findAllByProps({ testID: 'home-hero-action-divider' })).toHaveLength(0);
  });

  it('preserves profile editing and the existing profile bottom-sheet callback', async () => {
    const renderer = await renderPanel();
    for (const id of ['home-hero-profile-edit', 'home-hero-profile-info']) {
      const action = renderer.root.findByProps({ testID: id });
      expect(action.props.accessibilityRole).toBe('button');
      expect(
        StyleSheet.flatten(action.props.style).minHeight,
      ).toBeGreaterThanOrEqual(48);
      action.props.onPress();
    }
    expect(onPressPetProfileEdit).toHaveBeenCalledTimes(1);
    expect(onPressProfileInfo).toHaveBeenCalledTimes(1);
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
    const action = renderer.root.findByProps({ testID: 'home-hero-profile-edit' });
    expect(action.findByProps({ testID: 'home-hero-title-badge' })).toBeDefined();
    expect(action.findAllByType(AppText).map(node => node.props.children)).toEqual(['산책 새싹', '·', '누리']);
    expect(StyleSheet.flatten(action.props.style).flexWrap).toBe('wrap');
    const separator = action.findByProps({ testID: 'home-hero-title-separator' });
    expect(separator.props.accessible).toBe(false);
  });

  it('matches the title typography and medal size to the pet name', async () => {
    const renderer = await renderPanel();
    const action = renderer.root.findByProps({ testID: 'home-hero-profile-edit' });
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

  it('centers the identity group while keeping both action rows left-aligned with trailing arrows', async () => {
    const renderer = await renderPanel();
    const identity = renderer.root.findByProps({ testID: 'home-hero-identity' });
    expect(StyleSheet.flatten(identity.props.style).alignItems).toBe('center');
    const name = identity.findByProps({ testID: 'home-hero-profile-edit' });
    expect(StyleSheet.flatten(name.props.style)).toMatchObject({ alignSelf: 'center', justifyContent: 'center' });
    expect(StyleSheet.flatten(name.findByProps({ testID: 'home-hero-title-badge' }).props.style).alignSelf).toBe('center');
    expect(identity.findAllByType(AppText).some(node => node.props.children === '아이 정보를 채우면 더 예쁘게 보여요')).toBe(false);
    expect(StyleSheet.flatten(identity.findByProps({ testID: 'home-hero-together' }).props.style).justifyContent).toBe('center');
    expect(StyleSheet.flatten(renderer.root.findByProps({ testID: 'home-hero-memory' }).props.style).justifyContent).toBe('space-between');
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
    expect(StyleSheet.flatten(identity.findByProps({ testID: 'home-hero-profile-edit' }).props.style).minHeight).toBe(48);
  });

  it('matches the record chevron to the existing 18 dp profile-information chevron', async () => {
    const renderer = await renderPanel();
    const profile = renderer.root.findByProps({ testID: 'home-hero-profile-info' });
    const memory = renderer.root.findByProps({ testID: 'home-hero-memory' });
    const profileArrow = profile.findAll(node => node.props.name === 'chevron-right')[0];
    const memoryArrow = memory.findAll(node => node.props.name === 'chevron-right')[0];
    expect(profileArrow.props.size).toBe(18);
    expect(memoryArrow.props.size).toBe(profileArrow.props.size);
    expect(memoryArrow.props.color).toBe(profileArrow.props.color);
    expect(memoryArrow.props.accessible).toBe(false);
  });

  it('uses the quick-record widget material and reflections on each button without separator rules', async () => {
    const renderer = await renderPanel();
    expect(panelSource).not.toContain('styles.divider');
    expect(panelSource).not.toContain('styles.actionDivider');
    for (const [id, prefix] of [
      ['home-hero-memory', 'home-hero-memory-glass'],
      ['home-hero-profile-info', 'home-hero-profile-glass'],
    ]) {
      const button = renderer.root.findByProps({ testID: id });
      expect(StyleSheet.flatten(button.props.style)).toMatchObject({
        ...HOME_FLOATING_WIDGET_MATERIAL,
        width: '100%',
        minHeight: 48,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 12,
        overflow: 'hidden',
      });
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
