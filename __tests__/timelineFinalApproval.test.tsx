import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import fs from 'node:fs';
import path from 'node:path';
import { createTheme } from '../src/app/theme/theme';
import TimelineSeasonalHeader, {
  TimelineSeasonalControls,
} from '../src/screens/Records/TimelineSeasonalHeader';
import { buildTotalSummary } from '../src/services/home/weeklySummary';
import { buildTimelineCategoryCounts } from '../src/services/timeline/query';
import type { MemoryRecord } from '../src/services/supabase/memories';
import type { SeasonKey } from '../src/theme/seasonal/season';

const seasons: SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];
const records: MemoryRecord[] = Array.from({ length: 11 }, (_, index) => ({
  id: `record-${index}`,
  petId: 'pet-1',
  title: '합성 테스트 기록',
  tags: [],
  imagePaths: [],
  category: 'diary',
  occurredAt: '2026-10-04',
  createdAt: '2026-10-04T03:14:00Z',
}));

function render(element: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>{element}</ThemeProvider>,
    );
  });
  return tree;
}

describe('Timeline final approval contract', () => {
  it.each(seasons)('%s increases only chip text by 1sp', season => {
    const tree = render(
      <TimelineSeasonalControls
        season={season}
        sortLabel="최신순"
        monthLabel="2026년 10월"
        mainCategory="all"
        categoryLabel="전체"
        counts={buildTimelineCategoryCounts(records)}
        transitioning={false}
        onToggleSort={jest.fn()}
        onOpenMonth={jest.fn()}
        onPressCategory={jest.fn()}
      />,
    );
    for (const button of tree.root.findAllByType(TouchableOpacity)) {
      const category = button.props.testID?.startsWith('timeline-category-');
      expect(StyleSheet.flatten(button.props.style).minHeight).toBe(44);
      for (const label of button.findAllByType(Text)) {
        expect(StyleSheet.flatten(label.props.style)).toMatchObject({
          fontSize: category ? 12 : 13,
          lineHeight: category ? 17 : 18,
          letterSpacing: 0,
        });
      }
      const surface = button
        .findAll(node => /-surface(?:-|$)/.test(node.props.testID ?? ''))
        .at(-1)!;
      expect(StyleSheet.flatten(surface.props.style)).toMatchObject({
        paddingHorizontal: 8,
        paddingVertical: 4,
      });
    }
    TestRenderer.act(() => tree.unmount());
  });

  it.each(seasons)('%s displays the actual XP and record props', season => {
    const summary = buildTotalSummary(records);
    const level = {
      totalXp: 507,
      level: 4,
      currentLevelXp: 450,
      nextLevelXp: 700,
      updatedAt: null,
    };
    const tree = render(
      <TimelineSeasonalHeader
        season={season}
        width={384}
        fontScale={1}
        level={level}
        titles={[]}
        summary={summary}
        dailyStatus={null}
        petName={null}
        showWalkStatus={false}
        onPressBack={jest.fn()}
      />,
    );
    const labels = tree.root
      .findAllByType(Text)
      .flatMap(node => React.Children.toArray(node.props.children))
      .filter(child => typeof child === 'string' || typeof child === 'number')
      .join(' ');
    expect(labels).toContain('507');
    expect(labels).toContain('11개의 기록');
    expect(labels).not.toContain('1,111');
    const fill = tree.root
      .findAll(node => node.props.testID === 'timeline-progress-gradient')
      .at(-1)!;
    expect(StyleSheet.flatten(fill.props.style).width).toBe('23%');
    expect(level.totalXp).toBe(507);
    expect(summary.totalRecords).toBe(11);
    TestRenderer.act(() => tree.unmount());
  });

  it('removes the temporary preview and connects the canonical summaries directly', () => {
    const directory = path.join(__dirname, '../src/screens/Records');
    const source = fs.readFileSync(
      path.join(directory, 'TimelineScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('level={levelSummary}');
    expect(source).toContain('summary={totalSummary}');
    expect(source).not.toMatch(/statisticsReviewPreview|profileNickname/);
    expect(
      fs.existsSync(path.join(directory, 'timelineStatisticsReviewPreview.ts')),
    ).toBe(false);
    expect(source).not.toMatch(/\b(?:670|1111|1_111)\b/);
  });
});
