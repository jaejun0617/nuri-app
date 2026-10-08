import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { BackHandler, StyleSheet, TextInput } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import WeatherActivityRecordScreen from '../src/screens/Weather/WeatherActivityRecordScreen';
import RecordTagModal from '../src/screens/Records/components/RecordTagModal';
import { usePetStore } from '../src/store/petStore';

let mockKeyboardVisible = false;
const mockAssureVisible = jest.fn();
const mockNavigation = { canGoBack: () => true, goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { guideKey: 'massage', district: 'QA' } }),
  useFocusEffect: (effect: React.EffectCallback) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  KeyboardAwareScrollView: jest.requireActual('react').forwardRef(
    (props: React.PropsWithChildren<Record<string, unknown>>, ref: React.ForwardedRef<unknown>) => {
      const runtime = jest.requireActual('react') as typeof React;
      runtime.useImperativeHandle(ref, () => ({ assureFocusedInputVisible: mockAssureVisible }));
      return runtime.createElement('KeyboardControllerScrollView', props, props.children);
    },
  ),
  useKeyboardState: (selector: (state: { isVisible: boolean }) => unknown) => selector({ isVisible: mockKeyboardVisible }),
  useReanimatedKeyboardAnimation: () => ({ progress: { value: mockKeyboardVisible ? 1 : 0 } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 48, left: 0, right: 0 }),
}));

describe('record save footer keyboard ownership', () => {
  const beforePet = usePetStore.getState();
  let renderer: TestRenderer.ReactTestRenderer;
  const originalFrame = global.requestAnimationFrame;
  beforeEach(() => {
    jest.clearAllMocks();
    global.requestAnimationFrame = callback => { callback(0); return 1; };
  });
  afterEach(() => {
    act(() => renderer?.unmount());
    usePetStore.setState(beforePet);
    global.requestAnimationFrame = originalFrame;
    jest.restoreAllMocks();
  });
  it('restores Weather memo focus through its aware owner after tag modal close without losing the draft', async () => {
    await act(async () => {
      renderer = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><WeatherActivityRecordScreen /></ThemeProvider>);
    });
    const memo = renderer.root.findByProps({ testID: 'weather-record-note' });
    const instance = memo.findByType(TextInput).instance as unknown as {
      isFocused: () => boolean;
      blur: () => void;
      focus: () => void;
    };
    jest.spyOn(instance, 'isFocused').mockReturnValue(true);
    const blur = jest.spyOn(instance, 'blur');
    const focus = jest.spyOn(instance, 'focus');
    await act(async () => memo.props.onChangeText('태그 복귀 초안'));
    await act(async () => renderer.root.findByProps({ testID: 'weather-record-tag-open' }).props.onPress());
    expect(blur).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByType(RecordTagModal).props.visible).toBe(true);
    expect(renderer.root.findByType(RecordTagModal).props.embedded).toBe(true);
    await act(async () => renderer.root.findByType(RecordTagModal).props.onClose());
    expect(focus).toHaveBeenCalledTimes(1);
    await act(async () => memo.props.onFocus());
    expect(mockAssureVisible).toHaveBeenCalledTimes(1);
    expect(memo.props.value).toBe('태그 복귀 초안');
    expect(renderer.root.findAll(node => node.type === ('KeyboardControllerScrollView' as TestRenderer.ReactTestInstance['type']))[0].props.disableScrollOnKeyboardHide).toBe(true);
    const source = readFileSync(join(process.cwd(), 'src/screens/Weather/WeatherActivityRecordScreen.tsx'), 'utf8');
    expect(source).not.toContain('setTimeout');
  });
  it('consumes Android Back in the embedded tag dialog instead of popping the record route', async () => {
    const addListener = jest.spyOn(BackHandler, 'addEventListener');
    await act(async () => {
      renderer = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><WeatherActivityRecordScreen /></ThemeProvider>);
    });
    await act(async () => renderer.root.findByProps({ testID: 'weather-record-tag-open' }).props.onPress());
    const handler = addListener.mock.calls.at(-1)?.[1];
    if (!handler) throw new Error('Weather hardware Back handler missing');
    await act(async () => { expect(handler({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true); });
    expect(renderer.root.findByType(RecordTagModal).props.visible).toBe(false);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it.each([false, true])('does not retain system bottom space with keyboard visible=%s', async visible => {
    mockKeyboardVisible = visible;
    usePetStore.setState({ pets: [{ id: 'qa', name: '누리' }], selectedPetId: 'qa' });
    await act(async () => {
      renderer = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><WeatherActivityRecordScreen /></ThemeProvider>);
    });
    const screen = renderer.root.findAll(node => node.props.testID === 'weather-activity-record-screen')[0];
    expect(screen.props.edges.includes('bottom')).toBe(!visible);
    const scroll = renderer.root.findAll(node => node.type === ('KeyboardControllerScrollView' as TestRenderer.ReactTestInstance['type']))[0];
    // SafeAreaView owns the closed system inset; the scroll content owns only visual spacing.
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom).toBe(16);
    expect(scroll.props.keyboardDismissMode).toBe('none');
    expect(scroll.props).not.toHaveProperty('extraHeight');
  });
  it('protects both RecordEdit root states from the status bar without adding bottom IME space', () => {
    const source = ts.createSourceFile(
      'RecordEditScreen.tsx',
      readFileSync(join(process.cwd(), 'src/screens/Records/RecordEditScreen.tsx'), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const roots: ts.JsxOpeningElement[] = [];
    function visit(node: ts.Node) {
      if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === 'SafeAreaView') {
        const style = node.attributes.properties.find(property =>
          ts.isJsxAttribute(property) && property.name.getText(source) === 'style',
        );
        if (style?.getText(source) === 'style={styles.screen}') roots.push(node);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    expect(roots).toHaveLength(2);
    for (const root of roots) {
      const edges = root.attributes.properties.find(property =>
        ts.isJsxAttribute(property) && property.name.getText(source) === 'edges',
      );
      expect(edges?.getText(source)).toBe("edges={['top', 'left', 'right']}");
    }
  });
});
