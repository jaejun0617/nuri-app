import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Image,
  StyleSheet,
  View,
  type AppStateStatus,
} from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import { getSeasonalWeatherVisualTheme } from '../src/theme/seasonal/weather';
import { buildPetThemePalette } from '../src/services/pets/themePalette';
import WalkView from '../src/screens/DevTest/walkPresentation/WalkView';

let mockDimensions = { width: 384, height: 832, scale: 3, fontScale: 1 };
const seasonalPresentation = {
  spring: {
    source: require('../src/assets/images/walk/pre-walk-spring-v1.png'),
    word: '봄바람',
    tail: '에 발맞춰,',
  },
  summer: {
    source: require('../src/assets/images/walk/pre-walk-summer-v1.png'),
    word: '초록 그늘',
    tail: '을 따라,',
  },
  autumn: {
    source: require('../src/assets/images/walk/pre-walk-autumn-v1.png'),
    word: '발맞춰',
    tail: ' 걷는 이 시간,',
  },
  winter: {
    source: require('../src/assets/images/walk/pre-walk-winter-v1.png'),
    word: '작은 온기',
    tail: '를 나누며,',
  },
} as const;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('../src/components/icons/NuriFeatherIcon', () => 'Feather');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'SemanticIcon');
jest.mock(
  '../src/screens/DevTest/walkPresentation/WalkWeatherChip',
  () => 'WalkWeatherChip',
);

