import React from 'react';
import ReactNative, {
  Alert,
  FlatList,
  Modal,
  SectionList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { ScheduleCalendarSheet } from '../src/components/home/ScheduleCalendarSheet';
import { resolveBoundedInputOffset } from '../src/hooks/useBoundedKeyboardScroll';
import { useScheduleCreateForm } from '../src/hooks/useScheduleCreateForm';
import ScheduleListScreen from '../src/screens/Schedules/ScheduleListScreen';
import {
  createSchedule,
  type PetSchedule,
} from '../src/services/supabase/schedules';
import { upsertScheduleNotification } from '../src/services/schedules/notifications';
import { useScheduleStore } from '../src/store/scheduleStore';
import { usePetStore } from '../src/store/petStore';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  canGoBack: () => true,
};
const mockRoute = { params: { petId: 'p', entrySource: 'home' } };
const mockSheetCompletions: Array<(finished?: boolean) => void> = [];
const mockSheetTimings: Array<{ value: number; duration: number }> = [];
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'AnimatedView' },
  cancelAnimation: jest.fn(),
  Easing: {
    out: (value: unknown) => value,
    in: (value: unknown) => value,
    cubic: jest.fn(),
  },
  runOnJS: (callback: () => void) => callback,
  useSharedValue: (initial: number) => {
    const runtime = jest.requireActual('react') as typeof React;
    return runtime.useRef({ value: initial }).current;
  },
  useAnimatedStyle: (factory: () => unknown) => factory(),
  withTiming: (
    value: number,
    config: { duration: number },
    callback?: (finished?: boolean) => void,
  ) => {
    mockSheetTimings.push({ value, duration: config.duration });
    if (callback) mockSheetCompletions.push(callback);
    return value;
  },
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  useFocusEffect: (callback: () => void | (() => void)) => {
    const runtime = jest.requireActual('react') as typeof React;
    runtime.useEffect(callback, [callback]);
  },
}));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => 'autumn',
}));
jest.mock('../src/components/home/HomeFrostedGlass', () => ({
  HomeFrostedGlass: 'HomeFrostedGlass',
}));
jest.mock(
  '../src/screens/Main/components/LoggedInHome/HomeAmbientBubbleCanvas',
  () => ({ HomeAmbientBubbleCanvas: 'HomeAmbientBubbleCanvas' }),
);
jest.mock('../src/components/date-picker/DatePickerModal', () => () => null);
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/ui/AppTextInput', () => 'AppTextInput');
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  useReanimatedKeyboardAnimation: () => ({ progress: { value: 0 } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  SafeAreaProvider: 'SafeAreaProvider',
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('../src/services/supabase/schedules', () => ({
  ...jest.requireActual('../src/services/supabase/schedules'),
  createSchedule: jest.fn(),
}));
jest.mock('../src/services/schedules/notifications', () => ({
  ...jest.requireActual('../src/services/schedules/notifications'),
  getScheduleNotificationSettings: jest.fn().mockResolvedValue(null),
  checkScheduleNotificationPermission: jest.fn().mockResolvedValue('granted'),
  requestScheduleNotificationPermission: jest.fn().mockResolvedValue('granted'),
  upsertScheduleNotification: jest.fn(),
  getScheduleNotificationSyncFeedback: jest.fn().mockReturnValue(null),
}));
const row: PetSchedule = {
  id: 'qa',
  userId: 'u',
  petId: 'p',
  title: 'QA 일정',
  note: null,
  startsAt: '2099-10-05T01:00:00Z',
  endsAt: null,
  allDay: false,
  category: 'walk',
  subCategory: null,
  iconKey: 'walk',
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
  createdAt: '',
  updatedAt: '',
};
const sheetProps = {
  petId: 'p',
  day: '2099-10-05',
  occurrences: [],
  initialMode: 'create' as const,
  dataState: 'ready' as const,
  season: 'autumn' as const,
  accentColor: '#E45A58',
  accentDeepColor: '#AF3735',
  onClose: jest.fn(),
  onSaved: jest.fn(),
  onDetail: jest.fn(),
};
const hookSaved = jest.fn();
let form: ReturnType<typeof useScheduleCreateForm>;
function Probe() {
  form = useScheduleCreateForm({
    petId: 'p',
    params: { startsAt: '2099-10-05T10:00:00+09:00' },
    onSaved: hookSaved,
  });
  return null;
}
describe('calendar registration and schedule hub completion', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  const beforePet = usePetStore.getState();
  const beforeSchedule = useScheduleStore.getState();
  beforeEach(() => {
    jest.clearAllMocks();
    mockSheetCompletions.length = 0;
    mockSheetTimings.length = 0;
    jest.spyOn(Alert, 'alert');
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 384, height: 800, fontScale: 1, scale: 3 });
    jest.mocked(createSchedule).mockResolvedValue('new');
    jest.mocked(upsertScheduleNotification).mockResolvedValue({
      status: 'cleared',
      persistedRecord: 'unchanged',
      deviceAlarm: 'cleared',
      delivery: 'exact',
      permission: 'granted',
      exactAlarm: 'granted',
      channel: 'ready',
    });
    usePetStore.setState({
      pets: [{ id: 'p', name: '누리' }],
      selectedPetId: 'p',
    });
    useScheduleStore.setState({
      refresh: jest.fn().mockResolvedValue(undefined),
      bootstrap: jest.fn(),
      byPetId: {},
    });
  });
  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    usePetStore.setState(beforePet);
    useScheduleStore.setState(beforeSchedule);
    jest.restoreAllMocks();
  });
  async function mount(element: React.ReactElement) {
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>{element}</ThemeProvider>,
      );
    });
  }
  const byId = (id: string) =>
    renderer.root.findAll(node => node.props.testID === id)[0];
  it('opens directly in a bounded inline form, with one disabled save and no write', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} />);
    expect(renderer.root.findByType(Modal).props.animationType).toBe('none');
    expect(renderer.root.findByType(Modal).props.navigationBarTranslucent).toBe(
      true,
    );
    expect(byId('home-calendar-safe-area').props.edges).toEqual(['top']);
    expect(byId('calendar-create-save').props.disabled).toBe(true);
    expect(byId('calendar-create-title').props.value).toBe('');
    expect(
      renderer.root.findAll(
        node => node.props.testID === 'home-calendar-agenda-create',
      ),
    ).toHaveLength(0);
    expect(createSchedule).not.toHaveBeenCalled();
    const style = StyleSheet.flatten(
      byId('home-calendar-motion-panel').props.style,
    );
    expect(style.height).toBeLessThanOrEqual(660);
  });
  it.each(
    [360, 384, 430].flatMap(width =>
      [1, 1.3, 1.5].map(fontScale => ({ width, fontScale })),
    ),
  )(
    'bounds the sheet and keeps save outside the scrolling form at $width / $fontScale',
    async ({ width, fontScale }) => {
      jest
        .spyOn(ReactNative, 'useWindowDimensions')
        .mockReturnValue({ width, height: 800, fontScale, scale: 3 });
      await mount(<ScheduleCalendarSheet {...sheetProps} />);
      expect(
        StyleSheet.flatten(byId('home-calendar-motion-panel').props.style)
          .height,
      ).toBeLessThanOrEqual(728);
      expect(
        StyleSheet.flatten(byId('calendar-create-save').props.style).minHeight,
      ).toBe(46);
    },
  );
  it('protects the draft on backdrop, close and Android back, without discarding automatically', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} />);
    await act(async () =>
      byId('calendar-create-title').props.onChangeText('QA draft'),
    );
    await act(async () =>
      renderer.root.findByType(Modal).props.onRequestClose(),
    );
    expect(byId('confirm-dialog-card').props.accessibilityViewIsModal).toBe(true);
    expect(byId('confirm-dialog-cancel').props.accessibilityLabel).toBe('계속 작성하기');
    expect(byId('confirm-dialog-confirm').props.accessibilityLabel).toBe('나가기');
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType(Modal)).toHaveLength(1);
    await act(async () => byId('confirm-dialog-cancel').props.onPress());
    expect(renderer.root.findAll(node => node.props.testID === 'confirm-dialog-card')).toHaveLength(0);
    expect(sheetProps.onClose).not.toHaveBeenCalled();
    expect(byId('calendar-create-title').props.value).toBe('QA draft');
  });
  it('agenda switches to registration inside the same modal, without navigation', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} initialMode="agenda" />);
    await act(async () => byId('home-calendar-agenda-create').props.onPress());
    expect(byId('calendar-create-title')).toBeDefined();
    expect(renderer.root.findAllByType(Modal)).toHaveLength(1);
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });
  it('discards only through the styled confirmation and completed exit motion', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} />);
    await act(async () => byId('calendar-create-note').props.onChangeText('QA draft'));
    await act(async () => byId('home-calendar-agenda-close').props.onPress());
    expect(byId('confirm-dialog-card')).toBeDefined();
    await act(async () => byId('confirm-dialog-confirm').props.onPress());
    expect(sheetProps.onClose).not.toHaveBeenCalled();
    await act(async () => mockSheetCompletions[0](true));
    expect(sheetProps.onClose).toHaveBeenCalledTimes(1);
    expect(createSchedule).not.toHaveBeenCalled();
  });
  it('waits for native presentation and actual agenda sizing before starting entry once', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} initialMode="agenda" />);
    await act(async () => renderer.root.findByType(Modal).props.onShow());
    expect(mockSheetTimings).not.toContainEqual({ value: 1, duration: 300 });
    await act(async () => {
      byId('home-calendar-sheet-header').props.onLayout({
        nativeEvent: { layout: { height: 64 } },
      });
      byId('home-calendar-agenda-create').props.onLayout({
        nativeEvent: { layout: { height: 46 } },
      });
      renderer.root.findByType(FlatList).props.onContentSizeChange(300, 240);
    });
    expect(
      mockSheetTimings.filter(
        item => item.value === 1 && item.duration === 300,
      ),
    ).toHaveLength(1);
    await act(async () => renderer.root.findByType(Modal).props.onShow());
    expect(
      mockSheetTimings.filter(
        item => item.value === 1 && item.duration === 300,
      ),
    ).toHaveLength(1);
  });
  it('does not start a height correction while the panel is dismissing', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} initialMode="agenda" />);
    await act(async () => {
      renderer.root.findByType(Modal).props.onShow();
      byId('home-calendar-sheet-header').props.onLayout({
        nativeEvent: { layout: { height: 64 } },
      });
      byId('home-calendar-agenda-create').props.onLayout({
        nativeEvent: { layout: { height: 46 } },
      });
      renderer.root.findByType(FlatList).props.onContentSizeChange(300, 240);
    });
    await act(async () => byId('home-calendar-agenda-close').props.onPress());
    const before = mockSheetTimings.length;
    await act(async () =>
      renderer.root.findByType(FlatList).props.onContentSizeChange(300, 400),
    );
    expect(mockSheetTimings).toHaveLength(before);
  });
  it('retains the modal until dismissal completes and ignores duplicate close taps', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} initialMode="agenda" />);
    await act(async () => renderer.root.findByType(Modal).props.onShow());
    const close = byId('home-calendar-agenda-close').props.onPress;
    await act(async () => {
      close();
      close();
    });
    expect(sheetProps.onClose).not.toHaveBeenCalled();
    expect(mockSheetCompletions).toHaveLength(1);
    await act(async () => mockSheetCompletions[0](false));
    expect(sheetProps.onClose).not.toHaveBeenCalled();
    await act(async () => mockSheetCompletions[0](true));
    expect(sheetProps.onClose).toHaveBeenCalledTimes(1);
  });
  it('renders a crisp close glyph and explicit readable input placeholders', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} />);
    expect(byId('calendar-create-title').props.placeholderTextColor).toBe(
      '#556070',
    );
    const closeGlyph = byId('home-calendar-agenda-close').findAll(
      node => node.props.name === 'x' && node.props.color === '#0B1220',
    );
    expect(closeGlyph.length).toBeGreaterThan(0);
    expect(
      StyleSheet.flatten(byId('home-calendar-agenda-close').props.style).width,
    ).toBe(44);
  });
  it('is opaque at rest and during motion, without native blur inside the input sheet', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} />);
    expect(byId('home-calendar-agenda').props).not.toHaveProperty('blurAmount');
    expect(StyleSheet.flatten(byId('home-calendar-agenda').props.style)).toMatchObject({ backgroundColor: '#FFFFFF', overflow: 'hidden' });
    expect(
      StyleSheet.flatten(byId('home-calendar-reading-surface').props.style),
    ).toMatchObject({ backgroundColor: '#FFFFFF' });
    expect(
      StyleSheet.flatten(byId('home-calendar-reading-surface').props.style),
    ).toMatchObject({ borderTopLeftRadius: 24, borderTopRightRadius: 24 });
    const stopPropagation = jest.fn();
    byId('home-calendar-sheet-touch-boundary').props.onPress({
      stopPropagation,
    });
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(sheetProps.onClose).not.toHaveBeenCalled();
  });
  it('fills the sheet width and owns keyboard avoidance once, without a keyboard spacer inside the form', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} />);
    const viewport = byId('home-calendar-keyboard-viewport');
    expect(viewport.props.behavior).toBe('height');
    expect(viewport.props.automaticOffset).toBe(true);
    expect(StyleSheet.flatten(viewport.props.style)).not.toHaveProperty(
      'paddingHorizontal',
    );
    expect(StyleSheet.flatten(viewport.props.style)).not.toHaveProperty(
      'paddingBottom',
    );
    expect(
      StyleSheet.flatten(byId('home-calendar-motion-panel').props.style),
    ).toMatchObject({ width: '100%', maxHeight: '100%' });
    expect(
      StyleSheet.flatten(byId('home-calendar-agenda').props.style),
    ).toMatchObject({
      width: '100%',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      paddingBottom: 24,
    });
    const body = renderer.root.findByType(ScrollView);
    expect(
      StyleSheet.flatten(body.props.contentContainerStyle).paddingBottom,
    ).toBe(16);
    expect(body.props.automaticallyAdjustKeyboardInsets).not.toBe(true);
  });
  it.each([
    [{ y: 30, height: 44 }, 0, 300, 600, 0],
    [{ y: 500, height: 60 }, 0, 300, 600, 272],
    [{ y: 590, height: 60 }, 0, 300, 600, 300],
    [{ y: 20, height: 44 }, 300, 300, 600, 8],
    [{ y: 20, height: 44 }, 900, 300, 100, 0],
  ] as const)(
    'bounds focused-input reveal to actual content %#',
    (input, offset, viewport, content, expected) => {
      expect(resolveBoundedInputOffset(input, offset, viewport, content)).toBe(
        expected,
      );
    },
  );
  it('clamps the animated panel to the keyboard-reduced parent so the fixed header stays onscreen', async () => {
    await mount(<ScheduleCalendarSheet {...sheetProps} />);
    await act(async () => {
      byId('home-calendar-keyboard-viewport').props.onLayout({
        nativeEvent: { layout: { height: 330 } },
      });
      renderer.update(
        <ThemeProvider theme={createTheme('light')}>
          <ScheduleCalendarSheet {...sheetProps} />
        </ThemeProvider>,
      );
    });
    expect(
      StyleSheet.flatten(byId('home-calendar-motion-panel').props.style),
    ).toMatchObject({ height: 330, flexShrink: 1, minHeight: 0 });
    expect(
      byId('home-calendar-sheet-header').findAllByType(ScrollView),
    ).toHaveLength(0);
  });
  it('keeps the keyboard anchor until the exit completes', async () => {
    const dismissKeyboard = jest.spyOn(ReactNative.Keyboard, 'dismiss');
    await mount(<ScheduleCalendarSheet {...sheetProps} />);
    await act(async () => byId('home-calendar-agenda-close').props.onPress());
    expect(dismissKeyboard).not.toHaveBeenCalled();
    await act(async () => mockSheetCompletions[0](true));
    expect(dismissKeyboard).toHaveBeenCalledTimes(1);
    expect(sheetProps.onClose).toHaveBeenCalledTimes(1);
  });
  it('saves the selected date through the shared contract and blocks double taps', async () => {
    await mount(<Probe />);
    await act(async () => {
      form.setTitle('QA title');
      form.setAllDay(true);
    });
    await act(async () => {
      await Promise.all([form.onSubmit(), form.onSubmit()]);
    });
    expect(createSchedule).toHaveBeenCalledTimes(1);
    expect(createSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        petId: 'p',
        title: 'QA title',
        allDay: true,
        startsAt: '2099-10-04T15:00:00.000Z',
      }),
    );
    expect(hookSaved).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new', ymd: '2099-10-05' }),
    );
  });
  it('does not insert a duplicate if native alarm completion fails after the server write', async () => {
    jest
      .mocked(upsertScheduleNotification)
      .mockRejectedValueOnce(new Error('native failure'));
    await mount(<Probe />);
    await act(async () => form.setTitle('QA retry'));
    await act(async () => form.onSubmit());
    expect(form.persisted).toBe(true);
    expect(hookSaved).not.toHaveBeenCalled();
    await act(async () => form.onSubmit());
    expect(createSchedule).toHaveBeenCalledTimes(1);
    expect(upsertScheduleNotification).toHaveBeenCalledTimes(2);
    expect(hookSaved).toHaveBeenCalledTimes(1);
  });
  it('retains the draft after a failed server write', async () => {
    jest.mocked(createSchedule).mockRejectedValueOnce(new Error('network'));
    await mount(<Probe />);
    await act(async () => form.setTitle('QA preserve'));
    await act(async () => form.onSubmit());
    expect(form.title).toBe('QA preserve');
    expect(form.saving).toBe(false);
    expect(form.persisted).toBe(false);
    expect(hookSaved).not.toHaveBeenCalled();
  });
  it('rejects an empty title without writes or alarm changes', async () => {
    await mount(<Probe />);
    await act(async () => form.onSubmit());
    expect(createSchedule).not.toHaveBeenCalled();
    expect(upsertScheduleNotification).not.toHaveBeenCalled();
  });
  it('shows date-grouped rows, then narrows by search without writes', async () => {
    useScheduleStore.setState({
      byPetId: {
        p: {
          status: 'ready',
          items: [row, { ...row, id: 'second', title: '다른 일정' }],
          errorMessage: null,
          requestSeq: 1,
        },
      },
    });
    await mount(<ScheduleListScreen />);
    expect(byId('schedule-hub-search').props.placeholderTextColor).toBe(
      '#556070',
    );
    expect(
      renderer.root.findByType(SectionList).props.sections[0].data,
    ).toHaveLength(2);
    await act(async () => byId('schedule-hub-search').props.onChangeText('qa'));
    expect(
      renderer.root.findByType(SectionList).props.sections[0].data,
    ).toHaveLength(1);
    expect(createSchedule).not.toHaveBeenCalled();
  });
  it('maintains existing pet and return context for full-hub create/detail navigation', async () => {
    useScheduleStore.setState({
      byPetId: {
        p: { status: 'ready', items: [row], errorMessage: null, requestSeq: 1 },
      },
    });
    await mount(<ScheduleListScreen />);
    const item = renderer.root
      .findByType(SectionList)
      .props.renderItem({ item: { key: row.id, schedule: row, startsAt: row.startsAt, startDay: '2026-10-05' }, section: { day: '2026-10-05' } });
    await act(async () => item.props.onPress());
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'ScheduleDetail',
      expect.objectContaining({
        petId: 'p',
        scheduleId: 'qa',
        returnTo: { screen: 'ScheduleList', entrySource: 'home' },
      }),
    );
  });
  it('groups all/today/upcoming/past in order and preserves search when selecting Today', async () => {
    useScheduleStore.setState({ byPetId: { p: { status: 'ready', items: [row], errorMessage: null, requestSeq: 1 } } });
    await mount(<ScheduleListScreen />);
    const keys = [...new Set(renderer.root.findAll(node => node.props.accessibilityRole === 'tab').map(node => node.props.testID))];
    expect(keys).toEqual(['schedule-hub-filter-all', 'schedule-hub-filter-today', 'schedule-hub-filter-upcoming', 'schedule-hub-filter-past']);
    expect(renderer.root.findAll(node => node.props.testID === 'schedule-hub-today')).toHaveLength(0);
    await act(async () => byId('schedule-hub-search').props.onChangeText('qa'));
    await act(async () => byId('schedule-hub-filter-today').props.onPress());
    expect(byId('schedule-hub-search').props.value).toBe('qa');
    expect(byId('schedule-hub-filter-today').props.accessibilityState.selected).toBe(true);
    expect(renderer.root.findByType(SectionList).props.sections).toEqual([]);
    await act(async () => byId('schedule-hub-filter-all').props.onPress());
    expect(renderer.root.findByType(SectionList).props.sections[0].data).toHaveLength(1);
  });
});
