import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { AppHeaderLayout } from '../src/components/navigation/AppHeaderLayout';
import GuideDetailScreen from '../src/screens/Guides/GuideDetailScreen';
import { PET_CARE_GUIDES } from '../src/services/guides/data';
import { usePetCareGuideDetail } from '../src/hooks/usePetCareGuideDetail';

const mockBack = jest.fn();
let mockGuideId = 'first';
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: { guideId: mockGuideId } }),
  useNavigation: () => ({ goBack: mockBack }),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({ useEffectiveSeason: () => 'autumn' }));
jest.mock('../src/components/common/SeasonalAmbientBackground', () => () => null);
jest.mock('../src/hooks/usePetCareGuideDetail');
jest.mock('../src/services/guides/service', () => ({ recordPetCareGuideEvents: jest.fn().mockResolvedValue(undefined) }));

it('switches the fixed title at the measured edge in both directions and resets for a different guide', () => {
  jest.mocked(usePetCareGuideDetail).mockImplementation(id => ({
    guide: { ...PET_CARE_GUIDES[0], id, title: '긴 글 제목 ' + id },
    loading: false, error: null, refresh: async () => {},
  }));
  const screen = () => <ThemeProvider theme={createTheme('light')}><GuideDetailScreen /></ThemeProvider>;
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(screen()); });
  const header = () => tree.root.findByType(AppHeaderLayout);
  const title = () => header().findAllByType(Text).find(n => n.props.accessibilityRole === 'header')?.props;
  const layout = (id: string, y: number, height: number) => act(() => {
    tree.root.findByProps({ testID: id }).props.onLayout({ nativeEvent: { layout: { y, height } } });
  });
  const scroll = (y: number) => act(() => {
    tree.root.findByType(ScrollView).props.onScroll({ nativeEvent: { contentOffset: { y } } });
  });
  const generic = '집사 꿀팁 가이드';
  scroll(115);
  layout('guide-detail-body-title', 32, 64);
  expect(title()?.children).toBe(generic);
  layout('guide-detail-intro', 20, 200);
  expect(title()?.children).toBe(generic);
  scroll(116);
  expect(title()).toMatchObject({ children: '긴 글 제목 first', numberOfLines: 1, ellipsizeMode: 'tail' });
  layout('guide-detail-body-title', 32, 96);
  expect(title()?.children).toBe(generic);
  scroll(700);
  expect(title()?.children).toBe('긴 글 제목 first');
  scroll(147);
  expect(title()?.children).toBe(generic);
  scroll(148);
  act(() => header().findByType(TouchableOpacity).props.onPress());
  expect(mockBack).toHaveBeenCalledTimes(1);
  mockGuideId = 'next';
  act(() => tree.update(screen()));
  expect(title()?.children).toBe(generic);
  act(() => tree.unmount());
});
