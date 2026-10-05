import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import LinearGradient from 'react-native-linear-gradient';
import { ThemeProvider } from 'styled-components/native';

import NuriIcon, { type NuriIconName } from '../src/components/icons/NuriIcon';
import NuriSemanticIcon from '../src/components/icons/NuriSemanticIcon';
import {
  NURI_FUNCTION_ICONS,
  NURI_ORIGINAL_GLYPHS,
  NURI_MOOD_ICONS,
  resolveNuriIcon,
} from '../src/components/icons/nuriIconNames';
import glyphs from '../src/assets/icons/nuri-icons.glyphs.json';
import palettes from '../src/assets/icons/nuri-icons.palette.json';
import source from '../src/assets/icons/nuri-icons.source.json';
import catalog from '../src/assets/icons/nuri-icons.catalog.json';
import { getGuideCategoryIconName } from '../src/services/guides/presentation';
import AppNavigationToolbar from '../src/components/navigation/AppNavigationToolbar';
import { createTheme } from '../src/app/theme/theme';
import {
  buildPetThemePalette,
  PET_THEME_OPTIONS,
} from '../src/services/pets/themePalette';

jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 18, left: 0 }),
}));
const mockNavigate = jest.fn();
const mockMore = jest.fn();
let mockColor = '#EC4899';
let mockLoggedIn = true;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: (state: { isLoggedIn: boolean }) => unknown) =>
    selector({ isLoggedIn: mockLoggedIn }),
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: (
    selector: (state: {
      selectedPetId: string;
      pets: Array<{ id: string; themeColor: string }>;
    }) => unknown,
  ) =>
    selector({
      selectedPetId: 'p1',
      pets: [{ id: 'p1', themeColor: mockColor }],
    }),
}));
jest.mock('../src/store/uiStore', () => ({ openMoreDrawer: () => mockMore() }));

async function render(element: React.ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
}

const navigationIcons = (renderer: TestRenderer.ReactTestRenderer) =>
  renderer.root.findAll(
    item =>
      item.props.variant &&
      Object.prototype.hasOwnProperty.call(glyphs, item.props.name) &&
      item.props.size === 18,
  );

