import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import GuideListScreen from '../src/screens/Guides/GuideListScreen';

const mockSearch = jest.fn((_options: unknown) => ({ guides: [], source: 'local-seed', loading: false }));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 48, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), reset: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));
jest.mock('../src/hooks/usePetCareGuideCatalog', () => ({
  usePetCareGuideCatalog: () => ({ guides: [], source: 'local-seed', loading: false }),
}));
jest.mock('../src/hooks/usePetCareGuideSearch', () => ({
  usePetCareGuideSearch: (options: unknown) => mockSearch(options),
}));
jest.mock('../src/hooks/useRecentPetCareGuideSearches', () => ({
  useRecentPetCareGuideSearches: () => ({ searches: [], save: jest.fn(), remove: jest.fn() }),
}));
jest.mock('../src/hooks/useGuidePopularSearches', () => ({
  useGuidePopularSearches: () => ({ keywords: [], loading: false }),
}));

describe('Guide controlled search composition contract', () => {
  let tree: TestRenderer.ReactTestRenderer;
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => TestRenderer.act(() => tree?.unmount()));

  it('keeps the same input and reflects every composed value, then clears and reopens', async () => {
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><GuideListScreen /></ThemeProvider>);
    });
    const toggle = tree.root.findAllByProps({ accessibilityLabel: '가이드 검색 열기' })[0];
    await TestRenderer.act(async () => toggle.props.onPress());
    const input = tree.root.findByProps({ placeholder: '제목, 태그, 카테고리, 종으로 검색' });
    for (const value of ['ㅌ', '테', '테ㅅ', '테스', '테스트', '강아지 건강 관리', 'test', '123']) {
      await TestRenderer.act(async () => input.props.onChangeText(value));
      expect(input.props.value).toBe(value);
      expect(tree.root.findByProps({ placeholder: input.props.placeholder })).toBe(input);
      expect(mockSearch).toHaveBeenLastCalledWith(expect.objectContaining({ query: value }));
    }
    await TestRenderer.act(async () => tree.root.findAllByProps({ accessibilityLabel: '가이드 검색어 지우기' })[0].props.onPress());
    expect(input.props.value).toBe('');
    await TestRenderer.act(async () => toggle.props.onPress());
    await TestRenderer.act(async () => toggle.props.onPress());
    expect(tree.root.findByProps({ placeholder: '제목, 태그, 카테고리, 종으로 검색' }).props.value).toBe('');
  });

  it('never schedules controlled-value setters in a transition; only derived search is deferred', () => {
    const text = fs.readFileSync(path.join(process.cwd(), 'src/screens/Guides/GuideListScreen.tsx'), 'utf8');
    const source = ts.createSourceFile('GuideListScreen.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const transitions: ts.CallExpression[] = [];
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === 'startTransition') transitions.push(node);
      ts.forEachChild(node, visit);
    }
    visit(source);
    for (const transition of transitions) expect(transition.getText(source)).not.toContain('setSearchQuery');
    expect(text).toContain('onChangeText={setSearchQuery}');
    expect(text).toContain('useDeferredValue(searchQuery)');
    expect(text).toContain('query: trimmedSearchQuery');
    expect(text).toContain('filterPetCareGuidesForListAudience');
    expect(text).toContain('rankPetCareGuidesForList');
  });
});
