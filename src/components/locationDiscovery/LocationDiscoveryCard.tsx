import React, { memo, useEffect, useState } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import {
  formatDistanceLabel,
  formatDurationLabel,
} from '../../services/locationDiscovery/service';
import type { LocationDiscoveryItem } from '../../services/locationDiscovery/types';
import { styles } from './LocationDiscovery.styles';

type Props = {
  item: LocationDiscoveryItem;
  onPress: (item: LocationDiscoveryItem) => void;
  onPressDetail?: ((item: LocationDiscoveryItem) => void) | null;
  personalState?: {
    badges: ReadonlyArray<string>;
    note?: string | null;
  } | null;
  selected?: boolean;
  layout?: 'default' | 'compact';
};

function LocationDiscoveryCard({
  item,
  onPress,
  onPressDetail = null,
  personalState,
  selected = false,
  layout = 'default',
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const compact = layout === 'compact';

  useEffect(() => {
    setImageFailed(false);
  }, [item.mapPreviewUrl]);

  const durationLabel = formatDurationLabel(item.estimatedMinutes);
  const handleCardPress = () => {
    if (compact && selected && onPressDetail) {
      onPressDetail(item);
      return;
    }

    onPress(item);
  };

  return (
    <View style={[styles.card, selected ? styles.cardSelected : null]}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={[
          styles.cardPressableArea,
          compact ? styles.cardPressableAreaCompact : null,
        ]}
        onPress={handleCardPress}
      >
        <View style={compact ? styles.compactCardTop : null}>
          <View
            style={[
              styles.cardThumbnailWrap,
              compact ? styles.cardThumbnailWrapCompact : null,
            ]}
          >
            {!imageFailed ? (
              <Image
                source={{ uri: item.mapPreviewUrl }}
                style={[
                  styles.cardThumbnail,
                  compact ? styles.cardThumbnailCompact : null,
                ]}
                resizeMode="cover"
                onError={() => {
                  setImageFailed(true);
                }}
              />
            ) : null}
            <View
              style={[
                styles.cardThumbnailOverlay,
                compact ? styles.cardThumbnailOverlayCompact : null,
                imageFailed ? styles.cardThumbnailOverlayFallback : null,
              ]}
            >
              <View style={styles.cardThumbnailFooter}>
                {!compact ? (
                  <View style={styles.cardIconWrap}>
                    <Feather name="map" size={18} color="#2F8F48" />
                  </View>
                ) : <View />}
                <AppText preset="caption" style={styles.cardDistanceBadge}>
                  {formatDistanceLabel(item.distanceMeters)}
                </AppText>
              </View>
            </View>
          </View>

          <View style={[styles.cardHeader, compact ? styles.cardHeaderCompact : null]}>
            <View style={styles.cardHeaderCopy}>
              <AppText preset="caption" style={styles.cardCategory} numberOfLines={1}>
                {item.categoryLabel}
              </AppText>
              <AppText preset="headline" style={styles.cardTitle} numberOfLines={2}>
                {item.name}
              </AppText>
              {compact ? (
                <View style={styles.cardCompactMetaBlock}>
                  <AppText
                    preset="caption"
                    style={styles.cardMetaText}
                    numberOfLines={2}
                  >
                    {item.address}
                  </AppText>
                  {durationLabel ? (
                    <View style={styles.cardMetaPill}>
                      <Feather name="clock" size={12} color="#7B8597" />
                      <AppText preset="caption" style={styles.cardMetaText}>
                        {durationLabel}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          {!compact ? (
            <View style={styles.cardMetaPill}>
              <Feather name="map-pin" size={12} color="#7B8597" />
              <AppText preset="caption" style={styles.cardMetaText}>
                {item.address}
              </AppText>
            </View>
          ) : null}
          {!compact && durationLabel ? (
            <View style={styles.cardMetaPill}>
              <Feather name="clock" size={12} color="#7B8597" />
              <AppText preset="caption" style={styles.cardMetaText}>
                {durationLabel}
              </AppText>
            </View>
          ) : null}
        </View>

        {!compact && personalState?.badges.length ? (
          <View style={styles.personalStateSection}>
            <AppText preset="caption" style={styles.personalStateLabel}>
              내 상태
            </AppText>
            <View style={styles.personalBadgeRow}>
              {personalState.badges.map(badge => (
                <View key={`${item.id}:${badge}`} style={styles.personalBadge}>
                  <AppText preset="caption" style={styles.personalBadgeText}>
                    {badge}
                  </AppText>
                </View>
              ))}
            </View>
            {personalState.note ? (
              <AppText preset="caption" style={styles.personalStateNote}>
                {personalState.note}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>

      {onPressDetail && !compact ? (
        <View style={styles.cardActionRow}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.cardSecondaryActionButton,
              selected ? styles.cardSecondaryActionButtonSelected : null,
            ]}
            onPress={() => onPress(item)}
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
            onPress={() => onPressDetail(item)}
          >
            <AppText preset="caption" style={styles.cardPrimaryActionText}>
              상세 보기
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export default memo(LocationDiscoveryCard);
