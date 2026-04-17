import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import type { AnimalHospitalPublicHospital } from '../../domains/animalHospital/types';
import { styles } from '../locationDiscovery/LocationDiscovery.styles';

type Props = {
  item: AnimalHospitalPublicHospital;
  selected?: boolean;
  onSelect: (item: AnimalHospitalPublicHospital) => void;
  onOpenDetail: (item: AnimalHospitalPublicHospital) => void;
};

function AnimalHospitalCard({
  item,
  selected = false,
  onSelect,
  onOpenDetail,
}: Props) {
  return (
    <View style={[styles.card, selected ? styles.cardSelected : null]}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.cardPressableArea}
        onPress={() => onSelect(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderCopy}>
            <AppText preset="caption" style={styles.cardCategory} numberOfLines={1}>
              동물병원
            </AppText>
            <AppText preset="headline" style={styles.cardTitle} numberOfLines={2}>
              {item.name}
            </AppText>
          </View>
          <View
            style={[
              styles.filterChip,
              {
                alignSelf: 'flex-start',
                backgroundColor:
                  item.publicTrust.publicLabel === 'trust_reviewed'
                    ? 'rgba(47,143,72,0.12)'
                    : item.publicTrust.publicLabel === 'needs_verification'
                      ? 'rgba(200,111,49,0.12)'
                      : '#EEF2F8',
              },
            ]}
          >
            <AppText preset="caption" style={styles.filterChipText}>
              {item.publicTrust.label}
            </AppText>
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaPill}>
            <Feather name="map-pin" size={12} color="#7B8597" />
            <AppText preset="caption" style={styles.cardMetaText}>
              {item.address}
            </AppText>
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaPill}>
            <Feather name="navigation" size={12} color="#7B8597" />
            <AppText preset="caption" style={styles.cardMetaText}>
              {item.distanceLabel}
            </AppText>
          </View>
          <View style={styles.cardMetaPill}>
            <Feather name="shield" size={12} color="#7B8597" />
            <AppText preset="caption" style={styles.cardMetaText}>
              {item.statusSummary}
            </AppText>
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaPill}>
            <Feather name="phone" size={12} color="#7B8597" />
            <AppText preset="caption" style={styles.cardMetaText}>
              {item.officialPhone ?? '공식 전화 확인 중'}
            </AppText>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActionRow}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[
            styles.cardSecondaryActionButton,
            selected ? styles.cardSecondaryActionButtonSelected : null,
          ]}
          onPress={() => onSelect(item)}
        >
          <AppText
            preset="caption"
            style={[
              styles.cardSecondaryActionText,
              selected ? styles.cardSecondaryActionTextSelected : null,
            ]}
          >
            지도에서 보기
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.cardPrimaryActionButton}
          onPress={() => onOpenDetail(item)}
        >
          <AppText preset="caption" style={styles.cardPrimaryActionText}>
            상세 보기
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default memo(AnimalHospitalCard);
