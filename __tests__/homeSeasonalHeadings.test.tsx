import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import ReactNative, { StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import { HomeScheduleCalendar } from '../src/components/home/HomeScheduleCalendar';
import { HomeSeasonProvider } from '../src/components/home/HomeSeasonContext';
import { HomeSectionGlassSurface } from '../src/components/home/HomeSectionGlass';
import { HomeSectionHeader } from '../src/components/home/HomeSectionHeader';
import { HOME_SEASONAL_BACKGROUND_GRADIENTS } from '../src/theme/home/seasonalAmbient';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/home/ScheduleCalendarSheet', () => ({
  ScheduleCalendarSheet: 'ScheduleCalendarSheet',
}));

const HEADINGS = {
  spring: '#7A4654',
  summer: '#205D62',
  autumn: '#704C33',
  winter: '#35556B',
} as const satisfies Record<SeasonKey, string>;
const SEASONS: readonly SeasonKey[] = ['spring', 'summer', 'autumn', 'winter'];
const ACTION_COLOR = '#243044';
const EMPHASIS_COLOR = '#2563EB';
const onPress = jest.fn();

function content(headingSeason?: SeasonKey) {
  return (
    <ThemeProvider theme={createTheme('light')}>
      <HomeSeasonProvider season="autumn" headingSeason={headingSeason}>
        <HomeSectionHeader
          title="누리를 위한"
          color={ACTION_COLOR}
          emphasis={{ title: '추천 팁', color: EMPHASIS_COLOR }}
          description="기존 본문은 그대로 유지해요."
          action={{ onPress, accessibilityLabel: '추천 팁 전체 보기' }}
        />
        <HomeSectionHeader title="자주 쓰는 기록" color={ACTION_COLOR} />
        <HomeSectionGlassSurface />
        <HomeScheduleCalendar
          petId="qa-pet"
          items={[]}
          dataState="loading"
          season="autumn"
          activeScheduleIds={new Set<string>()}
          accentColor={EMPHASIS_COLOR}
          accentDeepColor={ACTION_COLOR}
          isFocused={false}
          onPressAll={onPress}
          onPressDetail={onPress}
        />
      </HomeSeasonProvider>
    </ThemeProvider>
  );
}

function headings(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node =>
      String(node.type) === 'AppText' &&
      node.props.accessibilityRole === 'header' &&
      node.props.preset === 'unifiedTitle',
  );
}

function headingColor(node: TestRenderer.ReactTestInstance): string {
  return StyleSheet.flatten(node.props.style)?.color ?? node.props.color;
}

const HEADER_ACTION_LABELS = [
  '추천 팁 전체 보기',
  '전체 일정 목록 보기',
] as const;

