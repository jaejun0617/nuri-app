import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import * as RN from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import { HomeSectionHeader } from '../src/components/home/HomeSectionHeader';
import { HomeRecommendationTipArtwork } from '../src/screens/Main/components/LoggedInHome/HomeRecommendationTipArtwork';
import { HOME_ORNAMENT_ATLASES } from '../src/screens/Main/components/LoggedInHome/HomeSeasonalOrnament';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');

const SEASONS: readonly SeasonKey[] = ['spring', 'summer', 'autumn', 'winter'];
const DESCRIPTION = '아이의 건강한 하루를 위한\n맞춤형 팁을 확인해보세요.';

describe('recommendation seasonal header artwork', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(SEASONS)(
    'uses one %s representative without secondary ornaments in its centered inset slot',
    async season => {
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <HomeRecommendationTipArtwork season={season} />,
        );
      });
      const frame = renderer.root.findByProps({
        testID: 'home-recommendation-seasonal-art',
      });
      expect(RN.StyleSheet.flatten(frame.props.style)).toEqual({
        width: 128,
        height: 128,
        marginRight: 24,
        flexShrink: 0,
        alignSelf: 'center',
        overflow: 'hidden',
      });
      expect(frame.props.pointerEvents).toBe('none');
      expect(frame.props.accessible).toBe(false);
      expect(frame.props.accessibilityElementsHidden).toBe(true);
      const main = renderer.root.findAll(
        node =>
          typeof node.type === 'string' &&
          node.props.testID === 'home-recommendation-main',
      )[0];
      expect(RN.StyleSheet.flatten(main.props.style)).toMatchObject({
        left: 6,
        bottom: 6,
        width: 116,
        height: 116,
      });
      expect(renderer.root.findAllByType(RN.Image)).toHaveLength(1);
      const sources = renderer.root
        .findAllByType(RN.Image)
        .map(image => image.props.source);
      for (const other of ['spring', 'summer', 'winter'] as const) {
        if (other !== season)
          expect(sources).not.toContain(HOME_ORNAMENT_ATLASES[other].source);
      }
      if (season === 'summer')
        expect(sources[0]).toBe(
          require('../src/assets/seasonal/home/summer/glass/summer-wave-droplets-glass-v1.png'),
        );
      if (season === 'autumn')
        expect(sources[0]).toBe(
          require('../src/assets/seasonal/home/autumn/glass/autumn-glass-maple-coral-v1.png'),
        );
      expect(renderer.root.findAllByType(RN.Pressable)).toHaveLength(0);
      await act(async () => renderer.unmount());
    },
  );

  it.each(
    [320, 360, 400, 430].flatMap(width =>
      [1, 1.3, 1.5].map(fontScale => ({ width, fontScale })),
    ),
  )(
    'keeps text flexible and the More action independent at $width / $fontScale',
    async ({ width, fontScale }) => {
      jest
        .spyOn(RN, 'useWindowDimensions')
        .mockReturnValue({ width, height: 800, scale: 3, fontScale });
      const onPress = jest.fn();
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <HomeSectionHeader
              title="누리와 함께하는 아주 긴 아이 이름을 위한"
              color="#243044"
              emphasis={{ title: '추천 팁', color: '#2563EB' }}
              description={DESCRIPTION}
              action={{ onPress, accessibilityLabel: '추천 팁 전체 보기' }}
            />
          </ThemeProvider>,
        );
      });
      expect(
        renderer.root.findAllByProps({
          testID: 'home-section-emphasis-with-artwork',
        }),
      ).toHaveLength(0);
      const copy = renderer.root.findAll(
        node =>
          String(node.type) === 'AppText' && node.props.children === '추천 팁',
      )[0].parent;
      if (!copy) throw new Error('Recommendation copy missing');
      expect(RN.StyleSheet.flatten(copy.props.style)).toMatchObject({
        gap: 10,
      });
      expect(RN.StyleSheet.flatten(copy.props.style)).not.toHaveProperty(
        'height',
      );
      expect(
        copy.findAll(
          node => node.props.accessibilityLabel === '추천 팁 전체 보기',
        ),
      ).toHaveLength(0);
      const action = renderer.root.findAll(
        node =>
          node.props.accessibilityLabel === '추천 팁 전체 보기' &&
          typeof node.props.onPress === 'function' &&
          typeof node.props.style === 'function',
      )[0];
      expect(action).toBeDefined();
      action.props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(
        RN.StyleSheet.flatten(action.props.style({ pressed: false })),
      ).toMatchObject({ minHeight: 48 });
      expect(JSON.stringify(renderer.toJSON())).toContain(
        '맞춤형 팁을 확인해보세요.',
      );
      for (const text of copy.findAll(
        node => String(node.type) === 'AppText',
      )) {
        expect(text.props.numberOfLines).toBeUndefined();
      }
      await act(async () => renderer.unmount());
    },
  );

  it('disconnects recommendation artwork and leaves memorial and data contracts intact', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
      ),
      'utf8',
    );
    const section = source.slice(
      source.indexOf('const RecommendationTipsSection'),
      source.indexOf('const TodayRecordsSection'),
    );
    expect(section).not.toContain('HomeRecommendationTipArtwork');
    expect(section).not.toContain('emphasisArtwork');
    expect(section).toContain('함께한 시간을 돌아보는 홈');
    expect(section).not.toContain('getGuideDataSourceLabel');
    expect(section).not.toContain('guideDebugBadge');
    expect(section).toContain('getGuideDataSourceDescription');
    expect(section).toContain('sourceReason');
    const usage = source.slice(
      source.indexOf('<RecommendationTipsSection'),
      source.indexOf('/>', source.indexOf('<RecommendationTipsSection')),
    );
    expect(usage).not.toContain('season={ambientSeason}');
    expect(usage).toContain('onPressMore={onPressGuideList}');
  });
});
