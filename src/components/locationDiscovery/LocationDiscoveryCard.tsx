import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
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
};

function LocationDiscoveryCard({ item, onPress }: Props) {
  const durationLabel = formatDurationLabel(item.estimatedMinutes);
  const verificationBadgeStyle = (() => {
    switch (item.verification.tone) {
      case 'positive':
        return styles.cardVerificationBadgePositive;
      case 'critical':
        return styles.cardVerificationBadgeCritical;
      case 'caution':
        return styles.cardVerificationBadgeCaution;
      default:
        return styles.cardVerificationBadgeNeutral;
    }
  })();
  const verificationTextStyle = (() => {
    switch (item.verification.tone) {
      case 'positive':
        return styles.cardVerificationBadgeTextPositive;
      case 'critical':
        return styles.cardVerificationBadgeTextCritical;
      case 'caution':
        return styles.cardVerificationBadgeTextCaution;
      default:
        return styles.cardVerificationBadgeTextNeutral;
    }
  })();

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.card}
      onPress={() => onPress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Feather
            name={item.domain === 'walk' ? 'map' : 'coffee'}
            size={18}
            color="#2F8F48"
          />
        </View>
        <View style={styles.cardHeaderCopy}>
          <AppText preset="caption" style={styles.cardCategory}>
            {item.categoryLabel}
          </AppText>
          <AppText preset="headline" style={styles.cardTitle}>
            {item.name}
          </AppText>
        </View>
        <AppText preset="body" style={styles.cardDistance}>
          {formatDistanceLabel(item.distanceMeters)}
        </AppText>
      </View>

      <View style={styles.cardBadgeRow}>
        <View style={styles.cardSourceBadge}>
          <AppText preset="caption" style={styles.cardSourceBadgeText}>
            {item.source.providerLabel}
          </AppText>
        </View>
        <View style={[styles.cardVerificationBadge, verificationBadgeStyle]}>
          <AppText
            preset="caption"
            style={[styles.cardVerificationBadgeText, verificationTextStyle]}
          >
            {item.verification.label}
          </AppText>
        </View>
      </View>

      <AppText preset="body" style={styles.cardDescription}>
        {item.description}
      </AppText>

      <View style={styles.cardMetaRow}>
        <View style={styles.cardMetaPill}>
          <Feather name="map-pin" size={12} color="#7B8597" />
          <AppText preset="caption" style={styles.cardMetaText}>
            {item.address}
          </AppText>
        </View>
        <View style={styles.cardMetaPill}>
          <Feather name="crosshair" size={12} color="#7B8597" />
          <AppText preset="caption" style={styles.cardMetaText}>
            {item.coordinateLabel}
          </AppText>
        </View>
        {durationLabel ? (
          <View style={styles.cardMetaPill}>
            <Feather name="clock" size={12} color="#7B8597" />
            <AppText preset="caption" style={styles.cardMetaText}>
              {durationLabel}
            </AppText>
          </View>
        ) : null}
        {item.operatingStatusLabel ? (
          <View style={styles.cardMetaPill}>
            <Feather name="clock" size={12} color="#7B8597" />
            <AppText preset="caption" style={styles.cardMetaText}>
              {item.operatingStatusLabel}
            </AppText>
          </View>
        ) : null}
      </View>

      {item.petPolicy.detail ? (
        <AppText preset="caption" style={styles.cardNotice}>
          {item.petPolicy.detail}
        </AppText>
      ) : null}
    </TouchableOpacity>
  );
}

export default memo(LocationDiscoveryCard);
