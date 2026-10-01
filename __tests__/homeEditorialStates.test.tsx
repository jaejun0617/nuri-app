import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import React from 'react';
import * as RN from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import {
  HOME_EDITORIAL_ART,
  HomeEditorialArtwork,
  styles as artStyles,
  type HomeEditorialArtKind,
} from '../src/screens/Main/components/LoggedInHome/HomeEditorialArtwork';
import {
  CommunityEmptyState,
  HOME_COMMUNITY_EMPTY_COPY,
  RecentRecordsEmptyState,
  TodayHomeTipSection,
  TODAY_HOME_TIP,
  getRecentEmptyDataState,
  shouldStackEditorialCopy,
  styles,
} from '../src/screens/Main/components/LoggedInHome/HomeEditorialStates';
import type { SeasonKey } from '../src/theme/seasonal/season';
import { HOME_AMBIENT_SCROLL_BUBBLES } from '../src/theme/home/ambientMesh';
import { HOME_AMBIENT_SECTION_LIGHTS } from '../src/theme/home/seasonalAmbient';

jest.mock('../src/app/ui/AppText', () => 'AppText');

const SEASONS: readonly SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];
const KINDS = Object.keys(HOME_EDITORIAL_ART) as HomeEditorialArtKind[];
const TABS = ['popular', 'question', 'info', 'daily', 'free'] as const;

