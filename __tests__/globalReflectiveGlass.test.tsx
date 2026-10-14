import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { BlurView } from '@sbaiahmed1/react-native-blur';
import { createTheme } from '../src/app/theme/theme';
import { HomeFrostedGlass } from '../src/components/home/HomeFrostedGlass';
import { HOME_FLOATING_WIDGET_MATERIAL } from '../src/components/home/HomeWidgetMaterial';
import { MoreMenuSection } from '../src/components/MoreDrawer/MoreMenuPresentation';
import { HOME_LOWER_SECTION_GAP, styles as homeStyles } from '../src/screens/Main/components/LoggedInHome/LoggedInHome.styles';

describe('PO global reflective card and navigation contract', () => {
  it.each(['spring', 'summer', 'autumn', 'winter'] as const)('%s legacy card entries now use the same reflective material', async season => {
    const onPress = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(<HomeFrostedGlass season={season} borderRadius={8} style={{ padding: 14, marginTop: 0 }}>
        <TouchableOpacity onPress={onPress}><Text>누리 더 알아보기</Text></TouchableOpacity>
      </HomeFrostedGlass>);
    });
    try {
      expect(tree.root.findAllByType(BlurView)).toHaveLength(0);
      const fill = tree.root.findAll(node => node.type === View && node.props.testID === 'home-reflective-fill');
      expect(fill).toHaveLength(1);
      expect(StyleSheet.flatten(fill[0].props.style)).toMatchObject({ ...HOME_FLOATING_WIDGET_MATERIAL, borderRadius: 8 });
      expect(tree.root.findAllByProps({ testID: 'home-reflective-glass-reflection' })).toHaveLength(1);
      tree.root.findByType(TouchableOpacity).props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('gives every quick destination an untouchable chevron without changing its action', async () => {
    const items = ['전체일정', '추억 다이어리', '건강관리', '실내 놀이 추천'].map((label, index) => ({ key: String(index), label, icon: 'calendar', onPress: jest.fn() }));
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><MoreMenuSection title="빠른 이동" items={items} quick /></ThemeProvider>);
    });
    try {
      for (const item of items) {
        const button = tree.root.findByProps({ testID: `more-entry-${item.key}` });
        expect(button.findAll(node => node.props.name === 'chevron-right').length).toBeGreaterThan(0);
        expect(button.props.accessibilityRole).toBe('button');
        button.props.onPress();
        expect(item.onPress).toHaveBeenCalledTimes(1);
      }
    } finally {
      await act(async () => tree.unmount());
    }
  });

  it('adds the standard section spacing after monthly expenses without changing other gaps', () => {
    expect(homeStyles.lowerHomeSectionList.paddingTop).toBe(HOME_LOWER_SECTION_GAP);
    expect(homeStyles.lowerHomeSectionList.gap).toBe(HOME_LOWER_SECTION_GAP);
  });
});
