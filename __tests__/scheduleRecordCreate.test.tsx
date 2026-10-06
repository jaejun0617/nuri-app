import React from 'react';
import { Alert } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import RecordCreateScreen from '../src/screens/Records/RecordCreateScreen';
import {
  fetchScheduleById,
  type PetSchedule,
} from '../src/services/supabase/schedules';
import { createMemory } from '../src/services/supabase/memories';
import {
  loadRecordCreateDraft,
  loadScheduleRecordRecovery,
  saveScheduleRecordRecovery,
  saveRecordCreateDraft,
} from '../src/services/local/recordDraft';
import { linkScheduleRecord } from '../src/services/schedules/recordLink';
import { recordTimelineCreateActivity } from '../src/services/activity/timelineActivity';
import { usePetStore } from '../src/store/petStore';
import { useRecordStore } from '../src/store/recordStore';
import { useScheduleStore } from '../src/store/scheduleStore';

const context = { petId: 'p', scheduleId: 's', entrySource: 'home' as const };
const scope = { userId: 'u', petId: 'p', scheduleId: 's' };
const mockNavigation = {
  navigate: jest.fn(),
  popTo: jest.fn(),
  canGoBack: () => true,
  goBack: jest.fn(),
};
const mockQuery = { invalidateQueries: jest.fn().mockResolvedValue(undefined) };
let mockUserId = 'u';
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: {
      petId: 'p',
      initialMainCategory: 'walk',
      returnTo: { tab: 'ScheduleDetail', params: context },
    },
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
  ) => selector({ session: { user: { id: mockUserId } } }),
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/ui/AppTextInput', () => 'AppTextInput');
jest.mock('../src/components/records/RecordImageGallery', () => () => null);
jest.mock('../src/components/date-picker/DatePickerModal', () => () => null);
jest.mock('../src/components/common/PremiumRewardModal', () => () => null);
jest.mock('../src/components/common/ConfirmDialog', () => 'ConfirmDialog');
jest.mock('../src/screens/Records/components/RecordTagModal', () => () => null);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 18 }),
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: 'KeyboardScroll',
  useKeyboardState: () => false,
}));
jest.mock('../src/services/local/recordDraft', () => ({
  clearRecordCreateDraft: jest.fn().mockResolvedValue(undefined),
  loadRecordCreateDraft: jest.fn(),
  saveRecordCreateDraft: jest.fn().mockResolvedValue(undefined),
  loadScheduleRecordRecovery: jest.fn(),
  saveScheduleRecordRecovery: jest.fn(),
  clearScheduleRecordRecovery: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/supabase/schedules', () => ({
  fetchScheduleById: jest.fn(),
}));
jest.mock('../src/services/supabase/memories', () => ({
  ...jest.requireActual('../src/services/supabase/memories'),
  createMemory: jest.fn(),
  fetchMemoryById: jest.fn().mockRejectedValue(new Error('offline')),
}));
jest.mock('../src/services/schedules/recordLink', () => ({
  linkScheduleRecord: jest.fn(),
}));
jest.mock('../src/services/activity/timelineActivity', () => ({
  recordTimelineCreateActivity: jest.fn(),
}));
const row: PetSchedule = {
  id: 's',
  userId: 'u',
  petId: 'p',
  title: '함께 산책',
  note: '천천히 걸어요',
  startsAt: '2026-10-01T01:00:00Z',
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
  completedAt: '2026-10-01T02:00:00Z',
  source: 'manual',
  externalCalendarId: null,
  externalEventId: null,
  syncStatus: 'local',
  createdAt: '',
  updatedAt: '',
};
describe('schedule-origin record creation', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  const petBefore = usePetStore.getState();
  const recordBefore = useRecordStore.getState();
  const scheduleBefore = useScheduleStore.getState();
  const view = () => (
    <ThemeProvider theme={createTheme('light')}>
      <RecordCreateScreen />
    </ThemeProvider>
  );
  const mount = async () => {
    await act(async () => {
      renderer = TestRenderer.create(view());
    });
  };
  const submit = async () => {
    await act(async () => {
      await renderer.root
        .findByProps({ testID: 'record-create-submit' })
        .props.onPress();
    });
  };
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = 'u';
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    usePetStore.setState({
      pets: [{ id: 'p', name: '누리' }],
      selectedPetId: 'p',
    });
    useRecordStore.setState({
      refresh: jest.fn().mockResolvedValue(undefined),
      upsertOneLocal: jest.fn(),
      setFocusedMemoryId: jest.fn(),
    });
    useScheduleStore.setState({
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    jest.mocked(fetchScheduleById).mockResolvedValue(row);
    jest.mocked(loadRecordCreateDraft).mockResolvedValue(null);
    jest.mocked(loadScheduleRecordRecovery).mockResolvedValue(null);
    jest.mocked(saveScheduleRecordRecovery).mockResolvedValue(undefined);
    jest.mocked(createMemory).mockResolvedValue('m');
    jest.mocked(linkScheduleRecord).mockResolvedValue(undefined);
    jest
      .mocked(recordTimelineCreateActivity)
      .mockResolvedValue({ streak: null, xp: null });
  });
  afterEach(() => {
    act(() => renderer?.unmount());
    usePetStore.setState(petBefore);
    useRecordStore.setState(recordBefore);
    useScheduleStore.setState(scheduleBefore);
    jest.restoreAllMocks();
  });
  it('prefills title/memo/date and loads only the isolated schedule draft', async () => {
    await mount();
    expect(
      renderer.root.findByProps({ placeholder: '제목을 입력하세요' }).props
        .value,
    ).toBe(row.title);
    expect(
      renderer.root.findByProps({ placeholder: '오늘의 추억을 남겨주세요' })
        .props.value,
    ).toBe(row.note);
    expect(loadRecordCreateDraft).toHaveBeenCalledWith(scope);
    await submit();
    expect(createMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        petId: 'p',
        title: row.title,
        content: row.note,
        occurredAt: '2026-10-01',
        category: 'walk',
      }),
    );
    expect(saveScheduleRecordRecovery).toHaveBeenCalledWith(scope, 'm');
    expect(linkScheduleRecord).toHaveBeenCalledWith({
      petId: 'p',
      scheduleId: 's',
      memoryId: 'm',
    });
    expect(mockNavigation.popTo).toHaveBeenCalledWith(
      'ScheduleDetail',
      context,
    );
  });
  it('retries the saved record only after a failed link', async () => {
    jest.mocked(linkScheduleRecord).mockRejectedValueOnce(new Error('offline'));
    await mount();
    await submit();
    await act(async () => {
      renderer.root
        .findByProps({ placeholder: '제목을 입력하세요' })
        .props.onChangeText('재시도');
    });
    await submit();
    expect(createMemory).toHaveBeenCalledTimes(1);
    expect(linkScheduleRecord).toHaveBeenCalledTimes(2);
  });
  it('locks rapid duplicate submissions before the first await', async () => {
    await mount();
    const onPress = renderer.root.findByProps({
      testID: 'record-create-submit',
    }).props.onPress;
    await act(async () => {
      await Promise.all([onPress(), onPress()]);
    });
    expect(createMemory).toHaveBeenCalledTimes(1);
  });
  it('does not re-create a pending record when re-entering', async () => {
    jest.mocked(loadScheduleRecordRecovery).mockResolvedValue('m');
    await mount();
    expect(mockNavigation.popTo).toHaveBeenCalledWith(
      'ScheduleDetail',
      context,
    );
    expect(createMemory).not.toHaveBeenCalled();
  });
  it('does not skip existing activity/photo pipeline when recovery storage fails', async () => {
    jest
      .mocked(saveScheduleRecordRecovery)
      .mockRejectedValue(new Error('disk'));
    await mount();
    await submit();
    expect(recordTimelineCreateActivity).toHaveBeenCalledWith({
      petId: 'p',
      memoryId: 'm',
      category: 'walk',
    });
    expect(linkScheduleRecord).toHaveBeenCalledTimes(1);
    expect(mockNavigation.popTo).toHaveBeenCalled();
  });
  it('blocks submission/autosave under a different account', async () => {
    await mount();
    jest.mocked(saveRecordCreateDraft).mockClear();
    mockUserId = 'different';
    await act(async () => {
      renderer.update(view());
    });
    expect(
      renderer.root.findByProps({ testID: 'record-create-submit' }).props
        .disabled,
    ).toBe(true);
    await submit();
    expect(createMemory).not.toHaveBeenCalled();
    expect(saveRecordCreateDraft).not.toHaveBeenCalled();
  });
  it('rejects changed/incomplete schedule state before creating a record', async () => {
    await mount();
    jest
      .mocked(fetchScheduleById)
      .mockResolvedValue({ ...row, completedAt: null });
    await submit();
    expect(createMemory).not.toHaveBeenCalled();
  });
});