// Only section-heading and header-action tint may differ from the existing tree.
function withoutHeaderTint(
  tree: ReturnType<TestRenderer.ReactTestRenderer['toJSON']>,
  inHeaderAction = false,
): unknown {
  if (tree === null) return null;
  if (Array.isArray(tree)) {
    return tree.map(node => withoutHeaderTint(node, inHeaderAction));
  }
  const isHeaderAction =
    inHeaderAction ||
    HEADER_ACTION_LABELS.some(label => tree.props.accessibilityLabel === label);
  const isHeading =
    tree.type === 'AppText' &&
    tree.props.accessibilityRole === 'header' &&
    tree.props.preset === 'unifiedTitle';
  return {
    ...tree,
    props:
      isHeading || isHeaderAction
        ? {
            ...tree.props,
            color: undefined,
            style: {
              ...StyleSheet.flatten(tree.props.style),
              color: undefined,
            },
          }
        : tree.props,
    children: tree.children?.map(child =>
      typeof child === 'string'
        ? child
        : withoutHeaderTint(child, isHeaderAction),
    ),
  };
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map(offset => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

describe('Home-only seasonal headline tint', () => {
  beforeEach(() => {
    jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
      width: 384,
      height: 800,
      scale: 3,
      fontScale: 1,
    });
    jest.clearAllMocks();
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(SEASONS)(
    'changes all header variants and the calendar to the %s deep tone only',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(content());
      });
      const baseline = withoutHeaderTint(renderer.toJSON());
      await act(async () => renderer.update(content(season)));
      expect(headings(renderer)).toHaveLength(4);
      expect(headings(renderer).map(headingColor)).toEqual(
        Array(4).fill(HEADINGS[season]),
      );
      expect(withoutHeaderTint(renderer.toJSON())).toEqual(baseline);
      await act(async () => renderer.unmount());
    },
  );

  it('updates headings and header actions with the selected season while retaining callbacks and glass', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(content('autumn'));
    });
    for (const season of SEASONS) {
      await act(async () => renderer.update(content(season)));
      expect(headings(renderer).map(headingColor)).toEqual(
        Array(4).fill(HEADINGS[season]),
      );
      const action = renderer.root.findAll(
        node =>
          node.props.accessibilityLabel === '추천 팁 전체 보기' &&
          typeof node.props.style === 'function',
      )[0];
      expect(action.props.onPress).toBe(onPress);
      const label = action.findAll(node => String(node.type) === 'AppText')[0];
      expect(headingColor(label)).toBe(HEADINGS[season]);
    }
    await act(async () => renderer.unmount());
  });

  it.each(SEASONS)(
    'matches both header-action labels and arrows to the %s title without changing their targets or text sizing',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(content(season));
      });
      for (const accessibilityLabel of HEADER_ACTION_LABELS) {
        const action = renderer.root.findAll(
          node =>
            node.props.accessibilityLabel === accessibilityLabel &&
            typeof node.props.style === 'function',
        )[0];
        expect(action.props.onPress).toBe(onPress);
        expect(
          StyleSheet.flatten(action.props.style({ pressed: false })),
        ).toMatchObject({
          minHeight: 48,
          minWidth: 48,
          backgroundColor: 'transparent',
          borderWidth: 0,
        });
        const label = action.findAll(
          node => String(node.type) === 'AppText',
        )[0];
        expect(StyleSheet.flatten(label.props.style)).toMatchObject({
          color: HEADINGS[season],
          fontSize: 14,
          lineHeight: 20,
          fontWeight: '500',
        });
        const arrows = action.findAll(
          node =>
            node.props.family === 'feather' &&
            node.props.name === 'chevron-right',
        );
        expect(arrows.length).toBeGreaterThan(0);
        for (const arrow of arrows) {
          expect(arrow.props).toMatchObject({
            color: HEADINGS[season],
            size: 15,
            preserveOriginal: true,
          });
        }
      }
      await act(async () => renderer.unmount());
    },
  );

  it('preserves existing title and emphasis colors without the explicit Home heading scope', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(content());
    });
    expect(headings(renderer).map(headingColor)).toEqual([
      ACTION_COLOR,
      EMPHASIS_COLOR,
      ACTION_COLOR,
      ACTION_COLOR,
    ]);
    await act(async () => renderer.unmount());
  });

  it.each(SEASONS)(
    'retains the same large-font geometry, body and actions for %s',
    async season => {
      jest.mocked(ReactNative.useWindowDimensions).mockReturnValue({
        width: 320,
        height: 800,
        scale: 3,
        fontScale: 1.3,
      });
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(content());
      });
      const baseline = withoutHeaderTint(renderer.toJSON());
      await act(async () => renderer.update(content(season)));
      expect(headings(renderer).map(headingColor)).toEqual(
        Array(4).fill(HEADINGS[season]),
      );
      expect(withoutHeaderTint(renderer.toJSON())).toEqual(baseline);
      await act(async () => renderer.unmount());
    },
  );

  it.each(SEASONS)(
    'has at least 4.5:1 contrast against the fixed %s background stops',
    season => {
      for (const background of HOME_SEASONAL_BACKGROUND_GRADIENTS[season]) {
        expect(
          (luminance(background) + 0.05) / (luminance(HEADINGS[season]) + 0.05),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it('connects the active Home season without replacing the frozen foreground material or neutral CTA palette', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
      ),
      'utf8',
    );
    expect(
      /<HomeSeasonProvider\s+season=\{HOME_FOREGROUND_UI_SEASON\}\s+headingSeason=\{ambientSeason\}/.test(
        source,
      ),
    ).toBe(true);
    const lower = source.slice(
      source.indexOf('const frequentRecordsSection ='),
      source.indexOf('// 10) render'),
    );
    expect(lower).toContain('petTheme={NEUTRAL_UI_PALETTE}');
    expect(lower).toContain('accentColor={NEUTRAL_UI_PALETTE.primary}');
    expect(lower).toContain('accentDeepColor={NEUTRAL_UI_PALETTE.deep}');
  });
});
