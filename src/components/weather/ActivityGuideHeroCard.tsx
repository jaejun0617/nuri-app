// 파일: src/components/weather/ActivityGuideHeroCard.tsx
// 역할:
// - 활동 가이드 상단 히어로 영역을 공통 레이아웃으로 제공

import { ResponsiveNativeText as Text } from '../../app/ui/ResponsiveNativeText';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { MenuGlassSurface, MENU_GLASS_FRAME } from '../common/MenuGlassSurface';
import { INDOOR_ACTIVITY_ARTWORK } from './indoorActivityArtwork';

import type { IndoorActivityGuide } from '../../services/weather/guide';

type Props = {
  guide: IndoorActivityGuide;
  accentColor?: string;
};

export default React.memo(function ActivityGuideHeroCard({
  guide,
  accentColor = '#7A45F4',
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.heroPanel}>
        <MenuGlassSurface radius={34} testID="activity-guide-hero-glass" />
        <Image
          testID={`activity-guide-image-${guide.key}`}
          source={INDOOR_ACTIVITY_ARTWORK[guide.key]}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={`${guide.title}을 하는 말티즈 일러스트`}
        />
      </View>

      <View style={styles.contentCard}>
        <MenuGlassSurface radius={28} testID="activity-guide-content-glass" />
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{guide.badge}</Text>
          <Text style={[styles.accent, { color: accentColor }]}>
            {guide.accentLabel}
          </Text>
        </View>
        <Text style={styles.title}>{guide.title}</Text>
        <Text style={styles.subtitle}>{guide.subtitle}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  wrap: {
    gap: 14,
  },
  heroPanel: {
    aspectRatio: 3 / 2,
    width: '100%',
    borderRadius: 34,
    overflow: 'hidden',
  },
  contentCard: {
    marginHorizontal: 2,
    borderRadius: 28,
    ...MENU_GLASS_FRAME,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    gap: 7,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    fontSize: 10,
    lineHeight: 14,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  accent: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    color: '#182133',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 19,
    color: '#7A8598',
    fontWeight: '400',
  },
});
