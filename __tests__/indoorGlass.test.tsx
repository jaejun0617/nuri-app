import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import IndoorActivityCard from '../src/components/weather/IndoorActivityCard';
import ActivityGuideHeroCard from '../src/components/weather/ActivityGuideHeroCard';
import {
  ALL_INDOOR_ACTIVITY_KEYS,
  getIndoorActivityGuide,
} from '../src/services/weather/guide';
import { INDOOR_ACTIVITY_ARTWORK } from '../src/components/weather/indoorActivityArtwork';

it('paints the indoor card without changing its dimensions or action', async () => {
  const onPress = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <IndoorActivityCard
        item={getIndoorActivityGuide('training')}
        onPress={onPress}
      />,
    );
  });
  try {
    const touch = tree.root.findByType(TouchableOpacity);
    expect(StyleSheet.flatten(touch.props.style)).toMatchObject({
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 14,
      borderWidth: 1,
    });
    const paint = tree.root
      .findAllByType(View)
      .find(node => node.props.testID === 'indoor-activity-glass');
    expect(paint?.props.pointerEvents).toBe('none');
    expect(StyleSheet.flatten(paint?.props.style)).toMatchObject({
      position: 'absolute',
      top: 0,
      bottom: 0,
    });
    await act(async () => touch.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => tree.unmount());
  }
});
it('reuses menu glass and preserves the full artwork aspect ratio', async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  const guide = getIndoorActivityGuide('training');
  await act(async () => {
    tree = TestRenderer.create(<ActivityGuideHeroCard guide={guide} />);
  });
  try {
    const glass = [
      'activity-guide-hero-glass',
      'activity-guide-content-glass',
    ].map(id =>
      tree.root.findAllByType(View).find(node => node.props.testID === id),
    );
    expect(
      glass.map(node => StyleSheet.flatten(node?.props.style).borderRadius),
    ).toEqual([34, 28]);
    expect(JSON.stringify(tree.toJSON())).toContain(guide.title);
    expect(JSON.stringify(tree.toJSON())).toContain(guide.subtitle);
    const panel = tree.root
      .findAllByType(View)
      .find(node => StyleSheet.flatten(node.props.style)?.aspectRatio === 3 / 2);
    expect(StyleSheet.flatten(panel?.props.style)).toMatchObject({
      borderRadius: 34,
      overflow: 'hidden',
      width: '100%',
      aspectRatio: 3 / 2,
    });
  } finally {
    await act(async () => tree.unmount());
  }
});

it.each(ALL_INDOOR_ACTIVITY_KEYS)(
  'connects matching local hero and thumbnail for %s',
  async key => {
    let tree!: TestRenderer.ReactTestRenderer;
    const guide = getIndoorActivityGuide(key);
    await act(async () => {
      tree = TestRenderer.create(
        <View>
          <IndoorActivityCard item={guide} onPress={jest.fn()} />
          <ActivityGuideHeroCard guide={guide} />
        </View>,
      );
    });
    try {
      const images = tree.root.findAllByType(Image);
      const thumbnail = images.find(
        node => node.props.testID === `indoor-thumbnail-${key}`,
      );
      const hero = images.find(
        node => node.props.testID === `activity-guide-image-${key}`,
      );
      expect(thumbnail?.props.source).toBe(INDOOR_ACTIVITY_ARTWORK[key]);
      expect(hero?.props.source).toBe(INDOOR_ACTIVITY_ARTWORK[key]);
      expect(thumbnail?.props.resizeMode).toBe('cover');
      expect(hero?.props.resizeMode).toBe('contain');
      expect(StyleSheet.flatten(thumbnail?.props.style)).toMatchObject({
        width: '100%',
        height: '100%',
      });
      expect(StyleSheet.flatten(hero?.props.style)).toMatchObject({
        width: '100%',
        height: '100%',
      });
      expect(hero?.props.accessibilityLabel).toBe(
        `${guide.title}을 하는 말티즈 일러스트`,
      );
    } finally {
      await act(async () => tree.unmount());
    }
  },
);
