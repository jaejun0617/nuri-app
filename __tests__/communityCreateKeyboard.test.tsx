import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import { PRODUCT_CTA } from '../src/app/theme/tokens/productAccent';
import ConfirmDialog from '../src/components/common/ConfirmDialog';
import CommunityCreateScreen from '../src/screens/Community/CommunityCreateScreen';
import { runCommunityCreateSubmitFlow } from '../src/screens/Community/communityPostSubmit.shared';

jest.mock('../src/screens/Community/communityPostSubmit.shared', () => ({
  runCommunityCreateSubmitFlow: jest.fn(),
}));
import {
  pickPhotoAssets,
  type PickedPhotoAsset,
} from '../src/services/media/photoPicker';
import { showToast } from '../src/store/uiStore';
import { usePetStore } from '../src/store/petStore';

let mockKeyboardVisible = false;
let mockSeason: keyof typeof SEASON_CTA = 'autumn';
const mockNavigation = {
  goBack: jest.fn(),
  replace: jest.fn(),
  setOptions: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  ...jest.requireActual('../src/app/providers/SeasonPreferenceProvider'),
  useEffectiveSeason: () => mockSeason,
}));
jest.mock('../src/services/media/photoPicker', () => ({
  pickPhotoAssets: jest.fn(),
}));
jest.mock('../src/store/uiStore', () => ({
  ...jest.requireActual('../src/store/uiStore'),
  showToast: jest.fn(),
}));

