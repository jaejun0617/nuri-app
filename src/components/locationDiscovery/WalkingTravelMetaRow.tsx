import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import { buildWalkingTravelLabel } from '../../services/locationDiscovery/travelMetrics';
import { styles } from './LocationDiscovery.styles';

type Props = {
  distanceMeters: number | null;
  estimatedMinutes?: number | null;
};

function WalkingTravelMetaRow({ distanceMeters, estimatedMinutes }: Props) {
  const label = useMemo(
    () => buildWalkingTravelLabel({ distanceMeters, estimatedMinutes }),
    [distanceMeters, estimatedMinutes],
  );

  return (
    <View style={styles.walkingTravelMetaRow} testID="walking-travel-meta">
      <Feather name="clock" size={12} color="#7B8597" />
      <AppText preset="unifiedMeta" style={styles.walkingTravelMetaText}>
        {label}
      </AppText>
    </View>
  );
}

export default memo(WalkingTravelMetaRow);
