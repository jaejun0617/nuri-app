import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import GuideRecommendationCard from '../src/components/guides/GuideRecommendationCard';
import { HOME_WIDGET_MATERIAL } from '../src/components/home/HomeWidgetMaterial';
import type { PetCareGuide } from '../src/services/guides/types';

const guide: PetCareGuide = {
  id: 'home-glass-guide',
  slug: 'home-glass-guide',
  title: '생활 환경을 점검해요',
  summary: '종별 온도와 습도 기준을 확인해요.',
  body: null,
  bodyPreview: '생활 환경 점검',
  category: 'environment',
  tags: ['환경', ' 온도 ', '환경', '습도', '안전'],
  targetSpecies: ['REPTILE'],
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
  publishedAt: '2026-09-30T00:00:00Z',
  createdAt: '2026-09-30T00:00:00Z',
  updatedAt: '2026-09-30T00:00:00Z',
};

async function renderCard(value: PetCareGuide = guide) {
  const onPress = jest.fn();
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <GuideRecommendationCard
          guide={value}
          accentColor="#2563EB"
          accentDeepColor="#174BA8"
          tintColor="#E9F1FF"
          onPress={onPress}
        />
      </ThemeProvider>,
    );
  });
  if (!renderer) throw new Error('Guide card missing');
  return { renderer, onPress };
}

describe('Home nested guide glass', () => {
  it('uses a quoted marker heading without the former decorative image area', async () => {
    const { renderer } = await renderCard();
    const glyphs = renderer.root.findAllByType(Text).filter(node => StyleSheet.flatten(node.props.style)?.fontFamily === 'NuriIcons');
    expect(glyphs).toHaveLength(0);
    expect(renderer.root.findAll(node => StyleSheet.flatten(node.props.style)?.width === 60)).toHaveLength(0);
    expect(StyleSheet.flatten(renderer.root.findByType(TouchableOpacity).props.style).padding).toBe(16);
    await act(async () => renderer.unmount());
  });
  it('retains glass reflection and navigation without a bottom shadow or dark rim', async () => {
    const { renderer, onPress } = await renderCard();
    const button = renderer.root.findByType(TouchableOpacity);
    expect(StyleSheet.flatten(button.props.style)).toMatchObject(
      HOME_WIDGET_MATERIAL,
    );
    expect(button.props.accessibilityLabel).toBe(
      '환경, 생활 환경을 점검해요, 상세 보기',
    );
    button.props.onPress();
    expect(onPress).toHaveBeenCalledWith(guide.id);
    const cardStyle = StyleSheet.flatten(button.props.style);
    expect(cardStyle.shadowOpacity).toBe(0);
    expect(cardStyle.elevation).toBe(0);
    expect(cardStyle.borderBottomColor).toBeUndefined();
    const sheen = renderer.root.find(
      node => node.props.testID === 'home-widget-sheen' && node.props.colors,
    );
    expect(sheen.props.colors).toEqual([
      'rgba(255, 255, 255, 0.14)',
      'rgba(255, 255, 255, 0.03)',
    ]);
    expect(sheen.props.pointerEvents).toBe('none');
    expect(sheen.props.accessible).toBe(false);
    await act(async () => renderer.unmount());
  });

  it.each([
    { targetSpecies: guide.targetSpecies, caption: '파충류 · 전 연령' },
    { targetSpecies: [], caption: '공통 · 전 연령' },
  ])('omits $caption while keeping the real summary and tags', async ({
    targetSpecies,
    caption,
  }) => {
    const { renderer } = await renderCard({ ...guide, targetSpecies });
    const texts = renderer.root
      .findAll(
        node => node.props.preset && typeof node.props.children === 'string',
      )
      .map(node => node.props.children);
    expect(texts).toContain(`“${guide.title}”`);
    expect(texts).toContain(guide.summary);
    expect(texts).not.toContain(caption);
    expect(
      texts.filter(value => typeof value === 'string' && value.startsWith('#')),
    ).toEqual(['#환경', '#온도', '#습도']);
    await act(async () => renderer.unmount());
  });

  it('does not manufacture sample tags when the catalog has none', async () => {
    const { renderer } = await renderCard({ ...guide, tags: [] });
    expect(
      renderer.root
        .findAll(node => node.props.preset)
        .some(
          node =>
            typeof node.props.children === 'string' &&
            node.props.children.startsWith('#'),
        ),
    ).toBe(false);
    await act(async () => renderer.unmount());
  });

  it('keeps long content flexible rather than fixing the card to mockup coordinates', async () => {
    const { renderer } = await renderCard({
      ...guide,
      title: '우리 아이의 생활 환경과 건강 상태를 함께 확인하는 긴 추천 제목',
      tags: ['매우긴생활환경점검태그와온습도기준'],
    });
    const card = renderer.root.findByType(TouchableOpacity);
    const style = StyleSheet.flatten(card.props.style);
    expect(style.height).toBeUndefined();
    expect(style.width).toBeUndefined();
    const content = renderer.root.findAllByType(View).find(node => {
      const value = StyleSheet.flatten(node.props.style);
      return value?.flex === 1 && value?.minWidth === 0;
    });
    expect(content).toBeDefined();
    const title = renderer.root
      .findAll(
        node => node.props.preset && typeof node.props.children === 'string',
      )
      .find(node => node.props.children.startsWith('“우리 아이의'));
    expect(title).toBeDefined();
    expect(title?.props.numberOfLines).toBeUndefined();
    await act(async () => renderer.unmount());
  });
});
