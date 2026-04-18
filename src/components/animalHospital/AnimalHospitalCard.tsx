import React, { memo, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import {
  buildAnimalHospitalCardViewModel,
} from '../../domains/animalHospital/presentation';
import type { AnimalHospitalPublicHospital } from '../../domains/animalHospital/types';
import { useAnimalHospitalThumbnail } from '../../hooks/useAnimalHospitalThumbnail';
import OptimizedImage from '../images/OptimizedImage';
import { styles } from '../locationDiscovery/LocationDiscovery.styles';

type Props = {
  item: AnimalHospitalPublicHospital;
  onOpenDetail: (item: AnimalHospitalPublicHospital) => void;
};

function AnimalHospitalCard({ item, onOpenDetail }: Props) {
  const viewModel = useMemo(() => buildAnimalHospitalCardViewModel(item), [item]);
  const thumbnailQuery = useAnimalHospitalThumbnail(item);
  const thumbnailUri = thumbnailQuery.data ?? null;
  const hasThumbnail = Boolean(thumbnailUri);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.cardPressableAreaCompact}
        onPress={() => onOpenDetail(item)}
      >
        <View style={styles.compactCardTop}>
          <View style={[styles.cardThumbnailWrap, styles.cardThumbnailWrapCompact]}>
            {hasThumbnail && thumbnailUri ? (
              <OptimizedImage
                uri={thumbnailUri}
                style={[styles.cardThumbnail, styles.cardThumbnailCompact]}
                resizeMode="cover"
                priority="normal"
                fallback={false}
              />
            ) : (
              <View
                style={[
                  styles.cardThumbnailPlaceholder,
                  styles.cardThumbnailPlaceholderCompact,
                ]}
              >
                <View style={styles.cardThumbnailPlaceholderIconWrap}>
                  <Feather name="shield" size={20} color="#7A8699" />
                </View>
              </View>
            )}
          </View>

          <View style={[styles.cardHeader, styles.cardHeaderCompact]}>
            <View style={styles.cardHeaderCopy}>
              <AppText preset="caption" style={styles.cardCategory} numberOfLines={1}>
                동물병원
              </AppText>
              <AppText preset="headline" style={styles.cardTitle} numberOfLines={2}>
                {viewModel.title}
              </AppText>
              <AppText preset="caption" style={styles.cardMetaText} numberOfLines={2}>
                {viewModel.address}
              </AppText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default memo(AnimalHospitalCard);
