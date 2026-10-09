import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from '../icons/NuriFeatherIcon';

import AppText from '../../app/ui/AppText';
import MarkerText from '../../app/ui/MarkerText';
import { HomeFrostedGlass } from '../home/HomeFrostedGlass';
import type { SeasonKey } from '../../theme/seasonal/season';
import {
  formatGuideAgePolicyLabel,
  formatGuideTargetSpeciesLabel,
  getGuideCategoryIconName,
  getGuideCategoryLabel,
} from '../../services/guides/presentation';
import type { PetCareGuide } from '../../services/guides/types';

type Props = {
  guide: PetCareGuide;
  season: SeasonKey;
  onPress: (guideId: string) => void;
  debugBadgeText?: string | null;
};

function GuideListCardBase({
  guide,
  season,
  onPress,
  debugBadgeText,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`${guide.title}, 가이드 상세 보기`}
      onPress={() => onPress(guide.id)}
    >
      <HomeFrostedGlass season={season} borderRadius={8} style={styles.card}>
        <View style={styles.headerRow}>
          <View
            style={styles.categoryBadge}
          >
            <Feather
              name={getGuideCategoryIconName(guide.category)}
              size={14}
              color="#556070"
            />
            <AppText
              preset="unifiedMeta"
              style={styles.categoryText}
            >
              {getGuideCategoryLabel(guide.category)}
            </AppText>
          </View>
          <Feather name="chevron-right" size={18} color="#98A1B2" />
        </View>

        <MarkerText preset="unifiedTitle" style={styles.title}>
          {`“${guide.title}”`}
        </MarkerText>
        {debugBadgeText ? (
          <View style={styles.debugBadge}>
            <AppText preset="unifiedMeta" style={styles.debugBadgeText}>
              {debugBadgeText}
            </AppText>
          </View>
        ) : null}
        <AppText preset="unifiedBody" style={styles.summary}>
          {guide.summary}
        </AppText>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <AppText preset="unifiedMeta" style={styles.metaChipText}>
              {formatGuideTargetSpeciesLabel(guide.targetSpecies)}
            </AppText>
          </View>
          <View style={styles.metaChip}>
            <AppText preset="unifiedMeta" style={styles.metaChipText}>
              {formatGuideAgePolicyLabel(guide.agePolicy)}
            </AppText>
          </View>
        </View>

        <View style={styles.tagsRow}>
          {guide.tags.slice(0, 3).map(tag => (
            <View key={tag} style={styles.tagChip}>
              <AppText preset="unifiedMeta" style={styles.tagText}>
                #{tag}
              </AppText>
            </View>
          ))}
        </View>
      </HomeFrostedGlass>
    </TouchableOpacity>
  );
}

export default React.memo(GuideListCardBase);

const styles = StyleSheet.create({
  card: {
    marginTop: 0,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  categoryText: {
    color: '#556070',
    fontWeight: '500',
  },
  title: {
    color: '#0B1220',
    fontWeight: '900',
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
  summary: {
    color: '#556070',
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    paddingVertical: 2,
  },
  metaChipText: {
    color: '#556070',
    fontWeight: '800',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingVertical: 2,
  },
  tagText: {
    color: '#7A8495',
    fontWeight: '700',
  },
});
