import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import ReactNative from 'react-native';
import { StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import {
  HomeSectionHeader,
  isHomeSectionConfirmedEmpty,
} from '../src/components/home/HomeSectionHeader';
import { HOME_SECTION_ROOT_STYLE } from '../src/components/home/HomeSectionGlass';
import {
  HOME_FLOATING_WIDGET_MATERIAL,
  HOME_FLOATING_WIDGET_REFLECTION,
  HOME_WIDGET_MATERIAL,
} from '../src/components/home/HomeWidgetMaterial';
import { HomeSeasonProvider } from '../src/components/home/HomeSeasonContext';
import { FrequentRecordsSection } from '../src/components/records/FrequentRecordsSection';
import { styles as frequentStyles } from '../src/components/records/FrequentRecordsSection.styles';
import { getHomeAmbientVisual } from '../src/theme/home/seasonalAmbient';
import type { SeasonKey } from '../src/theme/seasonal/season';
import {
  styles as homeStyles,
  HOME_LOWER_SECTION_GAP,
} from '../src/screens/Main/components/LoggedInHome/LoggedInHome.styles';
import { styles as actionStyles } from '../src/app/ui/SectionHeaderAction.styles';
import { styles as summaryStyles } from '../src/screens/Main/components/LoggedInHome/TotalSummarySection';
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
  beforeEach(() => {
    jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
      width: 384, height: 800, scale: 3, fontScale: 1,
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([360, 384, 400, 430].flatMap(width =>
    [1, 1.3, 1.5].map(fontScale => ({ width, fontScale })),
  ))('gives header actions room at $width dp and font scale $fontScale', async ({ width, fontScale }) => {
    jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
      width, height: 800, scale: 3, fontScale,
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <HomeSectionHeader title="반려인들이 주목한 이야기" color="#2563EB"
            action={{ onPress: jest.fn(), accessibilityLabel: '커뮤니티 전체 보기' }} />
        </ThemeProvider>,
      );
    });
    const header = renderer.root.findAllByType(View).find(
      node => node.props.testID === 'home-section-header',
    );
    const button = renderer.root.findAll(node =>
      node.props.accessibilityLabel === '커뮤니티 전체 보기' && !!node.props.style,
    )[0];
    const buttonStyle = StyleSheet.flatten(
      typeof button.props.style === 'function'
        ? button.props.style({ pressed: false }) : button.props.style,
    );
    expect(buttonStyle.width).toBe(Math.ceil(80 * fontScale));
    expect(buttonStyle.minHeight).toBe(Math.ceil(28 * fontScale));
    expect(StyleSheet.flatten(header?.props.style).flexDirection).toBe(
      fontScale >= 1.3 ? 'column' : 'row',
    );
    expect(button.props.accessibilityLabel).toBe('커뮤니티 전체 보기');
    await act(async () => renderer.unmount());
  });

  it('lowers the Hero identity and CTA together by 16dp while keeping the memory chip fixed', () => {
    expect(homeStyles.autumnHeroBodyGroup.paddingTop).toBe(14 + 16);
    expect(homeStyles.autumnHeroBodyGroup).not.toHaveProperty('transform');
    expect(homeStyles.autumnMemoryChipAnchor).toMatchObject({
      position: 'absolute', top: 6,
    });
    expect(homeStyles.autumnHeroCardWithMemoryChip.paddingTop).toBe(34);
    expect(homeStyles.heroCenter.paddingTop).toBe(10);
    expect(homeStyles.autumnProfileEntry.marginTop).toBe(32);
    expect(homeStyles.autumnProfileEntry.minHeight).toBe(52);
    expect(source).toMatch(
      /const usesCanonicalHeroGeometry =\s*isAutumn \|\| isWinter \|\| isSpring \|\| isSummer;/,
    );
    expect(source).toMatch(
      /style=\{usesCanonicalHeroGeometry \? styles\.autumnHeroBodyGroup : null\}[\s\S]*?<HeroProfileIdentity[\s\S]*?accessibilityLabel="우리 아이 더 알아보기"/,
    );
  });

  it('lets record tiles grow with enlarged copy instead of painting outside a square', async () => {
    jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
      width: 360, height: 800, scale: 3, fontScale: 1.5,
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <FrequentRecordsSection petTheme={buildPetThemePalette('#2563EB')}
            records={[]} recordStatus="ready" now={new Date('2026-10-04T03:00:00Z')}
            onPressCategory={jest.fn()} onPressAll={jest.fn()} />
        </ThemeProvider>,
      );
    });
    const tiles = renderer.root.findAll(node =>
      String(node.props.accessibilityLabel).includes('기록하기') && !!node.props.style,
    ).filter(node => typeof node.props.style === 'function');
    expect(tiles).toHaveLength(4);
    for (const tile of tiles) {
      expect(StyleSheet.flatten(tile.props.style({ pressed: false }))).toMatchObject({
        aspectRatio: undefined, minHeight: 156,
      });
    }
    await act(async () => renderer.unmount());
  });

  it('preserves the requested populated preview limits and diary month filter', () => {
    expect(source).toContain('const HOME_RECENT_RECORDS_MAX = 3;');
    expect(source).toContain('scheduleItems.slice(0, 7)');
    expect(source).toContain('activityItems.slice(0, 5)');
    expect(source).toMatch(/getMonthKeyFromYmd\(getRecordDisplayYmd\(item\)\) === currentMonthKey[\s\S]*?\.slice\(0, 7\)/);
  });

  it('lets touches cross the transparent overlapping Weather and lower-content wrappers', () => {
    expect(homeStyles.seasonalWeatherSection.marginTop).toBe(-64);
    expect(homeStyles.seasonalWeatherSection.paddingTop).toBe(48);
    expect(source).toMatch(
      /styles\.seasonalWeatherSection,[\s\S]*?fontScale > 1 \? \{ marginTop: 0 \} : null,[\s\S]*?pointerEvents="box-none"/,
    );
    expect(source).toMatch(
      /<Animated\.View[\s\S]*?onLayout=\{handleAmbientContentLayout\}[\s\S]*?pointerEvents="box-none"/,
    );
  });

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
      summaryStyles.section,
      frequentStyles.section,
    ]) {
      expect(section.paddingHorizontal).toBe(14);
      expect(section.paddingTop).toBe(18);
    }
  });

  it('unifies summary and quick-record glass without changing guide material or panel geometry', () => {
    for (const style of [
      summaryStyles.metric,
      summaryStyles.insight,
    ]) {
      expect(style).toMatchObject(HOME_FLOATING_WIDGET_MATERIAL);
      expect(style.elevation).toBe(0);
      expect(style.shadowOpacity).toBe(0);
    }
    expect(frequentStyles.recordCard.aspectRatio).toBe(1);
    expect(frequentStyles.recordCard).toMatchObject(
      HOME_FLOATING_WIDGET_MATERIAL,
    );
    expect(HOME_FLOATING_WIDGET_MATERIAL).toMatchObject({
      backgroundColor: 'rgba(255, 255, 255, 0.26)',
      borderTopColor: 'rgba(255, 255, 255, 0.98)',
      borderWidth: 1,
      elevation: 0,
      shadowOpacity: 0,
    });
    expect(summaryStyles.metric.height).toBeUndefined();
    expect(summaryStyles.metric.minHeight).toBe(108);
    expect(HOME_WIDGET_MATERIAL.backgroundColor).toBe(
      'rgba(255, 253, 250, 0.60)',
    );
    // A uniform white rim must not imitate a dark bottom shadow.
    expect(HOME_WIDGET_MATERIAL.borderBottomColor).toBeUndefined();
    expect(HOME_FLOATING_WIDGET_MATERIAL.borderBottomColor).toBeUndefined();
  });

  it.each(
    (['autumn', 'winter', 'spring', 'summer'] as SeasonKey[]).flatMap(season =>
      [360, 384, 400, 430].flatMap(width =>
        [1, 1.3, 1.5].map(fontScale => ({ season, width, fontScale })),
      ),
    ),
  )(
    'keeps four untouchable glass decorations and record targets at $season $width dp font $fontScale',
    async ({ season, width, fontScale }) => {
      jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
        width, height: 800, scale: 3, fontScale,
      });
      const onPressCategory = jest.fn();
      const onPressAll = jest.fn();
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <HomeSeasonProvider season={season}>
              <FrequentRecordsSection
                petTheme={buildPetThemePalette('#2563EB')}
                records={[]}
                recordStatus="ready"
                now={new Date('2026-10-04T03:00:00Z')}
                onPressCategory={onPressCategory}
                onPressAll={onPressAll}
              />
            </HomeSeasonProvider>
          </ThemeProvider>,
        );
      });
      const tiles = renderer.root.findAll(node =>
        typeof node.props.style === 'function' &&
        String(node.props.accessibilityLabel).includes('기록하기'),
      );
      expect(tiles).toHaveLength(4);
      for (const tile of tiles) {
        const style = StyleSheet.flatten(tile.props.style({ pressed: false }));
        expect(style).toMatchObject({
          ...HOME_FLOATING_WIDGET_MATERIAL,
          width: '48%',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 8,
          aspectRatio: fontScale > 1 ? undefined : 1,
        });
        expect(style.opacity).toBeUndefined();
        if (fontScale > 1) expect(style.minHeight).toBe(156);
        expect(StyleSheet.flatten(tile.props.style({ pressed: true }))).toMatchObject({
          opacity: 0.93, transform: [{ scale: 0.985 }],
        });
        tile.props.onPress();
      }
      expect(onPressCategory.mock.calls.map(call => call[0])).toEqual([
        'walk', 'meal', 'health', 'grooming',
      ]);
      expect(onPressAll).not.toHaveBeenCalled();
      const iconSlots = renderer.root.findAll(node =>
        node.type === View &&
        StyleSheet.flatten(node.props.style)?.width === 40 &&
        StyleSheet.flatten(node.props.style)?.height === 40,
      );
      expect(iconSlots).toHaveLength(4);
      for (const slot of iconSlots) {
        expect(StyleSheet.flatten(slot.props.style).backgroundColor).toBeUndefined();
      }
      const outerGlass = renderer.root.findAll(node =>
        node.type === View && node.props.testID === 'home-section-glass-surface',
      )[0];
      expect(StyleSheet.flatten(outerGlass.props.style).backgroundColor).toBe(
        getHomeAmbientVisual(season).glassSurface,
      );
      for (const id of ['reflection', 'glint']) {
        const decorations = renderer.root.findAll(node =>
          node.props.testID === `frequent-record-glass-${id}` && node.props.colors,
        );
        expect(decorations).toHaveLength(4);
        for (const decoration of decorations) {
          expect(decoration.props.pointerEvents).toBe('none');
          expect(decoration.props.accessible).toBe(false);
          expect(decoration.props.importantForAccessibility).toBe('no-hide-descendants');
          expect(StyleSheet.flatten(decoration.props.style).position).toBe('absolute');
        }
      }
      const reflection = renderer.root.findAll(node =>
        node.props.testID === 'frequent-record-glass-reflection' && node.props.colors,
      )[0];
      expect(reflection.props.colors).toEqual(HOME_FLOATING_WIDGET_REFLECTION.colors);
      expect(reflection.props.locations).toEqual(HOME_FLOATING_WIDGET_REFLECTION.locations);
      expect(renderer.root.findAll(node =>
        node.props.testID === 'frequent-record-glass-contact-shadow',
      )).toHaveLength(0);
      expect(frequentStyles.grid.rowGap).toBe(10);
      await act(async () => renderer.unmount());
    },
  );

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
    expect(
      buttons.find(node => node.props.accessibilityLabel === '전체 기록 보기'),
    ).toBeUndefined();
    expect(onPressAll).not.toHaveBeenCalled();
    const sheens = renderer.root.findAll(
      node => node.props.testID === 'frequent-record-glass-reflection' && node.props.colors,
    );
    expect(sheens).toHaveLength(4);
    expect(sheens.every(node => node.props.pointerEvents === 'none')).toBe(
      true,
    );
    expect(renderer.root.findAll(
      node => node.props.testID === 'frequent-record-glass-contact-shadow',
    )).toHaveLength(0);
    await act(async () => {
      renderer?.update(
        <ThemeProvider theme={createTheme('light')}>
          <FrequentRecordsSection
            petTheme={buildPetThemePalette('#2563EB')}
            records={[
              {
                id: 'header-ready-record',
                petId: 'header-ready-pet',
                title: '산책',
                tags: [],
                imagePaths: [],
                category: 'walk',
                createdAt: '2026-09-30T00:00:00Z',
              },
            ]}
            recordStatus="ready"
            now={new Date('2026-09-30T00:00:00Z')}
            onPressCategory={onPressCategory}
            onPressAll={onPressAll}
          />
        </ThemeProvider>,
      );
    });
    renderer.root
      .find(
        node =>
          node.props.accessibilityLabel === '전체 기록 보기' &&
          typeof node.props.onPress === 'function',
      )
      .props.onPress();
    expect(onPressAll).toHaveBeenCalledTimes(1);
    await act(async () => renderer?.unmount());
  });

  it('hides actions only for confirmed empty data, not loading or errors', () => {
    expect(isHomeSectionConfirmedEmpty(true, 0)).toBe(true);
    expect(isHomeSectionConfirmedEmpty(false, 0)).toBe(false);
    expect(isHomeSectionConfirmedEmpty(true, null)).toBe(false);
    expect(isHomeSectionConfirmedEmpty(true, 1)).toBe(false);
    for (const status of [
      'idle',
      'loading',
      'refreshing',
      'loadingMore',
      'error',
    ]) {
      expect(isHomeSectionConfirmedEmpty(status === 'ready', 0)).toBe(false);
    }
    expect(source).toContain("isReady={scheduleStatus === 'ready'}");
    expect(source).toContain(
      "isReady={recordStatus === 'ready' && scheduleStatus === 'ready'}",
    );
    expect(source).toContain("totalSummaryState.status === 'ready'");
    expect(source).toContain('currentMonthDiaryEntries.length,');
  });

  it('restores the real list button as soon as data is available', async () => {
    const onPress = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    const renderHeader = (count: number) => (
      <ThemeProvider theme={createTheme('light')}>
        <HomeSectionHeader
          title="이번 달 누리 일기"
          color="#2563EB"
          hideAction={isHomeSectionConfirmedEmpty(true, count)}
          action={{ onPress, accessibilityLabel: '이번 달 일기 전체 보기' }}
        />
      </ThemeProvider>
    );
    await act(async () => {
      renderer = TestRenderer.create(renderHeader(0));
    });
    expect(
      renderer.root.findAllByProps({ testID: 'home-section-empty-status' })
        .length,
    ).toBe(0);
    expect(
      renderer.root.findAll(node => typeof node.props.onPress === 'function'),
    ).toHaveLength(0);
    await act(async () => {
      renderer.update(renderHeader(1));
    });
    expect(
      renderer.root.findAllByProps({ testID: 'home-section-empty-status' }),
    ).toHaveLength(0);
    renderer.root
      .find(
        node =>
          node.props.accessibilityLabel === '이번 달 일기 전체 보기' &&
          typeof node.props.onPress === 'function',
      )
      .props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
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
