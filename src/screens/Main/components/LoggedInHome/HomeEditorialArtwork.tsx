import React, { memo } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import type { HomeCommunityTab } from '../../../../services/home/communityHighlights';
import type { SeasonKey } from '../../../../theme/seasonal/season';

export type HomeEditorialArtKind =
  | 'today-tip'
  | 'recent'
  | `community-${HomeCommunityTab}`;

export const HOME_EDITORIAL_ART: Readonly<
  Record<HomeEditorialArtKind, Readonly<Record<SeasonKey, ImageSourcePropType>>>
> = {
  'today-tip': {
    autumn: require('../../../../assets/seasonal/home/editorial/today-tip-autumn-v1.png'),
    winter: require('../../../../assets/seasonal/home/editorial/today-tip-winter-v1.png'),
    spring: require('../../../../assets/seasonal/home/editorial/today-tip-spring-v1.png'),
    summer: require('../../../../assets/seasonal/home/editorial/today-tip-summer-v1.png'),
  },
  recent: {
    autumn: require('../../../../assets/seasonal/home/editorial/recent-autumn-v1.png'),
    winter: require('../../../../assets/seasonal/home/editorial/recent-winter-v1.png'),
    spring: require('../../../../assets/seasonal/home/editorial/recent-spring-v1.png'),
    summer: require('../../../../assets/seasonal/home/editorial/recent-summer-v1.png'),
  },
  'community-popular': {
    autumn: require('../../../../assets/seasonal/home/editorial/community-popular-autumn-v1.png'),
    winter: require('../../../../assets/seasonal/home/editorial/community-popular-winter-v1.png'),
    spring: require('../../../../assets/seasonal/home/editorial/community-popular-spring-v1.png'),
    summer: require('../../../../assets/seasonal/home/editorial/community-popular-summer-v1.png'),
  },
  'community-question': {
    autumn: require('../../../../assets/seasonal/home/editorial/community-question-autumn-v1.png'),
    winter: require('../../../../assets/seasonal/home/editorial/community-question-winter-v1.png'),
    spring: require('../../../../assets/seasonal/home/editorial/community-question-spring-v1.png'),
    summer: require('../../../../assets/seasonal/home/editorial/community-question-summer-v1.png'),
  },
  'community-info': {
    autumn: require('../../../../assets/seasonal/home/editorial/community-info-autumn-v1.png'),
    winter: require('../../../../assets/seasonal/home/editorial/community-info-winter-v1.png'),
    spring: require('../../../../assets/seasonal/home/editorial/community-info-spring-v1.png'),
    summer: require('../../../../assets/seasonal/home/editorial/community-info-summer-v1.png'),
  },
  'community-daily': {
    autumn: require('../../../../assets/seasonal/home/editorial/community-daily-autumn-v1.png'),
    winter: require('../../../../assets/seasonal/home/editorial/community-daily-winter-v1.png'),
    spring: require('../../../../assets/seasonal/home/editorial/community-daily-spring-v1.png'),
    summer: require('../../../../assets/seasonal/home/editorial/community-daily-summer-v1.png'),
  },
  'community-free': {
    autumn: require('../../../../assets/seasonal/home/editorial/community-free-autumn-v1.png'),
    winter: require('../../../../assets/seasonal/home/editorial/community-free-winter-v1.png'),
    spring: require('../../../../assets/seasonal/home/editorial/community-free-spring-v1.png'),
    summer: require('../../../../assets/seasonal/home/editorial/community-free-summer-v1.png'),
  },
};

export const HomeEditorialArtwork = memo(function HomeEditorialArtworkView({
  kind,
  season,
  onReady,
}: {
  kind: HomeEditorialArtKind;
  season: SeasonKey;
  onReady?: () => void;
}) {
  const community = kind.startsWith('community-');
  const recent = kind === 'recent';
  return (
    <View
      testID={`home-${kind}-art-frame`}
      style={[
        styles.frame,
        community ? styles.community : recent ? styles.recent : styles.memo,
      ]}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        key={`${kind}:${season}`}
        testID={`home-${kind}-art`}
        source={HOME_EDITORIAL_ART[kind][season]}
        resizeMode="contain"
        fadeDuration={0}
        onLoad={onReady}
        onError={onReady}
        style={[styles.image, recent ? styles.recentImage : null]}
        accessible={false}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
});

export const styles = StyleSheet.create({
  // The slot owns layout; source PNG dimensions never determine section height.
  frame: { alignSelf: 'center', flexShrink: 0, overflow: 'hidden' },
  memo: { width: '30%', maxWidth: 108, aspectRatio: 1 },
  // Reserve the wider paint area without increasing the original row height.
  recent: {
    width: '37.5%',
    maxWidth: 135,
    aspectRatio: 1.25,
    marginRight: 16,
    overflow: 'visible',
  },
  community: { width: '62%', maxWidth: 190, aspectRatio: 1.5 },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  recentImage: { top: '-10%', left: '2%', width: '96%', height: '120%' },
});
