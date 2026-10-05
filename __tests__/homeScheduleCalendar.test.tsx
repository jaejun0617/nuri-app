import React from 'react';
import ReactNative from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { HomeScheduleCalendar } from '../src/components/home/HomeScheduleCalendar';
import { ScheduleCalendarSheet } from '../src/components/home/ScheduleCalendarSheet';
import type { PetSchedule } from '../src/services/supabase/schedules';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/home/ScheduleCalendarSheet', () => ({
  ScheduleCalendarSheet: 'ScheduleCalendarSheet',
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 24, left: 0 }),
}));
const schedule: PetSchedule = {
  id: 'qa',
  userId: 'u',
  petId: 'p',
  title: '길이가 긴 QA 일정 제목',
  note: null,
  startsAt: '2026-10-05T01:00:00Z',
  endsAt: null,
  allDay: false,
  category: 'walk',
  subCategory: null,
  iconKey: 'walk',
  colorKey: 'blue',
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
  createdAt: '',
  updatedAt: '',
};
const dimensions = { width: 384, height: 800, scale: 3, fontScale: 1 };
const props = {
  petId: 'p',
  items: [schedule],
  dataState: 'ready' as const,
  season: 'autumn' as const,
  activeScheduleIds: new Set<string>(),
  accentColor: '#2563EB',
  accentDeepColor: '#154BC4',
  accentTint: '#EAF0FF',
  isFocused: true,
  onPressAll: jest.fn(),
  onPressDetail: jest.fn(),
};
const content = (
  overrides: Partial<React.ComponentProps<typeof HomeScheduleCalendar>> = {},
) => (
  <ThemeProvider theme={createTheme('light')}>
    <HomeScheduleCalendar {...props} {...overrides} />
  </ThemeProvider>
);
const press = async (
  renderer: TestRenderer.ReactTestRenderer,
  testID: string,
) => {
  const button = renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(n => n.props.testID === testID);
  if (!button) throw new Error(`Missing button: ${testID}`);
  await act(async () => button.props.onPress());
};

function buttons(renderer: TestRenderer.ReactTestRenderer) {
  // Pressable is memo/forwardRef in RN; query its public props rather than the wrapper type.
  return [
    ...new Map(
      renderer.root
        .findAll(
          node =>
            typeof node.props.onPress === 'function' && !!node.props.testID,
        )
        .map(node => [node.props.testID, node]),
    ).values(),
  ];
}

describe('Home calendar interactions and sizing contract (native layout not simulated)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T03:00:00Z'));
    jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue(dimensions);
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('opens the full day agenda without writes and prefills the existing form', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    const items = Array.from({ length: 12 }, (_, index) => ({
      ...schedule,
      id: `qa-${index}`,
    }));
    await act(async () => {
      renderer = TestRenderer.create(content({ items }));
    });
    expect(
      buttons(renderer).filter(n =>
        n.props.testID?.startsWith('home-calendar-preview-'),
      ),
    ).toHaveLength(1);
    await press(renderer, 'home-calendar-day-2026-10-05');
    const sheet = renderer.root.findByType(ScheduleCalendarSheet);
    expect(sheet.props.initialMode).toBe('agenda');
    expect(sheet.props.day).toBe('2026-10-05');
    expect(sheet.props.occurrences).toHaveLength(12);
    const homeCta = buttons(renderer).find(
      node => node.props.testID === 'home-calendar-create',
    );
    expect(homeCta?.props.disabled).toBe(true);
    expect(
      ReactNative.StyleSheet.flatten(homeCta?.props.style({ pressed: false }))
        .opacity,
    ).toBe(0);
    await act(async () => sheet.props.onClose());
    expect(renderer.root.findAllByType(ScheduleCalendarSheet)).toHaveLength(0);
    await act(async () => renderer.unmount());
  });
  it('removes the month Today control while retaining month navigation, day-close and detail', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(content());
    });
    await press(renderer, 'home-calendar-next');
    expect(
      buttons(renderer).some(
        n => n.props.testID === 'home-calendar-day-2026-11-30',
      ),
    ).toBe(true);
    expect(
      buttons(renderer).some(
        node => node.props.testID === 'home-calendar-today',
      ),
    ).toBe(false);
    await press(renderer, 'home-calendar-previous');
    await press(renderer, 'home-calendar-day-2026-10-05');
    await act(async () =>
      renderer.root.findByType(ScheduleCalendarSheet).props.onClose(),
    );
    expect(renderer.root.findAllByType(ScheduleCalendarSheet)).toHaveLength(0);
    await press(renderer, 'home-calendar-preview-qa');
    expect(props.onPressDetail).toHaveBeenCalledWith('qa');
    await act(async () => renderer.unmount());
  });
  it.each(['loading', 'error'] as const)(
    'never labels unavailable %s data as a confirmed empty day',
    async dataState => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(content({ dataState, items: [] }));
      });
      const serialized = JSON.stringify(renderer.toJSON());
      expect(serialized).not.toContain('아직 등록된 일정이 없어요');
      expect(serialized).not.toContain('일정 0개');
      await act(async () => renderer.unmount());
    },
  );
  it.each(
    [360, 384, 430].flatMap(width =>
      [1, 1.3, 1.5].map(fontScale => ({ width, fontScale })),
    ),
  )(
    'keeps seven stable columns and allows text height to grow at $width dp / $fontScale',
    async ({ width, fontScale }) => {
      jest
        .spyOn(ReactNative, 'useWindowDimensions')
        .mockReturnValue({ ...dimensions, width, fontScale });
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(content());
      });
      const cells = buttons(renderer).filter(n =>
        n.props.testID?.startsWith('home-calendar-day-'),
      );
      expect(cells).toHaveLength(42);
      for (const cell of cells) {
        const style = ReactNative.StyleSheet.flatten(cell.props.style);
        expect(style.width).toBe('14.285714%');
        expect(style.minHeight).toBe(fontScale >= 1.3 ? 54 : 44);
        expect(style).not.toHaveProperty('height');
      }
      await act(async () => renderer.unmount());
    },
  );
  it('does not remount the calendar or lose selection when the season changes', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(content());
    });
    await press(renderer, 'home-calendar-day-2026-10-09');
    await act(async () => renderer.update(content({ season: 'winter' })));
    expect(
      buttons(renderer).find(
        n => n.props.testID === 'home-calendar-day-2026-10-09',
      )?.props.accessibilityState.selected,
    ).toBe(true);
    expect(
      renderer.root.findByType(ScheduleCalendarSheet).props.initialMode,
    ).toBe('create');
    await act(async () =>
      renderer.root.findByType(ScheduleCalendarSheet).props.onClose(),
    );
    await act(async () => renderer.unmount());
  });
});
