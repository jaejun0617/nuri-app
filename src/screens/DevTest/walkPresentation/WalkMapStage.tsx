import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import styled from 'styled-components/native';
import NuriSemanticIcon from '../../../components/icons/NuriSemanticIcon';
import type {
  WalkCameraMode,
  WalkMapPoint,
  WalkRoutePage,
} from '../../../services/walk/runtime/distanceProjection';
import { PUBLIC_ROUTE } from './fixtures';

const Ring = styled.View<{ $accent: string }>`
  width: 58px;
  height: 58px;
  border-radius: 29px;
  border-width: 3px;
  border-color: ${({ $accent }) => $accent};
  background-color: ${({ theme }) => theme.colors.surfaceElevated};
  align-items: center;
  justify-content: center;
`;
const Route = memo(function RoutePolyline({
  points,
  accent,
}: {
  points: readonly WalkMapPoint[];
  accent: string;
}) {
  const coordinates = useMemo(() => points.map(p => ({ ...p })), [points]);
  if (points.length < 2) return null;
  return (
    <>
      <Polyline
        coordinates={coordinates}
        strokeColor="rgba(255,255,255,0.85)"
        strokeWidth={9}
        zIndex={1}
      />
      <Polyline
        coordinates={coordinates}
        strokeColor={accent}
        strokeWidth={5}
        zIndex={2}
      />
    </>
  );
});
export function PetPosition({
  accent,
  image,
  onSettled,
}: {
  accent: string;
  image: string | null;
  onSettled?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [image]);
  return (
    <Ring
      $accent={accent}
      testID="walk-pet-ring"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {image && !failed ? (
        <Image
          source={{ uri: image }}
          style={styles.photo}
          onLoad={() => {
            setLoaded(true);
            onSettled?.();
          }}
          onError={() => {
            setFailed(true);
            onSettled?.();
          }}
        />
      ) : null}
      {!image || failed || !loaded ? (
        <View style={styles.fallback}>
          <NuriSemanticIcon
            family="material"
            name="paw"
            preserveOriginal
            size={26}
            color={accent}
          />
        </View>
      ) : null}
    </Ring>
  );
}
type Props = {
  preview: boolean;
  page: WalkRoutePage | null;
  accent: string;
  image: string | null;
  mode: WalkCameraMode;
  recenterRevision: number;
  paused: boolean;
  showRoute: boolean;
  onReady: () => void;
  onLoaded: () => void;
  onDrag: () => void;
};
export default function WalkMapStage({
  preview,
  page,
  accent,
  image,
  mode,
  recenterRevision,
  paused,
  showRoute,
  onReady,
  onLoaded,
  onDrag,
}: Props) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [markerRevision, setMarkerRevision] = useState(0);
  const [trackMarker, setTrackMarker] = useState(true);
  useEffect(() => {
    setTrackMarker(true);
    const timer = setTimeout(() => setTrackMarker(false), 300);
    return () => clearTimeout(timer);
  }, [accent, image, markerRevision]);
  const target = preview ? PUBLIC_ROUTE.at(-1)! : page?.current ?? null;
  const latitude = target?.latitude,
    longitude = target?.longitude;
  // The map is not mounted until an actual filtered fix exists; no fixture camera fallback.
  useEffect(() => {
    if (
      ready &&
      mode === 'FOLLOW' &&
      latitude !== undefined &&
      longitude !== undefined
    ) {
      map.current?.animateCamera(
        { center: { latitude, longitude }, zoom: 17 },
        { duration: paused ? 0 : 250 },
      );
    }
  }, [latitude, longitude, mode, ready, recenterRevision, paused]);
  if (!target) return null;
  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      showsUserLocation={false}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      showsCompass={false}
      initialRegion={{ ...target, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
      onMapReady={() => {
        setReady(true);
        onReady();
      }}
      onMapLoaded={onLoaded}
      onPanDrag={onDrag}
    >
      {showRoute &&
        (preview ? (
          <Route points={PUBLIC_ROUTE} accent={accent} />
        ) : (
          page?.segments.map(s => (
            <Route key={s.segmentId} points={s.points} accent={accent} />
          ))
        ))}
      {showRoute && (preview || page?.startCursor === '0') && (
        <Marker
          coordinate={
            preview ? PUBLIC_ROUTE[0] : page?.segments[0]?.points[0] ?? target
          }
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={[styles.start, { borderColor: accent }]} />
        </Marker>
      )}
      <Marker
        testID={preview ? 'walk-fixture-marker' : 'walk-actual-marker'}
        coordinate={target}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={trackMarker}
        zIndex={5}
      >
        <PetPosition
          accent={accent}
          image={preview ? null : image}
          onSettled={() => setMarkerRevision(n => n + 1)}
        />
      </Marker>
    </MapView>
  );
}
const styles = StyleSheet.create({
  photo: { width: 48, height: 48, borderRadius: 24 },
  fallback: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  start: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