describe('seasonal editorial Home sections', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(KINDS.flatMap(kind => SEASONS.map(season => ({ kind, season }))))(
    '$kind selects $season artwork inside a layout-owned frame',
    async ({ kind, season }) => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeEditorialArtwork kind={kind} season={season} />,
        );
      });
      const image = renderer.root.findByType(RN.Image);
      expect(image.props.source).toBe(HOME_EDITORIAL_ART[kind][season]);
      expect(image.props.resizeMode).toBe('contain');
      expect(image.props.pointerEvents).toBe('none');
      expect(image.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(RN.StyleSheet.flatten(image.props.style)).toEqual({
        position: 'absolute',
        top: kind === 'recent' ? '-10%' : 0,
        left: kind === 'recent' ? '2%' : 0,
        width: kind === 'recent' ? '96%' : '100%',
        height: kind === 'recent' ? '120%' : '100%',
      });
      const frame = renderer.root.findByProps({
        testID: `home-${kind}-art-frame`,
      });
      const geometry = RN.StyleSheet.flatten(frame.props.style);
      expect(geometry.maxWidth).toBe(
        kind.startsWith('community-') ? 190 : kind === 'recent' ? 135 : 108,
      );
      expect(geometry.aspectRatio).toBe(
        kind.startsWith('community-') ? 1.5 : kind === 'recent' ? 1.25 : 1,
      );
      expect(geometry.height).toBeUndefined();
      await act(async () => renderer.unmount());
    },
  );

  it('ships 28 distinct generated RGBA assets with source fingerprints', () => {
    const root = path.join(__dirname, '../src/assets/seasonal/home/editorial');
    const manifest: {
      tool: string;
      images: {
        kind: HomeEditorialArtKind;
        season: SeasonKey;
        sha256: string;
        transparentFraction: number;
      }[];
    } = JSON.parse(
      fs.readFileSync(path.join(root, 'generation-manifest.json'), 'utf8'),
    );
    expect(manifest.tool).toBe('built-in image_gen');
    expect(manifest.images).toHaveLength(28);
    const hashes = manifest.images.map(entry => {
      const bytes = fs.readFileSync(
        path.join(root, `${entry.kind}-${entry.season}-v1.png`),
      );
      expect(bytes[25]).toBe(6);
      expect(bytes.readUInt32BE(16)).toBeLessThanOrEqual(1536);
      expect(bytes.readUInt32BE(20)).toBeLessThanOrEqual(1536);
      expect(entry.transparentFraction).toBeGreaterThan(0.4);
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      expect(hash).toBe(entry.sha256);
      return hash;
    });
    expect(new Set(hashes).size).toBe(28);
  });

  it.each(SEASONS)(
    'keeps the actual Today Tip copy and no CTA in %s',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <TodayHomeTipSection season={season} accentColor="#0754DA" />
          </ThemeProvider>,
        );
      });
      const output = JSON.stringify(renderer.toJSON());
      expect(output).toContain(TODAY_HOME_TIP.title);
      expect(output).toContain(TODAY_HOME_TIP.description);
      expect(renderer.root.findAllByType(RN.TouchableOpacity)).toHaveLength(0);
      expect(renderer.root.findByType(RN.Image).props.source).toBe(
        HOME_EDITORIAL_ART['today-tip'][season],
      );
      await act(async () => renderer.unmount());
    },
  );

  it.each(SEASONS)(
    'keeps recent-record creation and centered icon-free action in %s',
    async season => {
      const onPress = jest.fn();
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <RecentRecordsEmptyState
            season={season}
            dataState="ready"
            accentColor="#0754DA"
            onPressRecord={onPress}
          />,
        );
      });
      const action = renderer.root.findByType(RN.TouchableOpacity);
      action.props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(RN.StyleSheet.flatten(action.props.style)).toMatchObject({
        minHeight: 46,
        shadowOpacity: 0,
        elevation: 0,
      });
      const label = action.find(node => node.props.children === '기록하기');
      expect(RN.StyleSheet.flatten(label.props.style).textAlign).toBe('center');
      expect(
        action.findAll(node => typeof node.props.name === 'string'),
      ).toHaveLength(0);
      await act(async () => renderer.unmount());
    },
  );

  it.each(['idle', 'loading', 'refreshing', 'loadingMore', 'error'] as const)(
    'does not show confirmed-empty art or creation CTA when recent records are %s',
    async status => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <RecentRecordsEmptyState
            season="spring"
            dataState={getRecentEmptyDataState(status)}
            accentColor="#0754DA"
            onPressRecord={jest.fn()}
          />,
        );
      });
      expect(renderer.root.findAllByType(RN.Image)).toHaveLength(0);
      expect(renderer.root.findAllByType(RN.TouchableOpacity)).toHaveLength(0);
      expect(JSON.stringify(renderer.toJSON())).not.toContain(
        '아직 기록이 없어요',
      );
      await act(async () => renderer.unmount());
    },
  );

  it.each(TABS)(
    'keeps %s tab copy, a distinct ornament and no new navigation',
    async tab => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <CommunityEmptyState tab={tab} season="spring" />,
        );
      });
      expect(JSON.stringify(renderer.toJSON())).toContain(
        HOME_COMMUNITY_EMPTY_COPY[tab],
      );
      expect(renderer.root.findByType(RN.Image).props.testID).toBe(
        `home-community-${tab}-art`,
      );
      expect(renderer.root.findAllByType(RN.TouchableOpacity)).toHaveLength(0);
      expect(styles.community).not.toHaveProperty('backgroundColor');
      expect(styles.community).not.toHaveProperty('borderWidth');
      await act(async () => renderer.unmount());
    },
  );

  it.each([320, 360, 400, 430])(
    'bounds artwork, not text height, at %s dp',
    width => {
      const inner = width - 32 - 28;
      for (const slot of [artStyles.memo, artStyles.recent, artStyles.community]) {
        const actual = Math.min(
          (inner * parseFloat(slot.width)) / 100,
          slot.maxWidth,
        );
        expect(actual).toBeLessThan(inner);
        expect(actual / slot.aspectRatio).toBeLessThanOrEqual(127);
      }
      expect(shouldStackEditorialCopy(width, 1)).toBe(width < 350);
      expect(shouldStackEditorialCopy(width, 1.5)).toBe(true);
      expect(styles.copy).not.toHaveProperty('maxHeight');
      expect(styles.content).not.toHaveProperty('height');
      expect(styles.action).not.toHaveProperty('height');
    },
  );

  it.each([320, 360, 400, 430])(
    'enlarges recent art and moves it inward without growing its row at %s dp',
    width => {
      const inner = width - 32 - 28;
      const oldSize = Math.min(inner * 0.3, 108);
      const newWidth = Math.min(inner * 0.375, 135);
      const newHeight = newWidth / artStyles.recent.aspectRatio;
      const paintWidth = newWidth * 0.96;
      const oldCenter = inner - oldSize / 2;
      const newCenter = inner - artStyles.recent.marginRight - newWidth / 2;
      const copyEnd = inner - artStyles.recent.marginRight - newWidth - 12;
      expect(newHeight).toBeCloseTo(oldSize);
      expect(paintWidth).toBeCloseTo(oldSize * 1.2);
      expect(newCenter).toBeLessThan(oldCenter - 25);
      expect(newCenter - newWidth / 2 - copyEnd).toBe(12);
      expect((paintWidth - newHeight) / 2).toBeLessThan(styles.row.gap);
      expect((paintWidth - newHeight) / 2).toBeLessThan(styles.content.gap);
      expect(artStyles.recentImage).toEqual({
        top: '-10%', left: '2%', width: '96%', height: '120%',
      });
      expect(artStyles.recent.overflow).toBe('visible');
      expect(artStyles.memo).toEqual({ width: '30%', maxWidth: 108, aspectRatio: 1 });
    },
  );

  it('stacks enlarged text without limiting lines or overlapping artwork', async () => {
    jest
      .spyOn(RN, 'useWindowDimensions')
      .mockReturnValue({ width: 360, height: 800, scale: 3, fontScale: 1.5 });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <RecentRecordsEmptyState
          season="summer"
          dataState="ready"
          accentColor="#0754DA"
          onPressRecord={jest.fn()}
        />,
      );
    });
    expect(
      renderer.root.findAll(
        node =>
          RN.StyleSheet.flatten(node.props.style)?.flexDirection === 'column',
      ).length,
    ).toBeGreaterThan(0);
    for (const text of renderer.root.findAll(
      node => typeof node.props.preset === 'string',
    )) {
      expect(text.props.numberOfLines).toBeUndefined();
    }
    await act(async () => renderer.unmount());
  });

  it.each(['recent', 'community', 'today-tip'] as const)(
    'adds concept spheres and glints only in the %s measured zone',
    zone => {
      const bubbles = HOME_AMBIENT_SCROLL_BUBBLES.filter(
        item => item.zone === zone,
      );
      expect(bubbles.filter(item => item.kind === 'large')).toHaveLength(2);
      expect(bubbles.filter(item => item.kind === 'medium')).toHaveLength(1);
      expect(bubbles.filter(item => item.kind === 'small')).toHaveLength(2);
      expect(
        HOME_AMBIENT_SECTION_LIGHTS.filter(item => item.zone === zone),
      ).toHaveLength(3);
    },
  );
});
