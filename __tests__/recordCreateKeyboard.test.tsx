import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import RecordCreateScreen from '../src/screens/Records/RecordCreateScreen';
import { usePetStore } from '../src/store/petStore';

const mockAssureFocusedInputVisible = jest.fn();
const mockCreateMemory = jest.fn();
const mockNavigation = {
  canGoBack: () => true,
  goBack: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('react-native-keyboard-controller', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;

  return {
    KeyboardAwareScrollView: ReactRuntime.forwardRef(
      (
        {
          children,
          ...props
        }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.ForwardedRef<unknown>,
      ) => {
        ReactRuntime.useImperativeHandle(ref, () => ({
          assureFocusedInputVisible: mockAssureFocusedInputVisible,
        }));
        return ReactRuntime.createElement(
          'KeyboardControllerScrollView',
          props,
          children,
        );
      },
    ),
    KeyboardStickyView: ReactRuntime.forwardRef(
      (
        {
          children,
          ...props
        }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.ForwardedRef<unknown>,
      ) =>
        ReactRuntime.createElement(
          'KeyboardStickyView',
          { ...props, ref },
          children,
        ),
    ),
    KeyboardAvoidingView: ({
      children,
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      ReactRuntime.createElement(ReactRuntime.Fragment, null, children),
  };
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: {
      petId: 'pet',
      initialMainCategory: 'walk',
    },
  }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactRuntime = jest.requireActual('react') as typeof React;
    ReactRuntime.useEffect(callback, [callback]);
  },
}));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));
jest.mock('../src/components/records/RecordImageGallery', () => () => null);
jest.mock('../src/components/date-picker/DatePickerModal', () => () => null);
jest.mock('../src/components/common/PremiumRewardModal', () => () => null);
jest.mock('../src/components/common/ConfirmDialog', () => () => null);
jest.mock('../src/screens/Records/components/RecordTagModal', () => () => null);
jest.mock('../src/services/local/recordDraft', () => ({
  clearRecordCreateDraft: jest.fn().mockResolvedValue(undefined),
  loadRecordCreateDraft: jest.fn().mockResolvedValue(null),
  saveRecordCreateDraft: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/supabase/memories', () => ({
  ...jest.requireActual('../src/services/supabase/memories'),
  createMemory: (...args: unknown[]) => mockCreateMemory(...args),
  fetchMemoryById: jest.fn().mockRejectedValue(new Error('test-only fetch stop')),
}));
jest.mock('../src/services/activity/timelineActivity', () => ({
  ...jest.requireActual('../src/services/activity/timelineActivity'),
  recordTimelineCreateActivity: jest.fn().mockResolvedValue({
    streak: null,
    xp: null,
  }),
}));

describe('RecordCreate keyboard visibility contract', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  const originalPets = usePetStore.getState();
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMemory.mockReset();
    global.requestAnimationFrame = callback => {
      callback(0);
      return 1;
    };
    usePetStore.setState({
      pets: [{ id: 'pet', name: 'QA' }],
      selectedPetId: 'pet',
    });
  });

  afterEach(() => {
    if (renderer) {
      TestRenderer.act(() => renderer?.unmount());
    }
    renderer = undefined;
    usePetStore.setState(originalPets);
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('uses one controller scroll host and keeps title and body focused', async () => {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <RecordCreateScreen />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('RecordCreateScreen did not mount');

    const scrollHost = renderer.root.find(
      node => String(node.type) === 'KeyboardControllerScrollView',
    );
    expect(scrollHost.props.keyboardDismissMode).toBe('none');
    expect(scrollHost.props.keyboardShouldPersistTaps).toBe('handled');
    expect(StyleSheet.flatten(scrollHost.props.contentContainerStyle)).toEqual(
      expect.objectContaining({ paddingBottom: 28 }),
    );

    const completeActionArea = renderer.root.findByProps({
      testID: 'record-create-complete-action-area',
    });
    expect(StyleSheet.flatten(completeActionArea.props.style)).toEqual(
      expect.objectContaining({ paddingBottom: 18 }),
    );

    const completeAction = renderer.root.findByProps({
      accessibilityLabel: '기록 저장 완료',
    });
    expect(completeAction.props.disabled).toBe(true);

    const title = renderer.root.findByProps({
      placeholder: '제목을 입력하세요',
    });
    const body = renderer.root.findByProps({
      placeholder: '오늘의 추억을 남겨주세요',
    });
    const titleInput = title.findByType(TextInput);
    const bodyInput = body.findByType(TextInput);

    TestRenderer.act(() => titleInput.props.onFocus());
    TestRenderer.act(() => bodyInput.props.onFocus());

    expect(mockAssureFocusedInputVisible).toHaveBeenCalledTimes(2);

    TestRenderer.act(() => titleInput.props.onChangeText('QA 완료 버튼 검증'));

    const enabledCompleteAction = renderer.root.findByProps({
      accessibilityLabel: '기록 저장 완료',
    });
    expect(enabledCompleteAction.props.disabled).toBe(false);

    let resolveCreate!: (memoryId: string) => void;
    mockCreateMemory.mockImplementation(
      () =>
        new Promise<string>(resolve => {
          resolveCreate = resolve;
        }),
    );
    const submit = enabledCompleteAction.props.onPress as () => Promise<void>;
    await TestRenderer.act(async () => {
      const firstSubmit = submit();
      const secondSubmit = submit();

      expect(mockCreateMemory).toHaveBeenCalledTimes(1);
      resolveCreate('memory-id');
      await Promise.all([firstSubmit, secondSubmit]);
    });

    expect(mockCreateMemory).toHaveBeenCalledTimes(1);
  });
});
