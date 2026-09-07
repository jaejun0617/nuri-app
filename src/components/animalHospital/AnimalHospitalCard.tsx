import React, { memo, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';

import AppText from '../../app/ui/AppText';
import { buildAnimalHospitalCardViewModel } from '../../domains/animalHospital/presentation';
import type { AnimalHospitalPublicHospital } from '../../domains/animalHospital/types';
import WalkingTravelMetaRow from '../locationDiscovery/WalkingTravelMetaRow';
import { styles } from '../locationDiscovery/LocationDiscovery.styles';

type Props = {
  item: AnimalHospitalPublicHospital;
  onOpenDetail: (item: AnimalHospitalPublicHospital) => void;
};

function AnimalHospitalCard({ item, onOpenDetail }: Props) {
  const viewModel = useMemo(
    () => buildAnimalHospitalCardViewModel(item),
    [item],
  );
  const operatingBadge = item.operatingBadge;
  const operatingBadgeStyle =
    operatingBadge?.kind === 'open24'
      ? styles.animalHospitalOperatingBadgeOpen24
      : operatingBadge?.kind === 'open'
      ? styles.animalHospitalOperatingBadgeOpen
      : styles.animalHospitalOperatingBadgeClosed;
  const operatingBadgeTextStyle =
    operatingBadge?.kind === 'open24'
      ? styles.animalHospitalOperatingBadgeTextOpen24
      : operatingBadge?.kind === 'open'
      ? styles.animalHospitalOperatingBadgeTextOpen
      : styles.animalHospitalOperatingBadgeTextClosed;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.cardPressableAreaCompact}
        onPress={() => onOpenDetail(item)}
      >
        <View style={styles.compactCardTopWithoutThumbnail}>
          <View style={[styles.cardHeader, styles.cardHeaderCompact]}>
            <View style={styles.cardHeaderCopy}>
              <AppText
                preset="unifiedMeta"
                style={styles.cardCategory}
                numberOfLines={1}
              >
                동물병원
              </AppText>
              {operatingBadge ? (
                <View style={styles.animalHospitalBadgeRow}>
                  <View
                    style={[
                      styles.animalHospitalOperatingBadge,
                      operatingBadgeStyle,
                    ]}
                  >
                    <AppText
                      preset="unifiedMeta"
                      style={[
                        styles.animalHospitalOperatingBadgeText,
                        operatingBadgeTextStyle,
                      ]}
                      numberOfLines={1}
                    >
                      {operatingBadge.label}
                    </AppText>
                  </View>
                </View>
              ) : null}
              <AppText
                preset="unifiedTitle"
                style={styles.cardTitle}
                numberOfLines={2}
              >
                {viewModel.title}
              </AppText>
              <AppText
                preset="unifiedMeta"
                style={styles.cardMetaText}
                numberOfLines={2}
              >
                {viewModel.address}
              </AppText>
              <WalkingTravelMetaRow distanceMeters={item.distanceMeters} />
              <AppText
                preset="unifiedMeta"
                style={styles.cardMetaText}
                numberOfLines={1}
              >
                {viewModel.phoneLabel}
              </AppText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default memo(AnimalHospitalCard);
