import React from 'react';
import { Image, View } from 'react-native';

import AppText from '../../app/ui/AppText';
import { styles } from './LocationDiscovery.styles';

type Props = {
  uri: string;
  title: string;
};

export default function LocationDiscoveryMapPreview({ uri, title }: Props) {
  return (
    <View style={styles.mapPreviewCard}>
      <Image source={{ uri }} style={styles.mapPreviewImage} resizeMode="cover" />
      <View style={styles.mapPreviewOverlay}>
        <AppText preset="caption" style={styles.mapPreviewLabel}>
          {title}
        </AppText>
      </View>
    </View>
  );
}
