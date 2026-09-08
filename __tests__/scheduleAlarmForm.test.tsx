import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import ScheduleCreateScreen from '../src/screens/Schedules/ScheduleCreateScreen';
import ScheduleEditScreen from '../src/screens/Schedules/ScheduleEditScreen';
import { usePetStore } from '../src/store/petStore';
import { useScheduleStore } from '../src/store/scheduleStore';
import {
  createSchedule,
  fetchScheduleById,
  updateSchedule,
  type PetSchedule,
} from '../src/services/supabase/schedules';
import {
  getScheduleNotificationSettings,
  upsertScheduleNotification,
} from '../src/services/schedules/notifications';

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  reset: jest.fn(),
  replace: jest.fn(),
  popTo: jest.fn(),
  canGoBack: () => true,
};
const mockQueryClient = {
  invalidateQueries: jest.fn().mockResolvedValue(undefined),
};
const mockRoute = {
  params: {
    petId: 'pet',
    scheduleId: 'schedule',
    startsAt: '2099-09-04T10:00:00+09:00',
    initialTitle: 'QA',
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  useFocusEffect: (callback: () => void | (() => void)) => {
    const runtime = jest.requireActual('react') as typeof React;
    runtime.useEffect(callback, [callback]);
  },
}));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => mockQueryClient,
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/components/date-picker/DatePickerModal', () => () => null);
jest.mock('../src/components/common/ConfirmDialog', () => () => null);
jest.mock('../src/components/common/WaveText', () => () => null);
jest.mock('../src/services/supabase/schedules', () => ({
  ...jest.requireActual('../src/services/supabase/schedules'),
  createSchedule: jest.fn(),
  fetchScheduleById: jest.fn(),
  updateSchedule: jest.fn(),
}));
jest.mock('../src/services/schedules/notifications', () => ({
  ...jest.requireActual('../src/services/schedules/notifications'),
  checkScheduleNotificationPermission: jest.fn().mockResolvedValue('granted'),
  requestScheduleNotificationPermission: jest.fn().mockResolvedValue('granted'),
  getScheduleNotificationSettings: jest.fn(),
  upsertScheduleNotification: jest.fn(),
  getScheduleNotificationSyncFeedback: jest.fn().mockReturnValue(null),
}));

const legacy: PetSchedule = {
  id: 'schedule',
  userId: 'qa',
  petId: 'pet',
  title: 'QA',
  note: null,
  startsAt: '2099-09-04T10:00:00+09:00',
  endsAt: null,
  allDay: false,
  category: 'other',
  subCategory: 'etc',
  iconKey: 'star',
  colorKey: 'brand',
  reminderMinutes: [5, 10, 15],
  repeatRule: 'weekly',
  repeatInterval: 1,
  repeatUntil: null,
  linkedMemoryId: null,
  completedAt: null,
  source: 'manual',
  externalCalendarId: null,
  externalEventId: null,
  syncStatus: 'local',
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

function hasText(root: TestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => node.props.children === text).length > 0;
}
async function press(root: TestRenderer.ReactTestInstance, text: string) {
  const button = root
    .findAllByType(TouchableOpacity)
    .find(node => hasText(node, text));
  if (!button) throw new Error(`Missing button: ${text}`);
  await TestRenderer.act(async () => {
    await button.props.onPress();
  });
}

describe('single schedule reminder form contract', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  const originalPlatform = Platform.OS;
  const originalPets = usePetStore.getState();
  const originalRefresh = useScheduleStore.getState().refresh;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    usePetStore.setState({
      pets: [{ id: 'pet', name: 'QA' }],
      selectedPetId: 'pet',
    });
    useScheduleStore.setState({
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    jest.mocked(fetchScheduleById).mockResolvedValue(legacy);
    jest.mocked(createSchedule).mockResolvedValue('new-schedule');
    jest.mocked(updateSchedule).mockResolvedValue(undefined);
    jest.mocked(getScheduleNotificationSettings).mockResolvedValue({
      enabled: true,
      nativeSupported: true,
      platform: 'android',
      permission: 'granted',
      exactAlarm: 'granted',
      channel: 'ready',
      delivery: 'exact',
      canOpenExactAlarmSettings: true,
    });
  });
  afterEach(() => {
    if (renderer) TestRenderer.act(() => renderer?.unmount());
    renderer = undefined;
    usePetStore.setState(originalPets);
    useScheduleStore.setState({ refresh: originalRefresh });
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    });
  });
  async function render(screen: React.ReactElement) {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>{screen}</ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('Screen not mounted');
    return renderer.root;
  }

  it('create retains offset and recurrence controls, without any repeat-count field', async () => {
    const root = await render(<ScheduleCreateScreen />);
    await press(root, '5분 전');
    await press(root, '매일');
    for (const removed of ['알림 반복', '1회', '3회', '5회', '계속 반복'])
      expect(hasText(root, removed)).toBe(false);
    for (const kept of ['정시', '5분 전', '매일', '매주'])
      expect(hasText(root, kept)).toBe(true);
    await press(root, '일정 저장하기');
    expect(createSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ reminderMinutes: [5], repeatRule: 'daily' }),
    );
    expect(upsertScheduleNotification).toHaveBeenCalledWith(
      expect.objectContaining({ reminderMinutes: [5], repeatRule: 'daily' }),
      expect.any(Object),
    );
  });

  it('edit reads old offsets but saves one without changing schedule recurrence', async () => {
    const root = await render(<ScheduleEditScreen />);
    expect(hasText(root, '알림 반복')).toBe(false);
    expect(hasText(root, '매주')).toBe(true);
    await press(root, '일정 수정하기');
    expect(updateSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ reminderMinutes: [5], repeatRule: 'weekly' }),
    );
    expect(upsertScheduleNotification).toHaveBeenCalledWith(
      expect.objectContaining({ reminderMinutes: [5], repeatRule: 'weekly' }),
      expect.any(Object),
    );
    expect(legacy.reminderMinutes).toEqual([5, 10, 15]);
  });

  it('edit helper uses real settings and refreshes capability after selection', async () => {
    const root = await render(<ScheduleEditScreen />);
    expect(
      root.findAll(
        node =>
          typeof node.props.children === 'string' &&
          node.props.children.includes('모듈 상태를 확인하지 못했어요'),
      ),
    ).toHaveLength(0);
    jest.mocked(getScheduleNotificationSettings).mockResolvedValue({
      enabled: true,
      nativeSupported: true,
      platform: 'android',
      permission: 'granted',
      exactAlarm: 'not-granted',
      channel: 'ready',
      delivery: 'inexact',
      canOpenExactAlarmSettings: true,
    });
    await press(root, '10분 전');
    expect(
      root.findAll(
        node =>
          typeof node.props.children === 'string' &&
          node.props.children.includes('정확한 시간 알림 권한이 없어'),
      ).length,
    ).toBeGreaterThan(0);
  });
});
