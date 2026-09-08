import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import RecordCreateScreen from '../src/screens/Records/RecordCreateScreen';
import { usePetStore } from '../src/store/petStore';

const mockAssureFocusedInputVisible = jest.fn();
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

describe('RecordCreate keyboard visibility contract', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  const originalPets = usePetStore.getState();
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  beforeEach(() => {
    jest.clearAllMocks();
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
      expect.objectContaining({ paddingBottom: 50 }),
    );

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
  });
});
