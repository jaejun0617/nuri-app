import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import CommunityCreateScreen from '../src/screens/Community/CommunityCreateScreen';
import { usePetStore } from '../src/store/petStore';

const mockAssureFocusedInputVisible = jest.fn();
const mockScrollTo = jest.fn();
let mockKeyboardVisible = false;
const mockNavigation = {
  goBack: jest.fn(),
  replace: jest.fn(),
  setOptions: jest.fn(),
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
          scrollTo: mockScrollTo,
        }));
        return ReactRuntime.createElement(
          'KeyboardControllerScrollView',
          props,
          children,
        );
      },
    ),
    useKeyboardState: (selector: (state: { isVisible: boolean }) => unknown) =>
      selector({ isVisible: mockKeyboardVisible }),
  };
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactRuntime = jest.requireActual('react') as typeof React;
    ReactRuntime.useEffect(callback, [callback]);
  },
}));
jest.mock('react-native-safe-area-context', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;

  return {
    ...jest.requireActual('react-native-safe-area-context'),
    SafeAreaView: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      ReactRuntime.createElement('SafeAreaView', props, children),
    useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
  };
});
jest.mock('../src/hooks/useCommunityAuth', () => ({
  useCommunityAuth: () => ({
    isLoggedIn: true,
    currentUserId: 'qa-user',
  }),
}));
jest.mock('../src/components/common/ConfirmDialog', () => () => null);
jest.mock('../src/services/supabase/storageCommunity', () => ({
  ...jest.requireActual('../src/services/supabase/storageCommunity'),
  flushPendingCommunityImageCleanup: jest.fn().mockResolvedValue(undefined),
}));

describe('CommunityCreate keyboard visibility contract', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  const originalPets = usePetStore.getState();
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  beforeEach(() => {
    jest.clearAllMocks();
    mockKeyboardVisible = false;
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
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

  it('moves title and body to their measured visible-area positions', async () => {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <CommunityCreateScreen />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('CommunityCreateScreen did not mount');

    const scrollHost = renderer.root.find(
      node => String(node.type) === 'KeyboardControllerScrollView',
    );
    expect(scrollHost.props.keyboardDismissMode).toBe('none');
    expect(scrollHost.props.keyboardShouldPersistTaps).toBe('handled');
    expect(StyleSheet.flatten(scrollHost.props.contentContainerStyle)).toEqual(
      expect.objectContaining({ paddingBottom: 50 }),
    );
    expect(
      renderer.root.find(
        node => String(node.type) === 'SafeAreaView',
      ).props.edges,
    ).toEqual(['left', 'right']);

    mockKeyboardVisible = true;
    TestRenderer.act(() => {
      renderer?.update(
        <ThemeProvider theme={createTheme('light')}>
          <CommunityCreateScreen />
        </ThemeProvider>,
      );
    });
    const keyboardOpenScrollHost = renderer.root.find(
      node => String(node.type) === 'KeyboardControllerScrollView',
    );
    expect(
      StyleSheet.flatten(keyboardOpenScrollHost.props.contentContainerStyle),
    ).toEqual(expect.objectContaining({ paddingBottom: 12 }));

    const title = renderer.root
      .findByProps({ placeholder: '제목을 입력해 주세요.' })
      .findByType(TextInput);
    const body = renderer.root
      .findByProps({
        placeholder:
          '우리 아이의 소중한 일상과 고민을 자유롭게 나누어 보세요. (욕설, 비방 등 불쾌감을 주는 내용은 운영정책에 따라 숨김 처리될 수 있습니다.)',
      })
      .findByType(TextInput);

    TestRenderer.act(() => {
      renderer?.root
        .findByProps({ testID: 'community-composer-title-section' })
        .props.onLayout({ nativeEvent: { layout: { y: 320 } } });
      renderer?.root
        .findByProps({ testID: 'community-composer-body-section' })
        .props.onLayout({ nativeEvent: { layout: { y: 760 } } });
    });

    TestRenderer.act(() => title.props.onFocus());
    TestRenderer.act(() => body.props.onFocus());

    expect(mockScrollTo).toHaveBeenNthCalledWith(1, {
      x: 0,
      y: 304,
      animated: true,
    });
    expect(mockScrollTo).toHaveBeenNthCalledWith(2, {
      x: 0,
      y: 744,
      animated: true,
    });
    expect(mockAssureFocusedInputVisible).not.toHaveBeenCalled();
    expect(
      renderer.root.findAllByProps({ children: '반려동물 연결' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ children: '나이 함께 표시' }),
    ).toHaveLength(0);
  });
});