describe('NURI custom icon candidate', () => {
  afterEach(() => {
    mockLoggedIn = true;
    jest.clearAllMocks();
  });

  it('contains the original seven functional types and a complete global catalog', () => {
    expect(Object.keys(NURI_FUNCTION_ICONS)).toHaveLength(7);
    expect(Object.keys(glyphs)).toHaveLength(110);
    const codes = Object.values(glyphs).flatMap(value => Object.values(value));
    expect(new Set(codes).size).toBe(770);
    expect(Math.min(...codes)).toBe(0xe900);
    expect(Object.keys(palettes)).toEqual(Object.keys(glyphs));
    for (const palette of Object.values(palettes)) {
      for (const key of [
        'primary',
        'surface',
        'detail',
        'accent',
        'secondary',
        'detailAccent',
      ] as const) {
        expect(palette[key]).toMatch(/^#[0-9A-F]{6}$/i);
      }
      expect(palette.layers).toContain('fill');
      expect(palette.layers).toContain('outline');
    }
  });

  it('registers the exact same generated font on both platforms', () => {
    const root = path.join(__dirname, '..');
    const font = fs.readFileSync(
      path.join(root, 'src/assets/fonts/NuriIcons.ttf'),
    );
    expect(font.readUInt32BE(0)).toBe(0x00010000);
    expect(
      font.equals(
        fs.readFileSync(
          path.join(root, 'android/app/src/main/assets/fonts/NuriIcons.ttf'),
        ),
      ),
    ).toBe(true);
    expect(
      fs.readFileSync(path.join(root, 'ios/nuri/Info.plist'), 'utf8'),
    ).toContain('<string>NuriIcons.ttf</string>');
    expect(
      fs.readFileSync(
        path.join(root, 'ios/nuri.xcodeproj/project.pbxproj'),
        'utf8',
      ),
    ).toContain('NuriIcons.ttf in Resources');
  });

  it('owns editable species-neutral jelly shapes rather than stock animal marks', () => {
    expect(source.designLanguage).toBe('NURI Jelly Objects 2026');
    expect(catalog.designLanguage).toBe(source.designLanguage);
    expect(Object.keys(source.icons)).toEqual([
      'walk',
      'meal',
      'health',
      'grooming',
      'diary',
      'calendar',
      'timeline',
      'home',
      'community',
      'letter',
      'menu',
    ]);
    expect(Object.keys(glyphs)).not.toEqual(
      expect.arrayContaining(['paw', 'dog', 'bone']),
    );
    expect(source.icons.meal.detail.length).toBeGreaterThan(0);
    expect(source.icons.community.detail.length).toBeGreaterThan(0);
    expect(catalog.icons['medical-bag'].detailAccent[0].stroke).toBe(2.3);
    expect(catalog.icons.needle.detail.length).toBeGreaterThan(0);
  });

  it('keeps unchecked controls hollow instead of turning them into filled badges', () => {
    for (const name of ['square', 'circle', 'search'] as const) {
      expect(catalog.icons[name].body).toHaveLength(1);
      expect(catalog.icons[name].body[0].stroke).toBeGreaterThan(2);
      expect(catalog.icons[name].body[0].outlineStroke).toBe(
        catalog.icons[name].body[0].stroke,
      );
    }
  });

  it('uses a legible white symbol on filled theme navigation and theme-only outlines', async () => {
    for (const name of [
      'home',
      'timeline',
      'community',
      'letter',
      'menu',
    ] as const) {
      const filled = await render(
        <NuriIcon name={name} size={18} colorMode="theme" color="#EC4899" />,
      );
      expect(filled.root.findByType(LinearGradient).props.colors).toEqual([
        '#FFFFFF',
        '#EC4899',
        '#EC4899',
      ]);
      const detail = filled.root
        .findAllByType(Text)
        .find(node =>
          React.Children.toArray(node.props.children).includes(
            String.fromCodePoint(glyphs[name].detail),
          ),
        );
      if (palettes[name].layers.includes('detail')) {
        expect(detail).toBeDefined();
        expect(StyleSheet.flatten(detail?.props.style).color).toBe('#FFFFFF');
      }
      const outline = await render(
        <NuriIcon
          name={name}
          size={18}
          colorMode="theme"
          variant="outline"
          color="#7B8393"
        />,
      );
      expect(outline.root.findAllByType(LinearGradient)).toHaveLength(0);
      expect(
        outline.root
          .findAllByType(Text)
          .every(
            node => StyleSheet.flatten(node.props.style).color === '#7B8393',
          ),
      ).toBe(true);
      await act(async () => {
        filled.unmount();
        outline.unmount();
      });
    }
  });

  it.each(Object.keys(glyphs) as NuriIconName[])(
    '%s stays within the existing fixed icon slot and cannot intercept touches',
    async name => {
      const renderer = await render(
        <NuriIcon name={name} size={18} color="#2563EB" testID="icon" />,
      );
      const view = renderer.root.findByType(View);
      expect(StyleSheet.flatten(view.props.style)).toMatchObject({
        width: 18,
        height: 18,
      });
      expect(view.props.pointerEvents).toBe('none');
      expect(view.props.importantForAccessibility).toBe('no-hide-descendants');
      for (const text of renderer.root.findAllByType(Text)) {
        expect(text.props.allowFontScaling).toBe(false);
        expect(StyleSheet.flatten(text.props.style)).toMatchObject({
          fontFamily: 'NuriIcons',
          fontSize: 18,
          lineHeight: 18,
          includeFontPadding: false,
        });
      }
      await act(async () => renderer.unmount());
    },
  );

  it.each(
    Object.entries(NURI_ORIGINAL_GLYPHS).flatMap(([family, names]) =>
      names.map(name => ({ family, name })),
    ),
  )('preserves the excluded $family $name glyph', async ({ family, name }) => {
    const iconFamily = family === 'material' ? 'material' : 'feather';
    expect(resolveNuriIcon(iconFamily, name)).toBeUndefined();
    const renderer = await render(
      <NuriSemanticIcon
        family={iconFamily}
        name={name}
        size={20}
        color="#123456"
      />,
    );
    expect(renderer.root.findAllByType(LinearGradient)).toHaveLength(0);
    expect(
      renderer.root.findAll(
        node => node.props.name === name && node.props.size === 20,
      ).length,
    ).toBeGreaterThan(0);
    await act(async () => renderer.unmount());
  });

  it('distinguishes generic activity from walk and preserves clinical meanings', () => {
    expect(resolveNuriIcon('feather', 'activity')).toBe('activity');
    expect(resolveNuriIcon('feather', 'coffee')).toBe('meal');
    expect(resolveNuriIcon('material', 'heart-pulse')).toBe('health');
    expect(resolveNuriIcon('material', 'content-cut')).toBe('grooming');
    expect(resolveNuriIcon('material', 'medical-bag')).toBe('medical-bag');
    expect(resolveNuriIcon('material', 'needle')).toBe('needle');
    expect(resolveNuriIcon('material', 'pill')).toBe('pill');
    expect(resolveNuriIcon('material', 'shower')).toBe('shower');
  });

  it.each(Object.values(NURI_FUNCTION_ICONS))(
    'keeps %s source colors even when given a pet-theme color',
    async name => {
      const renderer = await render(
        <NuriIcon name={name} size={22} color="#ABCDEF" />,
      );
      expect(renderer.root.findByType(LinearGradient).props.colors).toEqual([
        palettes[name].surface,
        palettes[name].primary,
        palettes[name].primary,
      ]);
      for (const text of renderer.root.findAllByType(Text))
        expect(StyleSheet.flatten(text.props.style).color).not.toBe('#ABCDEF');
      await act(async () => renderer.unmount());
    },
  );

  it('uses source colors through the global adapter and preserves slot margins', async () => {
    const renderer = await render(
      <NuriSemanticIcon
        family="feather"
        name="camera"
        size={22}
        color="#ABCDEF"
        style={{ marginRight: 8 }}
        testID="camera"
      />,
    );
    expect(renderer.root.findByType(View).props.testID).toBe('camera');
    expect(
      StyleSheet.flatten(renderer.root.findByType(View).props.style),
    ).toMatchObject({ width: 22, height: 22, marginRight: 8 });
    expect(renderer.root.findByType(LinearGradient).props.colors[1]).toBe(
      palettes.camera.primary,
    );
    await act(async () => renderer.unmount());
  });

  it('preserves the official NURI wordmark mark without rebranding it', async () => {
    const renderer = await render(
      <NuriSemanticIcon
        family="material"
        preserveOriginal
        name="paw"
        size={12}
        color="#123456"
      />,
    );
    expect(renderer.root.findAllByType(LinearGradient)).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  it('maps every recommendation category and all eight emotion values', () => {
    for (const category of [
      'nutrition',
      'health',
      'behavior',
      'daily-care',
      'environment',
      'safety',
      'seasonal',
    ] as const) {
      expect(
        resolveNuriIcon('feather', getGuideCategoryIconName(category)),
      ).toBeDefined();
    }
    expect(Object.keys(NURI_MOOD_ICONS)).toEqual([
      'happy',
      'calm',
      'excited',
      'neutral',
      'sad',
      'anxious',
      'angry',
      'tired',
    ]);
    expect(new Set(Object.values(NURI_MOOD_ICONS)).size).toBe(8);
  });

  it('limits raw vector providers to adapters, standalone weather and type-only metadata', () => {
    const root = path.join(__dirname, '..');
    const allowed = new Set([
      'src/components/icons/NuriSemanticIcon.tsx',
      'src/components/weather/WeatherGuideHomeCard.tsx',
      'src/services/guides/presentation.ts',
      'src/app/ui/SectionHeaderAction.tsx',
    ]);
    const walk = (directory: string): string[] =>
      fs
        .readdirSync(directory, { withFileTypes: true })
        .flatMap(entry =>
          entry.isDirectory()
            ? walk(path.join(directory, entry.name))
            : /\.[tj]sx?$/.test(entry.name)
            ? [path.join(directory, entry.name)]
            : [],
        );
    for (const file of walk(path.join(root, 'src'))) {
      if (
        /from 'react-native-vector-icons\/(Feather|MaterialCommunityIcons)'/.test(
          fs.readFileSync(file, 'utf8'),
        )
      )
        expect(allowed.has(path.relative(root, file))).toBe(true);
    }
    const more = fs.readFileSync(
      path.join(root, 'src/screens/More/MoreDrawerContent.tsx'),
      'utf8',
    );
    expect(more).toContain("nuriIcon: 'palette'");
    expect(more).not.toContain('iconEmoji');
    const menuColors = more.slice(
      more.indexOf('const menuThemeColors'),
      more.indexOf('const avatarUri'),
    );
    expect(menuColors).not.toContain('petTheme.');
  });

  it.each(PET_THEME_OPTIONS)(
    'uses pet theme %s for the selected navigation icon without recoloring inactive tabs',
    async color => {
      mockColor = color;
      const renderer = await render(
        <ThemeProvider theme={createTheme('light')}>
          <AppNavigationToolbar activeKey="home" />
        </ThemeProvider>,
      );
      const icons = navigationIcons(renderer);
      expect(icons.map(icon => icon.props.name)).toEqual([
        'home',
        'timeline',
        'community',
        'letter',
        'menu',
      ]);
      expect(icons[0].props).toMatchObject({
        color: buildPetThemePalette(color).primary,
        colorMode: 'theme',
        variant: 'glass',
        size: 18,
      });
      expect(
        renderer.root.findAllByType(LinearGradient)[0].props.colors,
      ).toEqual([
        '#FFFFFF',
        buildPetThemePalette(color).primary,
        buildPetThemePalette(color).primary,
      ]);
      for (const icon of icons.slice(1))
        expect(icon.props).toMatchObject({
          color: createTheme('light').colors.textMuted,
          variant: 'outline',
          size: 18,
        });
      const tabs = renderer.root.findAllByType(TouchableOpacity);
      tabs.forEach(tab => tab.props.onPress());
      expect(mockNavigate).toHaveBeenCalledWith('AppTabs', {
        screen: 'HomeTab',
      });
      expect(mockNavigate).toHaveBeenCalledWith('AppTabs', {
        screen: 'TimelineTab',
        params: {
          screen: 'TimelineMain',
          params: { mainCategory: 'all', entrySource: 'home' },
        },
      });
      expect(mockNavigate).toHaveBeenCalledWith('AppTabs', {
        screen: 'CommunityTab',
      });
      expect(mockNavigate).toHaveBeenCalledWith('AppTabs', {
        screen: 'GuestbookTab',
      });
      expect(mockMore).toHaveBeenCalledTimes(1);
      await act(async () => renderer.unmount());
    },
  );

  it('uses the global brand color for guests and preserves selected-tab accessibility', async () => {
    mockLoggedIn = false;
    const theme = createTheme('light');
    const renderer = await render(
      <ThemeProvider theme={theme}>
        <AppNavigationToolbar activeKey="community" />
      </ThemeProvider>,
    );
    expect(navigationIcons(renderer)[2].props.color).toBe(theme.colors.brand);
    expect(
      renderer.root.findAllByType(TouchableOpacity)[2].props.accessibilityState,
    ).toEqual({ selected: true });
    await act(async () => renderer.unmount());
  });
});
