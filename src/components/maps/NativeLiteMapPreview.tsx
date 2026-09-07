import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

type MapLoadStatus = 'loading' | 'ready' | 'failed';

const MAP_LOAD_TIMEOUT_MS = 10_000;

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
  const coordinateKey = previewCoordinate
    ? `${previewCoordinate.latitude.toFixed(
        5,
      )}:${previewCoordinate.longitude.toFixed(5)}`
    : 'invalid';
  const [loadState, setLoadState] = useState<{
    coordinateKey: string;
    status: MapLoadStatus;
  }>({ coordinateKey, status: 'loading' });
  const loadStatus =
    loadState.coordinateKey === coordinateKey ? loadState.status : 'loading';

  useEffect(() => {
    if (!region || !previewCoordinate) {
      return undefined;
    }

    setLoadState({ coordinateKey, status: 'loading' });
    const timeout = setTimeout(() => {
      setLoadState(current =>
        current.coordinateKey === coordinateKey && current.status === 'loading'
          ? { coordinateKey, status: 'failed' }
          : current,
      );
    }, MAP_LOAD_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [coordinateKey, previewCoordinate, region]);

  const handleMapLoaded = useCallback(() => {
    setLoadState({ coordinateKey, status: 'ready' });
  }, [coordinateKey]);

  if (!region || !previewCoordinate) {
    return (
      <View style={styles.card} testID="native-lite-map-fallback">
        <View style={[styles.map, styles.emptyState]}>
          <AppText preset="unifiedMeta" style={styles.emptyStateText}>
            위치 정보 준비 중이에요.
          </AppText>
        </View>
      </View>
    );
  }

  if (loadStatus === 'failed') {
    return (
      <View style={styles.card} testID="native-lite-map-fallback">
        <View style={[styles.map, styles.emptyState]}>
          <AppText preset="unifiedMeta" style={styles.emptyStateText}>
            지도 미리보기를 불러오지 못했어요. 길찾기에서 위치를 확인해 주세요.
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card} testID="native-lite-map-preview">
      <MapView
        key={coordinateKey}
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
        onMapLoaded={handleMapLoaded}
      >
        <Marker
          coordinate={previewCoordinate}
          title={title}
          pinColor="#C86F31"
        />
      </MapView>
      {loadStatus === 'loading' ? (
        <View
          pointerEvents="none"
          style={[styles.mapLoading, styles.emptyState]}
          testID="native-lite-map-loading"
        >
          <AppText preset="unifiedMeta" style={styles.emptyStateText}>
            지도를 불러오는 중이에요.
          </AppText>
        </View>
      ) : null}
      {overlayText ? (
        <View pointerEvents="none" style={styles.overlay}>
          <AppText preset="unifiedMeta" style={styles.overlayText}>
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
  mapLoading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#DDE5EE',
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
