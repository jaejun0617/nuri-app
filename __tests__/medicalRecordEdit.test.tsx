import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { appQueryClient } from '../src/services/query/appQueryClient';
import { createTheme } from '../src/app/theme/theme';
import RecordEditScreen from '../src/screens/Records/RecordEditScreen';
import MedicalRecordFields from '../src/components/records/MedicalRecordFields';
import RecordPhotoStrip from '../src/components/records/RecordPhotoStrip';
import RecordChoiceGrid from '../src/components/records/RecordChoiceGrid';
import { RecordFieldGlass } from '../src/components/records/TimelineFormSurface';
import { styles as editStyles } from '../src/screens/Records/RecordEditScreen.styles';
import { styles as createStyles } from '../src/screens/Records/RecordCreateScreen.styles';
import { Image, StyleSheet, TextInput } from 'react-native';
import { getMemoryImageSignedUrlCached } from '../src/services/supabase/storageMemories';
import CtaButton from '../src/components/records/TimelineButton';
import DatePickerModal from '../src/components/date-picker/DatePickerModal';
import { useRecordStore } from '../src/store/recordStore';
import {
  updateMemoryFields,
  fetchMemoryById,
  type MemoryRecord,
} from '../src/services/supabase/memories';
import { emptyHealthCareDetails } from '../src/services/records/metadata';

