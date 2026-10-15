import React from 'react';
import { StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import {
  HomePetBasicInfoSection,
  type HomePetBasicInfoValues,
} from '../src/screens/Main/components/LoggedInHome/HomePetBasicInfoSection';
import { styles as homeStyles } from '../src/screens/Main/components/LoggedInHome/LoggedInHome.styles';
import type { SeasonKey } from '../src/theme/seasonal/season';

jest.mock('../src/app/ui/AppText', () => 'AppText');

describe('Home profile sheet basic information', () => {
  const info: HomePetBasicInfoValues = {
    breed: '말티즈',
    age: '7살',
    weight: '6kg',
    gender: '남아',
  };
  const renderers: TestRenderer.ReactTestRenderer[] = [];

  async function renderInfo(
    values: HomePetBasicInfoValues = info,
    season: SeasonKey = 'autumn',
  ) {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <HomePetBasicInfoSection info={values} season={season} />,
      );
    });
    renderers.push(renderer);
    return renderer;
  }

  afterEach(async () => {
    for (const renderer of renderers.splice(0)) {
      await act(async () => renderer.unmount());
    }
  });

  it('shows a leading pet icon with the approved introduction above its compact summary', async () => {
    const renderer = await renderInfo();
    const root = renderer.root.findAll(node => node.type === View && node.props.testID === 'home-profile-basic-info')[0];
    expect(root.props.accessibilityLabel).toBe('이런 아이에요, 품종 말티즈, 나이 7살, 몸무게 6kg, 성별 남아');
    expect(root.findAll(node => node.props.name === 'pet' && node.props.size === 16).length).toBeGreaterThan(0);
    const summary = root.findByProps({ testID: 'home-profile-basic-summary' });
    expect(summary.props.children).toBe('말티즈 · 7살 · 6kg · 남아');
    expect(summary.props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(summary.props.style)).toMatchObject({ fontSize: 12, lineHeight: 18 });
    expect(StyleSheet.flatten(summary.props.style).flex).toBeUndefined();
    const title = root.findByProps({ testID: 'home-profile-intro-title' });
    expect(title.props.children).toBe('이런 아이에요');
    expect(title.parent).toBe(summary.parent);
    expect(StyleSheet.flatten(summary.parent?.props.style)).toMatchObject({ flexDirection: 'column', alignItems: 'stretch', gap: 2 });
  });

  it('retains empty rows with an explicit unentered value', async () => {
    const renderer = await renderInfo({ breed: null, age: '', weight: '  ', gender: null });
    const summary = renderer.root.findByProps({ testID: 'home-profile-basic-summary' });
    expect(summary.props.children).toBe('미입력 · 미입력 · 미입력 · 미입력');
  });

  it('keeps a long breed readable and receives newly selected pet values without a stale snapshot', async () => {
    const longBreed = '아주 긴 품종 이름도 잘리지 않고 모두 표시되는 반려동물';
    const renderer = await renderInfo({ ...info, breed: longBreed });
    const value = renderer.root.findByProps({ testID: 'home-profile-basic-summary' });
    expect(value.props.children).toBe(`${longBreed} · 7살 · 6kg · 남아`);
    expect(value.props.numberOfLines).toBeUndefined();
    expect(value.props.allowFontScaling).not.toBe(false);
    await act(async () => renderer.update(
      <HomePetBasicInfoSection info={{ breed: '푸들', age: '2살', weight: '4kg', gender: '여아' }} season="winter" />,
    ));
    expect(renderer.root.findByProps({ testID: 'home-profile-basic-summary' }).props.children).toBe('푸들 · 2살 · 4kg · 여아');
  });

  it.each<SeasonKey>(['spring', 'summer', 'autumn', 'winter'])(
    'reuses the existing %s sheet item surface without changing the other list styles',
    async season => {
      const renderer = await renderInfo(info, season);
      const root = renderer.root.findAll(node => node.type === View && node.props.testID === 'home-profile-basic-info')[0];
      const seasonalStyle = season === 'winter' ? homeStyles.winterProfileSheetRow
        : season === 'spring' ? homeStyles.springProfileSheetRow
        : season === 'summer' ? homeStyles.summerProfileSheetRow
        : homeStyles.profileSheetRow;
      expect(StyleSheet.flatten(root.props.style)).toMatchObject({
        backgroundColor: seasonalStyle.backgroundColor,
        borderColor: seasonalStyle.borderColor,
        borderRadius: homeStyles.profileSheetRow.borderRadius,
        paddingLeft: 14,
        paddingRight: 14,
        marginBottom: 9,
        flexDirection: 'row',
      });
    },
  );
});
