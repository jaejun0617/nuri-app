// 파일: src/components/weather/ActivityGuideHeroCard.tsx
// 역할:
// - 활동 가이드 상단 히어로 영역을 공통 레이아웃으로 제공

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
      <LinearGradient colors={guide.heroBackground} style={styles.heroPanel}>
        <Text style={styles.heroEmoji}>{guide.heroEmoji}</Text>
        <View style={styles.heroIconCircle}>
          <MaterialCommunityIcons
            name={guide.heroIcon as never}
            size={36}
            color={accentColor}
          />
        </View>
      </LinearGradient>

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
    gap: 16,
  },
  heroPanel: {
    height: 230,
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroEmoji: {
    position: 'absolute',
    top: 22,
    left: 22,
    fontSize: 28,
  },
  heroIconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCard: {
    marginTop: -44,
    marginHorizontal: 12,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.05)',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    fontSize: 11,
    lineHeight: 15,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  accent: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    color: '#182133',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#7A8598',
    fontWeight: '400',
  },
});
