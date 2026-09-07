import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import type { LocationDiscoveryItem } from '../../services/locationDiscovery/types';
import WalkingTravelMetaRow from './WalkingTravelMetaRow';
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
  const compact = layout === 'compact';
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
        <View style={compact ? styles.compactCardTopWithoutThumbnail : null}>
          <View
            style={[
              styles.cardHeader,
              compact ? styles.cardHeaderCompact : null,
            ]}
          >
            <View style={styles.cardHeaderCopy}>
              <AppText
                preset="unifiedMeta"
                style={styles.cardCategory}
                numberOfLines={1}
              >
                {item.categoryLabel}
              </AppText>
              <AppText
                preset="unifiedTitle"
                style={styles.cardTitle}
                numberOfLines={2}
              >
                {item.name}
              </AppText>
              {compact ? (
                <View style={styles.cardCompactMetaBlock}>
                  <AppText
                    preset="unifiedMeta"
                    style={styles.cardMetaText}
                    numberOfLines={2}
                  >
                    {item.address}
                  </AppText>
                  <WalkingTravelMetaRow
                    distanceMeters={item.distanceMeters}
                    estimatedMinutes={item.estimatedMinutes}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {!compact ? (
          <View style={styles.cardMetaRow}>
            <View style={styles.cardMetaPill}>
              <Feather name="map-pin" size={12} color="#7B8597" />
              <AppText
                preset="unifiedMeta"
                style={styles.cardMetaText}
                numberOfLines={2}
              >
                {item.address}
              </AppText>
            </View>
            <WalkingTravelMetaRow
              distanceMeters={item.distanceMeters}
              estimatedMinutes={item.estimatedMinutes}
            />
          </View>
        ) : null}

        {!compact && personalState?.badges.length ? (
          <View style={styles.personalStateSection}>
            <AppText preset="unifiedMeta" style={styles.personalStateLabel}>
              내 상태
            </AppText>
            <View style={styles.personalBadgeRow}>
              {personalState.badges.map(badge => (
                <View key={`${item.id}:${badge}`} style={styles.personalBadge}>
                  <AppText
                    preset="unifiedMeta"
                    style={styles.personalBadgeText}
                  >
                    {badge}
                  </AppText>
                </View>
              ))}
            </View>
            {personalState.note ? (
              <AppText preset="unifiedMeta" style={styles.personalStateNote}>
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
              preset="unifiedMeta"
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
            <AppText preset="unifiedMeta" style={styles.cardPrimaryActionText}>
              상세 보기
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export default memo(LocationDiscoveryCard);
