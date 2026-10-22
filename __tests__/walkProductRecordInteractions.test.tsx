import React from 'react';
import { Alert } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import RecordCreateScreen from '../src/screens/Records/RecordCreateScreen';
import RecordEditScreen from '../src/screens/Records/RecordEditScreen';
import TimelineWalkMemoryCard from '../src/components/records/TimelineWalkMemoryCard';
import { MemoryCard } from '../src/components/MemoryCard/MemoryCard';
import { usePetStore } from '../src/store/petStore';
import { useRecordStore } from '../src/store/recordStore';
import {
  createMemory,
  type MemoryRecord,
} from '../src/services/supabase/memories';
import {
  recordTimelineCreateActivity,
  recordTimelineCategoryChangeActivity,
} from '../src/services/activity/timelineActivity';
import { saveLinkedWalkBody } from '../src/services/walk/product/edit';
import { useWalkSources } from '../src/hooks/useWalkProduct';
import { updateMemoryFields } from '../src/services/supabase/memories';
import type { WalkMemorySourceSummary } from '../src/services/walk/server/recordRepository';
import type { WalkDraftFields } from '../src/services/walk/product/drafts';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  popTo: jest.fn(),
  canGoBack: () => true,
  addListener: jest.fn((event: string, listener: (value: { data: { closing: boolean } }) => void) => {
    if (event === 'transitionEnd') listener({ data: { closing: false } });
    return jest.fn();
  }),
};
let mockGpsMode = true;
const mockSubmit = jest.fn();
let mockReplay = false;
const mockMemory: MemoryRecord = {
  id: 'canonical-memory',
  petId: 'pet',
  title: '서버 원본',
  content: '서버 내용',
  category: 'walk',
  tags: [],
  imagePaths: [],
  occurredAt: '2026-10-19',
  createdAt: '2026-10-20T00:00:00.000Z',
};
let mockSource: WalkMemorySourceSummary | undefined;
let mockSourceUnavailable = false;
const source: WalkMemorySourceSummary = {
  version: 1,
  source: 'GPS_TRACKED',
  memoryId: 'canonical-memory',
  petId: 'pet',
  clientSessionId: 'session',
  recordState: 'RECORDED',
  sessionDeleted: false,
  summary: {
    sessionId: 'server-session',
    startedAt: '2026-10-19T14:50:00.000Z',
    endedAt: '2026-10-19T15:10:00.000Z',
    acceptedAt: '2026-10-19T15:11:00.000Z',
    measuredDurationMs: '1200000',
    activeDurationMs: '1200000',
    measuredDistanceM: '1200',
    acceptedDistanceM: '1200',
    eligibility: 'PROGRESSION_ELIGIBLE',
  },
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: {
      petId: 'pet',
      memoryId: 'canonical-memory',
      gpsSession: mockGpsMode ? { clientSessionId: 'session' } : undefined,
      returnTo: { tab: 'HomeTab' },
    },
  }),
  useFocusEffect: (callback: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(callback, [callback]),
}));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('../src/hooks/useWalkProduct', () => ({
  useWalkScope: () => ({ ownerId: 'owner', petId: 'pet', current: () => true }),
  useWalkSources: jest.fn(() => ({
    isSuccess: !mockSourceUnavailable,
    isError: mockSourceUnavailable,
    refetch: jest.fn().mockResolvedValue(undefined),
    data: mockSource ? [mockSource] : [],
  })),
}));
jest.mock('../src/hooks/useGpsWalkComposer', () => ({
  useGpsWalkComposer: (
    _session: string | undefined,
    _pet: string | null,
    _fields: WalkDraftFields,
    hydrate: (fields: WalkDraftFields, date: string) => void,
  ) => {
    jest.requireActual('react').useEffect(() => {
      if (mockGpsMode)
        hydrate(
          { title: '초안', content: '', emotion: null, tags: [], photos: [] },
          '2026-10-19',
        );
    }, [hydrate]);
    return {
      ready: true,
      current: () => true,
      contextKey: 'context',
      view: { summary: mockSource?.summary },
      submit: mockSubmit,
      draftScope: {
        ownerId: 'owner',
        petId: 'pet',
        clientSessionId: 'session',
      },
    };
  },
}));
jest.mock('../src/services/walk/product/edit', () => ({
  saveLinkedWalkBody: jest.fn(),
}));
jest.mock('../src/services/walk/product/invalidation', () => ({
  invalidateWalkProduct: jest.fn(),
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (
    selector: (s: { session: { user: { id: string } } }) => unknown,
  ) => selector({ session: { user: { id: 'owner' } } }),
}));
jest.mock('../src/components/common/SeasonalFormSurface', () => ({
  SeasonalFormBackground: () => null,
  SeasonalFormPanel: 'FormPanel',
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/ui/AppTextInput', () => 'AppTextInput');
jest.mock('../src/components/records/RecordImageGallery', () => () => null);
jest.mock('../src/components/date-picker/DatePickerModal', () => () => null);
jest.mock('../src/components/common/PremiumRewardModal', () => () => null);
jest.mock('../src/components/common/PremiumNoticeModal', () => () => null);
jest.mock('../src/components/common/ConfirmDialog', () => () => null);
jest.mock('../src/screens/Records/components/RecordTagModal', () => () => null);
jest.mock('../src/components/MemoryCard/MemoryCard', () => ({
  MemoryCard: 'MemoryCard',
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 18 }),
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: 'KeyboardScroll',
  useKeyboardState: () => false,
}));
jest.mock('../src/services/local/recordDraft', () => ({
  loadRecordCreateDraft: jest.fn().mockResolvedValue(null),
  saveRecordCreateDraft: jest.fn().mockResolvedValue(undefined),
  clearRecordCreateDraft: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/supabase/memories', () => ({
  ...jest.requireActual('../src/services/supabase/memories'),
  createMemory: jest.fn().mockResolvedValue('manual-memory'),
  updateMemoryFields: jest.fn().mockResolvedValue(undefined),
  fetchMemoryById: jest.fn().mockRejectedValue(new Error('offline')),
}));
jest.mock('../src/services/activity/timelineActivity', () => ({
  recordTimelineCreateActivity: jest
    .fn()
    .mockResolvedValue({ xp: null, streak: null }),
  recordTimelineCategoryChangeActivity: jest
    .fn()
    .mockResolvedValue({ xp: null, streak: null }),
}));

let tree: Renderer.ReactTestRenderer;
const mount = async (view: React.ReactElement) => {
  await act(async () => {
    tree = Renderer.create(
      <ThemeProvider theme={createTheme('light')}>{view}</ThemeProvider>,
    );
  });
};
const beforePet = usePetStore.getState(),
  beforeRecords = useRecordStore.getState();
beforeEach(() => {
  jest.clearAllMocks();
  mockGpsMode = true;
  mockReplay = false;
  mockSource = source;
  mockSourceUnavailable = false;
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  usePetStore.setState({
    pets: [{ id: 'pet', name: '누리' }],
    selectedPetId: 'pet',
  });
  useRecordStore.getState().replaceAll('pet', [mockMemory]);
  useRecordStore.setState({
    refresh: jest.fn().mockResolvedValue(undefined),
    upsertOneLocal: jest.fn(),
    setFocusedMemoryId: jest.fn(),
  });
  mockSubmit.mockImplementation(async () => ({
    commit: {
      record: { memory: mockMemory },
      replayed: mockReplay,
      reward: null,
    },
    retained: mockReplay,
    photoQueued: false,
  }));
  jest.mocked(saveLinkedWalkBody).mockResolvedValue(mockMemory);
});
afterEach(() => {
  act(() => tree?.unmount());
  usePetStore.setState(beforePet);
  useRecordStore.setState(beforeRecords);
  jest.restoreAllMocks();
});
it('existing composer GPS mode fixes pet/date/category and uses only atomic GPS submit', async () => {
  await mount(<RecordCreateScreen />);
  const title = tree.root.findByProps({ placeholder: '제목을 입력하세요' });
  expect(title.props.maxLength).toBe(100);
  expect(title.props.value).toBe('초안');
  expect(
    tree.root.findByProps({ placeholder: '오늘의 추억을 남겨주세요' }).props
      .maxLength,
  ).toBe(5000);
  expect(
    tree.root.findAll(n => n.props.onPress && n.props.disabled === true).length,
  ).toBeGreaterThan(0);
  await act(async () => {
    await tree.root
      .findByProps({ testID: 'record-create-submit' })
      .props.onPress();
  });
  expect(mockSubmit).toHaveBeenCalledTimes(1);
  expect(createMemory).not.toHaveBeenCalled();
  expect(recordTimelineCreateActivity).not.toHaveBeenCalled();
  expect(mockNavigation.navigate).toHaveBeenCalledWith(
    'AppTabs',
    expect.objectContaining({
      params: expect.objectContaining({
        screen: 'RecordDetail',
        params: expect.objectContaining({ memoryId: 'canonical-memory' }),
      }),
    }),
  );
});
it('composer replay preserves candidate and exposes explicit existing-record edit action', async () => {
  mockReplay = true;
  await mount(<RecordCreateScreen />);
  await act(async () => {
    await tree.root
      .findByProps({ testID: 'record-create-submit' })
      .props.onPress();
  });
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  await act(async () =>
    buttons?.find(button => button.text === '기존 기록 수정')?.onPress?.(),
  );
  expect(mockNavigation.navigate).toHaveBeenCalledWith(
    'AppTabs',
    expect.objectContaining({
      params: expect.objectContaining({
        screen: 'RecordEdit',
        params: expect.objectContaining({
          memoryId: 'canonical-memory',
          walkDraftSessionId: 'session',
        }),
      }),
    }),
  );
});
it('manual composer keeps legacy create/activity and no GPS submission', async () => {
  mockGpsMode = false;
  await mount(<RecordCreateScreen />);
  const title = tree.root.findByProps({ placeholder: '제목을 입력하세요' });
  expect(title.props.maxLength).toBeUndefined();
  await act(async () => title.props.onChangeText('수동 산책'));
  await act(async () => {
    await tree.root
      .findByProps({ testID: 'record-create-submit' })
      .props.onPress();
  });
  expect(createMemory).toHaveBeenCalledTimes(1);
  expect(recordTimelineCreateActivity).toHaveBeenCalledTimes(1);
  expect(mockSubmit).not.toHaveBeenCalled();
});
it('linked edit locks source controls and saves permitted body without legacy reward calls', async () => {
  await mount(<RecordEditScreen />);
  const date = tree.root.findAllByProps({ testID: 'record-edit-date' })[0];
  expect(date.props.disabled).toBe(true);
  const title = tree.root.findByProps({ placeholder: '제목' });
  await act(async () => title.props.onChangeText('수정 본문'));
  const header = tree.root.findAll(
    n => n.props.testID === 'record-edit-submit',
  )[0];
  await act(async () => header.props.onPress());
  expect(saveLinkedWalkBody).toHaveBeenCalledWith(
    expect.objectContaining({ petId: 'pet' }),
    source,
    expect.objectContaining({ title: '수정 본문' }),
    null,
  );
  expect(recordTimelineCategoryChangeActivity).not.toHaveBeenCalled();
});
it('Timeline summary trusts only matching lean source projection; deleted session hides measurements', async () => {
  await mount(
    <TimelineWalkMemoryCard
      item={mockMemory}
      onPress={jest.fn()}
      source={source}
      metaTextOverride="기본 날짜"
    />,
  );
  expect(tree.root.findByType(MemoryCard).props.metaTextOverride).toContain(
    '1.2 km',
  );
  act(() =>
    tree.update(
      <TimelineWalkMemoryCard
        item={mockMemory}
        onPress={jest.fn()}
        source={{ ...source, sessionDeleted: true, summary: null }}
      />,
    ),
  );
  expect(tree.root.findByType(MemoryCard).props.metaTextOverride).not.toMatch(
    /km|분/,
  );
  act(() =>
    tree.update(
      <TimelineWalkMemoryCard
        item={mockMemory}
        onPress={jest.fn()}
        source={{ ...source, petId: 'foreign-pet' }}
        metaTextOverride="기본 날짜"
      />,
    ),
  );
  expect(tree.root.findByType(MemoryCard).props.metaTextOverride).toBe(
    '기본 날짜',
  );
});
it('non-Walk edit stays usable while Walk summary endpoint is unavailable and requests no projection', async () => {
  mockSource = undefined;
  mockSourceUnavailable = true;
  useRecordStore
    .getState()
    .replaceAll('pet', [{ ...mockMemory, category: 'meal' }]);
  await mount(<RecordEditScreen />);
  expect(useWalkSources).toHaveBeenLastCalledWith('pet', [], false);
  const header = tree.root.findAll(
    n => n.props.testID === 'record-edit-submit',
  )[0];
  expect(header.props.disabled).toBe(true);
  await act(async()=>tree.root.findByProps({placeholder:'제목'}).props.onChangeText('식사 메모 수정'));
  const ready=tree.root.findAll(n=>n.props.testID==='record-edit-submit')[0];
  expect(ready.props.disabled).toBe(false);
  await act(async () => ready.props.onPress());
  expect(updateMemoryFields).toHaveBeenCalledTimes(1);
  expect(saveLinkedWalkBody).not.toHaveBeenCalled();
});
it('unresolved candidate Walk source fails closed before immutable controls or save', async () => {
  mockSource = undefined;
  mockSourceUnavailable = true;
  await mount(<RecordEditScreen />);
  expect(
    tree.root.findAllByProps({ testID: 'record-edit-date' })[0].props.disabled,
  ).toBe(true);
  expect(
    tree.root.findAll(n => n.props.testID === 'record-edit-submit')[0]
      .props.disabled,
  ).toBe(true);
});
