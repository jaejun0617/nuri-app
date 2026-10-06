import React from 'react';
import ReactNative from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import ScheduleDetailScreen from '../src/screens/Schedules/ScheduleDetailScreen';
import {
  fetchScheduleById,
  setScheduleCompletedAt,
  type PetSchedule,
} from '../src/services/supabase/schedules';
import { loadScheduleRecordRecovery } from '../src/services/local/recordDraft';
import { linkScheduleRecord } from '../src/services/schedules/recordLink';
import { fetchMemoryById } from '../src/services/supabase/memories';
import { normalizeMemoryRecord } from '../src/services/records/imageSources';
import { usePetStore } from '../src/store/petStore';
import { useScheduleStore } from '../src/store/scheduleStore';
import { StyleSheet } from 'react-native';
import CtaButton from '../src/app/ui/CtaButton';

const mockNav = { navigate: jest.fn(), goBack: jest.fn(), popTo: jest.fn() };
const mockQuery = {
  invalidateQueries: jest.fn().mockResolvedValue(undefined),
  setQueriesData: jest.fn(),
};
let mockSeason = 'autumn';
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNav,
  useRoute: () => ({
    params: { petId: 'p', scheduleId: 's', entrySource: 'home' },
  }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const runtime = jest.requireActual('react') as typeof React;
    runtime.useEffect(callback, [callback]);
  },
}));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => mockQuery }));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (
    selector: (state: { session: { user: { id: string } } }) => unknown,
  ) => selector({ session: { user: { id: 'u' } } }),
}));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));
jest.mock('../src/components/home/HomeFrostedGlass', () => ({
  HomeFrostedGlass: 'Glass',
}));
jest.mock(
  '../src/screens/Main/components/LoggedInHome/HomeAmbientBubbleCanvas',
  () => ({ HomeAmbientBubbleCanvas: 'Canvas' }),
);
jest.mock('../src/components/common/ConfirmDialog', () => 'ConfirmDialog');
jest.mock('../src/components/icons/NuriSemanticIcon', () => 'SemanticIcon');
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 24, bottom: 18 }),
}));
jest.mock('../src/services/supabase/schedules', () => ({
  ...jest.requireActual('../src/services/supabase/schedules'),
  fetchScheduleById: jest.fn(),
  setScheduleCompletedAt: jest.fn(),
}));
jest.mock('../src/services/supabase/memories', () => ({
  ...jest.requireActual('../src/services/supabase/memories'),
  fetchMemoryById: jest.fn(),
}));
jest.mock('../src/services/local/recordDraft', () => ({
  loadScheduleRecordRecovery: jest.fn().mockResolvedValue(null),
  clearScheduleRecordRecovery: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/schedules/recordLink', () => ({
  linkScheduleRecord: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/schedules/notifications', () => ({
  ...jest.requireActual('../src/services/schedules/notifications'),
  getScheduleNotificationSettings: jest.fn().mockResolvedValue(null),
  clearScheduleNotification: jest.fn(),
  getScheduleNotificationSyncFeedback: jest.fn().mockReturnValue(null),
}));
const row: PetSchedule = {
  id: 's',
  userId: 'u',
  petId: 'p',
  title: '긴 제목도 잘리지 않는 일정',
  note: '메모',
  startsAt: '2026-10-01T01:00:00Z',
  endsAt: null,
  allDay: false,
  category: 'other',
  subCategory: 'etc',
  iconKey: 'star',
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
describe('schedule detail candidate', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  const petBefore = usePetStore.getState();
  const scheduleBefore = useScheduleStore.getState();
  const mount = async () => {
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <ScheduleDetailScreen />
        </ThemeProvider>,
      );
    });
  };
  const press = async (testID: string) => {
    await act(async () => {
      await renderer.root.findByProps({ testID }).props.onPress();
    });
  };
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeason = 'autumn';
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 384, height: 800, fontScale: 1, scale: 3 });
    usePetStore.setState({
      pets: [{ id: 'p', name: '누리' }],
      selectedPetId: 'p',
    });
    useScheduleStore.setState({
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    jest.mocked(fetchScheduleById).mockResolvedValue(row);
    jest.mocked(loadScheduleRecordRecovery).mockResolvedValue(null);
  });
  afterEach(() => {
    act(() => renderer?.unmount());
    usePetStore.setState(petBefore);
    useScheduleStore.setState(scheduleBefore);
    jest.restoreAllMocks();
  });
  it.each(['autumn', 'winter', 'spring', 'summer'])(
    'shares exact list canvas and Home glass for %s',
    async season => {
      mockSeason = season;
      await mount();
      const canvas = renderer.root.find(node => String(node.type) === 'Canvas');
      expect(canvas.props).toMatchObject({ season, decorationMode: 'reading' });
      expect(
        renderer.root.findByProps({ testID: 'schedule-detail-glass' }).props
          .season,
      ).toBe(season);
      expect(
        renderer.root
          .findAll(node => String(node.type) === 'AppText')
          .map(node => node.props.children),
      ).toEqual(
        expect.arrayContaining([
          '누리의 일정',
          row.title,
          '미완료',
          '기타',
          '반복 없음',
          '일정 수정하기',
        ]),
      );
      expect(
        renderer.root.findAllByProps({ testID: 'schedule-detail-record' }),
      ).toHaveLength(0);
      expect(
        renderer.root
          .findByProps({ testID: 'schedule-detail-edit' })
          .findAll(node => String(node.type) === 'SemanticIcon'),
      ).toHaveLength(0);
    },
  );
  it.each([
    [360, 1.5, 'column'],
    [384, 1, 'row'],
    [400, 1.3, 'column'],
    [430, 1, 'row'],
  ])(
    'keeps three action roles and a natural layout at %s dp / %s scale',
    async (width, fontScale, direction) => {
      jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
        width: Number(width),
        height: 800,
        fontScale: Number(fontScale),
        scale: 3,
      });
      await mount();
      expect(
        StyleSheet.flatten(
          renderer.root.findByProps({
            testID: 'schedule-detail-secondary-actions',
          }).props.style,
        ).flexDirection,
      ).toBe(direction);
      const controls = renderer.root.findAllByType(CtaButton);
      expect(
        controls.find(n => n.props.testID === 'schedule-detail-edit')?.props
          .role,
      ).toBe('primary');
      expect(
        controls.find(n => n.props.testID === 'schedule-detail-complete')?.props
          .role,
      ).toBe('secondary');
      expect(
        controls.find(n => n.props.testID === 'schedule-detail-delete')?.props
          .role,
      ).toBe('destructiveEntry');
    },
  );
  it('completion stays in detail, preserves link metadata and does not create a record', async () => {
    jest
      .mocked(setScheduleCompletedAt)
      .mockResolvedValue({ ...row, completedAt: '2026-10-06T01:00:00Z' });
    await mount();
    await press('schedule-detail-complete');
    expect(setScheduleCompletedAt).toHaveBeenCalledWith(
      expect.objectContaining({ scheduleId: 's', petId: 'p' }),
    );
    expect(mockNav.popTo).not.toHaveBeenCalled();
    expect(linkScheduleRecord).not.toHaveBeenCalled();
    await press('schedule-detail-record');
    expect(mockNav.navigate).toHaveBeenCalledWith(
      'RecordCreate',
      expect.objectContaining({
        petId: 'p',
        returnTo: expect.objectContaining({ tab: 'ScheduleDetail' }),
      }),
    );
  });
  it('retries only the existing saved record link', async () => {
    jest
      .mocked(fetchScheduleById)
      .mockResolvedValue({ ...row, completedAt: 'done' });
    jest.mocked(loadScheduleRecordRecovery).mockResolvedValue('m');
    jest.mocked(fetchMemoryById).mockResolvedValue(
      normalizeMemoryRecord({
        id: 'm',
        petId: 'p',
        title: '저장한 기록',
        tags: [],
        createdAt: '2026-10-01T01:00:00Z',
      }),
    );
    await mount();
    await press('schedule-detail-record');
    expect(linkScheduleRecord).toHaveBeenCalledWith({
      petId: 'p',
      scheduleId: 's',
      memoryId: 'm',
    });
    expect(mockNav.navigate).not.toHaveBeenCalledWith(
      'RecordCreate',
      expect.anything(),
    );
  });
  it('fails closed when recovery cannot be read', async () => {
    jest
      .mocked(fetchScheduleById)
      .mockResolvedValue({ ...row, completedAt: 'done' });
    jest
      .mocked(loadScheduleRecordRecovery)
      .mockRejectedValue(new Error('disk'));
    await mount();
    await press('schedule-detail-record');
    expect(mockNav.navigate).not.toHaveBeenCalled();
    expect(linkScheduleRecord).not.toHaveBeenCalled();
  });
});
