import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import WeatherActivityRecordScreen from '../src/screens/Weather/WeatherActivityRecordScreen';
import { usePetStore } from '../src/store/petStore';

let mockKeyboardVisible = false;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
  useRoute: () => ({ params: { guideKey: 'massage', district: 'QA' } }),
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  KeyboardAwareScrollView: 'KeyboardControllerScrollView',
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
  afterEach(() => {
    act(() => renderer?.unmount());
    usePetStore.setState(beforePet);
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
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom).toBe(visible ? 12 : 76);
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
