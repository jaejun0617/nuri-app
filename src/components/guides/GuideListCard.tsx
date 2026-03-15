import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import {
  formatGuideAgePolicyLabel,
  formatGuideTargetSpeciesLabel,
  getGuideCategoryIconName,
  getGuideCategoryLabel,
} from '../../services/guides/presentation';
import type { PetCareGuide } from '../../services/guides/types';

type Props = {
  guide: PetCareGuide;
  onPress: (guideId: string) => void;
  debugBadgeText?: string | null;
};

function GuideListCardBase({ guide, onPress, debugBadgeText }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.card}
      onPress={() => onPress(guide.id)}
    >
      <View style={styles.headerRow}>
        <View style={styles.categoryBadge}>
          <Feather
            name={getGuideCategoryIconName(guide.category)}
            size={14}
            color="#6D6AF8"
          />
          <AppText preset="caption" style={styles.categoryText}>
            {getGuideCategoryLabel(guide.category)}
          </AppText>
        </View>
        <Feather name="chevron-right" size={18} color="#98A1B2" />
      </View>

      <AppText preset="headline" style={styles.title}>
        {guide.title}
      </AppText>
      {debugBadgeText ? (
        <View style={styles.debugBadge}>
          <AppText preset="caption" style={styles.debugBadgeText}>
            {debugBadgeText}
          </AppText>
        </View>
      ) : null}
      <AppText preset="body" style={styles.summary}>
        {guide.summary}
      </AppText>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <AppText preset="caption" style={styles.metaChipText}>
            {formatGuideTargetSpeciesLabel(guide.targetSpecies)}
          </AppText>
        </View>
        <View style={styles.metaChip}>
          <AppText preset="caption" style={styles.metaChipText}>
            {formatGuideAgePolicyLabel(guide.agePolicy)}
          </AppText>
        </View>
      </View>

      <View style={styles.tagsRow}>
        {guide.tags.slice(0, 3).map(tag => (
          <View key={tag} style={styles.tagChip}>
            <AppText preset="caption" style={styles.tagText}>
              #{tag}
            </AppText>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(GuideListCardBase);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  categoryText: {
    color: '#6D6AF8',
    fontWeight: '900',
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F5FA',
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F7F8FD',
  },
  tagText: {
    color: '#7A8495',
    fontWeight: '700',
  },
});
