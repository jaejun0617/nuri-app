import React, { memo, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import { buildAnimalHospitalCardViewModel } from '../../domains/animalHospital/presentation';
import type { AnimalHospitalPublicHospital } from '../../domains/animalHospital/types';
import { useAnimalHospitalEnrichedItem } from '../../hooks/useAnimalHospitalThumbnail';
import OptimizedImage from '../images/OptimizedImage';
import { styles } from '../locationDiscovery/LocationDiscovery.styles';

type Props = {
  item: AnimalHospitalPublicHospital;
  onOpenDetail: (item: AnimalHospitalPublicHospital) => void;
};

function AnimalHospitalCard({ item, onOpenDetail }: Props) {
  const enrichedItemQuery = useAnimalHospitalEnrichedItem(item);
  const displayItem = enrichedItemQuery.data ?? item;
  const photoAttributionLabel =
    enrichedItemQuery.overlay?.photoAttributionLabel ?? null;
  const viewModel = useMemo(
    () => buildAnimalHospitalCardViewModel(displayItem),
    [displayItem],
  );
  const thumbnailUri = displayItem.thumbnailUrl;
  const hasThumbnail = Boolean(thumbnailUri);
  const operatingBadge = displayItem.operatingBadge;
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
        onPress={() => onOpenDetail(displayItem)}
      >
        <View style={styles.compactCardTop}>
          <View
            style={[styles.cardThumbnailWrap, styles.cardThumbnailWrapCompact]}
          >
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
            {hasThumbnail && photoAttributionLabel ? (
              <View
                style={[
                  styles.cardThumbnailOverlay,
                  styles.cardThumbnailOverlayCompact,
                ]}
              >
                <View style={styles.cardPhotoAttributionWrap}>
                  <AppText
                    preset="unifiedMeta"
                    style={styles.cardPhotoAttributionText}
                    numberOfLines={1}
                  >
                    사진 출처 · {photoAttributionLabel}
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>

          <View style={[styles.cardHeader, styles.cardHeaderCompact]}>
            <View style={[styles.cardHeaderCopy, styles.cardHeaderCopyCentered]}>
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
