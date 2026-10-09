import React from 'react';
import { Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import fs from 'node:fs';
import path from 'node:path';
import { createTheme } from '../src/app/theme/theme';
import { ASSETS } from '../src/assets';
import { MemoryCard } from '../src/components/MemoryCard/MemoryCard';
import TimelineSeasonalHeader, {
  TimelineSeasonalControls,
} from '../src/screens/Records/TimelineSeasonalHeader';
import {
  TIMELINE_HERO_IMAGES,
  TIMELINE_SEASON_COLORS,
  TIMELINE_STATS_ANCHOR,
} from '../src/theme/seasonal/timeline';
import type { SeasonKey } from '../src/theme/seasonal/season';
import {
  buildTimelineDayCounts,
  buildTimelineDayHeader,
  formatTimelineRecordedMonth,
  getLatestTimelineDayKey,
  getLatestTimelineRecordedDay,
  resolveTimelineDaySubtitleColor,
} from '../src/screens/Records/timelinePresentation';
import { useTimelineInitialMonth } from '../src/screens/Records/useTimelineInitialMonth';
import { styles as timelineStyles } from '../src/screens/Records/TimelineScreen.styles';
import { resolveHomeFrostedMaterial } from '../src/components/home/HomeFrostedGlass';
import {
  buildTimelineCategoryCounts,
  buildTimelineView,
} from '../src/services/timeline/query';
import { buildTotalSummary } from '../src/services/home/weeklySummary';
import type { MemoryRecord } from '../src/services/supabase/memories';

jest.mock('../src/hooks/useSignedMemoryImage', () => ({
  useSignedMemoryImage: () => ({ signedUrl: null }),
}));
let mockEffectiveSeason: SeasonKey = 'autumn';
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockEffectiveSeason,
}));

const expected = {
  autumn: ['#DA4A0E', '#FE9E28', '#DF3500', '#FD8900', '#D44912'],
  winter: ['#2663E2', '#479DFB', '#4480E4', '#2E72F0', '#3573ED'],
  spring: ['#DE3E6B', '#F291AC', '#D0275D', '#ED5B86', '#DD3E6B'],
  summer: ['#047572', '#38BBB7', '#007771', '#02847E', '#1A817B'],
};
const record: MemoryRecord = {
  id: 'record-1',
  petId: 'pet-1',
  title: '함께한 하루',
  tags: [],
  imagePaths: [],
  category: 'diary',
  occurredAt: '2026-10-04',
  createdAt: '2026-10-04T03:14:00Z',
};

function render(element: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>{element}</ThemeProvider>,
    );
  });
  return tree;
}
function header(season: SeasonKey, width = 384, fontScale = 1) {
  return (
    <TimelineSeasonalHeader
      season={season}
      width={width}
      fontScale={fontScale}
      level={{
        totalXp: 468,
        level: 4,
        currentLevelXp: 450,
        nextLevelXp: 700,
        updatedAt: null,
      }}
      titles={[]}
      summary={buildTotalSummary([record])}
      dailyStatus={null}
      petName="누리"
      showWalkStatus={false}
      onPressBack={jest.fn()}
    />
  );
}
function text(tree: TestRenderer.ReactTestRenderer) {
  return tree.root
    .findAllByType(Text)
    .flatMap(node =>
      React.Children.toArray(node.props.children).filter(
        child => typeof child === 'string' || typeof child === 'number',
      ),
    )
    .join(' ');
}

