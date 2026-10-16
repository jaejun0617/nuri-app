import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { HomeSectionDecorations } from '../src/screens/Main/components/LoggedInHome/HomeSectionDecorations';
import type { SeasonKey } from '../src/theme/seasonal/season';

const ZONES = [
  'frequent',
  'summary',
  'recent',
  'community',
  'recommendation',
  'schedule',
  'health',
  'today-tip',
  'diary',
] as const;
const STARLIGHT = require('../src/assets/seasonal/home/autumn/glass/autumn-starlight-four-point-v1.png');
const PEARL = require('../src/assets/seasonal/home/autumn/glass/autumn-glass-pearl-apricot-v1.png');

describe('lower Home stars with sparse tiny pearls', () => {
  const renderers: TestRenderer.ReactTestRenderer[] = [];
  async function render(node: React.ReactElement) {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(node);
      renderers.push(renderer);
    });
    return renderer!;
  }
  afterEach(async () => {
    for (const renderer of renderers.splice(0))
      await act(async () => renderer.unmount());
  });

  it.each(ZONES)(
    'preserves six varied stars without restoring foliage in the %s gap',
    async zone => {
      const renderer = await render(
        <HomeSectionDecorations season="autumn" zone={zone} />,
      );
      const layer = renderer.root.findByProps({
        testID: `home-section-decorations-${zone}`,
      });
      expect(layer.props).toMatchObject({
        pointerEvents: 'none',
        accessible: false,
        importantForAccessibility: 'no-hide-descendants',
      });
      expect(StyleSheet.flatten(layer.props.style)).toEqual({
        position: 'absolute',
        top: -40,
        left: 0,
        right: 0,
        height: 52,
        overflow: 'hidden',
      });
      const stars = layer
        .findAllByType(Image)
        .filter(image =>
          image.props.testID.startsWith(`home-section-star-${zone}-`),
        );
      expect(stars).toHaveLength(6);
      expect(
        new Set(stars.map(star => StyleSheet.flatten(star.props.style).width))
          .size,
      ).toBe(6);
      expect(
        new Set(stars.map(star => StyleSheet.flatten(star.props.style).opacity))
          .size,
      ).toBeGreaterThanOrEqual(4);
      expect(stars.map(star => star.props.testID)).toEqual(
        Array.from({ length: 6 }, (_, i) => `home-section-star-${zone}-${i}`),
      );
      for (const image of renderer.root.findAllByType(Image)) {
        expect(image.props.source).toEqual(
          image.props.testID.startsWith('home-section-tiny-pearl-')
            ? PEARL
            : STARLIGHT,
        );
        expect(image.props).toMatchObject({
          pointerEvents: 'none',
          accessible: false,
          importantForAccessibility: 'no-hide-descendants',
          resizeMode: 'contain',
          resizeMethod: 'resize',
          fadeDuration: 0,
        });
        expect(image.props.tintColor).toBeUndefined();
      }
    },
  );

  it.each([320, 384, 430])(
    'keeps every visible star core inside the unchanged whitespace at %s dp',
    async width => {
      for (const zone of ZONES) {
        const renderer = await render(
          <HomeSectionDecorations season="autumn" zone={zone} />,
        );
        for (const star of renderer.root
          .findAllByType(Image)
          .filter(
            image => !image.props.testID.startsWith('home-section-tiny-pearl-'),
          )) {
          const style = StyleSheet.flatten(star.props.style);
          const size = style.width;
          expect(style.position).toBe('absolute');
          expect(style.height).toBe(size);
          expect(size).toBeGreaterThanOrEqual(20);
          expect(size).toBeLessThanOrEqual(64);
          expect(style.left).toMatch(/^\d+%$/);
          expect(style.transform).toEqual([{ translateX: -size / 2 }]);
          // Exact alpha-64 source bounds, including contain's vertical padding.
          const scale = size / 1280;
          const left = (parseFloat(style.left) / 100) * (width - 32) - size / 2;
          const top = style.top + (size - 1229 * scale) / 2;
          expect(left + 393 * scale).toBeGreaterThanOrEqual(0);
          expect(left + 891 * scale).toBeLessThanOrEqual(width - 32);
          expect(top + 306 * scale).toBeGreaterThanOrEqual(0);
          expect(top + 914 * scale).toBeLessThanOrEqual(52);
        }
      }
    },
  );

  it('adds three stars below the final diary without restoring its acorns', async () => {
    const renderer = await render(
      <HomeSectionDecorations season="autumn" zone="diary" />,
    );
    const tail = renderer.root.findByProps({
      testID: 'home-section-tail-decorations',
    });
    expect(StyleSheet.flatten(tail.props.style)).toEqual({
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      height: 52,
      overflow: 'hidden',
    });
    expect(tail.props.pointerEvents).toBe('none');
    expect(tail.findAllByType(Image)).toHaveLength(3);
    expect(renderer.root.findAllByType(Image)).toHaveLength(10);
  });

  it('adds only five small pearls near stars in alternating gaps, keeping the rest quiet', async () => {
    let count = 0;
    const pearlZones = [
      'frequent',
      'recent',
      'recommendation',
      'health',
      'diary',
    ];
    for (const zone of ZONES) {
      const renderer = await render(
        <HomeSectionDecorations season="autumn" zone={zone} />,
      );
      const pearls = renderer.root
        .findAllByType(Image)
        .filter(
          image => image.props.testID === `home-section-tiny-pearl-${zone}`,
        );
      expect(pearls).toHaveLength(pearlZones.includes(zone) ? 1 : 0);
      count += pearls.length;
      for (const pearl of pearls) {
        expect(pearl.props.source).toEqual(PEARL);
        const style = StyleSheet.flatten(pearl.props.style);
        expect(style.width).toBeGreaterThanOrEqual(20);
        expect(style.width).toBeLessThanOrEqual(26);
        expect(style.height).toBe(style.width);
        expect(style.opacity).toBe(0.8);
        expect(style.top).toBeGreaterThanOrEqual(0);
        expect(style.top + style.height).toBeLessThanOrEqual(52);
        const stars = renderer.root
          .findAllByType(Image)
          .filter(image =>
            image.props.testID.startsWith(`home-section-star-${zone}-`),
          );
        const centerY = style.top + style.height / 2;
        for (const width of [320, 384, 430]) {
          const centerX = (parseFloat(style.left) / 100) * (width - 32);
          expect(centerX - style.width / 2).toBeGreaterThanOrEqual(0);
          expect(centerX + style.width / 2).toBeLessThanOrEqual(width - 32);
          const distances = stars.map(star => {
            const s = StyleSheet.flatten(star.props.style);
            return Math.hypot(
              centerX - (parseFloat(s.left) / 100) * (width - 32),
              centerY - s.top - s.height / 2,
            );
          });
          expect(Math.min(...distances)).toBeLessThanOrEqual(38);
        }
      }
    }
    expect(count).toBe(5);
  });

  it('uses distinct deterministic placements rather than repeating one row', async () => {
    const placements = new Set<string>();
    for (const zone of ZONES) {
      const renderer = await render(
        <HomeSectionDecorations season="autumn" zone={zone} />,
      );
      const layer = renderer.root.findByProps({
        testID: `home-section-decorations-${zone}`,
      });
      placements.add(
        JSON.stringify(
          layer
            .findAllByType(Image)
            .map(image => StyleSheet.flatten(image.props.style)),
        ),
      );
    }
    expect(placements.size).toBe(9);
  });

  it.each<SeasonKey>(['spring', 'summer', 'winter'])(
    'keeps all lower stars and uses the correct small pearls for %s',
    async season => {
      for (const zone of ZONES) {
        const renderer = await render(
          <HomeSectionDecorations season={season} zone={zone} />,
        );
        const stars = renderer.root
          .findAllByType(Image)
          .filter(
            image =>
              image.props.testID?.startsWith('home-section-star-') ||
              image.props.testID?.startsWith('home-section-tail-star-'),
          );
        expect(stars).toHaveLength(zone === 'diary' ? 9 : 6);
        for (const star of stars) expect(star.props.source).toEqual(STARLIGHT);
        const pearls = renderer.root.findAllByProps({
          testID: `home-section-tiny-pearl-${zone}`,
        });
        expect(pearls.length > 0).toBe(
          ['frequent', 'recent', 'recommendation', 'health', 'diary'].includes(
            zone,
          ),
        );
      }
    },
  );

  it('preserves card actions without new measurements or touch targets', async () => {
    const onPress = jest.fn();
    const renderer = await render(
      <View>
        <TouchableOpacity testID="card-action" onPress={onPress} />
        <HomeSectionDecorations season="autumn" zone="summary" />
      </View>,
    );
    renderer.root.findByProps({ testID: 'card-action' }).props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType(TouchableOpacity)).toHaveLength(1);
    const layer = renderer.root.findByProps({
      testID: 'home-section-decorations-summary',
    });
    expect(layer.props.onLayout).toBeUndefined();
    expect(layer.props.onPress).toBeUndefined();
  });
});