const mockInitialTitleFrames: Array<string | undefined> = [];
const mockDatePickerRender = jest.fn();
const mockNoticeRender = jest.fn();
const mockRewardRender = jest.fn();
let mockCompleteTransition = true;
const mockNavigation = {
  goBack: jest.fn(),
  canGoBack: () => true,
  navigate: jest.fn(),
  addListener: jest.fn((event: string, listener: (event: { data: { closing: boolean } }) => void) => {
    if (event === 'transitionEnd' && mockCompleteTransition) listener({ data: { closing: false } });
    return jest.fn();
  }),
};
jest.mock('../src/app/ui/AppTextInput', () => {
  const runtime = jest.requireActual('react') as typeof React;
  const Actual = jest.requireActual('../src/app/ui/AppTextInput').default as typeof import('../src/app/ui/AppTextInput').default;
  return function ObservedInput(props: React.ComponentProps<typeof Actual>) {
    if (props.placeholder === '제목') mockInitialTitleFrames.push(props.value);
    return runtime.createElement(Actual, props);
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: { petId: 'qa', memoryId: 'm', entrySource: 'health_report' },
  }),
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: jest.requireActual('zustand').create(() => ({ session: { user: { id: 'u' } } })),
}));
jest.mock('../src/services/supabase/memories', () => ({
  ...jest.requireActual('../src/services/supabase/memories'),
  updateMemoryFields: jest.fn(),
  fetchMemoryById: jest.fn(),
}));
jest.mock('../src/services/activity/timelineActivity', () => ({
  recordTimelineCategoryChangeActivity: jest
    .fn()
    .mockResolvedValue({ xp: null }),
}));
jest.mock('../src/services/supabase/storageMemories', () => ({
  getMemoryImageSignedUrlCached: jest.fn(),
}));
jest.mock('../src/components/common/PremiumNoticeModal', () => (props: unknown) => {
  mockNoticeRender(props);
  return null;
});
jest.mock('../src/components/common/PremiumRewardModal', () => (props: unknown) => {
  mockRewardRender(props);
  return null;
});
jest.mock('../src/components/date-picker/DatePickerModal', () => (props: unknown) => {
  mockDatePickerRender(props);
  return null;
});
jest.mock('../src/components/records/RecordImageGallery', () => () => null);
jest.mock('../src/hooks/useKeyboardInset', () => ({
  useKeyboardInset: () => 0,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));

describe('medical edit through the single bottom submit action', () => {
  let tree: TestRenderer.ReactTestRenderer;
  const original = useRecordStore.getState();
  const record: MemoryRecord = {
    id: 'm',
    petId: 'qa',
    title: '검진',
    tags: [],
    category: 'health',
    price: 12000,
    occurredAt: '2026-10-09',
    createdAt: '2026-10-09T00:00:00Z',
    imagePaths: [],
    metadata: {
      version: 1,
      health: {
        condition: 'normal',
        weightKg: 4.21,
        care: {
          ...emptyHealthCareDetails('hospital'),
          hospitalName: '누리병원',
        },
      },
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompleteTransition = true;
    mockInitialTitleFrames.length = 0;
    useRecordStore.getState().upsertOneLocal('qa', record);
    useRecordStore.setState({
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    jest
      .mocked(fetchMemoryById)
      .mockRejectedValue(new Error('offline refresh'));
  });
  afterEach(() => {
    act(() => tree?.unmount());
    appQueryClient.clear();
    useRecordStore.setState(original, true);
  });
  it('matches Create glass and category icons while preserving loaded fields and save state', async () => {
    await act(async () => {
      tree = TestRenderer.create(
        <QueryClientProvider client={appQueryClient}><ThemeProvider theme={createTheme('light')}>
          <RecordEditScreen />
        </ThemeProvider></QueryClientProvider>,
      );
    });
    expect(tree.root.findByType(RecordPhotoStrip).props.surfaceVariant).toBe('homeGlass');
    expect(tree.root.findByType(MedicalRecordFields).props.surfaceVariant).toBe('homeGlass');
    for (const grid of tree.root.findAllByType(RecordChoiceGrid)) {
      expect(grid.props.surfaceVariant).toBe('homeGlass');
      expect(typeof grid.props.renderIcon).toBe('function');
    }
    const health = tree.root.findAllByProps({ testID: 'record-category-icon-health' }).at(-1);
    expect(health?.props).toMatchObject({ name: 'heart-outline', color: '#000000' });
    expect(tree.root.findAllByProps({ testID: 'record-category-icon-walk' })).toHaveLength(0);
    expect(tree.root.findAllByType(RecordFieldGlass).length).toBeGreaterThan(10);
    for (const name of ['screen', 'input', 'moodChip'] as const) {
      const current = StyleSheet.flatten(editStyles[name]);
      const reference = StyleSheet.flatten(createStyles[name]);
      expect(current?.backgroundColor).toBe(reference?.backgroundColor);
    }
    const title = tree.root.findAllByType(TextInput).find(node => node.props.placeholder === '제목');
    expect(title?.props.value).toBe(record.title);
    expect(tree.root.findAllByType(TextInput).some(node => node.props.value === '12000')).toBe(true);
    expect(tree.root.findByProps({ testID: 'record-edit-submit' }).props.disabled).toBe(true);
    expect(updateMemoryFields).not.toHaveBeenCalled();
  });
  it('does not construct success or reward dialogs before a save completes', async () => {
    await act(async () => {
      tree = TestRenderer.create(
        <QueryClientProvider client={appQueryClient}><ThemeProvider theme={createTheme('light')}>
          <RecordEditScreen />
        </ThemeProvider></QueryClientProvider>,
      );
    });
    expect(mockNoticeRender).not.toHaveBeenCalled();
    expect(mockRewardRender).not.toHaveBeenCalled();
    expect(updateMemoryFields).not.toHaveBeenCalled();
  });
  it('bounds Android preview decoding without changing the source photo or saving a record', async () => {
    const uri = 'https://example.invalid/original-photo.jpg';
    useRecordStore.getState().upsertOneLocal('qa', { ...record, imagePaths: ['synthetic-original.jpg'] });
    jest.mocked(getMemoryImageSignedUrlCached).mockResolvedValue(uri);
    await act(async () => {
      tree = TestRenderer.create(
        <QueryClientProvider client={appQueryClient}><ThemeProvider theme={createTheme('light')}>
          <RecordEditScreen />
        </ThemeProvider></QueryClientProvider>,
      );
    });
    const gallery = tree.root.findByType(RecordPhotoStrip);
    const photo = gallery.findAllByType(Image).find(node=>node.props.source?.uri===uri);
    if(!photo)throw new Error('Original preview missing');
    expect(photo.props).toMatchObject({ source: { uri }, resizeMode: 'cover', resizeMethod: 'resize' });
    expect(gallery.props.items).toHaveLength(1);
    expect(updateMemoryFields).not.toHaveBeenCalled();
  });
  it('preserves typed input across a closing transition and a later cached record refresh', async () => {
    await act(async () => {
      tree = TestRenderer.create(
        <QueryClientProvider client={appQueryClient}><ThemeProvider theme={createTheme('light')}>
          <RecordEditScreen />
        </ThemeProvider></QueryClientProvider>,
      );
    });
    const titleInput = tree.root.findAllByProps({ placeholder: '제목' })[0];
    await act(async () => titleInput.props.onChangeText('입력 중인 검진 기록'));
    await act(async () => {
      useRecordStore.getState().upsertOneLocal('qa', { ...record, title: '갱신된 서버 제목' });
      const end = mockNavigation.addListener.mock.calls.find(([event]) => event === 'transitionEnd')?.[1];
      end?.({ data: { closing: true } });
    });
    expect(tree.root.findAllByProps({ placeholder: '제목' })[0].props.value).toBe('입력 중인 검진 기록');
    expect(tree.root.findAllByProps({ testID: 'record-edit-entering' })).toHaveLength(0);
    expect(updateMemoryFields).not.toHaveBeenCalled();
  });
  it('renders the cached record from the first form frame without an empty rehydration frame', async () => {
    await act(async () => {
      tree = TestRenderer.create(
        <QueryClientProvider client={appQueryClient}><ThemeProvider theme={createTheme('light')}>
          <RecordEditScreen />
        </ThemeProvider></QueryClientProvider>,
      );
    });
    expect(mockInitialTitleFrames.length).toBeGreaterThan(0);
    expect(mockInitialTitleFrames.every(value => value === record.title)).toBe(true);
    expect(updateMemoryFields).not.toHaveBeenCalled();
    expect(fetchMemoryById).not.toHaveBeenCalled();
  });
  it('mounts the calendar only on request and keeps the form unchanged when cancelled', async () => {
    await act(async () => {
      tree = TestRenderer.create(
        <QueryClientProvider client={appQueryClient}><ThemeProvider theme={createTheme('light')}>
          <RecordEditScreen />
        </ThemeProvider></QueryClientProvider>,
      );
    });
    expect(mockDatePickerRender).not.toHaveBeenCalled();
    await act(async () => tree.root.findByProps({ testID: 'record-edit-date' }).props.onPress());
    const picker = tree.root.findByType(DatePickerModal);
    expect(picker.props.initialDate).toBe(record.occurredAt);
    expect(picker.props.visible).toBe(true);
    await act(async () => picker.props.onCancel());
    expect(tree.root.findAllByType(DatePickerModal)).toHaveLength(0);
    expect(mockInitialTitleFrames.every(value => value === record.title)).toBe(true);
    expect(updateMemoryFields).not.toHaveBeenCalled();
  });
  it('mounts the form after native entry completion and blocks an early save', async () => {
    mockCompleteTransition = false;
    await act(async () => {
      tree = TestRenderer.create(
        <QueryClientProvider client={appQueryClient}><ThemeProvider theme={createTheme('light')}>
          <RecordEditScreen />
        </ThemeProvider></QueryClientProvider>,
      );
    });
    expect(mockInitialTitleFrames).toHaveLength(0);
    expect(tree.root.findAllByProps({testID:'record-edit-submit'})).toHaveLength(0);
    expect(updateMemoryFields).not.toHaveBeenCalled();
    const end = mockNavigation.addListener.mock.calls.find(([event]) => event === 'transitionEnd')?.[1];
    expect(end).toBeDefined();
    await act(async () => end?.({ data: { closing: true } }));
    expect(mockInitialTitleFrames).toHaveLength(0);
    await act(async () => end?.({ data: { closing: false } }));
    expect(mockInitialTitleFrames.every(value => value === record.title)).toBe(true);
    expect(mockInitialTitleFrames.length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'record-edit-entering' })).toHaveLength(0);
    expect(updateMemoryFields).not.toHaveBeenCalled();
  });
  it('hydrates optional details, saves edits with existing weight/condition, and blocks same-tick double submit', async () => {
    await act(async () => {
      tree = TestRenderer.create(
        <QueryClientProvider client={appQueryClient}><ThemeProvider theme={createTheme('light')}>
          <RecordEditScreen />
        </ThemeProvider></QueryClientProvider>,
      );
    });
    const fields = tree.root.findByType(MedicalRecordFields);
    expect(fields.props.value.hospitalName).toBe('누리병원');
    await act(async () =>
      fields.props.onChange({
        ...fields.props.value,
        diagnosis: '진료 내용',
        medication: '처방 메모',
      }),
    );
    const header = tree.root.findAllByType(CtaButton).find(node=>node.props.testID==='record-edit-submit');
    if(!header)throw new Error('Submit missing');
    const bottom = header;
    let finish: (() => void) | undefined;
    jest.mocked(updateMemoryFields).mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        }),
    );
    await act(async () => {
      const first = header.props.onPress();
      const second = bottom?.props.onPress?.();
      expect(updateMemoryFields).toHaveBeenCalledTimes(1);
      finish?.();
      await first;
      await second;
    });
    expect(updateMemoryFields).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 12000,
        metadata: {
          version: 1,
          health: {
            condition: 'normal',
            weightKg: 4.21,
            care: expect.objectContaining({
              hospitalName: '누리병원',
              diagnosis: '진료 내용',
              medication: '처방 메모',
            }),
          },
        },
      }),
    );
    const saved = useRecordStore
      .getState()
      .byPetId.qa?.items.find(item => item.id === 'm');
    expect(saved?.metadata?.health?.care?.diagnosis).toBe('진료 내용');
    expect(saved?.price).toBe(12000);
  });
});
