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
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
  title: string;
  overlayText?: string | null;
  interactive?: boolean;
};

function normalizePreviewCoordinate(input: {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
}): { latitude: number; longitude: number } | null {
  if (input.latitude === null || input.latitude === undefined) {
    return null;
  }

  if (input.longitude === null || input.longitude === undefined) {
    return null;
  }

  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);

  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const coordinate = { latitude, longitude };

  return hasValidCoordinate(coordinate) ? coordinate : null;
}

export default function NativeLiteMapPreview({
  latitude,
  longitude,
  title,
  overlayText = null,
  interactive = false,
}: Props) {
  const previewCoordinate = useMemo(
    () => normalizePreviewCoordinate({ latitude, longitude }),
    [latitude, longitude],
  );

  const region = useMemo(() => {
    if (!previewCoordinate) {
      return null;
    }

    return buildRegionFromPoint(
      previewCoordinate,
      interactive ? PRETTY_PREVIEW_DELTA / 2 : PRETTY_PREVIEW_DELTA,
    );
  }, [interactive, previewCoordinate]);

  if (!region || !previewCoordinate) {
    return (
      <View style={styles.card}>
        <View style={[styles.map, styles.emptyState]}>
          <AppText preset="caption" style={styles.emptyStateText}>
            위치 정보 준비 중이에요.
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        liteMode={Platform.OS === 'android' && !interactive}
        initialRegion={region}
        moveOnMarkerPress={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        toolbarEnabled={interactive}
        showsCompass={interactive}
        showsMyLocationButton={false}
        loadingEnabled
      >
        <Marker
          coordinate={previewCoordinate}
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
