import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import {
  formatGuideAgePolicyLabel,
  formatGuideStatusLabel,
  formatGuideTargetSpeciesLabel,
  getGuideCategoryLabel,
} from '../../services/guides/presentation';
import type { PetCareGuide } from '../../services/guides/types';

type Props = {
  guide: PetCareGuide;
  onPress: (guideId: string) => void;
};

function GuideAdminListCardBase({ guide, onPress }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.card}
      onPress={() => onPress(guide.id)}
    >
      <View style={styles.headerRow}>
        <View style={styles.badgesRow}>
          <View style={styles.statusChip}>
            <AppText preset="caption" style={styles.statusChipText}>
              {formatGuideStatusLabel(guide.status)}
            </AppText>
          </View>
          {!guide.isActive ? (
            <View style={styles.inactiveChip}>
              <AppText preset="caption" style={styles.inactiveChipText}>
                비활성
              </AppText>
            </View>
          ) : null}
        </View>
        <Feather name="chevron-right" size={18} color="#98A1B2" />
      </View>

      <AppText preset="headline" style={styles.title}>
        {guide.title}
      </AppText>
      <AppText preset="body" style={styles.summary}>
        {guide.summary}
      </AppText>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <AppText preset="caption" style={styles.metaChipText}>
            {getGuideCategoryLabel(guide.category)}
          </AppText>
        </View>
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

      <View style={styles.footerRow}>
        <AppText preset="caption" style={styles.footerText}>
          priority {guide.priority} · sort {guide.sortOrder}
        </AppText>
        <AppText preset="caption" style={styles.footerText}>
          {guide.updatedAt.slice(0, 10)}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(GuideAdminListCardBase);

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
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(109,106,248,0.10)',
  },
  statusChipText: {
    color: '#6D6AF8',
    fontWeight: '900',
  },
  inactiveChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFF0F0',
  },
  inactiveChipText: {
    color: '#D64545',
    fontWeight: '900',
  },
  title: {
    color: '#0B1220',
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerText: {
    color: '#98A1B2',
    fontWeight: '700',
  },
});
