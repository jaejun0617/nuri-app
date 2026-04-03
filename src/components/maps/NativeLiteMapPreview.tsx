import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import AppText from '../../app/ui/AppText';
import {
  PRETTY_PREVIEW_DELTA,
  buildRegionFromPoint,
  hasValidCoordinate,
} from './mapViewportUtils';

type Props = {
  latitude: number;
  longitude: number;
  title: string;
  overlayText?: string | null;
};

export default function NativeLiteMapPreview({
  latitude,
  longitude,
  title,
  overlayText = null,
}: Props) {
  if (!hasValidCoordinate({ latitude, longitude })) {
    return (
      <View style={styles.card}>
        <View style={[styles.map, styles.emptyState]}>
          <AppText preset="caption" style={styles.emptyStateText}>
            위치 좌표를 아직 확인하지 못해 지도를 표시할 수 없어요.
          </AppText>
        </View>
      </View>
    );
  }

  const region = useMemo(
    () =>
      buildRegionFromPoint(
        { latitude, longitude },
        PRETTY_PREVIEW_DELTA,
      ),
    [latitude, longitude],
  );

  return (
    <View style={styles.card}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        liteMode={Platform.OS === 'android'}
        initialRegion={region}
        moveOnMarkerPress={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
        loadingEnabled
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={title}
          pinColor="#C86F31"
        />
      </MapView>
      {overlayText ? (
        <View pointerEvents="none" style={styles.overlay}>
          <AppText preset="caption" style={styles.overlayText}>
            {overlayText}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#DDE5EE',
    minHeight: 200,
  },
  map: {
    width: '100%',
    height: 220,
  },
  overlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(16,32,51,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  overlayText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyStateText: {
    color: '#516173',
    textAlign: 'center',
    lineHeight: 18,
  },
});
