import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from '../icons/NuriFeatherIcon';

import AppText from '../../app/ui/AppText';
import MarkerText from '../../app/ui/MarkerText';
import {
  getGuideCategoryLabel,
} from '../../services/guides/presentation';
import type { PetCareGuide } from '../../services/guides/types';
import {
  HOME_WIDGET_MATERIAL,
  HomeWidgetSheen,
} from '../home/HomeWidgetMaterial';

type Props = {
  guide: PetCareGuide;
  accentColor: string;
  accentDeepColor: string;
  tintColor: string;
  onPress: (guideId: string) => void;
  debugBadgeText?: string | null;
};

function GuideRecommendationCardBase({
  guide,
  accentColor,
  accentDeepColor,
  onPress,
  debugBadgeText,
}: Props) {
  // Keep the catalog's metadata; the mockup's sample copy is not content.
  const tags = useMemo(
    () =>
      Array.from(
        new Set(guide.tags.map(tag => tag.trim()).filter(Boolean)),
      ).slice(0, 3),
    [guide.tags],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.card}
      onPress={() => onPress(guide.id)}
      accessibilityRole="button"
      accessibilityLabel={`${getGuideCategoryLabel(guide.category)}, ${
        guide.title
      }, 상세 보기`}
      testID="home-guide-glass-card"
    >
      <HomeWidgetSheen radius={22} />
      <View style={styles.header}>
        <View style={styles.content}>
          <AppText
            preset="unifiedMeta"
            style={[styles.eyebrow, { color: accentColor }]}
          >
            {getGuideCategoryLabel(guide.category)}
          </AppText>
          <MarkerText
            preset="unifiedBody"
            styleOverridesPreset
            style={styles.title}
          >
            {`“${guide.title}”`}
          </MarkerText>
        </View>
        <View style={styles.chevron} pointerEvents="none">
          <Feather name="chevron-right" size={20} color={accentDeepColor} />
        </View>
      </View>
      {debugBadgeText ? (
        <View style={styles.debugBadge}>
          <AppText preset="unifiedMeta" style={styles.debugBadgeText}>
            {debugBadgeText}
          </AppText>
        </View>
      ) : null}
      <AppText preset="unifiedBody" style={styles.desc} numberOfLines={4}>
        {guide.summary}
      </AppText>
      {tags.length > 0 ? (
        <View style={styles.tags}>
          {tags.map(tag => (
            <View
              key={tag}
              style={styles.tag}
            >
              <AppText
                preset="unifiedMeta"
                style={[styles.tagText, { color: accentDeepColor }]}
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default React.memo(GuideRecommendationCardBase);

const styles = StyleSheet.create({
  card: {
    gap: 14,
    borderRadius: 22,
    padding: 16,
    ...HOME_WIDGET_MATERIAL,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    flexShrink: 0,
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  eyebrow: {
    fontWeight: '700',
  },
  title: {
    color: '#0B1220',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    letterSpacing: 0,
  },
  debugBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.14)',
  },
  debugBadgeText: {
    color: '#8A5A00',
    fontWeight: '900',
  },
  desc: {
    color: '#556070',
    fontWeight: '500',
    letterSpacing: 0,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    maxWidth: '100%',
    paddingVertical: 2,
  },
  tagText: {
    flexShrink: 1,
    letterSpacing: 0,
  },
});
