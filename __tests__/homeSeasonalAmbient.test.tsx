import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import * as ReactNative from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { HomeAmbientBubbleCanvas } from '../src/screens/Main/components/LoggedInHome/HomeAmbientBubbleCanvas';
import { SeasonalHomeAutumnStage } from '../src/screens/Main/components/LoggedInHome/SeasonalHomeAutumn';
import {
  HOME_AMBIENT_BASE_GRADIENT,
  HOME_AMBIENT_MESH_FIELDS,
  HOME_AMBIENT_SCROLL_BUBBLES,
  HOME_AMBIENT_SECTION_ZONES,
  type HomeAmbientSectionLayouts,
} from '../src/theme/home/ambientMesh';
import {
  getHomeAmbientVisual,
  HOME_AMBIENT_SECTION_LIGHTS,
} from '../src/theme/home/seasonalAmbient';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');

const SEASONS: readonly SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];
const homeSource = fs.readFileSync(
  path.join(
    __dirname,
    '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
  ),
  'utf8',
);

describe('seasonal Home ambient material', () => {
  afterEach(() => jest.restoreAllMocks());

  it('retains the approved Autumn Hero descriptors and pearl material', () => {
    const autumn = getHomeAmbientVisual('autumn');
    expect(autumn.baseGradient).toBe(HOME_AMBIENT_BASE_GRADIENT);
    expect(autumn.fields).toBe(HOME_AMBIENT_MESH_FIELDS);
    expect(autumn.baseColor).toBe('#FFF9F0');
    expect(autumn.heroFields).toEqual([]);
    expect(autumn.sectionFields).toHaveLength(20);
    expect(autumn.centerWashOpacity).toBe(0.38);
    expect(autumn.glassSurface).toBe('rgba(255, 252, 246, 0.50)');
    expect(autumn.lightHalo).toBe('#FFFDEB');
  });

  it.each(SEASONS)(
    '%s has stable, low-contrast dimension-relative material',
    season => {
      const visual = getHomeAmbientVisual(season);
      expect(getHomeAmbientVisual(season)).toBe(visual);
      expect(visual.baseGradient).toHaveLength(5);
      expect(visual.sectionFields).toHaveLength(20);
      expect(visual.glassSurface).toContain('0.50');
      if (season !== 'autumn') {
        expect(visual.fields).toEqual([]);
        expect(visual.heroFields.length).toBeGreaterThanOrEqual(6);
        expect(visual.sectionFields).toHaveLength(20);
        for (const field of [...visual.heroFields, ...visual.sectionFields]) {
          expect(field.widthRatio).toBeGreaterThan(1);
          expect(field.heightRatio).toBeGreaterThan(0.5);
          expect(field.centerYRatio).toBeGreaterThanOrEqual(0);
          expect(field.centerYRatio).toBeLessThanOrEqual(1);
          expect(field.opacity).toBeLessThanOrEqual(0.68);
        }
      }
    },
  );

  it('distinguishes powder-blue winter, blush spring and aqua-mint summer', () => {
    const colors = (season: SeasonKey) =>
      getHomeAmbientVisual(season).heroFields.map(field => field.color);
    expect(colors('winter')).toContain('#D4EAFE');
    expect(colors('winter')).toContain('#E5E2F8');
    expect(colors('spring')).toContain('#FFDCE7');
    expect(colors('spring')).toContain('#F7D4E7');
    expect(colors('summer')).toContain('#C9F2F8');
    expect(colors('summer')).toContain('#D4F5E2');
    expect(
      new Set(SEASONS.map(season => getHomeAmbientVisual(season).baseColor))
        .size,
    ).toBe(4);
  });

  it.each(
    SEASONS.flatMap(season =>
      [360, 400, 430].map(width => ({ season, width })),
    ),
  )(
    '$season keeps the full-height canvas behind content at $width dp',
    async ({ season, width }) => {
      jest
        .spyOn(ReactNative.Dimensions, 'get')
        .mockReturnValue({ width, height: 832, scale: 3, fontScale: 1 });
      const layouts: HomeAmbientSectionLayouts = {};
      HOME_AMBIENT_SECTION_ZONES.forEach((zone, index) => {
        layouts[zone] = { y: index * 400, height: 360 };
      });
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <HomeAmbientBubbleCanvas
            season={season}
            heroHeight={704}
            sectionOrigin={940}
            sectionLayouts={layouts}
          />,
        );
      });
      if (!renderer) throw new Error('Seasonal canvas did not render');
      const root = renderer.root;
      const canvas = root.findAll(
        node =>
          node.type === ReactNative.View &&
          node.props.testID === 'home-ambient-bubble-canvas',
      )[0];
      expect(canvas.props.pointerEvents).toBe('none');
      expect(canvas.props.accessibilityElementsHidden).toBe(true);
      expect(ReactNative.StyleSheet.flatten(canvas.props.style)).toMatchObject({
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: -16,
        right: -16,
        overflow: 'hidden',
        backgroundColor: getHomeAmbientVisual(season).baseColor,
      });
      const lowerBubbles = root.findAll(
        node =>
          typeof node.props.testID === 'string' &&
          node.props.testID.startsWith('home-ambient-lower-bubble-') &&
          (node.type === ReactNative.View || node.type === ReactNative.Image),
      );
      expect(lowerBubbles).toHaveLength(HOME_AMBIENT_SCROLL_BUBBLES.length);
      lowerBubbles.forEach((node, index) => {
        const style = ReactNative.StyleSheet.flatten(node.props.style);
        const bubble = HOME_AMBIENT_SCROLL_BUBBLES[index];
        expect(style.width).toBeGreaterThanOrEqual(bubble.minimumSize);
        expect(style.width).toBeLessThanOrEqual(bubble.maximumSize);
        expect(style.left).toBe(
          Math.round(width * bubble.centerXRatio - style.width / 2),
        );
      });
      const spheres = root
        .findAllByType(ReactNative.Image)
        .filter(node =>
          /home-ambient-(hero|lower)-bubble-/.test(node.props.testID ?? ''),
        );
      expect(spheres).toHaveLength(32);
      spheres.forEach(node => {
        const style = ReactNative.StyleSheet.flatten(node.props.style);
        expect(node.props.source).toBe(
          getHomeAmbientVisual(season).bubbleTexture,
        );
        expect(style.tintColor).toBeUndefined();
        expect(style.width).toBeLessThanOrEqual(290);
        expect(style.height).toBe(style.width);
      });
      const heroFields = root
        .findAllByType(ReactNative.Image)
        .filter(node =>
          /home-ambient-hero-field-/.test(node.props.testID ?? ''),
        );
      heroFields.forEach((node, index) => {
        const descriptor = getHomeAmbientVisual(season).heroFields[index];
        const style = ReactNative.StyleSheet.flatten(node.props.style);
        expect(style.top + style.height / 2).toBeCloseTo(
          704 * descriptor.centerYRatio,
          0,
        );
      });
      const anchored = root
        .findAllByType(ReactNative.Image)
        .filter(node =>
          /home-ambient-section-field-/.test(node.props.testID ?? ''),
        );
      expect(anchored).toHaveLength(20);
      anchored.forEach((node, index) => {
        const descriptor = getHomeAmbientVisual(season).sectionFields[index];
        const layout = layouts[descriptor.zone];
        if (!layout) throw new Error('Field has no measured anchor');
        const style = ReactNative.StyleSheet.flatten(node.props.style);
        expect(style.top).toBe(
          Math.round(
            940 +
              layout.y +
              layout.height * descriptor.centerYRatio -
              style.height / 2,
          ),
        );
      });
      expect(
        root.findAll(node =>
          [
            'home-ambient-lower-atmosphere',
            'home-ambient-lower-tone-transition',
            'home-ambient-lower-field-fade',
          ].includes(node.props.testID),
        ),
      ).toHaveLength(0);
      const wash = root.findAll(
        node => node.props.testID === 'home-ambient-hero-center-wash',
      )[0];
      expect(ReactNative.StyleSheet.flatten(wash.props.style).height).toBe(704);
      const edgeWash = root.findAll(
        node => node.props.testID === 'home-ambient-lower-edge-wash',
      )[0];
      expect(
        ReactNative.StyleSheet.flatten(edgeWash.props.style),
      ).toMatchObject({
        position: 'absolute',
        top: 704,
        bottom: 0,
      });
      expect(edgeWash.props.colors).toEqual([
        ...getHomeAmbientVisual(season).lowerEdgeWash,
      ]);
      expect(edgeWash.props.colors[2]).toMatch(/, 0\)$/);
      expect(
        ReactNative.StyleSheet.flatten(edgeWash.props.style).backgroundColor,
      ).toBeUndefined();
      const handoff = root.findAll(
        node => node.props.testID === 'home-ambient-edge-handoff',
      )[0];
      expect(ReactNative.StyleSheet.flatten(handoff.props.style)).toMatchObject(
        {
          top: 704,
          height: Math.round(width * 0.42),
        },
      );
      const lights = root.findAll(
        node =>
          node.type === ReactNative.View &&
          /^home-ambient-lower-light-/.test(node.props.testID ?? ''),
      );
      expect(lights).toHaveLength(HOME_AMBIENT_SECTION_LIGHTS.length);
      lights.forEach((node, index) => {
        const descriptor = HOME_AMBIENT_SECTION_LIGHTS[index];
        const layout = layouts[descriptor.zone];
        const origin = layout ? 940 + layout.y : 704;
        const height = layout ? layout.height : 940 - 704;
        const style = ReactNative.StyleSheet.flatten(node.props.style);
        expect(style.top).toBe(
          Math.round(origin + height * descriptor.topRatio - 704),
        );
        expect(style.width).toBeGreaterThanOrEqual(12);
        expect(style.width).toBeLessThanOrEqual(22);
        expect(style.left).toBe(
          Math.round(width * descriptor.centerXRatio - style.width / 2),
        );
      });
      await ReactTestRenderer.act(async () => renderer?.unmount());
    },
  );

  it.each(SEASONS)(
    '%s keeps three-tone color movement instead of a uniform lower cover',
    season => {
      const visual = getHomeAmbientVisual(season);
      expect(new Set(visual.sectionFields.map(field => field.color)).size).toBe(
        3,
      );
      expect(new Set(visual.sectionFields.map(field => field.opacity))).toEqual(
        new Set(season === 'autumn' ? [0.4, 0.34] : [0.66, 0.58]),
      );
      for (const field of visual.sectionFields) {
        expect(field.color).not.toBe('#FFFFFF');
        expect(HOME_AMBIENT_SECTION_ZONES).toContain(field.zone);
      }
    },
  );

  it.each([
    { season: 'winter', whiteTone: '#FFF9ED', softenedTone: '#DEE6F7' },
    { season: 'spring', whiteTone: '#FFF0DF', softenedTone: '#F7DCE9' },
    { season: 'summer', whiteTone: '#FFFBE4', softenedTone: '#D9F2E8' },
  ] as const)(
    '$season replaces the pale lower neutral field while retaining Hero luminance',
    ({ season, whiteTone, softenedTone }) => {
      const visual = getHomeAmbientVisual(season);
      const heroColors = new Set(visual.heroFields.map(field => field.color));
      const lowerColors = new Set(
        visual.sectionFields.map(field => field.color),
      );
      expect(heroColors).toContain(whiteTone);
      expect(heroColors).not.toContain(softenedTone);
      expect(lowerColors).toContain(softenedTone);
      expect(lowerColors).not.toContain(whiteTone);
      for (const color of heroColors) {
        if (color !== whiteTone) expect(lowerColors).toContain(color);
      }
      const luminance = (color: string) =>
        [0.2126, 0.7152, 0.0722].reduce(
          (total, weight, index) =>
            total +
            weight * parseInt(color.slice(1 + index * 2, 3 + index * 2), 16),
          0,
        );
      expect(luminance(softenedTone)).toBeLessThan(luminance(whiteTone) - 10);
    },
  );

  it('uses pink rather than mint in every Spring background field', () => {
    const spring = getHomeAmbientVisual('spring');
    for (const field of [...spring.heroFields, ...spring.sectionFields]) {
      const red = parseInt(field.color.slice(1, 3), 16);
      const green = parseInt(field.color.slice(3, 5), 16);
      const blue = parseInt(field.color.slice(5, 7), 16);
      expect(red).toBeGreaterThan(green);
      expect(red).toBeGreaterThanOrEqual(blue);
    }
    expect(spring.lowerEdgeWash.join(' ')).not.toContain('222, 242, 222');
  });

  it('balances section-local glints with varied sizes beside content and in gaps', () => {
    for (const zone of ['weather', ...HOME_AMBIENT_SECTION_ZONES]) {
      const lights = HOME_AMBIENT_SECTION_LIGHTS.filter(
        light => light.zone === zone,
      );
      expect(lights).toHaveLength(zone === 'weather' ? 2 : 1);
    }
    expect(
      new Set(HOME_AMBIENT_SECTION_LIGHTS.map(light => light.size)).size,
    ).toBeGreaterThanOrEqual(6);
    expect(HOME_AMBIENT_SECTION_LIGHTS.some(light => light.topRatio < 0)).toBe(
      true,
    );
    expect(HOME_AMBIENT_SECTION_LIGHTS).toHaveLength(12);
    for (const light of HOME_AMBIENT_SECTION_LIGHTS) {
      if (
        light.zone !== 'weather' &&
        light.topRatio > 0.1 &&
        light.topRatio < 0.9
      ) {
        expect(light.centerXRatio <= 0.18 || light.centerXRatio >= 0.82).toBe(
          true,
        );
      }
      expect(light.opacity).toBeLessThanOrEqual(0.86);
    }
  });

  it.each(SEASONS)(
    '%s uses the approved Hero spacing without the legacy wallpaper',
    async season => {
      const onPress = jest.fn();
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <SeasonalHomeAutumnStage
            atmosphere={1}
            atmosphereAspectRatio={724 / 2172}
            backgroundImageVisible={false}
            ambientSeason={season}
            minHeight={704}
          >
            <ReactNative.TouchableOpacity
              testID="hero-content"
              onPress={onPress}
            />
          </SeasonalHomeAutumnStage>,
        );
      });
      if (!renderer) throw new Error('Seasonal Hero did not render');
      expect(renderer.root.findAllByType(ReactNative.Image)).toHaveLength(0);
      const views = renderer.root.findAllByType(ReactNative.View);
      expect(
        ReactNative.StyleSheet.flatten(views[0].props.style),
      ).toMatchObject({
        marginHorizontal: -16,
        minHeight: 704,
        backgroundColor: 'transparent',
      });
      expect(
        ReactNative.StyleSheet.flatten(
          views.find(
            view =>
              ReactNative.StyleSheet.flatten(view.props.style)
                ?.paddingHorizontal === 16,
          )?.props.style,
        ),
      ).toMatchObject({
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 0,
        gap: 14,
      });
      renderer.root.findByProps({ testID: 'hero-content' }).props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);
      await ReactTestRenderer.act(async () => renderer?.unmount());
    },
  );

  it('connects every season to one canvas without altering automatic season selection', () => {
    expect(homeSource).toContain('const ambientSeason = getSeasonalThemeKey()');
    expect(homeSource).toContain('season={ambientSeason}');
    expect(homeSource).toContain('ambientSeason={ambientSeason}');
    expect(homeSource).toContain(
      'getSeasonalHomeVisual(HOME_FOREGROUND_UI_SEASON)',
    );
    expect(homeSource).toContain('backgroundImageVisible={false}');
    expect(homeSource).toContain(
      'hideSeasonalBackgroundImage={ambientBubbleCanvasEnabled}',
    );
    expect(homeSource).not.toContain('<SeasonalHomeWinterStage');
    expect(homeSource).not.toContain('<SeasonalHomeNatureStage');
  });

  it.each(['winter', 'spring', 'summer'])(
    '%s uses a distinct transparent pearl asset, not an Autumn tint',
    season => {
      const texture = fs.readFileSync(
        path.join(
          __dirname,
          `../src/assets/seasonal/home/${season}/bubbles/pearl-bubble-reference-v1.png`,
        ),
      );
      expect(texture.readUInt32BE(16)).toBe(1254);
      expect(texture.readUInt32BE(20)).toBe(1254);
      expect(texture[25]).toBe(6);
      expect(texture.length).toBeLessThan(1_500_000);
      const autumn = fs.readFileSync(
        path.join(
          __dirname,
          '../src/assets/seasonal/home/autumn/bubbles/pearl-bubble-v1.png',
        ),
      );
      expect(texture.equals(autumn)).toBe(false);
    },
  );
});
