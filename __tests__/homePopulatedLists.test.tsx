import React from 'react';
import * as RN from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import type { PetSchedule } from '../src/services/supabase/schedules';
import type { HealthActivityItem } from '../src/services/health-report/viewModel';
import {
  getNextHomeScheduleId,
  HomeHealthActivityList,
  HomeScheduleList,
} from '../src/screens/Main/components/LoggedInHome/HomePopulatedLists';

jest.mock('../src/app/ui/AppText', () => 'AppText');

const schedule = (
  id: string,
  startsAt: string,
  extra: Partial<PetSchedule> = {},
): PetSchedule => ({
  id,
  startsAt,
  title: `실제 일정 ${id}`,
  note: '저장한 메모',
  userId: 'user',
  petId: 'pet',
  endsAt: null,
  allDay: false,
  category: 'other',
  subCategory: null,
  iconKey: 'calendar',
  colorKey: 'brand',
  reminderMinutes: [],
  repeatRule: 'none',
  repeatInterval: 1,
  repeatUntil: null,
  linkedMemoryId: null,
  completedAt: null,
  source: 'manual',
  externalCalendarId: null,
  externalEventId: null,
  syncStatus: 'local',
  createdAt: startsAt,
  updatedAt: startsAt,
  ...extra,
});
const activity = (
  kind: HealthActivityItem['kind'],
  index: number,
): HealthActivityItem => ({
  id: `memory:${index}`,
  source: 'memory',
  ymd: '2026-10-02',
  title: `실제 건강 활동 ${index}`,
  subtitle: '저장된 관찰 내용',
  kind,
  iconName: 'heart',
});
const render = (child: React.ReactNode) =>
  TestRenderer.create(
    <ThemeProvider theme={createTheme('light')}>{child}</ThemeProvider>,
  );

describe('Home populated lists', () => {
  afterEach(() => jest.restoreAllMocks());

  it('emphasizes only the nearest actual future incomplete schedule, without sorting input', () => {
    const items = [
      schedule('past', '2026-10-01T00:00:00Z'),
      schedule('later', '2026-10-04T00:00:00Z'),
      schedule('complete', '2026-10-02T01:00:00Z', {
        completedAt: '2026-10-01T01:00:00Z',
      }),
      schedule('invalid', 'invalid'),
      schedule('next', '2026-10-03T00:00:00Z'),
    ];
    const ids = items.map(item => item.id);
    expect(
      getNextHomeScheduleId(items, Date.parse('2026-10-02T00:00:00Z')),
    ).toBe('next');
    expect(items.map(item => item.id)).toEqual(ids);
    expect(
      getNextHomeScheduleId(items, Date.parse('2026-10-05T00:00:00Z')),
    ).toBeNull();
    expect(getNextHomeScheduleId([], Date.now())).toBeNull();
  });

  it('preserves schedule order, real timestamps, notes, alarm state and list navigation', async () => {
    const onPress = jest.fn();
    const items = [
      schedule('one', '2026-10-02T00:00:00Z'),
      schedule('two', '2026-10-03T00:00:00Z', { allDay: true, note: null }),
    ];
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = render(
        <HomeScheduleList
          items={items}
          activeScheduleIds={new Set(['two'])}
          accentColor="#0754DA"
          accentTint="#EDF3FF"
          onPress={onPress}
        />,
      );
    });
    const buttons = renderer.root.findAllByType(RN.TouchableOpacity);
    expect(buttons.map(button => button.props.testID)).toEqual([
      'home-schedule-row-one',
      'home-schedule-row-two',
    ]);
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain('10/2 (금) 오전 9:00');
    expect(output).toContain('저장한 메모');
    expect(output).toContain('하루 일정으로 저장된 항목이에요');
    expect(output).toContain('알람 울리는 중');
    buttons.forEach(button => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(2);
    await act(async () => renderer.unmount());
  });

  it.each([
    'hospital',
    'medicine',
    'checkup',
    'vaccine',
    'symptom',
    'health',
  ] as const)(
    'shows %s with a species-neutral icon and unchanged date navigation',
    async kind => {
      const onPress = jest.fn();
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = render(
          <HomeHealthActivityList
            items={[activity(kind, 1)]}
            accentColor="#0754DA"
            onPress={onPress}
          />,
        );
      });
      const output = JSON.stringify(renderer.toJSON());
      expect(output).toContain('2026.10.02');
      expect(output).toContain('실제 건강 활동 1');
      expect(output).not.toMatch(/paw|dog|건강 점수|진단 결과/);
      renderer.root.findByType(RN.TouchableOpacity).props.onPress();
      expect(onPress).toHaveBeenCalledWith('2026-10-02');
      await act(async () => renderer.unmount());
    },
  );

  it.each(
    [360, 384, 400, 430].flatMap(width =>
      [1, 1.3, 1.5].map(fontScale => ({ width, fontScale })),
    ),
  )(
    'allows content-driven row height at $width dp and font scale $fontScale',
    async ({ width, fontScale }) => {
      const dimensions = jest
        .spyOn(
          jest.requireActual<typeof RN>('react-native'),
          'useWindowDimensions',
        )
        .mockReturnValue({ width, height: 800, scale: 3, fontScale });
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = render(
          <HomeHealthActivityList
            items={[activity('health', 1)]}
            accentColor="#0754DA"
            onPress={jest.fn()}
          />,
        );
      });
      expect(dimensions).toHaveBeenCalled();
      const row = renderer.root.findByType(RN.TouchableOpacity);
      const geometry = RN.StyleSheet.flatten(row.props.style);
      expect(geometry.minHeight).toBeGreaterThanOrEqual(44);
      expect(geometry.height).toBeUndefined();
      const title = renderer.root.find(
        node => node.props.preset === 'cardTitle',
      );
      expect(title.props.numberOfLines).toBeUndefined();
      const date = renderer.root.find(
        node => node.props.preset === 'unifiedDate',
      );
      const parentStyle = RN.StyleSheet.flatten(date.parent?.props.style);
      expect(parentStyle.flexDirection).toBe(fontScale > 1 ? 'column' : 'row');
      await act(async () => renderer.unmount());
    },
  );
});
