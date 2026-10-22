import React from 'react';
import { Keyboard, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import RecordTagModal from '../src/screens/Records/components/RecordTagModal';

let mockKeyboardProgress = 0;
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));
jest.mock('react-native-keyboard-controller', () => {
  const runtime = jest.requireActual('react') as typeof React;
  return {
    useReanimatedKeyboardAnimation: () => ({ progress: { value: mockKeyboardProgress } }),
    KeyboardAvoidingView: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      runtime.createElement('KeyboardAvoidingView', props, children),
  };
});

type Props = React.ComponentProps<typeof RecordTagModal>;
const onClose = jest.fn();
const onChangeTagDraft = jest.fn();
const onSubmitDraftTag = jest.fn();
const onRemoveTag = jest.fn();
const defaults: Props = {
  visible: true, tagDraft: '', selectedTags: [],
  onClose, onChangeTagDraft, onSubmitDraftTag, onRemoveTag,
};
let tree: TestRenderer.ReactTestRenderer | undefined;
function render(props: Partial<Props> = {}) {
  act(() => { tree = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><RecordTagModal {...defaults} {...props} /></ThemeProvider>); });
  if (!tree) throw new Error('Sheet missing');
  return tree;
}
function byId(id: string) {
  const matches = tree?.root.findAllByProps({ testID: id }) ?? [];
  const node = matches.find(item => item.type === TouchableOpacity)
    ?? matches.find(item => typeof item.props.onPress === 'function')
    ?? matches.at(-1);
  if (!node) throw new Error(`Missing sheet control: ${id}`);
  return node;
}
beforeEach(() => {
  mockKeyboardProgress = 0;
  jest.clearAllMocks();
  jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
  jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
});
afterEach(() => {
  act(() => tree?.unmount());
  tree = undefined;
  jest.restoreAllMocks();
});

describe('Record tag bottom sheet', () => {
  it('anchors a bounded slide sheet to the bottom without forcing the keyboard', () => {
    const result = render();
    expect(result.root.findByType(Modal).props).toMatchObject({ animationType: 'slide', transparent: true });
    expect(StyleSheet.flatten(byId('record-tag-sheet-root').props.style)).toMatchObject({ justifyContent: 'flex-end', paddingTop: 36 });
    expect(byId('record-tag-sheet-root').props).toMatchObject({ behavior: 'height', automaticOffset: true, enabled: true });
    expect(StyleSheet.flatten(byId('record-tag-sheet').props.style)).toMatchObject({ width: '100%', maxHeight: '100%', flexShrink: 1, paddingBottom: 24 });
    expect(byId('record-tag-sheet').props.accessibilityViewIsModal).toBe(true);
    expect(result.root.findByType(TextInput).props.autoFocus).toBe(false);
    expect(result.root.findByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('uses one keyboard height owner and only a design gap above the keyboard', () => {
    mockKeyboardProgress = 1;
    render();
    expect(StyleSheet.flatten(byId('record-tag-sheet').props.style)).toMatchObject({ paddingBottom: 12 });
    expect(StyleSheet.flatten(byId('record-tag-sheet-scroll').props.style)).toMatchObject({ flexShrink: 1, minHeight: 0 });
  });

  it('retains controlled input and calls the existing add path only for a nonempty draft', () => {
    const result = render({ tagDraft: '  ' });
    expect(byId('record-tag-sheet-add').props.disabled).toBe(true);
    act(() => byId('record-tag-sheet-add').props.onPress());
    act(() => result.root.findByType(TextInput).props.onSubmitEditing());
    expect(onSubmitDraftTag).not.toHaveBeenCalled();
    act(() => result.update(<ThemeProvider theme={createTheme('light')}><RecordTagModal {...defaults} tagDraft="추억" /></ThemeProvider>));
    expect(result.root.findByType(TextInput).props.value).toBe('추억');
    act(() => result.root.findByType(TextInput).props.onChangeText('산책'));
    expect(onChangeTagDraft).toHaveBeenCalledWith('산책');
    act(() => byId('record-tag-sheet-add').props.onPress());
    expect(onSubmitDraftTag).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes only the explicitly tapped tag without modifying the supplied list', () => {
    const tags = ['기억', '산책'];
    const result = render({ selectedTags: tags });
    const target = result.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === '산책 태그 제거');
    if (!target) throw new Error('Remove action missing');
    expect(StyleSheet.flatten(target.props.style)).toMatchObject({ minHeight: 48 });
    act(() => target.props.onPress());
    expect(onRemoveTag).toHaveBeenCalledWith('산책');
    expect(tags).toEqual(['기억', '산책']);
  });

  it('dismisses the keyboard first on Back, then closes without submitting a draft', () => {
    const result = render({ tagDraft: '작성 중' });
    jest.mocked(Keyboard.isVisible).mockReturnValue(true);
    act(() => result.root.findByType(Modal).props.onRequestClose());
    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    jest.mocked(Keyboard.isVisible).mockReturnValue(false);
    act(() => result.root.findByType(Modal).props.onRequestClose());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmitDraftTag).not.toHaveBeenCalled();
  });

  it('keeps close, backdrop and completion on the existing close policy', () => {
    render({ tagDraft: '아직 추가하지 않은 태그' });
    for (const id of ['record-tag-sheet-close', 'record-tag-sheet-backdrop', 'record-tag-sheet-done']) {
      act(() => byId(id).props.onPress());
    }
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(onSubmitDraftTag).not.toHaveBeenCalled();
  });

  it('does not mount hidden content and preserves the embedded path without a nested Modal', () => {
    const hidden = render({ visible: false });
    expect(hidden.root.findAllByType(Modal)).toHaveLength(0);
    act(() => hidden.update(<ThemeProvider theme={createTheme('light')}><RecordTagModal {...defaults} embedded /></ThemeProvider>));
    expect(hidden.root.findAllByType(Modal)).toHaveLength(0);
    expect(StyleSheet.flatten(byId('record-tag-sheet-root').props.style)).toMatchObject({ position: 'absolute', zIndex: 10 });
  });
});