describe('Timeline seasonal design', () => {
  beforeEach(() => {
    mockEffectiveSeason = 'autumn';
  });
  it.each(Object.keys(expected) as SeasonKey[])(
    '%s renders separate exact tokens, original hero and white selected chip contents',
    season => {
      const palette = TIMELINE_SEASON_COLORS[season];
      expect([
        palette.statsGradientStart,
        palette.statsGradientEnd,
        palette.statsValue,
        palette.statsIcon,
        palette.selectedCategory,
      ]).toEqual(expected[season]);
      const tree = render(header(season));
      const image = tree.root
        .findAllByType(Image)
        .find(node => node.props.testID === 'timeline-seasonal-hero')!;
      expect(image.props.source).toBe(TIMELINE_HERO_IMAGES[season]);
      expect(image.props.resizeMode).toBe('contain');
      expect(StyleSheet.flatten(image.props.style)).toMatchObject({
        width: 384,
        height: 192,
      });
      const gradient = tree.root
        .findAll(node => node.props.testID === 'timeline-progress-gradient')
        .at(-1)!;
      expect(gradient.props.colors).toEqual(expected[season].slice(0, 2));
      expect(StyleSheet.flatten(gradient.props.style).width).toBe('7%');
      expect(
        tree.root
          .findAllByType(Image)
          .find(node => node.props.testID === 'timeline-statistics-brand'),
      ).toBeUndefined();
      expect(tree.root.findAll(node => node.props.name === 'paw')).toHaveLength(
        0,
      );
      expect(text(tree)).not.toContain('타임라인');
      expect(text(tree)).not.toContain('너와 함께');
      const stats = tree.root
        .findAll(node => node.props.testID === 'timeline-statistics')
        .at(-1)!;
      expect(StyleSheet.flatten(stats.props.style)).toMatchObject({
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.65)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        marginTop:
          -192 * (1 - TIMELINE_STATS_ANCHOR[season]) -
          (season === 'summer' ? 8 : 4),
      });
      expect(stats.props.blurAmount).toBeUndefined();
      expect(tree.root.findAllByProps({ testID: 'home-frosted-tint' })).toHaveLength(0);
      const titleXp = tree.root
        .findAll(node => node.props.testID === 'timeline-title-xp-row')
        .at(-1)!;
      expect(StyleSheet.flatten(titleXp.props.style).flexDirection).toBe('row');
      expect(
        titleXp.findAll(node => node.props.testID === 'timeline-xp').length,
      ).toBeGreaterThan(0);
      const xp = titleXp
        .findAllByType(Text)
        .find(node => node.props.testID === 'timeline-xp')!;
      expect(StyleSheet.flatten(xp.props.style).color).toBe('#243042');
      expect(
        StyleSheet.flatten(xp.findAllByType(Text).at(-1)!.props.style).color,
      ).toBe(palette.statsValue);
      const counts = buildTimelineCategoryCounts([record]);
      const controls = render(
        <TimelineSeasonalControls
          season={season}
          sortLabel="최신순"
          monthLabel="월/전체"
          mainCategory="all"
          categoryLabel="전체"
          counts={counts}
          transitioning={false}
          onToggleSort={jest.fn()}
          onOpenMonth={jest.fn()}
          onPressCategory={jest.fn()}
        />,
      );
      const selected = controls.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.testID === 'timeline-category-all')!;
      const surface = selected
        .findAll(node => node.props.testID === 'timeline-category-surface-all')
        .at(-1)!;
      expect(StyleSheet.flatten(surface.props.style).backgroundColor).toBe(
        expected[season][4],
      );
      expect(selected.props.accessibilityState).toEqual({ selected: true });
      expect(
        selected.findAll(node => node.props.family === 'material')[0].props,
      ).toMatchObject({
        color: '#FFFFFF',
        preserveOriginal: true,
      });
      for (const label of selected.findAllByType(Text))
        expect(StyleSheet.flatten(label.props.style).color).toBe('#FFFFFF');
      const inactive = controls.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.testID === 'timeline-category-diary')!;
      const inactiveSurface = inactive
        .findAll(
          node => node.props.testID === 'timeline-category-surface-diary',
        )
        .at(-1)!;
      expect(
        StyleSheet.flatten(inactiveSurface.props.style).backgroundColor,
      ).toBe('#FFFFFF');
      expect(
        inactive.findAll(node => node.props.family === 'material'),
      ).toHaveLength(0);
      expect(StyleSheet.flatten(surface.props.style)).toMatchObject({
        paddingHorizontal: 8,
        paddingVertical: 4,
      });
      for (const label of inactive.findAllByType(Text)) {
        expect(StyleSheet.flatten(label.props.style).fontSize).toBe(12);
      }
      TestRenderer.act(() => {
        tree.unmount();
        controls.unmount();
      });
    },
  );

  it.each([360, 384, 430])(
    'uses exact hero ratio and flexible stats at %idp with enlarged text',
    width => {
      const tree = render(header('autumn', width, 1.5));
      expect(
        StyleSheet.flatten(
          tree.root
            .findAllByType(Image)
            .find(node => node.props.testID === 'timeline-seasonal-hero')!.props
            .style,
        ),
      ).toEqual({ width, height: width / 2 });
      const stats = tree.root
        .findAll(node => node.props.testID === 'timeline-statistics')
        .at(-1)!;
      expect(StyleSheet.flatten(stats.props.style).flexDirection).toBe(
        'column',
      );
      expect(StyleSheet.flatten(stats.props.style)).not.toHaveProperty(
        'height',
      );
      expect(text(tree)).toContain('468');
      expect(text(tree)).toContain('1개의 기록');
      TestRenderer.act(() => tree.unmount());
    },
  );

  it.each([360, 384, 430])(
    'allows large record totals to wrap at %idp without a fixed height',
    width => {
      const tree = render(
        <TimelineSeasonalHeader
          season="autumn"
          width={width}
          fontScale={1.5}
          level={null}
          titles={[]}
          summary={{
            ...buildTotalSummary([]),
            totalRecords: 10000,
            recordDays: 1000,
          }}
          dailyStatus={null}
          petName={null}
          showWalkStatus={false}
          onPressBack={jest.fn()}
        />,
      );
      expect(text(tree)).toContain('10,000개의 기록');
      expect(text(tree)).toContain('기록한 날 1,000일');
      const total = tree.root
        .findAllByType(Text)
        .find(node => node.props.children === '10,000개의 기록')!;
      expect(total.props.numberOfLines).toBeUndefined();
      expect(StyleSheet.flatten(total.props.style)).not.toHaveProperty(
        'height',
      );
      const stats = tree.root
        .findAll(node => node.props.testID === 'timeline-statistics')
        .at(-1)!;
      expect(StyleSheet.flatten(stats.props.style).flexDirection).toBe(
        'column',
      );
      TestRenderer.act(() => tree.unmount());
    },
  );

  it('keeps 44dp taps while month and sort surfaces use a slightly roomier 4dp vertical padding', () => {
    const tree = render(
      <TimelineSeasonalControls
        season="autumn"
        sortLabel="최신순"
        monthLabel="2026년 10월"
        mainCategory="all"
        categoryLabel="전체"
        counts={buildTimelineCategoryCounts([])}
        transitioning={false}
        onToggleSort={jest.fn()}
        onOpenMonth={jest.fn()}
        onPressCategory={jest.fn()}
      />,
    );
    for (const id of [
      'timeline-month-control-surface',
      'timeline-sort-control-surface',
    ]) {
      const surface = tree.root
        .findAll(node => node.props.testID === id)
        .at(-1)!;
      expect(StyleSheet.flatten(surface.props.style).paddingVertical).toBe(4);
      expect(StyleSheet.flatten(surface.props.style)).not.toHaveProperty(
        'minHeight',
      );
      for (const label of surface.findAllByType(Text)) {
        expect(StyleSheet.flatten(label.props.style).fontSize).toBe(13);
      }
    }
    const buttons = tree.root
      .findAllByType(TouchableOpacity)
      .filter(node =>
        /^(기록 월 선택|정렬 변경)/.test(node.props.accessibilityLabel),
      );
    expect(buttons).toHaveLength(2);
    for (const button of buttons)
      expect(StyleSheet.flatten(button.props.style).minHeight).toBe(44);
    TestRenderer.act(() => tree.unmount());
  });

  it('does not manufacture missing statistics or XP and keeps real zeroes distinct', () => {
    const tree = render(
      <TimelineSeasonalHeader
        season="winter"
        width={384}
        fontScale={1}
        level={null}
        titles={[]}
        summary={null}
        dailyStatus={null}
        petName={null}
        showWalkStatus={false}
        onPressBack={jest.fn()}
      />,
    );
    expect(text(tree)).toContain('Lv.—');
    expect(text(tree)).not.toContain('0개의 기록');
    TestRenderer.act(() =>
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <TimelineSeasonalHeader
            season="winter"
            width={384}
            fontScale={1}
            level={{
              totalXp: 0,
              level: 1,
              currentLevelXp: 0,
              nextLevelXp: 100,
              updatedAt: null,
            }}
            titles={[]}
            summary={buildTotalSummary([])}
            dailyStatus={null}
            petName={null}
            showWalkStatus={false}
            onPressBack={jest.fn()}
          />
        </ThemeProvider>,
      ),
    );
    expect(text(tree)).toContain('0개의 기록');
    TestRenderer.act(() => tree.unmount());
  });

  it('maps controls to existing callbacks without interpreting selected colors as actions', () => {
    const toggle = jest.fn(),
      month = jest.fn(),
      category = jest.fn();
    const tree = render(
      <TimelineSeasonalControls
        season="spring"
        sortLabel="최신순"
        monthLabel="2026년 10월"
        mainCategory="diary"
        categoryLabel="일기"
        counts={buildTimelineCategoryCounts([record])}
        transitioning={false}
        onToggleSort={toggle}
        onOpenMonth={month}
        onPressCategory={category}
      />,
    );
    const buttons = tree.root.findAllByType(TouchableOpacity);
    TestRenderer.act(() => {
      buttons
        .find(node => node.props.accessibilityLabel.startsWith('정렬 변경'))!
        .props.onPress();
      buttons
        .find(node => node.props.accessibilityLabel.startsWith('기록 월 선택'))!
        .props.onPress();
      buttons
        .find(node => node.props.testID === 'timeline-category-diary')!
        .props.onPress();
    });
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(month).toHaveBeenCalledTimes(1);
    expect(category).toHaveBeenCalledWith('diary');
    for (const button of buttons)
      expect(
        StyleSheet.flatten(button.props.style).minHeight,
      ).toBeGreaterThanOrEqual(44);
    TestRenderer.act(() => tree.unmount());
  });

  it('keeps day grouping KST-safe, stable across years, and based on complete filtered summaries', () => {
    expect(
      buildTimelineDayHeader('2026-10-04', null, '2026-10-07'),
    ).toMatchObject({ title: '10월 4일', subtitle: '일요일', isWeekend: true });
    expect(
      buildTimelineDayHeader('2026-10-04', '2026-10-04', '2026-10-07'),
    ).toBeNull();
    expect(
      buildTimelineDayHeader('2025-10-04', null, '2026-10-07')?.title,
    ).toBe('2025년 10월 4일');
    expect(buildTimelineDayHeader('2026-02-31', null, '2026-10-07')).toBeNull();
    const view = buildTimelineView({
      items: [
        record,
        record,
        {
          ...record,
          id: 'record-2',
          occurredAt: null,
          createdAt: '2026-10-03T15:10:00Z',
        },
      ],
      filters: {
        ymFilter: '2026-10',
        mainCategory: 'diary',
        otherSubCategory: null,
        query: '',
        sortMode: 'recent',
      },
    });
    expect(buildTimelineDayCounts(view.filteredItems).get('2026-10-04')).toBe(
      2,
    );
    expect(buildTotalSummary(view.filteredItems)).toMatchObject({
      totalRecords: 2,
      recordDays: 1,
    });
  });

  it.each([
    ['누리', '누리와의'],
    ['초코', '초코와의'],
    ['총콩', '총콩과의'],
    ['  밤  ', '밤과의'],
    ['', '우리 아이와의'],
    [null, '우리 아이와의'],
    ['Nuri', 'Nuri와의'],
    ['별🐾', '별🐾와의'],
  ])(
    'uses the selected pet name and safe particles for %s',
    (petName, phrase) => {
      const tree = render(
        <TimelineSeasonalHeader
          season="autumn"
          width={384}
          fontScale={1}
          level={null}
          titles={[]}
          summary={null}
          dailyStatus={null}
          petName={petName}
          showWalkStatus
          onPressBack={jest.fn()}
        />,
      );
      expect(text(tree)).toContain(`${phrase} 오늘 산책을 기록해 보세요.`);
      expect(
        tree.root
          .findAllByType(Image)
          .find(node => node.props.testID === 'timeline-walk-brand')!.props
          .source,
      ).toBe(ASSETS.logo);
      TestRenderer.act(() => tree.unmount());
    },
  );

  it('defaults to the real latest recorded month and emphasizes only its newest day, independent of sorting', () => {
    const records = [
      record,
      { ...record, id: 'new', occurredAt: '2026-10-07' },
      {
        ...record,
        id: 'kst',
        occurredAt: null,
        createdAt: '2026-09-30T15:10:00Z',
      },
    ];
    expect(getLatestTimelineRecordedDay(records)).toBe('2026-10-07');
    expect(getLatestTimelineRecordedDay([...records].reverse())).toBe(
      '2026-10-07',
    );
    expect(getLatestTimelineRecordedDay([])).toBeNull();
    expect(getLatestTimelineDayKey(['2026-02-31', '2026-10-04'])).toBe(
      '2026-10-04',
    );
    expect(formatTimelineRecordedMonth('2026-10')).toBe('2026년 10월');
    expect(formatTimelineRecordedMonth('2026-13')).toBeNull();
    expect(getLatestTimelineRecordedDay([records[2]])).toBe('2026-10-01');
    for (const season of Object.keys(expected) as SeasonKey[]) {
      expect(
        resolveTimelineDaySubtitleColor(
          '2026-10-07',
          '2026-10-07',
          expected[season][4],
        ),
      ).toBe(expected[season][4]);
      expect(
        resolveTimelineDaySubtitleColor(
          '2026-10-04',
          '2026-10-07',
          expected[season][4],
        ),
      ).toBe('#5D6879');
      expect(
        resolveTimelineDaySubtitleColor(null, null, expected[season][4]),
      ).toBe('#5D6879');
    }
  });

  it('protects explicit month selection, pet switches, and the Home all-record entry against delayed summaries', () => {
    const setMonth = jest.fn();
    function Probe({
      petId,
      enabled = true,
      latestRecordedMonth,
    }: {
      petId: string | null;
      enabled?: boolean;
      latestRecordedMonth: string | null;
    }) {
      const mark = useTimelineInitialMonth({
        petId,
        enabled,
        latestRecordedMonth,
        setMonth,
      });
      return <TouchableOpacity onPress={mark} />;
    }
    const tree = render(<Probe petId="pet-1" latestRecordedMonth={null} />);
    const update = (element: React.ReactElement) => {
      TestRenderer.act(() =>
        tree.update(
          <ThemeProvider theme={createTheme('light')}>{element}</ThemeProvider>,
        ),
      );
    };
    expect(setMonth).not.toHaveBeenCalled();
    TestRenderer.act(() =>
      tree.root.findByType(TouchableOpacity).props.onPress(),
    );
    update(<Probe petId="pet-1" latestRecordedMonth="2026-10" />);
    expect(setMonth).not.toHaveBeenCalled();
    update(<Probe petId="pet-2" latestRecordedMonth="2026-09" />);
    expect(setMonth).toHaveBeenLastCalledWith('2026-09');
    update(<Probe petId="pet-2" latestRecordedMonth="2026-11" />);
    expect(setMonth).toHaveBeenCalledTimes(1);
    update(<Probe petId="pet-1" latestRecordedMonth="2026-10" />);
    expect(setMonth).toHaveBeenLastCalledWith('2026-10');
    update(<Probe petId="pet-2" latestRecordedMonth={null} />);
    update(<Probe petId="pet-1" latestRecordedMonth="2026-10" />);
    expect(setMonth).toHaveBeenCalledTimes(3);
    update(
      <Probe petId="pet-1" enabled={false} latestRecordedMonth="2026-11" />,
    );
    expect(setMonth).toHaveBeenCalledTimes(3);
    TestRenderer.act(() => tree.unmount());
  });

  it.each(Object.keys(expected) as SeasonKey[])('%s opts into row blur without changing default cards, taps, or image behavior', season => {
    mockEffectiveSeason = season;
    const press = jest.fn();
    const tree = render(
      <MemoryCard
        item={record}
        onPress={press}
        presentation="seasonalTimeline"
        showDateHeader
        dateHeaderTitle="10월 4일"
        dateHeaderSubtitle="일요일"
        dateHeaderCount={1}
      />,
    );
    const button = tree.root.findByType(TouchableOpacity);
    const glass = tree.root.findAllByProps({ testID: 'timeline-record-glass' }).at(-1)!;
    expect(glass.props.blurAmount).toBe(18);
    expect(glass.props.blurRounds).toBe(2);
    expect(StyleSheet.flatten(glass.props.style)).toMatchObject({
      marginTop: 0, padding: 8, borderRadius: 8, backgroundColor: 'transparent',
    });
    const material = resolveHomeFrostedMaterial(season);
    expect(glass.props.reducedTransparencyFallbackColor).toBe(material.reducedTransparencyFallbackColor);
    const tint = tree.root.findAllByProps({ testID: 'home-frosted-tint' }).at(-1)!;
    expect(StyleSheet.flatten(tint.props.style)).toMatchObject({
      backgroundColor: material.backgroundColor, borderColor: material.borderColor,
    });
    const chip = tree.root
      .findAll(node => node.props.testID === 'timeline-record-category')
      .at(-1)!;
    expect(chip.findAll(node => node.props.family === 'material')).toHaveLength(
      0,
    );
    expect(StyleSheet.flatten(chip.props.style).backgroundColor).toBe(
      '#DDEEFF',
    );
    TestRenderer.act(() => button.props.onPress());
    expect(press).toHaveBeenCalledWith(record);
    expect(
      tree.root.findAll(node => node.props.testID === 'timeline-day-header')
        .length,
    ).toBeGreaterThan(0);
    TestRenderer.act(() =>
      tree.update(
        <ThemeProvider theme={createTheme('light')}>
          <MemoryCard item={record} onPress={press} />
        </ThemeProvider>,
      ),
    );
    expect(
      tree.root.findAll(
        node => node.props.testID === 'timeline-seasonal-record',
      ),
    ).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'timeline-record-glass' })).toHaveLength(0);
    TestRenderer.act(() => tree.unmount());
  });

  it('owns safe top and bottom spacing once, uses global effective season, and preserves guest auth presentation', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/Records/TimelineScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('useEffectiveSeason()');
    expect(source).toContain('paddingTop: insets.top');
    expect(source).toContain(
      'paddingBottom: (toolbarHeight ?? insets.bottom) + 16',
    );
    expect(source).toContain('fetchMemorySummaryRecordsByPet(petId)');
    expect(source).toContain('buildTimelineCategoryCounts(records)');
    expect(source).not.toContain('fetchTimelineCategoryCountsByPet(petId)');
    expect(source).toContain('enabled: isLoggedIn && !isHomeTotalSummaryEntry');
    expect(source).toContain('petName={selectedPet?.name ?? null}');
    expect(source).not.toContain('마지막 기록이에요');
    expect(source).not.toContain('styles.primaryIcon');
    expect(source).not.toContain("dateHeader?.isWeekend ? '#CC4425'");
    const guest = source.slice(
      source.indexOf('if (!isLoggedIn) {'),
      source.indexOf('onLayout={onListLayout}'),
    );
    expect(guest).toContain('backgroundColor: theme.colors.brand');
    expect(guest).not.toContain('<TimelineSeasonalHeader');
    const background = '<SeasonalAmbientBackground season={season} appearance="light" />';
    expect(source.split(background)).toHaveLength(3);
    expect(guest).toContain(background);
    const loggedIn = source.slice(source.indexOf('onLayout={onListLayout}'));
    expect(loggedIn.indexOf(background)).toBeLessThan(loggedIn.indexOf('<FlashList'));
    expect(StyleSheet.flatten(timelineStyles.header)).not.toHaveProperty('backgroundColor');
    expect(StyleSheet.flatten(timelineStyles.controlsWrap)).not.toHaveProperty('backgroundColor');
    expect(timelineStyles.seasonalCard).not.toHaveProperty('backgroundColor');
    expect(timelineStyles.seasonalCardContent).toMatchObject({ padding: 8, marginTop: 0 });
    const tokenSource = fs.readFileSync(
      path.join(process.cwd(), 'src/theme/seasonal/timeline.ts'),
      'utf8',
    );
    expect(tokenSource).not.toContain('ctaPalette');
    for (const season of Object.keys(expected)) {
      const png = fs.readFileSync(
        path.join(process.cwd(), `src/assets/seasonal/timeline/${season}.png`),
      );
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1774, 887]);
    }
  });
});
