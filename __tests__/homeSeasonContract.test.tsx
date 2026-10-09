import fs from 'node:fs';
import path from 'node:path';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import TestRenderer from 'react-test-renderer';

import { HomeSectionGlassSurface } from '../src/components/home/HomeSectionGlass';
import {
  HomeSeasonProvider,
  useHomeSeason,
} from '../src/components/home/HomeSeasonContext';
import {
  getHomeAmbientVisual,
  HOME_FOREGROUND_UI_SEASON,
} from '../src/theme/home/seasonalAmbient';
import { HomeAmbientBubbleCanvas } from '../src/screens/Main/components/LoggedInHome/HomeAmbientBubbleCanvas';
import * as calendarSeason from '../src/theme/seasonal/season';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');

const SEASONS: readonly SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];

describe('approved Home season contract', () => {
  afterEach(() => jest.restoreAllMocks());

  it('changes atmosphere without changing approved glass, remounting content or changing the calendar', async () => {
    jest
      .spyOn(calendarSeason, 'getSeasonalThemeKey')
      .mockReturnValue('autumn');
    const mounted = jest.fn();
    const unmounted = jest.fn();
    function Content() {
      useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return <View testID="preserved-content" style={{ height: 300 }} />;
    }
    const render = (season: SeasonKey) => (
      <HomeSeasonProvider season={HOME_FOREGROUND_UI_SEASON}>
        <HomeAmbientBubbleCanvas season={season} heroHeight={704} />
        <HomeSectionGlassSurface />
        <Content />
      </HomeSeasonProvider>
    );
    let renderer!: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(render('autumn'));
    });
    for (const season of SEASONS) {
      await TestRenderer.act(async () => renderer.update(render(season)));
      const glass = renderer.root
        .findAllByType(View)
        .find(node => node.props.testID === 'home-section-glass-surface');
      expect(glass).toBeDefined();
      expect(StyleSheet.flatten(glass?.props.style)).toMatchObject({
        backgroundColor: getHomeAmbientVisual(HOME_FOREGROUND_UI_SEASON)
          .glassSurface,
        borderRadius: 22,
        elevation: 0,
        shadowOpacity: 0,
      });
      expect(glass?.props.pointerEvents).toBe('none');
      expect(
        renderer.root.findByProps({ testID: 'preserved-content' }).props.style
          .height,
      ).toBe(300);
    }
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    expect(calendarSeason.getSeasonalThemeKey()).toBe('autumn');
    await TestRenderer.act(async () => renderer.unmount());
  });

  it.each(SEASONS)(
    'uses the calendar %s background without a manual override',
    async season => {
      jest.spyOn(calendarSeason, 'getSeasonalThemeKey').mockReturnValue(season);
      function HomeAtmosphere() {
        return (
          <HomeSeasonProvider season={HOME_FOREGROUND_UI_SEASON}>
            <HomeAmbientBubbleCanvas
              season={calendarSeason.getSeasonalThemeKey()}
              heroHeight={704}
            />
            <HomeSectionGlassSurface />
          </HomeSeasonProvider>
        );
      }
      let renderer!: TestRenderer.ReactTestRenderer;
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(<HomeAtmosphere />);
      });
      const canvas = renderer.root.findByProps({
        testID: 'home-ambient-bubble-canvas',
      });
      expect(StyleSheet.flatten(canvas.props.style).backgroundColor).toBe(
        getHomeAmbientVisual(season).canvasGradient[0],
      );
      const surface = renderer.root.findByProps({
        testID: 'home-section-glass-surface',
      });
      expect(StyleSheet.flatten(surface.props.style).backgroundColor).toBe(
        getHomeAmbientVisual(HOME_FOREGROUND_UI_SEASON).glassSurface,
      );
      await TestRenderer.act(async () => renderer.unmount());
    },
  );

  it('uses automatic season selection outside the Home provider', async () => {
    jest.spyOn(calendarSeason, 'getSeasonalThemeKey').mockReturnValue('winter');
    function Probe() {
      return <View testID={useHomeSeason()} />;
    }
    let renderer!: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
    expect(renderer.root.findByProps({ testID: 'winter' })).toBeDefined();
    await TestRenderer.act(async () => renderer.unmount());
  });

  it('temporarily shares the review selection across canvas and empty art without changing the foreground', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../src/screens/Main/components/LoggedInHome/LoggedInHome.tsx',
      ),
      'utf8',
    );
    expect(source).not.toContain('HomeDiarySeasonReviewControls');
    expect(source).not.toContain('diaryReviewSeason');
    expect(source).not.toContain('setDiaryReviewSeason');
    expect(source).not.toContain('HOME_SEASON_QA_OVERRIDE');
    expect(source).toContain('season: ambientSeason, setOverride: setSeasonOverride');
    expect(source).not.toContain('useState<SeasonKey | null>');
    expect(source).toContain('<HomeSeasonReviewControls');
    expect(source).toContain('onChange={setReviewSeason}');
    expect(source).toContain(
      'getSeasonalHomeVisual(HOME_FOREGROUND_UI_SEASON)',
    );
    expect(source).toContain('season={ambientSeason}');
    expect(source).toContain('ambientSeason={ambientSeason}');
    expect(source).toContain(
      'season={HOME_FOREGROUND_UI_SEASON}',
    );
  });
});
