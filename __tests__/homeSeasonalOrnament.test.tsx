import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import {
  HOME_ORNAMENT_ATLASES,
  HomeSeasonalOrnament,
} from '../src/screens/Main/components/LoggedInHome/HomeSeasonalOrnament';

const SEASONS = ['spring', 'summer', 'winter'] as const;
const ROLES = ['cluster', 'accent', 'pearl'] as const;
const frames = {
  cluster: { width: 108, height: 102 },
  accent: { width: 90, height: 75 },
  pearl: { width: 26, height: 26 },
};

describe('read-only seasonal ornament windows', () => {
  const renderers: TestRenderer.ReactTestRenderer[] = [];
  async function render(node: React.ReactElement) {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(node);
      renderers.push(renderer);
    });
    return renderer!;
  }
  function host(renderer: TestRenderer.ReactTestRenderer, id: string) {
    const node = renderer.root.findAll(
      n => typeof n.type === 'string' && n.props.testID === id,
    )[0];
    if (!node) throw new Error(`Missing ${id}`);
    return node;
  }
  afterEach(async () => {
    for (const renderer of renderers.splice(0))
      await act(async () => renderer.unmount());
  });

  it.each(SEASONS.flatMap(season => ROLES.map(role => ({ season, role }))))(
    'shows only the $role from $season inside its fixed frame',
    async ({ season, role }) => {
      const frame = frames[role];
      const renderer = await render(
        <HomeSeasonalOrnament
          season={season}
          role={role}
          testID="ornament"
          style={{ ...frame, left: 8, top: 2 }}
        />,
      );
      const root = host(renderer, 'ornament');
      expect(root.props).toMatchObject({
        pointerEvents: 'none',
        accessible: false,
        importantForAccessibility: 'no-hide-descendants',
      });
      expect(StyleSheet.flatten(root.props.style)).toEqual({
        position: 'absolute',
        ...frame,
        left: 8,
        top: 2,
        overflow: 'hidden',
      });
      expect(root.props.onLayout).toBeUndefined();
      expect(root.props.onPress).toBeUndefined();
      const viewport = StyleSheet.flatten(
        host(renderer, 'ornament-viewport').props.style,
      );
      const atlas = HOME_ORNAMENT_ATLASES[season];
      const region = atlas.regions[role];
      expect(region.left).toBeGreaterThanOrEqual(0);
      expect(region.top).toBeGreaterThanOrEqual(0);
      expect(region.left + region.width).toBeLessThanOrEqual(atlas.size);
      expect(region.top + region.height).toBeLessThanOrEqual(atlas.size);
      expect(viewport.overflow).toBe('hidden');
      expect(viewport.left).toBeGreaterThanOrEqual(0);
      expect(viewport.top).toBeGreaterThanOrEqual(0);
      expect(viewport.left + viewport.width).toBeLessThanOrEqual(frame.width);
      expect(viewport.top + viewport.height).toBeLessThanOrEqual(frame.height);
      const image = host(renderer, 'ornament-atlas');
      expect(renderer.root.findAllByType(Image)).toHaveLength(1);
      expect(image.props.source).toEqual(atlas.source);
      expect(image.props).toMatchObject({
        pointerEvents: 'none',
        accessible: false,
        resizeMethod: 'resize',
        fadeDuration: 0,
      });
      expect(image.props.tintColor).toBeUndefined();
      const imageStyle = StyleSheet.flatten(image.props.style);
      const scale = viewport.width / region.width;
      expect(imageStyle.width).toBeCloseTo(atlas.size * scale);
      expect(imageStyle.height).toBeCloseTo(atlas.size * scale);
      expect(imageStyle.left).toBeCloseTo(-region.left * scale);
      expect(imageStyle.top).toBeCloseTo(-region.top * scale);
    },
  );

  it.each(SEASONS)(
    'keeps the %s sheet byte-identical to its source',
    season => {
      const file = `${season}-colored-glass-collection-v1.png`;
      const hash = (filePath: string) =>
        createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
      expect(
        hash(
          path.join(
            __dirname,
            '../src/assets/seasonal/home',
            season,
            'glass',
            file,
          ),
        ),
      ).toBe(
        hash(
          path.join(
            __dirname,
            '../output/imagegen/nuri-three-season-glass-concepts-v1-20261017',
            file,
          ),
        ),
      );
    },
  );

  it('replaces the sheet on season changes without changing the frame', async () => {
    const renderer = await render(
      <HomeSeasonalOrnament
        season="spring"
        role="cluster"
        testID="ornament"
        style={frames.cluster}
      />,
    );
    const before = StyleSheet.flatten(host(renderer, 'ornament').props.style);
    await act(async () =>
      renderer.update(
        <HomeSeasonalOrnament
          season="winter"
          role="cluster"
          testID="ornament"
          style={frames.cluster}
        />,
      ),
    );
    expect(StyleSheet.flatten(host(renderer, 'ornament').props.style)).toEqual(
      before,
    );
    expect(host(renderer, 'ornament-atlas').props.source).toEqual(
      HOME_ORNAMENT_ATLASES.winter.source,
    );
  });

  it.each(ROLES)(
    'preserves the original direct autumn Image for %s',
    async role => {
      const renderer = await render(
        <HomeSeasonalOrnament
          season="autumn"
          role={role}
          testID="ornament"
          style={frames[role]}
        />,
      );
      expect(renderer.root.findAllByType(Image)).toHaveLength(1);
      expect(host(renderer, 'ornament').props.resizeMode).toBe('contain');
      expect(
        renderer.root.findAll(n => n.props.testID === 'ornament-viewport'),
      ).toHaveLength(0);
    },
  );
});
