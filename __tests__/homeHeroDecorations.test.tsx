import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Image,
  StyleSheet,
} from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import {
  HomeHeroFooterOrnaments,
  HomeHeroPhotoStarlights,
  HomeHeroWaveOrnaments,
} from '../src/screens/Main/components/LoggedInHome/HomeHeroDecorations';
import type { SeasonKey } from '../src/theme/seasonal/season';

describe('bounded seasonal Hero decorations', () => {
  const originalAppState = AppState.currentState;
  const renderers: TestRenderer.ReactTestRenderer[] = [];
  const animation = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
  const removeMotion = jest.fn();
  const removeState = jest.fn();
  let motionListener: ((enabled: boolean) => void) | undefined;
  let stateListener:
    | ((state: 'active' | 'background' | 'inactive') => void)
    | undefined;

  async function render(node: React.ReactElement) {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(node);
      renderers.push(renderer);
    });
    return renderer!;
  }

  function host(renderer: TestRenderer.ReactTestRenderer, testID: string) {
    const node = renderer.root.findAll(
      item => typeof item.type === 'string' && item.props.testID === testID,
    )[0];
    if (!node) throw new Error(`Missing decoration ${testID}`);
    return node;
  }

  beforeEach(() => {
    animation.start.mockClear();
    animation.stop.mockClear();
    animation.reset.mockClear();
    removeMotion.mockClear();
    removeState.mockClear();
    motionListener = undefined;
    stateListener = undefined;
    AppState.currentState = 'active';
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockClear()
      .mockResolvedValue(false);
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((event, listener) => {
        if (event === 'reduceMotionChanged') motionListener = listener;
        return { remove: removeMotion };
      });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((event, listener) => {
        if (event === 'change') stateListener = listener;
        return { remove: removeState };
      });
    jest.spyOn(Animated, 'loop').mockReturnValue(animation);
    jest.spyOn(Animated, 'timing');
  });

  afterEach(async () => {
    for (const renderer of renderers.splice(0))
      await act(async () => renderer.unmount());
    jest.restoreAllMocks();
    AppState.currentState = originalAppState;
  });

  it.each<SeasonKey>(['spring', 'summer', 'winter'])(
    'renders the seasonal Hero and common photo glints for %s',
    async season => {
      const renderer = await render(
        <>
          <HomeHeroWaveOrnaments season={season} />
          <HomeHeroFooterOrnaments season={season} />
          <HomeHeroPhotoStarlights season={season} aspectRatio={0.75} active />
        </>,
      );
      expect(
        host(renderer, `home-hero-${season}-ornaments`).props.pointerEvents,
      ).toBe('none');
      expect(renderer.root.findAllByType(Image)).toHaveLength(31);
      expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalledTimes(1);
      expect(Animated.loop).toHaveBeenCalledTimes(1);
    },
  );

  it('lowers the existing left ornaments by 8 dp and places a different leaf at the right edge', async () => {
    const renderer = await render(<HomeHeroWaveOrnaments season="autumn" />);
    expect(
      StyleSheet.flatten(
        host(renderer, 'home-hero-wave-left-ornaments').props.style,
      ),
    ).toMatchObject({ top: -40, left: 0 });
    expect(
      StyleSheet.flatten(
        host(renderer, 'home-hero-wave-right-ornaments').props.style,
      ),
    ).toMatchObject({ top: -14, right: -4 });
    expect(host(renderer, 'home-hero-glass-maple').props.source).toEqual(
      require('../src/assets/seasonal/home/autumn/glass/autumn-glass-maple-coral-v1.png'),
    );
    expect(renderer.root.findAllByType(Image)).toHaveLength(8);
    for (const id of [
      'home-hero-starlight-upper',
      'home-hero-starlight-lower',
      'home-hero-starlight-left-edge',
      'home-hero-starlight-right-upper',
      'home-hero-starlight-right-lower',
    ]) {
      expect(host(renderer, id).props.source).toEqual(
        require('../src/assets/seasonal/home/autumn/glass/autumn-starlight-four-point-v1.png'),
      );
    }
  });

  it('keeps the footer spheres and stars wholly inside the existing weather gap with zero layout height', async () => {
    const renderer = await render(<HomeHeroFooterOrnaments season="autumn" />);
    expect(
      StyleSheet.flatten(
        host(renderer, 'home-hero-footer-ornaments').props.style,
      ),
    ).toMatchObject({ height: 0, marginHorizontal: -16, overflow: 'visible' });
    expect(renderer.root.findAllByType(Image)).toHaveLength(5);
    for (const image of renderer.root.findAllByType(Image)) {
      const style = StyleSheet.flatten(image.props.style);
      expect(style.position).toBe('absolute');
      expect(style.top + style.height).toBeLessThan(52);
      expect(style.top).toBeGreaterThanOrEqual(-2);
      expect(style.width).toBeLessThanOrEqual(46);
      expect(image.props.onPress).toBeUndefined();
    }
  });

  it('bounds eighteen small photo glints to the original photo and keeps the header and centre clear', async () => {
    const renderer = await render(
      <HomeHeroPhotoStarlights season="autumn" aspectRatio={0.75} active />,
    );
    expect(
      StyleSheet.flatten(
        host(renderer, 'home-hero-photo-starlights').props.style,
      ),
    ).toMatchObject({
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      aspectRatio: 0.75,
      overflow: 'hidden',
    });
    expect(
      StyleSheet.flatten(
        host(renderer, 'home-hero-photo-star-field').props.style,
      ),
    ).toMatchObject({ top: 112, bottom: 48, overflow: 'hidden' });
    const stars = Array.from({ length: 18 }, (_, index) =>
      host(renderer, `home-hero-photo-star-${index}`),
    );
    expect(stars).toHaveLength(18);
    for (const star of stars) {
      const style = StyleSheet.flatten(star.props.style);
      expect(style.width).toBeLessThanOrEqual(42);
      expect(style.width).toBe(style.height);
      const x = parseFloat(style.left);
      const y = parseFloat(style.top);
      expect(x <= 23 || x >= 77 || y <= 12 || y >= 96).toBe(true);
    }
    expect(Animated.loop).toHaveBeenCalledTimes(1);
    expect(Animated.timing).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        duration: 7600,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
  });

  it('makes every layer decorative and every image untouchable without changing the cutout bytes', async () => {
    const renderer = await render(
      <>
        <HomeHeroWaveOrnaments season="autumn" />
        <HomeHeroFooterOrnaments season="autumn" />
        <HomeHeroPhotoStarlights
          season="autumn"
          aspectRatio={0.75}
          active={false}
        />
      </>,
    );
    for (const id of [
      'home-hero-autumn-ornaments',
      'home-hero-wave-left-ornaments',
      'home-hero-wave-right-ornaments',
      'home-hero-footer-ornaments',
      'home-hero-photo-starlights',
      'home-hero-photo-star-field',
    ]) {
      expect(host(renderer, id).props).toMatchObject({
        pointerEvents: 'none',
        accessible: false,
        importantForAccessibility: 'no-hide-descendants',
      });
    }
    const images = renderer.root.findAllByType(Image);
    expect(images).toHaveLength(31);
    for (const image of images) {
      expect(image.props).toMatchObject({
        pointerEvents: 'none',
        accessible: false,
        resizeMode: 'contain',
        resizeMethod: 'resize',
        fadeDuration: 0,
      });
      expect(image.props.tintColor).toBeUndefined();
    }
    const file = 'autumn-glass-maple-coral-v1.png';
    const hash = (root: string) =>
      createHash('sha256')
        .update(fs.readFileSync(path.join(__dirname, root, file)))
        .digest('hex');
    expect(hash('../src/assets/seasonal/home/autumn/glass')).toBe(
      hash('../output/imagegen/nuri-autumn-glass-v1-20261017'),
    );
  });

  it.each([null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, 3])(
    'does not invent a star field without sufficient valid photo bounds: %s',
    async aspectRatio => {
      const renderer = await render(
        <HomeHeroPhotoStarlights
          season="autumn"
          aspectRatio={aspectRatio}
          active
        />,
      );
      expect(renderer.toJSON()).toBeNull();
      expect(Animated.loop).not.toHaveBeenCalled();
    },
  );

  it('keeps all glints static when motion reduction is enabled', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    await render(
      <HomeHeroPhotoStarlights season="autumn" aspectRatio={0.75} active />,
    );
    expect(Animated.loop).not.toHaveBeenCalled();
  });

  it('keeps a failed motion-preference read static', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockRejectedValue(new Error('Unavailable'));
    await render(
      <HomeHeroPhotoStarlights season="autumn" aspectRatio={0.75} active />,
    );
    expect(Animated.loop).not.toHaveBeenCalled();
  });

  it('stops when Home loses focus and resumes only when it is focused again', async () => {
    const renderer = await render(
      <HomeHeroPhotoStarlights season="autumn" aspectRatio={0.75} active />,
    );
    expect(animation.start).toHaveBeenCalledTimes(1);
    await act(async () =>
      renderer.update(
        <HomeHeroPhotoStarlights
          season="autumn"
          aspectRatio={0.75}
          active={false}
        />,
      ),
    );
    expect(animation.stop).toHaveBeenCalledTimes(1);
    expect(animation.start).toHaveBeenCalledTimes(1);
    await act(async () =>
      renderer.update(
        <HomeHeroPhotoStarlights season="autumn" aspectRatio={0.75} active />,
      ),
    );
    expect(animation.start).toHaveBeenCalledTimes(2);
  });

  it('stops in the background and obeys a motion preference change before resuming', async () => {
    await render(
      <HomeHeroPhotoStarlights season="autumn" aspectRatio={0.75} active />,
    );
    await act(async () => stateListener?.('background'));
    expect(animation.stop).toHaveBeenCalledTimes(1);
    await act(async () => motionListener?.(true));
    await act(async () => stateListener?.('active'));
    expect(animation.start).toHaveBeenCalledTimes(1);
    await act(async () => motionListener?.(false));
    expect(animation.start).toHaveBeenCalledTimes(2);
  });

  it('does not let a late initial preference overwrite the newer reduced-motion event', async () => {
    let resolvePreference: ((value: boolean) => void) | undefined;
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockReturnValue(
      new Promise(resolve => {
        resolvePreference = resolve;
      }),
    );
    await render(
      <HomeHeroPhotoStarlights season="autumn" aspectRatio={0.75} active />,
    );
    await act(async () => motionListener?.(true));
    await act(async () => resolvePreference?.(false));
    expect(Animated.loop).not.toHaveBeenCalled();
  });

  it('stops its single native clock and removes listeners on unmount', async () => {
    const renderer = await render(
      <HomeHeroPhotoStarlights season="autumn" aspectRatio={0.75} active />,
    );
    await act(async () => renderer.unmount());
    expect(animation.stop).toHaveBeenCalledTimes(1);
    expect(removeMotion).toHaveBeenCalledTimes(1);
    expect(removeState).toHaveBeenCalledTimes(1);
    renderers.splice(renderers.indexOf(renderer), 1);
  });
});
