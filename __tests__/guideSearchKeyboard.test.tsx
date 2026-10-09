import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import GuideListScreen from '../src/screens/Guides/GuideListScreen';
import { FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as seasonPreference from '../src/app/providers/SeasonPreferenceProvider';
import { getHomeAmbientVisual } from '../src/theme/home/seasonalAmbient';
import { BlurView } from '@sbaiahmed1/react-native-blur';
import { resolveHomeFrostedMaterial } from '../src/components/home/HomeFrostedGlass';
import GuideListCard from '../src/components/guides/GuideListCard';
import { PET_CARE_GUIDES } from '../src/services/guides/data';
import type { PetCareGuide } from '../src/services/guides/types';

const mockSearch = jest.fn((_options: unknown) => ({ guides: [], source: 'local-seed', loading: false }));
let mockGuides: PetCareGuide[] = [];
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
  usePetCareGuideCatalog: () => ({ guides: mockGuides, source: 'local-seed', loading: false }),
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
  beforeEach(() => { jest.clearAllMocks(); mockGuides = []; });
  afterEach(() => { TestRenderer.act(() => tree?.unmount()); jest.restoreAllMocks(); });

  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'shares the %s background and glass without changing list or empty/search contracts',
    async season => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.spyOn(seasonPreference, 'useEffectiveSeason').mockReturnValue(season);
      const render = () => <ThemeProvider theme={createTheme('light')}><GuideListScreen /></ThemeProvider>;
      await TestRenderer.act(async () => { tree = TestRenderer.create(render()); });
      const background = tree.root.findAllByType(View).find(
        node => node.props.testID === 'seasonal-ambient-background',
      );
      expect(StyleSheet.flatten(background?.props.style).backgroundColor).toBe(
        getHomeAmbientVisual(season).canvasGradient[0],
      );
      expect(background?.props.pointerEvents).toBe('none');
      expect(tree.root.findAllByType(BlurView)).toHaveLength(1);
      await TestRenderer.act(async () => tree.root.findAllByProps({ accessibilityLabel: '가이드 검색 열기' })[0].props.onPress());
      expect(tree.root.findAllByType(BlurView)).toHaveLength(3);
      for (const panel of tree.root.findAllByType(BlurView)) {
        const tint = panel.findAllByProps({ testID: 'home-frosted-tint' })[0];
        expect(StyleSheet.flatten(tint.props.style).backgroundColor).toBe(
          resolveHomeFrostedMaterial(season).backgroundColor,
        );
        // Horizontal margins must not be added to the shared glass's 100% width.
        expect(StyleSheet.flatten(panel.props.style).width).toBeUndefined();
        expect(StyleSheet.flatten(panel.props.style).alignSelf).toBe('stretch');
      }
      mockGuides = [PET_CARE_GUIDES[0]];
      await TestRenderer.act(async () => tree.update(render()));
      const list = tree.root.findByType(FlatList);
      expect(list.props.data).toEqual(mockGuides);
      expect(list.props.keyExtractor(mockGuides[0])).toBe(mockGuides[0].id);
      expect(list.props.keyboardShouldPersistTaps).toBe('handled');
      expect(list.props.keyboardDismissMode).toBe('on-drag');
      expect(list.props.renderItem({ item: mockGuides[0] }).props.season).toBe(season);
    },
  );

  it('keeps guide content and the full-row navigation action inside one glass layer', async () => {
    const onPress = jest.fn();
    const guide = PET_CARE_GUIDES[0];
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(<ThemeProvider theme={createTheme('light')}>
        <GuideListCard guide={guide} season="summer" onPress={onPress}
          accentColor="#247264" accentTint="#E2F4EF" accentBorder="#BADDD3" />
      </ThemeProvider>);
    });
    expect(tree.root.findAllByType(BlurView)).toHaveLength(1);
    const button = tree.root.findByType(TouchableOpacity);
    expect(button.props.accessibilityLabel).toBe(`${guide.title}, 가이드 상세 보기`);
    button.props.onPress();
    expect(onPress).toHaveBeenCalledWith(guide.id);
    expect(tree.root.findAllByProps({ children: guide.title }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ children: guide.summary }).length).toBeGreaterThan(0);
  });

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
