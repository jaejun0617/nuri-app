import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import * as RN from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import {
  HOME_SUMMARY_ART,
  HOME_SUMMARY_GLASS,
  TotalSummarySection,
  resolveSummaryCountFontSize,
  shouldStackSummary,
  styles,
} from '../src/screens/Main/components/LoggedInHome/TotalSummarySection';
import type { MemoryRecord } from '../src/services/supabase/memories';
import type { SeasonKey } from '../src/theme/seasonal/season';
import {
  HOME_AMBIENT_SCROLL_BUBBLES,
  getHomeAmbientBubbleSize,
} from '../src/theme/home/ambientMesh';
import { HOME_AMBIENT_SECTION_LIGHTS } from '../src/theme/home/seasonalAmbient';

jest.mock('../src/app/ui/AppText', () => 'AppText');

const SEASONS: readonly SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];
const record = (id: string, category: string): MemoryRecord => ({
  id,
  petId: 'pet-a',
  category,
  title: '기록',
  tags: [],
  imagePaths: [],
  occurredAt: '2026-10-01',
  createdAt: '2026-10-01T00:00:00Z',
});
const records = [
  record('w1', 'walk'),
  record('w2', 'walk'),
  record('m1', 'meal'),
  record('l1', 'other'),
  record('d1', 'diary'),
  record('h1', 'health'),
];
const actions = () => ({
  onPressWalk: jest.fn(),
  onPressMeal: jest.fn(),
  onPressLife: jest.fn(),
  onPressAllRecords: jest.fn(),
});
const headerActions = (renderer: TestRenderer.ReactTestRenderer) =>
  renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === '전체 요약 기록 전체 보기' &&
      typeof node.props.onPress === 'function',
  );
const render = (
  props: Partial<React.ComponentProps<typeof TotalSummarySection>> = {},
) => (
  <ThemeProvider theme={createTheme('light')}>
    <TotalSummarySection
      records={records}
      season="autumn"
      accentDeepColor="#0754DA"
      isReady
      isLoading={false}
      {...actions()}
      {...props}
    />
  </ThemeProvider>
);

