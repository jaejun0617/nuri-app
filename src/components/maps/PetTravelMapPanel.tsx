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
import type { PetTravelItem } from '../../services/petTravel/types';
import type { MapViewportSnapshot } from '../../store/mapViewportStore';
import {
  areRegionsEquivalent,
  buildViewportFromPoints,
  buildViewportKey,
  filterValidCoordinatePoints,
  normalizeViewport,
  regionToViewport,
  viewportToRegion,
  type MutableViewport,
} from './mapViewportUtils';

type PetTravelMapPanelProps = {
  items: ReadonlyArray<PetTravelItem>;
  viewport: MapViewportSnapshot | null;
  selectedItemId?: string | null;
  restoring: boolean;
  onViewportIdle: (
    viewport: MutableViewport,
    reason: 'gesture' | 'marker' | 'restore' | 'results',
  ) => void;
  onSelectItem: (item: PetTravelItem, viewport: MutableViewport) => void;
  onMapReady?: () => void;
};

const MAP_HEIGHT = 240;
const MAP_WIDTH_FALLBACK = 340;

export function buildPetTravelMapViewportFromItems(
  items: ReadonlyArray<PetTravelItem>,
): MutableViewport | null {
  const mappableItems = filterValidCoordinatePoints(items);
  return buildViewportFromPoints(mappableItems, mappableItems[0]?.id ?? null);
}

export default function PetTravelMapPanel({
  items,
  viewport,
  selectedItemId = null,
  restoring,
  onViewportIdle,
  onSelectItem,
  onMapReady,
}: PetTravelMapPanelProps) {
  const mapRef = useRef<ComponentRef<typeof MapsView> | null>(null);
  const lastAppliedViewportKeyRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(MAP_HEIGHT / MAP_WIDTH_FALLBACK);
  const [currentRegion, setCurrentRegion] = useState<Region>(() =>
    viewportToRegion(viewport, MAP_HEIGHT / MAP_WIDTH_FALLBACK),
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
      setCurrentRegion(region);
      const nextViewport = regionToViewport(region, selectedItemId);
      lastAppliedViewportKeyRef.current = buildViewportKey(nextViewport);
      onViewportIdle(nextViewport, restoring ? 'restore' : 'gesture');
    },
    [onViewportIdle, restoring, selectedItemId],
  );

  const handleMarkerPress = useCallback(
    (item: PetTravelItem) => (_event: MarkerPressEvent) => {
      const nextViewport = regionToViewport(currentRegion, item.id);
      onViewportIdle(nextViewport, 'marker');
      onSelectItem(item, nextViewport);
    },
    [currentRegion, onSelectItem, onViewportIdle],
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <AppText preset="headline" style={styles.title}>
          지도
        </AppText>
        <AppText preset="caption" style={styles.caption}>
          실제 마커와 클러스터를 네이티브 맵으로 표시해요
        </AppText>
      </View>
      <View
        style={styles.mapFrame}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          if (width <= 0 || height <= 0) {
            return;
          }

          setAspectRatio(height / width);
        }}
      >
        <ClusteredMapView
          style={styles.map}
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
      <AppText preset="caption" style={styles.footerCaption}>
        {mappableItems.length
          ? '마커를 누르면 상세로 이동하고, 돌아오면 마지막 지도 위치를 복원해요.'
          : '검색 결과가 없으면 마지막으로 저장한 지도 위치를 유지해요.'}
      </AppText>
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
