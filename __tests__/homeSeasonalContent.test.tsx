import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import ReactNative, { StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import { HomeSeasonProvider } from '../src/components/home/HomeSeasonContext';
import { HomeHeroInfoPanel } from '../src/screens/Main/components/LoggedInHome/HomeHeroInfoPanel';
import {
  TodayHomeTipSection,
  TODAY_HOME_TIP,
} from '../src/screens/Main/components/LoggedInHome/HomeEditorialStates';
import { HomeEmptySectionState } from '../src/screens/Main/components/LoggedInHome/HomeEmptySectionState';
import { MonthlyDiaryEmptyState } from '../src/screens/Main/components/LoggedInHome/MonthlyDiaryEmptyState';
import { HomeHealthActivityList } from '../src/screens/Main/components/LoggedInHome/HomePopulatedLists';
import { FrequentRecordsSection } from '../src/components/records/FrequentRecordsSection';
import GuideRecommendationCard from '../src/components/guides/GuideRecommendationCard';
import {
  NEUTRAL_UI_PALETTE,
  buildPetThemePalette,
} from '../src/services/pets/themePalette';
import { HOME_SEASONAL_BACKGROUND_GRADIENTS } from '../src/theme/home/seasonalAmbient';
import type { PetCareGuide } from '../src/services/guides/types';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/app/ui/MarkerText', () => 'AppText');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => false,
}));

const COLORS = {
  spring: '#62505A',
  summer: '#405A56',
  autumn: '#625448',
  winter: '#4A5968',
} as const;
const guide: PetCareGuide = {
  id: 'qa-guide',
  slug: 'qa-guide',
  title: '생활 환경을 점검해요',
  summary: '설명은 기존 회색을 유지해요.',
  body: null,
  bodyPreview: '',
  category: 'environment',
  tags: ['환경'],
  targetSpecies: [],
  speciesKeywords: [],
  searchKeywords: [],
  contentBlocks: [],
  sources: [],
  agePolicy: { type: 'all', lifeStage: null, minMonths: null, maxMonths: null },
  status: 'published',
  isActive: true,
  priority: 1,
  sortOrder: 0,
  rotationWeight: 1,
  image: null,
  publishedAt: null,
  createdAt: '',
  updatedAt: '',
};
const noop = () => {};

function content(season?: SeasonKey, petTheme = NEUTRAL_UI_PALETTE) {
  return (
    <ThemeProvider theme={createTheme('light')}>
      <HomeSeasonProvider season="autumn" headingSeason={season}>
        <HomeHeroInfoPanel
          petTheme={petTheme}
          profilePetName="누리"
          titleBadge="산책 새싹"
          togetherDays={3517}
          hasMultiplePets={false}
          onPressPetSelect={noop}
          onPressProfileInfo={noop}
          onPressPetProfileEdit={noop}
        />
        <FrequentRecordsSection
          petTheme={NEUTRAL_UI_PALETTE}
          records={[]}
          recordStatus="ready"
          onPressCategory={noop}
          onPressAll={noop}
        />
        <TodayHomeTipSection
          season="autumn"
          accentColor={NEUTRAL_UI_PALETTE.primary}
        />
        <HomeHealthActivityList
          items={[
            {
              id: 'qa-health',
              source: 'memory',
              ymd: '2026-10-17',
              kind: 'checkup',
              title: '저장한 건강 기록',
              subtitle: '건강 기록 설명',
              iconName: 'heart',
            },
          ]}
          accentColor={NEUTRAL_UI_PALETTE.primary}
          onPress={noop}
        />
        <GuideRecommendationCard
          guide={guide}
          accentColor={NEUTRAL_UI_PALETTE.primary}
          accentDeepColor={NEUTRAL_UI_PALETTE.deep}
          tintColor={NEUTRAL_UI_PALETTE.tint}
          onPress={noop}
        />
        <HomeEmptySectionState
          kind="health"
          season="autumn"
          dataState="ready"
          accentDeepColor={NEUTRAL_UI_PALETTE.deep}
          onPressAction={noop}
        />
        <MonthlyDiaryEmptyState
          season="autumn"
          recordStatus="ready"
          accentDeepColor={NEUTRAL_UI_PALETTE.deep}
          onPressRecord={noop}
        />
      </HomeSeasonProvider>
    </ThemeProvider>
  );
}