jest.mock('react-native-keyboard-controller', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;

  return {
    KeyboardStickyView: ({ children }: React.PropsWithChildren) =>
      ReactRuntime.createElement('KeyboardStickyView', {}, children),
    useReanimatedKeyboardAnimation: () => ({
      progress: { value: mockKeyboardVisible ? 1 : 0 },
    }),
    KeyboardAwareScrollView: ReactRuntime.forwardRef(
      (
        {
          children,
          ...props
        }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.ForwardedRef<unknown>,
      ) => {
        ReactRuntime.useImperativeHandle(ref, () => ({}));
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
    mockSeason = 'autumn';
    jest.mocked(pickPhotoAssets).mockReset();
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

  it('reserves meaningful editing space through one keyboard-aware scroll', async () => {
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
    expect(scrollHost.props.bottomOffset).toBe(80);
    expect(StyleSheet.flatten(scrollHost.props.contentContainerStyle)).toEqual(
      expect.objectContaining({ paddingBottom: 12 }),
    );
    expect(
      renderer.root.find(node => String(node.type) === 'SafeAreaView').props
        .edges,
    ).toEqual(['left', 'right']);
    expect(scrollHost.findAllByProps({ testID: 'community-create-attachments' })).toHaveLength(0);
    const sticky = renderer.root.find(
      node => String(node.type) === 'KeyboardStickyView',
    );
    expect(sticky.findAllByProps({ testID: 'community-create-photo' }).length).toBeGreaterThan(0);

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

    expect(
      renderer.root
        .findByProps({ placeholder: '제목을 입력해 주세요.' })
        .findByType(TextInput),
    ).toBeDefined();
    expect(
      renderer.root
        .findByProps({
          placeholder: 'QA의 일상과 이야기를 나눠 주세요.',
        })
        .findByType(TextInput),
    ).toBeDefined();
    expect(
      renderer.root.findAllByProps({ children: '반려동물 연결' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ children: '나이 함께 표시' }),
    ).toHaveLength(0);
  });

  const mount = async () => {
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <CommunityCreateScreen />
        </ThemeProvider>,
      );
    });
  };
  const form = () => ({
    props: {
      ...renderer!.root.find(node => typeof node.props.onChangeCategory === 'function' && typeof node.props.onChangeTitle === 'function').props,
      ...renderer!.root.find(node => typeof node.props.onPickImage === 'function' && typeof node.props.onRemoveImage === 'function').props,
    },
  });
  const photos = (count: number, prefix = 'photo'): PickedPhotoAsset[] =>
    Array.from({ length: count }, (_, index) => ({
      uri: `content://${prefix}-${index}`,
      mimeType: 'image/jpeg',
      fileName: `${prefix}-${index}.jpg`,
    }));

  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'uses plain header actions and %s submit text',
    async season => {
      mockSeason = season;
      await mount();
      await TestRenderer.act(async () => {
        form().props.onChangeTitle('제목');
        form().props.onChangeContent('본문');
      });
      const options = mockNavigation.setOptions.mock.calls.at(-1)![0] as {
        headerLeft: () => React.ReactElement;
        headerRight: () => React.ReactElement;
      };
      let header!: TestRenderer.ReactTestRenderer;
      TestRenderer.act(() => {
        header = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            {options.headerLeft()}
            {options.headerRight()}
          </ThemeProvider>,
        );
      });
      const buttons = header.root.findAll(
        node => node.props.accessibilityRole === 'button',
        { deep: false },
      );
      expect(buttons).toHaveLength(2);
      for (const button of buttons) {
        const style = StyleSheet.flatten(button.props.style);
        expect(style.minHeight).toBe(48);
        expect(style.backgroundColor).toBeUndefined();
        expect(style.borderWidth).toBeUndefined();
      }
      expect(buttons[1].props.disabled).toBe(false);
      expect(
        StyleSheet.flatten(
          buttons[1].findByProps({ children: '등록' }).props.style,
        ).color,
      ).toBe(PRODUCT_CTA.primary);
      TestRenderer.act(() => header.unmount());
    },
  );

  it('caps excess Android selections at five, announces the limit and permits replacement', async () => {
    await mount();
    const selected = photos(7);
    jest
      .mocked(pickPhotoAssets)
      .mockResolvedValue({ status: 'success', assets: selected });
    await TestRenderer.act(async () => {
      await form().props.onPickImage();
    });
    expect(pickPhotoAssets).toHaveBeenCalledWith({
      selectionLimit: 5,
      quality: 0.9,
    });
    expect(form().props.imageUris).toEqual(
      selected.slice(0, 5).map(photo => photo.uri),
    );
    expect(showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('선택 순서대로 5장'),
      }),
    );
    await TestRenderer.act(async () => {
      await form().props.onPickImage();
    });
    expect(pickPhotoAssets).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenLastCalledWith({
      tone: 'info',
      message: '사진은 최대 5장까지 첨부할 수 있어요.',
    });
    await TestRenderer.act(async () => {
      form().props.onRemoveImage(2);
    });
    jest.mocked(pickPhotoAssets).mockResolvedValue({
      status: 'success',
      assets: photos(1, 'replacement'),
    });
    await TestRenderer.act(async () => {
      await form().props.onPickImage();
    });
    expect(pickPhotoAssets).toHaveBeenLastCalledWith({
      selectionLimit: 1,
      quality: 0.9,
    });
    expect(form().props.imageUris).toEqual([
      selected[0].uri,
      selected[1].uri,
      selected[3].uri,
      selected[4].uri,
      'content://replacement-0',
    ]);
  });

  it('deduplicates both existing photos and duplicate picker results without losing draft on cancel/error', async () => {
    await mount();
    const [first, second] = photos(2);
    jest
      .mocked(pickPhotoAssets)
      .mockResolvedValue({ status: 'success', assets: [first, first] });
    await TestRenderer.act(async () => {
      form().props.onChangeTitle('남아야 하는 제목');
      form().props.onChangeContent('남아야 하는 본문');
      await form().props.onPickImage();
    });
    jest.mocked(pickPhotoAssets).mockResolvedValue({
      status: 'success',
      assets: [first, second, second],
    });
    await TestRenderer.act(async () => {
      await form().props.onPickImage();
    });
    expect(form().props.imageUris).toEqual([first.uri, second.uri]);
    jest.mocked(pickPhotoAssets).mockResolvedValue({ status: 'cancelled' });
    await TestRenderer.act(async () => {
      await form().props.onPickImage();
    });
    jest
      .mocked(pickPhotoAssets)
      .mockRejectedValue(new Error('picker unavailable'));
    await TestRenderer.act(async () => {
      await form().props.onPickImage();
      form().props.onImageError();
    });
    expect(form().props.imageUris).toEqual([first.uri, second.uri]);
    expect(form().props.title).toBe('남아야 하는 제목');
    expect(form().props.content).toBe('남아야 하는 본문');
  });

  it('ignores a second picker request while the first is open', async () => {
    await mount();
    let resolvePicker!: (
      value: Awaited<ReturnType<typeof pickPhotoAssets>>,
    ) => void;
    jest.mocked(pickPhotoAssets).mockImplementation(
      () =>
        new Promise(resolve => {
          resolvePicker = resolve;
        }),
    );
    await TestRenderer.act(async () => {
      const pending = form().props.onPickImage();
      await form().props.onPickImage();
      resolvePicker({ status: 'success', assets: photos(1) });
      await pending;
    });
    expect(pickPhotoAssets).toHaveBeenCalledTimes(1);
    expect(form().props.imageUris).toHaveLength(1);
  });

  it('keeps an existing draft until its async read and restore choice finish', async () => {
    const key = 'nuri.community.draft.v1';
    const draft = { title: '임시 제목', content: '임시 본문', category: 'daily', pickedImages: [] };
    let resolveRead!: (value: string) => void;
    jest.mocked(AsyncStorage.getItem).mockImplementationOnce(
      () => new Promise(resolve => { resolveRead = resolve; }),
    );
    await mount();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith(key);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(key, expect.anything());

    await TestRenderer.act(async () => { resolveRead(JSON.stringify(draft)); });
    const restore = renderer!.root
      .findAllByType(ConfirmDialog)
      .find(node => node.props.title === '임시저장된 글이 있어요')!;
    expect(restore.props.visible).toBe(true);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith(key);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(key, expect.anything());

    await TestRenderer.act(async () => { restore.props.onConfirm(); });
    expect(form().props.content).toBe(draft.content);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(key, JSON.stringify(draft));
  });

  it('restores and persists all five draft photos', async () => {
    const pickedImages = photos(5);
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(
      JSON.stringify({
        title: '임시 제목',
        content: '임시 본문',
        category: 'daily',
        pickedImages,
      }),
    );
    await mount();
    const dialog = renderer!.root
      .findAllByType(ConfirmDialog)
      .find(node => node.props.title === '임시저장된 글이 있어요')!;
    expect(dialog.props.visible).toBe(true);
    await TestRenderer.act(async () => {
      dialog.props.onConfirm();
    });
    expect(form().props.imageUris).toEqual(
      pickedImages.map(photo => photo.uri),
    );
    expect(form().props.title).toBe('임시 제목');
    expect(form().props.category).toBe('daily');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      'nuri.community.draft.v1',
      JSON.stringify({
        title: '임시 제목',
        content: '임시 본문',
        category: 'daily',
        pickedImages,
      }),
    );
  });

  describe('draft storage recovery', () => {
    const key = 'nuri.community.draft.v1';
    const previous = JSON.stringify({ title: '이전 글', content: '기존 본문', category: 'daily', pickedImages: [] });
    let disk: Map<string, string>;
    const read = jest.mocked(AsyncStorage.getItem);
    const write = jest.mocked(AsyncStorage.setItem);
    const remove = jest.mocked(AsyncStorage.removeItem);
    const dialog = (title: string) => {
      const node = renderer!.root.findAllByType(ConfirmDialog).find(item => item.props.title === title);
      if (!node?.props.visible) throw new Error('Expected visible dialog: ' + title);
      return node.props;
    };
    const pressBack = () => TestRenderer.act(async () => {
      mockNavigation.setOptions.mock.calls.at(-1)![0].headerLeft().props.onPress();
    });
    const edit = () => TestRenderer.act(async () => {
      form().props.onChangeTitle('새 제목');
      form().props.onChangeContent('새 본문');
    });
    const reenter = async () => {
      await TestRenderer.act(async () => renderer!.unmount());
      await mount();
      await TestRenderer.act(async () => dialog('임시저장된 글이 있어요').onConfirm());
      expect(form().props.title).toBe('새 제목');
      expect(form().props.content).toBe('새 본문');
    };
    beforeEach(() => {
      disk = new Map();
      read.mockImplementation(async k => disk.get(k) ?? null);
      write.mockImplementation(async (k, v) => { disk.set(k, v); });
      remove.mockImplementation(async k => { disk.delete(k); });
    });
    afterEach(() => {
      read.mockReset().mockResolvedValue(null);
      write.mockReset().mockResolvedValue(undefined);
      remove.mockReset().mockResolvedValue(undefined);
    });

    it.each([false, true])('restores the last edit after leaving (first read fails: %s)', async failsOnce => {
      if (failsOnce) read.mockRejectedValueOnce(new Error('read'));
      await mount();
      expect(read.mock.calls.filter(([k]) => k === key)).toHaveLength(failsOnce ? 2 : 1);
      await edit();
      await pressBack();
      await TestRenderer.act(async () => dialog('작성 중인 글을 나갈까요?').onConfirm());
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
      await reenter();
    });

    it('keeps an unread draft untouched and allows a manual retry before accepting edits', async () => {
      disk.set(key, previous);
      read.mockRejectedValueOnce(new Error('read')).mockRejectedValueOnce(new Error('read'));
      await mount();
      expect(renderer!.root.findAllByType(TextInput).every(input => input.props.editable === false)).toBe(true);
      expect(form().props.submitLoading).toBe(true);
      expect(mockNavigation.setOptions.mock.calls.at(-1)![0].headerRight().props.disabled).toBe(true);
      expect(dialog('임시저장한 글을 확인하지 못했어요').confirmLabel).toBe('다시 불러오기');
      expect(read.mock.calls.filter(([k]) => k === key)).toHaveLength(2);
      await TestRenderer.act(async () => dialog('임시저장한 글을 확인하지 못했어요').onConfirm());
      expect(write).not.toHaveBeenCalledWith(key, expect.anything());
      expect(remove).not.toHaveBeenCalledWith(key);
      await TestRenderer.act(async () => dialog('임시저장된 글이 있어요').onCancel());
      await TestRenderer.act(async () => dialog('이전 글을 버릴까요?').onCancel());
      expect(disk.get(key)).toBe(previous);
      await TestRenderer.act(async () => dialog('임시저장된 글이 있어요').onConfirm());
      expect(form().props.title).toBe('이전 글');
      expect(form().props.content).toBe('기존 본문');
      await edit();
      await pressBack();
      await TestRenderer.act(async () => dialog('작성 중인 글을 나갈까요?').onConfirm());
      await reenter();
    });

    it('can leave after repeated read failure without touching the unresolved draft', async () => {
      disk.set(key, previous);
      read.mockRejectedValue(new Error('read'));
      await mount();
      await TestRenderer.act(async () => dialog('임시저장한 글을 확인하지 못했어요').onCancel());
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
      expect(disk.get(key)).toBe(previous);
      expect(remove).not.toHaveBeenCalledWith(key);
      expect(write).not.toHaveBeenCalledWith(key, expect.anything());
    });

    it('does not unlock the empty editor until explicitly discarding an older draft succeeds', async () => {
      disk.set(key, previous);
      await mount();
      await TestRenderer.act(async () => dialog('임시저장된 글이 있어요').onCancel());
      remove.mockRejectedValueOnce(new Error('remove'));
      await TestRenderer.act(async () => dialog('이전 글을 버릴까요?').onConfirm());
      expect(disk.get(key)).toBe(previous);
      expect(form().props.submitLoading).toBe(true);
      await TestRenderer.act(async () => dialog('이전 글을 버릴까요?').onConfirm());
      expect(disk.has(key)).toBe(false);
      expect(form().props.submitLoading).toBe(false);
      expect(form().props.title).toBe('');
    });

    it('restores a category-only edit after a successful exit save', async () => {
      await mount();
      await TestRenderer.act(async () => { form().props.onChangeCategory('daily'); });
      await pressBack();
      await TestRenderer.act(async () => dialog('작성 중인 글을 나갈까요?').onConfirm());
      await TestRenderer.act(async () => renderer!.unmount());
      await mount();
      await TestRenderer.act(async () => dialog('임시저장된 글이 있어요').onConfirm());
      expect(form().props.category).toBe('daily');
      expect(form().props.title).toBe('');
    });

    it('keeps input after both autosave and exit save fail, and only leaves after a successful retry', async () => {
      await mount();
      write.mockRejectedValueOnce(new Error('autosave')).mockRejectedValueOnce(new Error('exit save'));
      await edit();
      await pressBack();
      await TestRenderer.act(async () => dialog('작성 중인 글을 나갈까요?').onConfirm());
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
      expect(dialog('작성 중인 글을 나갈까요?').confirmLabel).toBe('다시 저장');
      expect(dialog('작성 중인 글을 나갈까요?').message).toContain('임시저장하지 못했어요');
      expect(form().props.content).toBe('새 본문');
      expect(disk.has(key)).toBe(false);
      await TestRenderer.act(async () => dialog('작성 중인 글을 나갈까요?').onConfirm());
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
      await reenter();
    });

    it('waits for an older write before the final snapshot and ignores a duplicate exit', async () => {
      await mount();
      let finish!: () => void;
      write.mockImplementationOnce((k, v) => new Promise<void>(resolve => {
        finish = () => { disk.set(k, v); resolve(); };
      }));
      await TestRenderer.act(async () => { form().props.onChangeTitle('먼저 쓴 글'); });
      await edit();
      await pressBack();
      await TestRenderer.act(async () => {
        dialog('작성 중인 글을 나갈까요?').onConfirm();
        dialog('작성 중인 글을 나갈까요?').onConfirm();
      });
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
      expect(dialog('작성 중인 글을 나갈까요?').confirmDisabled).toBe(true);
      await TestRenderer.act(async () => finish());
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
      await reenter();
    });

    it('does not resurrect an erased draft when its first removal fails', async () => {
      await mount();
      await edit();
      remove.mockRejectedValueOnce(new Error('remove')).mockRejectedValueOnce(new Error('exit remove'));
      await TestRenderer.act(async () => {
        form().props.onChangeTitle('');
        form().props.onChangeContent('');
      });
      await pressBack();
      await TestRenderer.act(async () => dialog('작성 중인 글을 나갈까요?').onConfirm());
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
      expect(disk.has(key)).toBe(true);
      await TestRenderer.act(async () => dialog('작성 중인 글을 나갈까요?').onConfirm());
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
      expect(disk.has(key)).toBe(false);
      await TestRenderer.act(async () => renderer!.unmount());
      await mount();
      expect(form().props.title).toBe('');
      expect(renderer!.root.findAllByType(ConfirmDialog).some(item => item.props.visible)).toBe(false);
    });
  });

  it('keeps real submission progress visible, locks duplicate taps and retains draft on failure', async () => {
    await mount();
    await TestRenderer.act(async () => {
      form().props.onChangeTitle('전송 제목');
      form().props.onChangeContent('유지할 본문');
    });
    let reject!: (error: Error) => void;
    jest.mocked(runCommunityCreateSubmitFlow).mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    const submit = mockNavigation.setOptions.mock.calls.at(-1)![0].headerRight().props.onPress as () => Promise<void>;
    let pending!: Promise<void>;
    await TestRenderer.act(async () => {
      pending = submit();
      await submit();
    });
    expect(runCommunityCreateSubmitFlow).toHaveBeenCalledTimes(1);
    expect(renderer!.root.findAllByProps({ testID: 'community-submit-progress' }).length).toBeGreaterThan(0);
    expect(form().props.submitLoading).toBe(true);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    await TestRenderer.act(async () => {
      reject(new Error('request failed'));
      await pending;
    });
    expect(renderer!.root.findAllByProps({ testID: 'community-submit-progress' })).toHaveLength(0);
    expect(form().props.content).toBe('유지할 본문');
    expect(form().props.submitLoading).toBe(false);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });
});
