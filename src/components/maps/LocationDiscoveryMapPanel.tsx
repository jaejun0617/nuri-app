import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { StyleSheet, View } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import MapsView, {
  Marker,
  PROVIDER_GOOGLE,
  type MarkerPressEvent,
  type Region,
} from 'react-native-maps';

import AppText from '../../app/ui/AppText';
import type { MapViewportSnapshot } from '../../store/mapViewportStore';
import {
  areRegionsEquivalent,
  buildViewportFromCoordinate,
  buildViewportFromPoints,
  buildViewportKey,
  filterValidCoordinatePoints,
  hasValidCoordinate,
  normalizeViewport,
  regionToViewport,
  viewportToRegion,
  type MutableViewport,
} from './mapViewportUtils';

export type LocationDiscoveryMapItem = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type Props = {
  title?: string;
  caption?: string;
  items: ReadonlyArray<LocationDiscoveryMapItem>;
  viewport: MapViewportSnapshot | null;
  selectedItemId?: string | null;
  restoring: boolean;
  mapHeight?: number;
  compact?: boolean;
  onViewportIdle: (
    viewport: MutableViewport,
    region: Region,
    reason: 'gesture' | 'marker' | 'restore' | 'results',
  ) => void;
  onSelectItem: (
    item: LocationDiscoveryMapItem,
    viewport: MutableViewport,
  ) => void;
  onMapReady?: () => void;
};

const MAP_HEIGHT = 300;
const MAP_WIDTH_FALLBACK = 340;

export function buildLocationDiscoveryMapViewport(params: {
  items: ReadonlyArray<LocationDiscoveryMapItem>;
  fallbackCoordinates?: {
    latitude: number;
    longitude: number;
  } | null;
}): MutableViewport | null {
  const { items, fallbackCoordinates } = params;
  const mappableItems = filterValidCoordinatePoints(items);
  if (mappableItems.length) {
    return buildViewportFromPoints(mappableItems, mappableItems[0]?.id ?? null);
  }

  if (!fallbackCoordinates || !hasValidCoordinate(fallbackCoordinates)) {
    return null;
  }

  return buildViewportFromCoordinate(
    {
      latitude: fallbackCoordinates.latitude,
      longitude: fallbackCoordinates.longitude,
    },
    null,
  );
}

export default function LocationDiscoveryMapPanel({
  title,
  caption,
  items,
  viewport,
  selectedItemId = null,
  restoring,
  mapHeight = MAP_HEIGHT,
  compact = false,
  onViewportIdle,
  onSelectItem,
  onMapReady,
}: Props) {
  const mapRef = useRef<ComponentRef<typeof MapsView> | null>(null);
  const lastAppliedViewportKeyRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(mapHeight / MAP_WIDTH_FALLBACK);
  const [currentRegion, setCurrentRegion] = useState<Region>(() =>
    viewportToRegion(viewport, mapHeight / MAP_WIDTH_FALLBACK),
  );

  const targetViewport = useMemo(
    () => normalizeViewport(viewport),
    [viewport],
  );
  const targetRegion = useMemo(
    () => viewportToRegion(targetViewport, aspectRatio),
    [aspectRatio, targetViewport],
  );
  const mappableItems = useMemo(
    () => filterValidCoordinatePoints(items),
    [items],
  );

  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }

    if (areRegionsEquivalent(currentRegion, targetRegion)) {
      return;
    }

    const nextViewportKey = buildViewportKey(targetViewport);
    if (lastAppliedViewportKeyRef.current === nextViewportKey) {
      return;
    }

    lastAppliedViewportKeyRef.current = nextViewportKey;
    mapRef.current.animateToRegion(targetRegion, restoring ? 320 : 220);
    setCurrentRegion(targetRegion);
  }, [currentRegion, mapReady, restoring, targetRegion, targetViewport]);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      const nextViewport = regionToViewport(region, selectedItemId);
      const nextViewportKey = buildViewportKey(nextViewport);

      if (
        lastAppliedViewportKeyRef.current === nextViewportKey &&
        areRegionsEquivalent(currentRegion, region)
      ) {
        return;
      }

      setCurrentRegion(region);
      lastAppliedViewportKeyRef.current = nextViewportKey;
      onViewportIdle(nextViewport, region, restoring ? 'restore' : 'gesture');
    },
    [currentRegion, onViewportIdle, restoring, selectedItemId],
  );

  const handleMarkerPress = useCallback(
    (item: LocationDiscoveryMapItem) => (_event: MarkerPressEvent) => {
      const nextViewport = regionToViewport(currentRegion, item.id);
      onSelectItem(item, nextViewport);
    },
    [currentRegion, onSelectItem],
  );

  return (
    <View style={compact ? styles.compactCard : styles.card}>
      {!compact && title ? (
        <View style={styles.headerRow}>
          <AppText preset="headline" style={styles.title}>
            {title}
          </AppText>
          {caption ? (
            <AppText preset="caption" style={styles.caption}>
              {caption}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View
        style={[styles.mapFrame, { height: mapHeight }]}
        collapsable={false}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          if (width <= 0 || height <= 0) {
            return;
          }

          setAspectRatio(height / width);
        }}
      >
        <ClusteredMapView
          style={[styles.map, { height: mapHeight }]}
          provider={PROVIDER_GOOGLE}
          initialRegion={targetRegion}
          animationEnabled={false}
          clusterColor="#2F8F48"
          clusterTextColor="#FFFFFF"
          edgePadding={{ top: 48, right: 48, bottom: 48, left: 48 }}
          moveOnMarkerPress={false}
          pitchEnabled={false}
          radius={42}
          rotateEnabled={false}
          showsCompass={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          tracksViewChanges={false}
          clusteringEnabled={mappableItems.length >= 6}
          onMapReady={() => {
            setMapReady(true);
            onMapReady?.();
          }}
          onRegionChangeComplete={handleRegionChangeComplete}
          mapRef={mapInstance => {
            mapRef.current =
              mapInstance as unknown as ComponentRef<typeof MapsView> | null;
          }}
        >
          {mappableItems.map(item => (
            <Marker
              key={item.id}
              coordinate={{
                latitude: item.latitude,
                longitude: item.longitude,
              }}
              pinColor={item.id === selectedItemId ? '#C86F31' : '#2F8F48'}
              title={item.name}
              description={item.address}
              onPress={handleMarkerPress(item)}
            />
          ))}
        </ClusteredMapView>
      </View>
      {!compact ? (
        <AppText preset="caption" style={styles.footerCaption}>
          {mappableItems.length
            ? '마커나 리스트 카드를 선택하면 지도와 리스트가 같은 장소에 맞춰지고, 상세에 다녀와도 마지막 위치를 그대로 복원해요.'
            : '현재 위치를 기준으로 예쁜 확대 레벨을 유지해 다음 검색을 바로 이어갈 수 있어요.'}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAF1',
    padding: 14,
    marginBottom: 12,
  },
  compactCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAF1',
    padding: 12,
    marginBottom: 12,
  },
  headerRow: {
    marginBottom: 10,
  },
  title: {
    color: '#102033',
    fontWeight: '900',
  },
  caption: {
    color: '#6A7687',
    marginTop: 4,
  },
  mapFrame: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#DDE5EE',
    height: MAP_HEIGHT,
  },
  map: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  footerCaption: {
    marginTop: 10,
    color: '#6A7687',
    lineHeight: 18,
  },
});
