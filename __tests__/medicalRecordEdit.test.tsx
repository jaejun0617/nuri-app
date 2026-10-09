import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import RecordEditScreen from '../src/screens/Records/RecordEditScreen';
import MedicalRecordFields from '../src/components/records/MedicalRecordFields';
import HeaderTextActionButton from '../src/components/navigation/HeaderTextActionButton';
import CtaButton from '../src/app/ui/CtaButton';
import { useRecordStore } from '../src/store/recordStore';
import {
  updateMemoryFields,
  fetchMemoryById,
  type MemoryRecord,
} from '../src/services/supabase/memories';
import { emptyHealthCareDetails } from '../src/services/records/metadata';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    canGoBack: () => true,
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: { petId: 'qa', memoryId: 'm', entrySource: 'health_report' },
  }),
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (
    selector: (state: { session: { user: { id: string } } }) => unknown,
  ) => selector({ session: { user: { id: 'u' } } }),
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
jest.mock('../src/components/common/PremiumNoticeModal', () => () => null);
jest.mock('../src/components/common/PremiumRewardModal', () => () => null);
jest.mock('../src/components/date-picker/DatePickerModal', () => () => null);
jest.mock('../src/components/records/RecordImageGallery', () => () => null);
jest.mock('../src/hooks/useKeyboardInset', () => ({
  useKeyboardInset: () => 0,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));

describe('medical edit through both submit actions', () => {
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
    useRecordStore.setState(original, true);
  });
  it('hydrates optional details, saves edits with existing weight/condition, and blocks same-tick double submit', async () => {
    await act(async () => {
      tree = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <RecordEditScreen />
        </ThemeProvider>,
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
    const header = tree.root.findByType(HeaderTextActionButton);
    const bottom = tree.root
      .findAllByType(CtaButton)
      .find(node => node.props.onPress === header.props.onPress);
    expect(bottom).toBeDefined();
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
