// 파일: src/components/weather/ActivityGuideHeroCard.tsx
// 역할:
// - 활동 가이드 상단 히어로 영역을 공통 레이아웃으로 제공

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

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
      <LinearGradient colors={guide.heroBackground} style={styles.heroPanel} />

      <View style={styles.contentCard}>
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
  wrap: {
    gap: 14,
  },
  heroPanel: {
    height: 172,
    borderRadius: 34,
    overflow: 'hidden',
  },
  contentCard: {
    marginHorizontal: 2,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.05)',
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
