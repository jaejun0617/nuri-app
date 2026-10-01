import fs from 'node:fs';
import path from 'node:path';

import React from 'react';
import * as ReactNative from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { HomeAmbientBubbleCanvas } from '../src/screens/Main/components/LoggedInHome/HomeAmbientBubbleCanvas';
import {
  getHomeAmbientBubbleSize,
  HOME_AMBIENT_HERO_BUBBLES,
  HOME_AMBIENT_HERO_LIGHTS,
  HOME_AMBIENT_MESH_BASE_COLOR,
  HOME_AMBIENT_MESH_FIELDS,
  HOME_AMBIENT_SCROLL_BUBBLES,
  HOME_AMBIENT_SECTION_ZONES,
  updateHomeAmbientSectionLayout,
  type HomeAmbientSectionLayouts,
  type HomeAmbientBubbleZone,
} from '../src/theme/home/ambientMesh';
import { HOME_AMBIENT_SECTION_LIGHTS } from '../src/theme/home/seasonalAmbient';

const canvasSource = fs.readFileSync(
  path.join(
    __dirname,
    '../src/screens/Main/components/LoggedInHome/HomeAmbientBubbleCanvas.tsx',
  ),
  'utf8',
);
const homeSource = fs.readFileSync(
  path.join(
    __dirname,
    '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
  ),
  'utf8',
);