describe('approved pre-walk illustration and entrance', () => {
  let tree: Renderer.ReactTestRenderer;
  const onPrimary = jest.fn();
  const props: React.ComponentProps<typeof WalkView> = {
    state: 'PRE_WALK',
    petName: '누리',
    season: 'autumn',
    preview: false,
    distanceM: null,
    activeMs: '0',
    busy: false,
    map: <View testID="map-must-not-mount-before-start" />,
    insetTop: 24,
    insetBottom: 24,
    freeLook: false,
    error: false,
    qualityLabel: '품질 확인 전',
    onClose: jest.fn(),
    onQa: jest.fn(),
    onRecenter: jest.fn(),
    onPrimary,
    onFinish: jest.fn(),
    onCancelFinish: jest.fn(),
  };
  const mount = async (overrides: Partial<typeof props> = {}) => {
    await act(async () => {
      tree = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <WalkView {...props} {...overrides} />
        </ThemeProvider>,
      );
    });
  };
  const host = (id: string) => tree.root.findAllByProps({ testID: id }).at(-1)!;
  const button = () =>
    tree.root.find(
      n =>
        n.props.testID === 'walk-primary' &&
        typeof n.props.onPress === 'function',
    );
  beforeEach(() => {
    jest.clearAllMocks();
    mockDimensions = { width: 384, height: 832, scale: 3, fontScale: 1 };
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
  });
  afterEach(async () => {
    if (tree) await act(async () => tree.unmount());
    jest.restoreAllMocks();
  });

  it('replaces only pre-walk map/card with a white illustration composition', async () => {
    await mount();
    expect(
      tree.root.findAllByProps({ testID: 'map-must-not-mount-before-start' }),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByProps({ testID: 'walk-state-overlay' }),
    ).toHaveLength(0);
    expect(
      StyleSheet.flatten(host('walk-pre-screen').props.style).backgroundColor,
    ).toBe('#FFFFFF');
    expect(host('walk-pre-title').props.accessibilityLabel).toBe(
      '누리야, 산책 가자!',
    );
    expect(host('walk-pre-subtitle').props.accessibilityLabel).toBe(
      '오늘도 함께, 한 걸음씩.',
    );
    expect(tree.root.findByType(Image).props.resizeMode).toBe('contain');
    expect(tree.root.findByType(Image).props.accessible).toBe(false);
  });

  it('overrides Android asset intrinsic dimensions inside an aspect-ratio frame', async () => {
    await mount();
    expect(
      StyleSheet.flatten(tree.root.findByType(Image).props.style),
    ).toMatchObject({ width: '100%', height: '100%' });
    expect(
      StyleSheet.flatten(host('walk-pre-artwork-frame').props.style),
    ).toMatchObject({ width: '100%', aspectRatio: 1402 / 1122, flexShrink: 0 });
  });

  it.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    'shows the approved %s artwork and personalized seasonal invitation with identical geometry',
    async season => {
      const expected = seasonalPresentation[season];
      await mount({ season, petName: '초코바닐라라' });
      expect(tree.root.findByType(Image).props.source).toEqual(expected.source);
      expect(tree.root.findByType(Image).props.resizeMode).toBe('contain');
      expect(
        StyleSheet.flatten(host('walk-pre-artwork-frame').props.style),
      ).toMatchObject({ width: '100%', aspectRatio: 1402 / 1122, flexShrink: 0 });
      expect(host('walk-pre-emotional-copy').props.accessibilityLabel).toBe(
        `초코바닐라라와 ${expected.word}${expected.tail}\n오늘도 우리만의 추억을 쌓아가요.`,
      );
      expect(host('walk-pre-emphasis-0').props.children).toBe(expected.word);
      expect(onPrimary).not.toHaveBeenCalled();
    },
  );

  it('updates only seasonal presentation without restarting entrance or starting tracking', async () => {
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    const before = StyleSheet.flatten(host('walk-pre-copy-group').props.style);
    await act(async () => {
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <WalkView {...props} season="winter" />
        </ThemeProvider>,
      );
    });
    expect(tree.root.findByType(Image).props.source).toEqual(
      seasonalPresentation.winter.source,
    );
    expect(StyleSheet.flatten(host('walk-pre-copy-group').props.style)).toEqual(before);
    expect(timing).toHaveBeenCalledTimes(6);
    expect(onPrimary).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'omits preview labels from the map-free pre-walk screen (public: %s)',
    async publicPreview => {
      await mount({ preview: true, publicPreview });
      expect(
        tree.root.findAll(
          node =>
            node.props.children === '합성 미리보기' ||
            node.props.children === '합성 경로 · 내 펫',
        ),
      ).toHaveLength(0);
      expect(
        tree.root.findAllByProps({ testID: 'map-must-not-mount-before-start' }),
      ).toHaveLength(0);
      expect(onPrimary).not.toHaveBeenCalled();
    },
  );

  it('fades actual native views rather than Android inline text spans', async () => {
    await mount();
    for (let i = 0; i < 6; i++) {
      expect(host(`walk-pre-fade-${i}`).type as unknown).toBe('View');
    }
  });

  it.each(['초코바닐라라', '우리집복덩이'])(
    'uses selected pet %s in full-width wrapping phrases, never a fixed Nuri name',
    async petName => {
      await mount({ petName });
      expect(host('walk-pre-title').props.accessibilityLabel).toContain(
        petName,
      );
      expect(host('walk-pre-title').props.accessibilityLabel).not.toContain(
        '누리야',
      );
      for (const id of ['walk-pre-title', 'walk-pre-subtitle']) {
        expect(StyleSheet.flatten(host(id).props.style)).toMatchObject({
          width: '100%',
          flexWrap: 'wrap',
          justifyContent: 'center',
        });
      }
      expect(host('walk-pre-title-text-0').props.children).toContain(petName);
      const message = host('walk-pre-emotional-copy').props.accessibilityLabel;
      expect(message).toContain(petName);
      expect(message).not.toContain('너와');
      expect(host('walk-pre-title-text-0').props.numberOfLines).toBeUndefined();
      expect(host('walk-pre-title-text-0').props.adjustsFontSizeToFit).not.toBe(
        true,
      );
    },
  );

  it('uses compact emotional copy instead of weather and keeps text shadow-free', async () => {
    await mount();
    expect(
      StyleSheet.flatten(host('walk-pre-title-text-0').props.style),
    ).toMatchObject({
      fontSize: 22,
      lineHeight: 30,
      textAlign: 'center',
      letterSpacing: 0,
    });
    expect(
      StyleSheet.flatten(host('walk-pre-subtitle-text-0').props.style),
    ).toMatchObject({ fontSize: 13, lineHeight: 20 });
    expect(
      StyleSheet.flatten(host('walk-pre-subtitle').props.style).marginTop,
    ).toBe(6);
    expect(
      StyleSheet.flatten(host('walk-pre-emotional-copy').props.style),
    ).toMatchObject({ marginTop: 12, alignItems: 'center' });
    expect(
      StyleSheet.flatten(host('walk-pre-copy-group').props.style),
    ).toMatchObject({ width: '100%' });
    expect(
      tree.root.findAll(n => (n.type as unknown) === 'WalkWeatherChip'),
    ).toHaveLength(0);
    expect(host('walk-pre-emotional-copy').props.accessibilityLabel).toBe(
      '누리와 발맞춰 걷는 이 시간,\n오늘도 우리만의 추억을 쌓아가요.',
    );
    expect(host('walk-pre-emotional-copy').props.accessible).toBe(true);
    for (let i = 0; i < 2; i++) {
      const line = host(`walk-pre-emotional-text-${i}`);
      expect(StyleSheet.flatten(line.props.style)).toMatchObject({
        fontSize: 12,
        lineHeight: 20,
        textAlign: 'center',
        color: '#556070',
      });
      expect(line.props.accessible).toBe(false);
    }
    expect(
      StyleSheet.flatten(host('walk-pre-title-text-0').props.style)
        .textShadowColor,
    ).toBeUndefined();
  });

  it.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    'distributes %s weather accents across emotional keywords without recoloring full sentences',
    async season => {
      await mount({ season });
      const accent = getSeasonalWeatherVisualTheme(season)?.card.accent;
      expect(accent).toBeDefined();
      expect(
        StyleSheet.flatten(host('walk-pre-title-text-0').props.style).color,
      ).toBe(accent);
      expect(
        StyleSheet.flatten(host('walk-pre-title-text-1').props.style).color,
      ).toBe('#0B1220');
      expect(
        StyleSheet.flatten(host('walk-pre-subtitle-text-0').props.style).color,
      ).toBe('#556070');
      const smallAccent = buildPetThemePalette(accent).deep;
      for (const [id, word] of [
        ['walk-pre-emphasis-together', '함께'],
        ['walk-pre-emphasis-0', seasonalPresentation[season].word],
        ['walk-pre-emphasis-1', '추억'],
      ]) {
        const emphasis = host(id);
        expect(emphasis.props.children).toBe(word);
        expect(StyleSheet.flatten(emphasis.props.style)).toEqual({
          color: smallAccent,
        });
      }
      const channels = [1, 3, 5]
        .map(offset => parseInt(smallAccent.slice(offset, offset + 2), 16) / 255)
        .map(value =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        );
      const luminance =
        channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      expect(1.05 / (luminance + 0.05)).toBeGreaterThanOrEqual(4.5);
      if (season === 'autumn') expect(accent).toBe('#D95F32');
    },
  );

  it.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    'keeps %s canonical start colors and starts only on press',
    async season => {
      await mount({ season });
      expect(onPrimary).not.toHaveBeenCalled();
      expect(
        StyleSheet.flatten(button().props.style({ pressed: false })),
      ).toMatchObject({
        backgroundColor: SEASON_CTA[season].primary,
        minHeight: 52,
        borderRadius: 16,
      });
      expect(
        StyleSheet.flatten(button().props.style({ pressed: true }))
          .backgroundColor,
      ).toBe(SEASON_CTA[season].pressed);
      expect(
        StyleSheet.flatten(host('walk-primary-label').props.style),
      ).toMatchObject({ fontSize: 15, lineHeight: 21, textAlign: 'center' });
      expect(
        StyleSheet.flatten(host('walk-pre-footer').props.style),
      ).toMatchObject({ paddingHorizontal: 20, paddingBottom: 36 });
      await act(async () => button().props.onPress());
      expect(onPrimary).toHaveBeenCalledTimes(1);
    },
  );

  it('reveals six phrases with overlapping native fade/lift and never gates the button or replays on props', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    expect(
      timing.mock.calls.map(([, c]) => [
        c.delay,
        c.duration,
        c.useNativeDriver,
        c.isInteraction,
      ]),
    ).toEqual([
      [250, 1100, true, false],
      [850, 1150, true, false],
      [1650, 1050, true, false],
      [2150, 1050, true, false],
      [2950, 1200, true, false],
      [3750, 1250, true, false],
    ]);
    expect(
      Math.max(
        ...timing.mock.calls.map(
          ([, config]) => (config.delay ?? 0) + (config.duration ?? 0),
        ),
      ),
    ).toBe(5000);
    for (let i = 0; i < 6; i++) {
      const transform = StyleSheet.flatten(
        host(`walk-pre-fade-${i}`).props.style,
      ).transform;
      expect(transform).toHaveLength(1);
      expect(transform[0]).toHaveProperty('translateY');
    }
    expect(button().props.disabled).toBe(false);
    await act(async () =>
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <WalkView {...props} busy />
        </ThemeProvider>,
      ),
    );
    expect(timing).toHaveBeenCalledTimes(6);
    expect(host('walk-primary').props.accessibilityState.disabled).toBe(true);
  });

  it('shows everything immediately for reduced motion and failed motion queries', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    expect(timing).not.toHaveBeenCalled();
    for (let i = 0; i < 6; i++) {
      expect(
        StyleSheet.flatten(host(`walk-pre-fade-${i}`).props.style),
      ).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
    }
    await act(async () => tree.unmount());
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockRejectedValue(new Error('unavailable'));
    await mount();
    expect(timing).not.toHaveBeenCalled();
  });

  it('preserves entrance history across inspector remounts, but a fresh entry replays', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(false);
    const timing = jest.spyOn(Animated, 'timing');
    const preWalkIntroSeen = { current: false };
    await mount({ preWalkIntroSeen });
    expect(timing).toHaveBeenCalledTimes(6);
    expect(preWalkIntroSeen.current).toBe(true);
    await act(async () => tree.unmount());
    timing.mockClear();
    await mount({ preWalkIntroSeen });
    expect(timing).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
    await mount({ preWalkIntroSeen: { current: false } });
    expect(timing).toHaveBeenCalledTimes(6);
  });

  it('reveals the complete copy when reduced motion is enabled during entrance', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(false);
    let motionListener: ((enabled: boolean) => void) | undefined;
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((_event, callback) => {
        motionListener = callback;
        return { remove: jest.fn() };
      });
    await mount();
    await act(async () => motionListener?.(true));
    for (let i = 0; i < 6; i++) {
      expect(
        StyleSheet.flatten(host(`walk-pre-fade-${i}`).props.style).opacity,
      ).toBe(1);
    }
  });

  it('ignores a late motion-policy reply after leaving the screen', async () => {
    let resolveMotion: ((value: boolean) => void) | undefined;
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockReturnValue(
      new Promise(resolve => {
        resolveMotion = resolve;
      }),
    );
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    await act(async () => tree.unmount());
    await act(async () => resolveMotion?.(false));
    expect(timing).not.toHaveBeenCalled();
  });

  it('does not mount entrance art or motion in an existing walking state', async () => {
    await mount({ state: 'WALKING' });
    expect(
      tree.root.findAllByProps({ testID: 'walk-pre-screen' }),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByProps({ testID: 'map-must-not-mount-before-start' })
        .length,
    ).toBeGreaterThan(0);
    expect(AccessibilityInfo.isReduceMotionEnabled).not.toHaveBeenCalled();
  });

  it('settles on background and does not restart its sequence on foreground', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(false);
    let listener: ((state: AppStateStatus) => void) | undefined;
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, callback) => {
        listener = callback;
        return { remove: jest.fn() };
      });
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    await act(async () => {
      listener?.('background');
      listener?.('active');
    });
    expect(timing).toHaveBeenCalledTimes(6);
    for (let i = 0; i < 6; i++) {
      expect(
        StyleSheet.flatten(host(`walk-pre-fade-${i}`).props.style).opacity,
      ).toBe(1);
    }
  });

  it.each([
    { width: 320, height: 640, fontScale: 1.3 },
    { width: 384, height: 832, fontScale: 2 },
  ])(
    'preserves font scaling and full image at $width with scale $fontScale',
    async size => {
      mockDimensions = { ...mockDimensions, ...size };
      await mount({ petName: '아주아주긴이름을가진반려동물' });
      expect(host('walk-pre-title').props.accessibilityLabel).toContain(
        '아주아주긴이름을가진반려동물아,',
      );
      expect(host('walk-pre-title').props.numberOfLines).toBeUndefined();
      expect(host('walk-pre-title').props.allowFontScaling).not.toBe(false);
      expect(tree.root.findByType(Image).props.resizeMode).toBe('contain');
      expect(host('walk-pre-body').props.contentContainerStyle.flexGrow).toBe(
        1,
      );
    },
  );
});
