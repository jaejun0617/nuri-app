import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import { HomeSectionHeader } from '../src/components/home/HomeSectionHeader';
import { HOME_SECTION_ROOT_STYLE } from '../src/components/home/HomeSectionGlass';
import { HOME_WIDGET_MATERIAL } from '../src/components/home/HomeWidgetMaterial';
import { FrequentRecordsSection } from '../src/components/records/FrequentRecordsSection';
import { styles as frequentStyles } from '../src/components/records/FrequentRecordsSection.styles';
import {
  styles as homeStyles,
  HOME_LOWER_SECTION_GAP,
} from '../src/screens/Main/components/LoggedInHome/LoggedInHome.styles';
import { styles as actionStyles } from '../src/app/ui/SectionHeaderAction.styles';
import { buildPetThemePalette } from '../src/services/pets/themePalette';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
}));

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
  ),
  'utf8',
);

describe('Home section rhythm and material', () => {
  it('uses the existing Weather-to-records distance between every lower section', () => {
    expect(HOME_LOWER_SECTION_GAP).toBe(40);
    expect(homeStyles.lowerHomeSectionList.gap).toBe(
      homeStyles.seasonalWeatherSection.paddingBottom,
    );
    // Existing glass-root margin contributes to the visible panel-to-panel gap.
    expect(HOME_SECTION_ROOT_STYLE.marginTop).toBe(12);
    expect(
      HOME_LOWER_SECTION_GAP + Number(HOME_SECTION_ROOT_STYLE.marginTop),
    ).toBe(52);
    expect(source).toContain('style={styles.lowerHomeSectionList}');
    for (const section of [
      homeStyles.section,
      homeStyles.weeklySummarySection,
      frequentStyles.section,
    ]) {
      expect(section.paddingHorizontal).toBe(14);
      expect(section.paddingTop).toBe(18);
    }
  });

  it('unifies widgets and the insight CTA as translucent inner glass', () => {
    for (const style of [
      frequentStyles.recordCard,
      homeStyles.weeklySummaryMetricCard,
      homeStyles.weeklySummaryInsight,
    ]) {
      expect(style).toMatchObject(HOME_WIDGET_MATERIAL);
      expect(style.elevation).toBe(0);
      expect(style.shadowOpacity).toBe(0);
    }
    expect(frequentStyles.recordCard.aspectRatio).toBe(1);
    expect(homeStyles.weeklySummaryMetricCard.height).toBe(144);
    expect(source).toContain('<HomeWidgetSheen radius={20} />');
    expect(source).toContain('<HomeWidgetSheen radius={18} />');
    expect(HOME_WIDGET_MATERIAL.backgroundColor).toBe(
      'rgba(255, 253, 250, 0.60)',
    );
  });

  it('limits the oversized title treatment to the recommendation heading', async () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <HomeSectionHeader
            title="우리 아이를 위한"
            emphasis={{ title: '추천 팁', color: '#2563EB' }}
            description={'아이의 건강한 하루를 위한\n맞춤형 팁을 확인해보세요.'}
            color="#174BA8"
            action={{
              onPress: jest.fn(),
              accessibilityLabel: '추천 팁 전체 보기',
            }}
          />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('Recommendation heading missing');
    const titles = renderer.root.findAll(
      node => node.props.preset === 'unifiedTitle',
    );
    expect(
      titles.map(node => StyleSheet.flatten(node.props.style).fontSize),
    ).toEqual([22, 30]);
    expect(titles.every(node => node.props.styleOverridesPreset)).toBe(true);
    expect(titles.every(node => node.props.numberOfLines === undefined)).toBe(
      true,
    );
    expect(
      renderer.root.findAll(
        node =>
          node.props.preset === 'unifiedBody' &&
          node.props.children ===
            '아이의 건강한 하루를 위한\n맞춤형 팁을 확인해보세요.',
      ),
    ).not.toHaveLength(0);
    expect(source).toContain(
      "'아이의 건강한 하루를 위한\\n맞춤형 팁을 확인해보세요.'",
    );
    await act(async () => renderer?.unmount());
  });

  it('centers action text independently of the right-edge arrow', async () => {
    const onPress = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <HomeSectionHeader
            title="우리 아이를 위한 추천 팁"
            color="#2563EB"
            action={{ onPress, accessibilityLabel: '추천 팁 전체 보기' }}
          />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('Home header missing');
    const action = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '추천 팁 전체 보기' &&
        typeof node.props.onPress === 'function',
    );
    expect(action.props.accessibilityLabel).toBe('추천 팁 전체 보기');
    expect(actionStyles.text).toMatchObject({
      textAlign: 'center',
      flex: 1,
      marginHorizontal: 14,
    });
    expect(actionStyles.compactIconSlot).toMatchObject({
      position: 'absolute',
      right: 5,
    });
    expect(actionStyles.compactButton).toMatchObject({
      width: 80,
      flexShrink: 0,
    });
    expect(
      renderer.root.findAll(node => node.props.name === 'chevron-right'),
    ).toHaveLength(1);
    const header = renderer.root.findAll(
      node => node.type === View && node.props.testID === 'home-section-header',
    )[0];
    expect(StyleSheet.flatten(header.props.style)).toMatchObject({
      width: '100%',
      alignItems: 'flex-start',
    });
    action.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
    await act(async () => renderer?.unmount());
  });

  it('keeps all four record entries and their navigation under the raised surfaces', async () => {
    const onPressCategory = jest.fn();
    const onPressAll = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <FrequentRecordsSection
            petTheme={buildPetThemePalette('#2563EB')}
            records={[]}
            recordStatus="ready"
            now={new Date('2026-09-30T00:00:00Z')}
            onPressCategory={onPressCategory}
            onPressAll={onPressAll}
          />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('Frequent records missing');
    const buttons = renderer.root.findAll(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    );
    const entries = buttons.filter(
      (node, index, nodes) =>
        String(node.props.accessibilityLabel).includes('기록하기') &&
        nodes.findIndex(
          item =>
            item.props.accessibilityLabel === node.props.accessibilityLabel,
        ) === index,
    );
    expect(entries).toHaveLength(4);
    for (const entry of entries) entry.props.onPress();
    expect(onPressCategory.mock.calls.map(call => call[0])).toEqual([
      'walk',
      'meal',
      'health',
      'grooming',
    ]);
    buttons
      .find(node => node.props.accessibilityLabel === '전체 기록 보기')
      ?.props.onPress();
    expect(onPressAll).toHaveBeenCalledTimes(1);
    const sheens = renderer.root.findAll(
      node => node.props.testID === 'home-widget-sheen' && node.props.colors,
    );
    expect(sheens).toHaveLength(4);
    expect(sheens.every(node => node.props.pointerEvents === 'none')).toBe(
      true,
    );
    await act(async () => renderer?.unmount());
  });

  it('opens only the embedded Home Community font boundary and keeps Weather fixed', () => {
    const communityPosition = source.indexOf('<CommunitySection');
    const openingBoundary = source.lastIndexOf(
      '<FixedTypographyBoundary>',
      communityPosition,
    );
    const closingBoundary = source.lastIndexOf(
      '</FixedTypographyBoundary>',
      communityPosition,
    );
    expect(openingBoundary).toBeLessThanOrEqual(closingBoundary);
    const weatherPosition = source.indexOf('<HomeWeatherSection\n');
    expect(
      source.lastIndexOf('<FixedTypographyBoundary>', weatherPosition),
    ).toBeGreaterThan(
      source.lastIndexOf('</FixedTypographyBoundary>', weatherPosition),
    );
    const tabs = fs.readFileSync(
      path.join(__dirname, '../src/navigation/AppTabsNavigator.tsx'),
      'utf8',
    );
    expect(tabs).toContain('<FixedTypographyBoundary>');
    expect(tabs).toContain('<Community');
    expect(source).not.toContain('건강관리 열기');
    expect(source).not.toContain('더보기');
  });
});
