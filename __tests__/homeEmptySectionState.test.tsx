import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import * as RN from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import {
  HOME_EMPTY_SECTION_ART,
  HOME_EMPTY_SECTION_COPY,
  HomeEmptySectionState,
  shouldStackHealthEmptyState,
  styles,
  type HomeEmptySectionKind,
} from '../src/screens/Main/components/LoggedInHome/HomeEmptySectionState';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/providers/AppFontPreferenceProvider', () => ({
  FixedTypographyBoundary: ({ children }: { children: React.ReactNode }) =>
    children,
}));

const KINDS: readonly HomeEmptySectionKind[] = ['health', 'schedule', 'photo'];
const SEASONS: readonly SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];

describe('seasonal Home empty sections', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(KINDS.flatMap(kind => SEASONS.map(season => ({ kind, season }))))(
    '$kind uses its $season transparent illustration, bounded frame and original action',
    async ({ kind, season }) => {
      const onPress = jest.fn();
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeEmptySectionState
            kind={kind}
            season={season}
            dataState="ready"
            accentDeepColor="#0754DA"
            onPressAction={onPress}
          />,
        );
      });
      const image = renderer.root.findByType(RN.Image);
      expect(image.props.source).toBe(HOME_EMPTY_SECTION_ART[kind][season]);
      expect(image.props.resizeMode).toBe('contain');
      expect(image.props.pointerEvents).toBe('none');
      expect(image.props.accessibilityElementsHidden).toBe(true);
      expect(RN.StyleSheet.flatten(image.props.style)).toMatchObject({
        position: 'absolute',
        width: '100%',
        top: kind === 'health' ? 0 : '-17.5%',
        height: kind === 'health' ? '100%' : '135%',
      });
      const viewport = renderer.root.findByProps({
        testID: `home-${kind}-art-viewport`,
      });
      expect(RN.StyleSheet.flatten(viewport.props.style)).toMatchObject({
        position: 'absolute',
        top: 0,
        bottom: 0,
        overflow: 'hidden',
        left: kind === 'health' ? 0 : '-17.5%',
        right: kind === 'health' ? 0 : '-17.5%',
      });
      const frame = renderer.root.findByProps({
        testID: `home-${kind}-art-frame`,
      });
      const geometry = RN.StyleSheet.flatten(frame.props.style);
      expect(geometry.aspectRatio).toBe(1);
      expect(geometry.maxWidth).toBeLessThanOrEqual(168);
      expect(geometry.maxHeight).toBe(geometry.maxWidth);
      expect(geometry.height).toBeUndefined();
      const action = renderer.root.findByType(RN.TouchableOpacity);
      action.props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(action.props.accessibilityLabel).toBe(
        HOME_EMPTY_SECTION_COPY[kind].accessibilityLabel,
      );
      const label = action.find(
        node => node.props.children === HOME_EMPTY_SECTION_COPY[kind].action,
      );
      expect(RN.StyleSheet.flatten(label.props.style).textAlign).toBe('center');
      expect(
        action.findAll(node => typeof node.props.name === 'string'),
      ).toHaveLength(0);
      expect(RN.StyleSheet.flatten(action.props.style).minHeight).toBe(46);
      const bytes = fs.readFileSync(
        path.join(
          __dirname,
          `../src/assets/seasonal/home/empty-sections/${kind}-${season}-v1.png`,
        ),
      );
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      expect(bytes[25]).toBe(6);
      expect(bytes.readUInt32BE(16)).toBe(bytes.readUInt32BE(20));
      expect(bytes.readUInt32BE(20)).toBeGreaterThan(1000);
      expect(bytes.length).toBeLessThan(1_500_000);
      expect(styles.content).not.toHaveProperty('backgroundColor');
      await act(async () => renderer.unmount());
    },
  );

  it.each(
    KINDS.flatMap(kind =>
      (['loading', 'error'] as const).map(dataState => ({ kind, dataState })),
    ),
  )(
    '$kind never presents confirmed-empty art or action while $dataState',
    async ({ kind, dataState }) => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeEmptySectionState
            kind={kind}
            season="spring"
            dataState={dataState}
            accentDeepColor="#0754DA"
            onPressAction={jest.fn()}
          />,
        );
      });
      expect(renderer.root.findAllByType(RN.Image)).toHaveLength(0);
      expect(renderer.root.findAllByType(RN.TouchableOpacity)).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({ testID: `home-${kind}-empty` }),
      ).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({ testID: `home-${kind}-${dataState}` })
          .length,
      ).toBeGreaterThan(0);
      await act(async () => renderer.unmount());
    },
  );

  it.each([320, 360, 400, 430])(
    'limits art, not the complete section, at %s dp',
    width => {
      const inner = width - 32 - 28;
      for (const art of [
        styles.healthArt,
        styles.scheduleArt,
        styles.photoArt,
      ]) {
        const actual = Math.min(
          (inner * parseFloat(art.width)) / 100,
          art.maxWidth,
        );
        expect(actual).toBeLessThanOrEqual(168);
        expect(actual).toBeLessThan(inner);
        expect(art.maxHeight).toBe(art.maxWidth);
        // The wider paint area remains inside the section at every supported width.
        const paintScale = art === styles.healthArt ? 1 : 1.35;
        expect(actual * paintScale).toBeLessThan(inner);
      }
      expect(shouldStackHealthEmptyState(width, 1)).toBe(width < 350);
      expect(shouldStackHealthEmptyState(width, 1.5)).toBe(true);
      expect(styles.content).not.toHaveProperty('height');
      expect(styles.copy).not.toHaveProperty('maxHeight');
    },
  );

  it('preserves approved layout slots, copy spacing and health artwork geometry', () => {
    expect(styles.healthArt).toEqual({
      width: '38%',
      maxWidth: 128,
      maxHeight: 128,
    });
    expect(styles.scheduleArt).toEqual({
      width: '56%',
      maxWidth: 136,
      maxHeight: 136,
    });
    expect(styles.photoArt).toEqual({
      width: '72%',
      maxWidth: 168,
      maxHeight: 168,
    });
    expect(styles.artFrame).toEqual({
      aspectRatio: 1,
      alignSelf: 'center',
      flexShrink: 0,
    });
    expect(styles.composition).toEqual({
      width: '100%',
      alignItems: 'center',
      gap: 12,
    });
    expect(styles.content).toEqual({ width: '100%', gap: 12 });
  });

  it('allows enlarged copy and button text to wrap rather than clipping', async () => {
    jest
      .spyOn(RN, 'useWindowDimensions')
      .mockReturnValue({ width: 360, height: 800, scale: 3, fontScale: 1.5 });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <HomeEmptySectionState
          kind="health"
          season="summer"
          dataState="ready"
          accentDeepColor="#0754DA"
          onPressAction={jest.fn()}
        />,
      );
    });
    for (const text of renderer.root.findAll(
      node => typeof node.props.preset === 'string',
    )) {
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.adjustsFontSizeToFit).toBeUndefined();
    }
    expect(styles.action.height).toBeUndefined();
    expect(styles.action.minHeight).toBe(46);
    await act(async () => renderer.unmount());
  });
});
