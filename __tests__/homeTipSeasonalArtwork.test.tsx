import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import { HomeTipSeasonalArtwork } from '../src/screens/Main/components/LoggedInHome/HomeTipSeasonalArtwork';
import { HOME_ORNAMENT_ATLASES } from '../src/screens/Main/components/LoggedInHome/HomeSeasonalOrnament';
import type { SeasonKey } from '../src/theme/seasonal/season';

const SEASONS: readonly SeasonKey[] = ['spring', 'summer', 'autumn', 'winter'];
const SOURCES = {
  autumn: require('../src/assets/seasonal/home/autumn/glass/autumn-glass-maple-coral-v1.png'),
  summer: require('../src/assets/seasonal/home/summer/glass/summer-wave-droplets-glass-v1.png'),
  spring: HOME_ORNAMENT_ATLASES.spring.source,
  winter: HOME_ORNAMENT_ATLASES.winter.source,
};
const SMALL_SOURCES = {
  autumn: [
    SOURCES.autumn,
    require('../src/assets/seasonal/home/autumn/glass/autumn-glass-ginkgo-amber-v1.png'),
  ],
  spring: [SOURCES.spring, SOURCES.spring],
  summer: [
    HOME_ORNAMENT_ATLASES.summer.source,
    HOME_ORNAMENT_ATLASES.summer.source,
  ],
  winter: [SOURCES.winter, SOURCES.winter],
};

function smallImages(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType(Image)
    .filter(node =>
      String(node.props.testID).startsWith('home-today-tip-small-ornament-'),
    );
}

function mainImage(renderer: TestRenderer.ReactTestRenderer) {
  const image = renderer.root
    .findAllByType(Image)
    .find(node =>
      [
        'home-today-tip-seasonal-art',
        'home-today-tip-seasonal-art-atlas',
      ].includes(node.props.testID),
    );
  if (!image) throw new Error('Missing primary Today Tip artwork');
  return image;
}