describe('Home glossy bubble atmosphere', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps a bright base with warm/cool fields fading on both axes', () => {
    expect(HOME_AMBIENT_MESH_BASE_COLOR).toBe('#FFF9F0');
    expect(HOME_AMBIENT_MESH_FIELDS).toHaveLength(12);
    expect(
      HOME_AMBIENT_MESH_FIELDS.some(field =>
        field.colors.some(color => color.includes('234, 242, 248')),
      ),
    ).toBe(true);
    expect(
      HOME_AMBIENT_MESH_FIELDS.every(
        field =>
          field.widthRatio > 1 &&
          field.colors[0].endsWith(', 0)') &&
          field.colors[2].endsWith(', 0)'),
      ),
    ).toBe(true);
    expect(canvasSource).toContain('tintColor: field.colors[1]');
    expect(canvasSource).not.toContain('MaskedView');
    expect(canvasSource).not.toContain('borderRadius');
  });

  it.each([360, 400, 430])(
    'keeps only two edge-cropped Hero spheres at %sdp',
    width => {
      const spheres = HOME_AMBIENT_HERO_BUBBLES.filter(
        bubble => bubble.kind === 'large',
      );
      expect(spheres).toHaveLength(2);
      expect(spheres[0]).toMatchObject({
        topRatio: 0.225,
        centerXRatio: -0.02,
      });
      expect(spheres[1]).toMatchObject({ topRatio: 0.598, centerXRatio: 1.08 });
      for (const bubble of spheres) {
        const size = getHomeAmbientBubbleSize(bubble, width);
        const left = width * bubble.centerXRatio - size / 2;
        const visible = Math.min(width, left + size) - Math.max(0, left);
        expect(visible / size).toBeLessThan(0.5);
        const visibleCenterBoundary =
          bubble.centerXRatio < 0.5 ? left + size : left;
        expect(
          bubble.centerXRatio < 0.5
            ? visibleCenterBoundary < width * 0.3
            : visibleCenterBoundary > width * 0.7,
        ).toBe(true);
      }
      expect(
        new Set(HOME_AMBIENT_HERO_BUBBLES.map(bubble => bubble.sizeRatio)).size,
      ).toBe(8);
    },
  );

  it.each<HomeAmbientBubbleZone>([
    'weather',
    'frequent',
    'summary',
    'recent',
    'photo',
    'community',
    'recommendation',
    'schedule',
    'health',
    'today-tip',
    'diary',
  ])('balances cropped and complete spheres through %s', zone => {
    const bubbles = HOME_AMBIENT_SCROLL_BUBBLES.filter(
      bubble => bubble.zone === zone,
    );
    expect(bubbles.filter(bubble => bubble.kind === 'large')).toHaveLength(zone === 'summary' ? 3 : zone === 'weather' ? 2 : 1);
    expect(bubbles.filter(bubble => bubble.kind === 'medium')).toHaveLength(zone === 'weather' ? 2 : 1);
    expect(
      bubbles.every(
        bubble => bubble.kind === 'small' || bubble.centerXRatio <= 0.24 || bubble.centerXRatio >= 0.76,
      ),
    ).toBe(true);
  });

  it.each([360, 400, 430])(
    'matches the three decoration families and keeps complete spheres visible at %sdp',
    width => {
      const sizes = HOME_AMBIENT_SCROLL_BUBBLES.map(bubble =>
        getHomeAmbientBubbleSize(bubble, width),
      );
      expect(sizes.every(size => size >= 18 && size <= 150)).toBe(true);
      expect(new Set(sizes).size).toBeGreaterThanOrEqual(8);
      const large = HOME_AMBIENT_SCROLL_BUBBLES.filter(bubble => bubble.kind === 'large');
      expect(large).toHaveLength(14);
      for (const bubble of large) {
        const size = getHomeAmbientBubbleSize(bubble, width);
        const left = width * bubble.centerXRatio - size / 2;
        const visible = Math.min(width, left + size) - Math.max(0, left);
        expect(visible / size).toBeGreaterThan(0.42);
        expect(visible / size).toBeLessThan(0.5);
        expect(size / width).toBeLessThanOrEqual(0.35);
      }
      const complete = HOME_AMBIENT_SCROLL_BUBBLES.filter(bubble => bubble.kind === 'medium');
      expect(complete).toHaveLength(12);
      for (const bubble of complete) {
        const size = getHomeAmbientBubbleSize(bubble, width);
        const left = Math.round(width * bubble.centerXRatio - size / 2);
        expect(left).toBeGreaterThanOrEqual(8);
        expect(left + size).toBeLessThanOrEqual(width - 8);
        if (bubble.offsetY === -14) {
          expect(bubble.offsetY - size / 2).toBeGreaterThanOrEqual(-40);
          expect(bubble.offsetY + size / 2).toBeLessThanOrEqual(12);
        }
      }
      const diaryDetails = HOME_AMBIENT_SCROLL_BUBBLES.filter(bubble => bubble.kind === 'small' && bubble.zone === 'diary');
      expect(diaryDetails).toHaveLength(2);
      expect(diaryDetails.every(bubble => bubble.zone === 'diary')).toBe(true);
      expect(diaryDetails.every(bubble => getHomeAmbientBubbleSize(bubble, width) <= 28)).toBe(true);
      expect(HOME_AMBIENT_HERO_LIGHTS).toHaveLength(9);
      expect(HOME_AMBIENT_SECTION_LIGHTS).toHaveLength(16);
    },
  );

  it('uses one optimized RGBA sphere, not a full-screen bitmap wallpaper', () => {
    const asset = fs.readFileSync(
      path.join(
        __dirname,
        '../src/assets/seasonal/home/autumn/bubbles/pearl-bubble-v1.png',
      ),
    );
    expect(asset.subarray(1, 4).toString()).toBe('PNG');
    expect(asset.readUInt32BE(16)).toBe(768);
    expect(asset.readUInt32BE(20)).toBe(768);
    expect(asset[25]).toBe(6);
    expect(asset.byteLength).toBeLessThan(900_000);
    const glow = fs.readFileSync(
      path.join(
        __dirname,
        '../src/assets/seasonal/home/autumn/bubbles/soft-radial-glow-v1.png',
      ),
    );
    expect(glow.readUInt32BE(16)).toBe(192);
    expect(glow.readUInt32BE(20)).toBe(192);
    expect(glow[25]).toBe(6);
    expect(glow.byteLength).toBeLessThan(100_000);
    expect(canvasSource.match(/require\(/g)).toHaveLength(1);
    expect(canvasSource).toContain('source={texture}');
    expect(canvasSource).toContain('resizeMode="contain"');
    expect(canvasSource).not.toContain('BlurView');
    expect(canvasSource).not.toContain('Animated');
    expect(canvasSource).not.toContain('onScroll');
  });

  it('owns the actual full-content bounds behind unchanged interactive content', async () => {
    const layouts: HomeAmbientSectionLayouts = {};
    HOME_AMBIENT_SECTION_ZONES.forEach((zone, index) => {
      layouts[zone] = { y: index * 400, height: 360 };
    });
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        React.createElement(HomeAmbientBubbleCanvas, { heroHeight: 704, sectionOrigin: 940, sectionLayouts: layouts }),
      );
    });
    if (!renderer) throw new Error('Home canvas did not render');
    const canvas = renderer.root.findAll(
      node =>
        node.type === ReactNative.View &&
        node.props.testID === 'home-ambient-bubble-canvas',
    )[0];
    expect(canvas.props.pointerEvents).toBe('none');
    expect(canvas.props.accessible).toBe(false);
    expect(canvas.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(ReactNative.StyleSheet.flatten(canvas.props.style)).toMatchObject({
      position: 'absolute',
      top: 0,
      bottom: 0,
      overflow: 'hidden',
    });
    const lower = renderer.root.findAll(
      node =>
        node.type === ReactNative.View &&
        node.props.testID === 'home-ambient-lower-layer',
    )[0];
    expect(ReactNative.StyleSheet.flatten(lower.props.style)).toMatchObject({
      position: 'absolute',
      top: 704,
      bottom: 0,
    });
    expect(renderer.root.findAllByType(ReactNative.Image)).toHaveLength(
      HOME_AMBIENT_HERO_BUBBLES.length +
        HOME_AMBIENT_SCROLL_BUBBLES.length +
        HOME_AMBIENT_MESH_FIELDS.length +
        22 +
        HOME_AMBIENT_HERO_LIGHTS.length +
        HOME_AMBIENT_SECTION_LIGHTS.length,
    );
    await ReactTestRenderer.act(async () => {
      renderer?.update(
        React.createElement(HomeAmbientBubbleCanvas, { heroHeight: 812, sectionOrigin: 1048, sectionLayouts: layouts }),
      );
    });
    expect(ReactNative.StyleSheet.flatten(lower.props.style).top).toBe(812);
    expect(canvasSource).not.toContain('onLayout=');
    expect(canvasSource).not.toContain('useState');
    expect(homeSource.indexOf('<HomeAmbientBubbleCanvas')).toBeLessThan(
      homeSource.indexOf('<SeasonalHomeAutumnStage'),
    );
    expect(homeSource).toContain('heroHeight={seasonalHeroViewportHeight}');
    await ReactTestRenderer.act(async () => renderer?.unmount());
  });

  it('updates layout only when real section geometry changes', () => {
    const initial: HomeAmbientSectionLayouts = {};
    expect(updateHomeAmbientSectionLayout(initial, 'summary', { y: NaN, height: 100 })).toBe(initial);
    expect(updateHomeAmbientSectionLayout(initial, 'summary', { y: 100, height: 0 })).toBe(initial);
    const measured = updateHomeAmbientSectionLayout(initial, 'summary', { y: 500.1, height: 360.1 });
    expect(measured.summary).toEqual({ y: 500, height: 360 });
    expect(updateHomeAmbientSectionLayout(measured, 'summary', { y: 500.2, height: 360.2 })).toBe(measured);
    const resized = updateHomeAmbientSectionLayout(measured, 'summary', { y: 600, height: 540 });
    expect(resized.summary).toEqual({ y: 600, height: 540 });
  });

  it('keeps Summary corner decoration attached when content above it grows', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    const bubble = HOME_AMBIENT_SCROLL_BUBBLES.find(item => item.zone === 'summary' && item.kind === 'large');
    if (!bubble) throw new Error('Summary sphere missing');
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(React.createElement(HomeAmbientBubbleCanvas, {
        heroHeight: 704, sectionOrigin: 940, sectionLayouts: { summary: { y: 500, height: 360 } },
      }));
    });
    if (!renderer) throw new Error('Home canvas did not render');
    const findSphere = () => renderer?.root.findAllByType(ReactNative.Image).find(node => node.props.testID === `home-ambient-lower-bubble-${HOME_AMBIENT_SCROLL_BUBBLES.indexOf(bubble)}`);
    const firstStyle = ReactNative.StyleSheet.flatten(findSphere()?.props.style);
    expect(firstStyle.top).toBe(Math.round(940 + 500 + 360 * 0.12 - 704 - firstStyle.width / 2));
    await ReactTestRenderer.act(async () => {
      renderer?.update(React.createElement(HomeAmbientBubbleCanvas, {
        heroHeight: 704, sectionOrigin: 940, sectionLayouts: { summary: { y: 700, height: 540 } },
      }));
    });
    const nextStyle = ReactNative.StyleSheet.flatten(findSphere()?.props.style);
    expect(nextStyle.top).toBe(Math.round(940 + 700 + 540 * 0.12 - 704 - nextStyle.width / 2));
    await ReactTestRenderer.act(async () => renderer?.unmount());
  });

  it('keeps full spheres in panel gaps and beside the recommendation emphasis as content grows', async () => {
    for (const height of [240, 620, 1100]) {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(React.createElement(HomeAmbientBubbleCanvas, {
          heroHeight: 704,
          sectionOrigin: 940,
          sectionLayouts: {
            frequent: { y: 0, height },
            recommendation: { y: 1600, height },
          },
        }));
      });
      if (!renderer) throw new Error('Home canvas did not render');
      for (const [zone, offset] of [['frequent', -14], ['recommendation', 98]] as const) {
        const bubble = HOME_AMBIENT_SCROLL_BUBBLES.find(item => item.zone === zone && item.kind === 'medium');
        if (!bubble) throw new Error('Complete sphere missing');
        const sphere = renderer.root.findAllByType(ReactNative.Image).find(node => node.props.testID === `home-ambient-lower-bubble-${HOME_AMBIENT_SCROLL_BUBBLES.indexOf(bubble)}`);
        const style = ReactNative.StyleSheet.flatten(sphere?.props.style);
        expect(style.top).toBe(Math.round(940 + (zone === 'frequent' ? 0 : 1600) + offset - 704 - style.width / 2));
        if (zone === 'recommendation') {
          expect(bubble.centerXRatio).toBe(0.83);
          expect(offset - style.width / 2).toBeGreaterThan(66);
        }
      }
      await ReactTestRenderer.act(async () => renderer?.unmount());
    }
  });

  it('waits for the measured Weather interval before rendering its decoration', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(React.createElement(HomeAmbientBubbleCanvas, {
        heroHeight: 704, sectionOrigin: 0,
      }));
    });
    if (!renderer) throw new Error('Home canvas did not render');
    expect(renderer.root.findAllByType(ReactNative.Image).filter(node => /home-ambient-lower-bubble-/.test(node.props.testID ?? ''))).toHaveLength(0);
    await ReactTestRenderer.act(async () => renderer?.unmount());
  });
});