function text(renderer: TestRenderer.ReactTestRenderer, copy: string) {
  return renderer.root.findAll(
    node => String(node.type) === 'AppText' && node.props.children === copy,
  )[0];
}
function color(renderer: TestRenderer.ReactTestRenderer, copy: string) {
  const node = text(renderer, copy);
  expect(node).toBeDefined();
  return StyleSheet.flatten(node.props.style)?.color ?? node.props.color;
}
function luminance(hex: string) {
  const values = [1, 3, 5]
    .map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

describe('Home muted seasonal content, not a global body or CTA tint', () => {
  beforeEach(() => {
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 384, height: 800, scale: 3, fontScale: 1 });
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(
    (Object.keys(COLORS) as SeasonKey[]).flatMap(season =>
      [1, 1.3].map(fontScale => ({ season, fontScale })),
    ),
  )(
    '$season font $fontScale changes primary content only, preserving copy, sizing, CTA and captions',
    async ({ season, fontScale }) => {
      jest.mocked(ReactNative.useWindowDimensions).mockReturnValue({
        width: fontScale === 1 ? 384 : 320,
        height: 800,
        scale: 3,
        fontScale,
      });
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(content());
      });
      const primary = [
        '산책',
        TODAY_HOME_TIP.title,
        '저장한 건강 기록',
        '검진',
        '“생활 환경을 점검해요”',
        '환경',
        '#환경',
        '아직 건강 기록이 없어요',
        '이번 달 일기가 아직 없어요',
      ];
      const typography = primary.map(copy => ({
        copy,
        style: {
          ...StyleSheet.flatten(text(renderer, copy).props.style),
          color: undefined,
        },
      }));
      const cta = color(renderer, '프로필 수정하기');
      const caption = color(renderer, guide.summary);
      await act(async () => renderer.update(content(season)));
      for (const { copy, style } of typography) {
        expect(color(renderer, copy)).toBe(COLORS[season]);
        expect({
          ...StyleSheet.flatten(text(renderer, copy).props.style),
          color: undefined,
        }).toEqual(style);
      }
      expect(color(renderer, '프로필 수정하기')).toBe(cta);
      expect(color(renderer, '누리')).toBe(NEUTRAL_UI_PALETTE.primary);
      expect(color(renderer, '산책 새싹')).toBe(NEUTRAL_UI_PALETTE.primary);
      expect(color(renderer, guide.summary)).toBe(caption);
      expect(color(renderer, '건강 기록 설명')).toBe(
        createTheme('light').colors.textMuted,
      );
      expect(color(renderer, '2026.10.17')).toBe(
        createTheme('light').colors.textMuted,
      );
      await act(async () => renderer.update(content()));
      expect(color(renderer, '누리')).toBe(NEUTRAL_UI_PALETTE.primary);
      await act(async () => renderer.unmount());
    },
  );

  it.each(['#6D6AF8', '#14B8A6'])(
    'uses Hero user theme %s for the title, pet name and together-time, independently of seasons',
    async themeColor => {
      const petTheme = buildPetThemePalette(themeColor);
      let renderer!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = TestRenderer.create(content('spring', petTheme));
      });
      for (const season of Object.keys(COLORS) as SeasonKey[]) {
        await act(async () => renderer.update(content(season, petTheme)));
        expect(color(renderer, '누리')).toBe(themeColor);
        expect(color(renderer, '산책 새싹')).toBe(themeColor);
        const together = renderer.root.findByProps({
          testID: 'home-hero-together',
        });
        const texts = together.findAll(node => String(node.type) === 'AppText');
        expect(texts).toHaveLength(3);
        for (const item of texts)
          expect(StyleSheet.flatten(item.props.style).color).toBe(themeColor);
        expect(color(renderer, TODAY_HOME_TIP.title)).toBe(COLORS[season]);
        expect(color(renderer, '프로필 수정하기')).toBe(
          NEUTRAL_UI_PALETTE.primary,
        );
      }
      const nextTheme = buildPetThemePalette('#EC4899');
      await act(async () => renderer.update(content('winter', nextTheme)));
      expect(color(renderer, '누리')).toBe(nextTheme.primary);
      expect(color(renderer, '산책 새싹')).toBe(nextTheme.primary);
      await act(async () => renderer.unmount());
    },
  );

  it.each(Object.keys(COLORS) as SeasonKey[])(
    '%s keeps at least 4.5:1 against every fixed background stop',
    season => {
      for (const background of HOME_SEASONAL_BACKGROUND_GRADIENTS[season]) {
        expect(
          (luminance(background) + 0.05) / (luminance(COLORS[season]) + 0.05),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it('uses the Home content style for the internal recent and diary titles without tinting their dates', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
      ),
      'utf8',
    );
    const recent = source.slice(
      source.indexOf('const HomeRecentRecordRow'),
      source.indexOf('const EMPTY_RECORD_ITEMS'),
    );
    const diary = source.slice(
      source.indexOf('const MonthlyDiaryCard'),
      source.indexOf('const HomeWeatherSection'),
    );
    expect(recent.includes('useHomeContentTextStyle()')).toBe(true);
    expect(
      recent.includes(
        'style={[styles.recentRecordCategory, contentTextStyle]}',
      ),
    ).toBe(true);
    expect(recent.includes('style={styles.recentRecordTime}')).toBe(true);
    expect(
      diary.includes('style={[styles.monthDiaryTitle, contentTextStyle]}'),
    ).toBe(true);
    expect(diary.includes('style={styles.monthDiaryMeta}')).toBe(true);
  });
});