describe('Total Summary seasonal concept', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(SEASONS)(
    '%s uses transparent art with bounded native layout and layered glass',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(render({ season }));
      });
      const image = renderer.root.findByType(RN.Image);
      expect(image.props.source).toBe(HOME_SUMMARY_ART[season]);
      expect(image.props.resizeMode).toBe('contain');
      expect(RN.StyleSheet.flatten(image.props.style)).toMatchObject({
        position: 'absolute',
        width: '100%',
        height: '100%',
      });
      const frame = renderer.root.findByProps({
        testID: 'home-summary-art-frame',
      });
      expect(frame.props.pointerEvents).toBe('none');
      expect(frame.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(RN.StyleSheet.flatten(frame.props.style)).toMatchObject({
        maxWidth: 176,
        maxHeight: 176,
        aspectRatio: 1,
      });
      for (const id of [
        'home-summary-walk',
        'home-summary-meal',
        'home-summary-life',
        'home-summary-insight',
      ]) {
        expect(
          RN.StyleSheet.flatten(
            renderer.root.findByProps({ testID: id }).props.style,
          ),
        ).toMatchObject({
          backgroundColor: HOME_SUMMARY_GLASS[season],
          elevation: 0,
          shadowOpacity: 0,
        });
      }
      const png = fs.readFileSync(
        path.join(
          __dirname,
          `../src/assets/seasonal/home/summary/keepsake-${season}-v1.png`,
        ),
      );
      expect(png[25]).toBe(6);
      expect(png.readUInt32BE(16)).toBe(png.readUInt32BE(20));
      expect(png.length).toBeLessThan(1_700_000);
      await act(async () => renderer.unmount());
    },
  );

  it('shows real eligible totals, category counts and unique KST dates without assuming their sum is the total', async () => {
    const handlers = actions();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(render(handlers));
    });
    const value = (key: string) =>
      renderer.root.findByProps({ testID: key }).props.children[0];
    expect(value('home-summary-total-value')).toBe(5);
    expect(value('home-summary-walk-value')).toBe(2);
    expect(value('home-summary-meal-value')).toBe(1);
    expect(value('home-summary-life-value')).toBe(1);
    expect(
      renderer.root.findByProps({ testID: 'home-summary-days-value' }).props
        .children,
    ).toBe('1일');
    expect(
      renderer.root.findByProps({ testID: 'home-summary-line' }).props.children,
    ).toBe('산책과 식사 기록이 차곡차곡 쌓였어요!');
    for (const key of ['walk', 'meal', 'life', 'days', 'insight']) {
      renderer.root
        .findByProps({ testID: `home-summary-${key}` })
        .props.onPress();
    }
    expect(handlers.onPressWalk).toHaveBeenCalledTimes(1);
    expect(handlers.onPressMeal).toHaveBeenCalledTimes(1);
    expect(handlers.onPressLife).toHaveBeenCalledTimes(1);
    expect(handlers.onPressAllRecords).toHaveBeenCalledTimes(2);
    expect(headerActions(renderer)).not.toHaveLength(0);
    headerActions(renderer)[0].props.onPress();
    expect(handlers.onPressAllRecords).toHaveBeenCalledTimes(3);
    await act(async () => renderer.unmount());
  });

  it.each([true, false])(
    'never fabricates zero when records are unavailable (loading=%s)',
    async isLoading => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          render({ records: null, isReady: false, isLoading }),
        );
      });
      expect(
        renderer.root.findAllByProps({ testID: 'home-summary-total-value' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findByProps({ testID: 'home-summary-pending' }).props
          .children,
      ).toBe(isLoading ? '확인 중' : '확인 필요');
      expect(renderer.root.findAllByType(RN.ActivityIndicator)).toHaveLength(
        isLoading ? 1 : 0,
      );
      expect(headerActions(renderer)).not.toHaveLength(0);
      await act(async () => renderer.unmount());
    },
  );

  it('hides the confirmed empty list action and restores it with real records', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(render({ records: [] }));
    });
    expect(headerActions(renderer)).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'home-summary-total-value' }).props
        .children[0],
    ).toBe(0);
    expect(
      renderer.root.findByProps({ testID: 'home-summary-line' }).props.children,
    ).toBe('아직 남긴 기록이 없어요.');
    await act(async () => {
      renderer.update(render({ records: [record('health-only', 'health')] }));
    });
    expect(headerActions(renderer)).toHaveLength(0);
    await act(async () => {
      renderer.update(render());
    });
    expect(headerActions(renderer)).not.toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  it('changes season without resetting totals or destination handlers', async () => {
    const handlers = actions();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(render(handlers));
    });
    for (const season of SEASONS) {
      await act(async () => {
        renderer.update(render({ ...handlers, season }));
      });
      expect(renderer.root.findByType(RN.Image).props.source).toBe(
        HOME_SUMMARY_ART[season],
      );
      expect(
        renderer.root.findByProps({ testID: 'home-summary-total-value' }).props
          .children[0],
      ).toBe(5);
      renderer.root
        .findByProps({ testID: 'home-summary-walk' })
        .props.onPress();
    }
    expect(handlers.onPressWalk).toHaveBeenCalledTimes(4);
    await act(async () => renderer.unmount());
  });

  it.each([320, 360, 400, 430])(
    'bounds art and supports wrapping at %sdp',
    async width => {
      const inner = width - 32 - 28;
      expect(Math.min(inner * 0.49, styles.artFrame.maxWidth)).toBeLessThan(
        inner / 2,
      );
      expect(shouldStackSummary(width, 1)).toBe(width < 350);
      jest
        .spyOn(RN, 'useWindowDimensions')
        .mockReturnValue({ width, height: 900, scale: 3, fontScale: 1.5 });
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(render());
      });
      for (const id of ['home-summary-overview', 'home-summary-metrics']) {
        expect(
          RN.StyleSheet.flatten(
            renderer.root.findByProps({ testID: id }).props.style,
          ).flexDirection,
        ).toBe('column');
      }
      for (const text of renderer.root.findAll(
        node =>
          node.props.preset && node.props.testID?.startsWith('home-summary'),
      )) {
        expect(text.props.numberOfLines).toBeUndefined();
      }
      expect(styles.section).not.toHaveProperty('height');
      expect(styles.metric).not.toHaveProperty('height');
      await act(async () => renderer.unmount());
    },
  );

  it('keeps large counts exact and shrinks by digit count, not viewport width', () => {
    expect(resolveSummaryCountFontSize(null)).toBe(62);
    expect(resolveSummaryCountFontSize(24)).toBe(62);
    expect(resolveSummaryCountFontSize(999)).toBe(46);
    expect(resolveSummaryCountFontSize(9999)).toBe(34);
    expect(resolveSummaryCountFontSize(99999)).toBe(24);
  });

  it('adds only Summary decorations using existing canvas and seasonal pearl textures', () => {
    const bubbles = HOME_AMBIENT_SCROLL_BUBBLES.filter(
      b => b.zone === 'summary',
    );
    expect(bubbles.filter(b => b.kind === 'large')).toHaveLength(3);
    expect(bubbles.filter(b => b.kind === 'small')).toHaveLength(2);
    expect(
      HOME_AMBIENT_SECTION_LIGHTS.filter(l => l.zone === 'summary'),
    ).toHaveLength(3);
    for (const width of [360, 400, 430]) {
      for (const b of bubbles.filter(item => item.kind === 'small')) {
        const size = getHomeAmbientBubbleSize(b, width);
        expect(size).toBeLessThan(28);
        expect(width * b.centerXRatio - size / 2).toBeGreaterThan(0);
        expect(width * b.centerXRatio + size / 2).toBeLessThan(width);
      }
    }
    const home = fs.readFileSync(
      path.join(
        __dirname,
        '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
      ),
      'utf8',
    );
    expect(home).toContain(
      '<TotalSummarySection\n            season={ambientSeason}',
    );
    expect(home).toContain('onPressWalk={onPressTotalWalk}');
    expect(home).toContain('onPressMeal={onPressTotalMeal}');
    expect(home).toContain('onPressLife={onPressTotalLife}');
  });
});