describe('Today Tip seasonal glass artwork', () => {
  it.each(SEASONS)(
    'selects both small specimens from %s only',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeTipSeasonalArtwork season={season} />,
        );
      });
      expect(smallImages(renderer).map(image => image.props.source)).toEqual(
        SMALL_SOURCES[season],
      );
      await act(async () => renderer.unmount());
    },
  );

  it.each([
    { season: 'spring', left: 660, top: 650, width: 230, height: 275 },
    { season: 'summer', left: 200, top: 545, width: 390, height: 340 },
    { season: 'winter', left: 740, top: 18, width: 465, height: 520 },
  ] as const)(
    'clips only the intended small $season specimens',
    async region => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeTipSeasonalArtwork season={region.season} />,
        );
      });
      for (const image of smallImages(renderer)) {
        const style = StyleSheet.flatten(image.props.style);
        expect(parseFloat(style.left)).toBeCloseTo(
          (-region.left / region.width) * 100,
        );
        expect(parseFloat(style.top)).toBeCloseTo(
          (-region.top / region.height) * 100,
        );
        expect(parseFloat(style.width)).toBeCloseTo(
          (1254 / region.width) * 100,
        );
        expect(parseFloat(style.height)).toBeCloseTo(
          (1254 / region.height) * 100,
        );
      }
      await act(async () => renderer.unmount());
    },
  );

  it.each(['autumn', 'summer', 'winter'] as const)(
    'never renders a spring petal source during %s',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeTipSeasonalArtwork season={season} />,
        );
      });
      expect(
        renderer.root.findAllByType(Image).map(image => image.props.source),
      ).not.toContain(HOME_ORNAMENT_ATLASES.spring.source);
      await act(async () => renderer.unmount());
    },
  );

  it.each(SEASONS)(
    'layers seasonal specimens, a seasonal pearl and three glints inside the %s art slot',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeTipSeasonalArtwork season={season} />,
        );
      });
      const layers = renderer.root.findAllByProps({
        testID: 'home-today-tip-detail-layer',
      });
      expect(layers.length).toBeGreaterThan(0);
      expect(StyleSheet.flatten(layers[0].props.style)).toMatchObject({
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: 'hidden',
      });
      expect(layers[0].props.pointerEvents).toBe('none');
      expect(layers[0].props.accessibilityElementsHidden).toBe(true);
      expect(renderer.root.findAllByType(Image)).toHaveLength(7);
      expect(
        renderer.root
          .findAllByType(Image)
          .filter(node =>
            String(node.props.testID).startsWith('home-today-tip-glint-'),
          ),
      ).toHaveLength(3);
      for (const id of [
        'home-today-tip-small-ornament-0',
        'home-today-tip-small-ornament-1',
        'home-today-tip-pearl',
      ]) {
        const ornament = renderer.root.findAll(
          node => typeof node.type === 'string' && node.props.testID === id,
        )[0];
        expect(ornament).toBeDefined();
        expect(ornament.props.pointerEvents).toBe('none');
        expect(ornament.props.accessible).toBe(false);
      }
      await act(async () => renderer.unmount());
    },
  );

  it.each(SEASONS)(
    'uses one decorative %s specimen in the unchanged slot',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeTipSeasonalArtwork season={season} />,
        );
      });
      const frame = renderer.root.findByProps({
        testID: 'home-today-tip-art-frame',
      });
      expect(StyleSheet.flatten(frame.props.style)).toEqual({
        alignSelf: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        width: '30%',
        maxWidth: 108,
        aspectRatio: 1,
      });
      expect(frame.props.pointerEvents).toBe('none');
      expect(frame.props.accessible).toBe(false);
      expect(frame.props.accessibilityElementsHidden).toBe(true);
      expect(frame.props.importantForAccessibility).toBe('no-hide-descendants');
      const image = mainImage(renderer);
      expect(image.props.source).toBe(SOURCES[season]);
      expect(image.props.fadeDuration).toBe(0);
      expect(image.props.resizeMethod).toBe('resize');
      expect(renderer.root.findAllByType(TouchableOpacity)).toHaveLength(0);
      expect(StyleSheet.flatten(image.props.style)).not.toHaveProperty(
        'tintColor',
      );
      expect(image.props.onLayout).toBeUndefined();
      await act(async () => renderer.unmount());
    },
  );

  it.each(['spring', 'winter'] as const)(
    'clips only the %s accent and preserves its aspect ratio at all slot sizes',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeTipSeasonalArtwork season={season} />,
        );
      });
      const atlas = HOME_ORNAMENT_ATLASES[season];
      const rect = atlas.regions.accent;
      const viewport = StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-today-tip-seasonal-art' })
          .props.style,
      );
      const image = mainImage(renderer);
      const canvas = StyleSheet.flatten(image.props.style);
      const percent = (value: string) => parseFloat(value) / 100;
      expect(viewport.overflow).toBe('hidden');
      expect(viewport.position).toBe('absolute');
      expect(image.props.resizeMode).toBe('stretch');
      for (const screen of [320, 360, 400, 430]) {
        const slot = Math.min((screen - 32 - 28) * 0.3, 108);
        const w = slot * percent(viewport.width);
        const h = slot * percent(viewport.height);
        const scale = w / rect.width;
        expect(w / h).toBeCloseTo(rect.width / rect.height, 10);
        expect(w * percent(canvas.width)).toBeCloseTo(atlas.size * scale, 10);
        expect(h * percent(canvas.height)).toBeCloseTo(atlas.size * scale, 10);
        expect(w * percent(canvas.left)).toBeCloseTo(-rect.left * scale, 10);
        expect(h * percent(canvas.top)).toBeCloseTo(-rect.top * scale, 10);
        expect(slot * percent(viewport.left) + w).toBeLessThan(slot);
        expect(slot * percent(viewport.top) + h).toBeLessThan(slot);
      }
      await act(async () => renderer.unmount());
    },
  );

  it.each(['autumn', 'summer'] as const)(
    'contains the entire %s PNG without a crop viewport',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeTipSeasonalArtwork season={season} />,
        );
      });
      expect(mainImage(renderer).props.resizeMode).toBe('contain');
      expect(StyleSheet.flatten(mainImage(renderer).props.style)).toEqual({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      });
      expect(
        renderer.root.findAllByProps({
          testID: 'home-today-tip-seasonal-art-atlas',
        }),
      ).toHaveLength(0);
      await act(async () => renderer.unmount());
    },
  );

  it('replaces artwork when switching season without keeping a stale specimen', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <HomeTipSeasonalArtwork season="autumn" />,
      );
    });
    for (const season of SEASONS) {
      await act(async () =>
        renderer.update(<HomeTipSeasonalArtwork season={season} />),
      );
      expect(renderer.root.findAllByType(Image)).toHaveLength(7);
      expect(mainImage(renderer).props.source).toBe(SOURCES[season]);
      expect(smallImages(renderer).map(image => image.props.source)).toEqual(
        SMALL_SOURCES[season],
      );
    }
    await act(async () => renderer.unmount());
  });

  it('ships the transparent summer wave and droplets as an exact source copy', () => {
    const root = path.join(__dirname, '..');
    const runtime = fs.readFileSync(
      path.join(
        root,
        'src/assets/seasonal/home/summer/glass/summer-wave-droplets-glass-v1.png',
      ),
    );
    const source = fs.readFileSync(
      path.join(
        root,
        'output/imagegen/nuri-today-tip-seasonal-v1-20261017/summer-wave-droplets-glass-v1.png',
      ),
    );
    expect(runtime.equals(source)).toBe(true);
    expect(runtime[25]).toBe(6);
    expect(runtime.readUInt32BE(16)).toBe(1254);
    expect(runtime.readUInt32BE(20)).toBe(1254);
    expect(crypto.createHash('sha256').update(runtime).digest('hex')).toBe(
      '697cb36e9893b776372ba9351841f437980c95ca127c5070cdafa1d74a526bf5',
    );
  });
});
