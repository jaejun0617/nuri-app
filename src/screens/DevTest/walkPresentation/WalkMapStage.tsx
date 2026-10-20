// @refresh reset
import React, {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { WALK_MAP_STYLE, WALK_SHEET_OVERLAP } from './visuals';
import { timerTrace } from './timerTrace';

export type PetMarkerImageStatus = 'NONE' | 'LOADING' | 'LOADED' | 'FAILED';

const PET_MARKER_SIZE = 36;
const PET_PHOTO_SIZE = 28;
const PET_MARKER_ANCHOR = { x: 0.5, y: 0.5 };

const Ring = styled.View<{ $accent: string }>`
  width: ${PET_MARKER_SIZE}px;
  height: ${PET_MARKER_SIZE}px;
  border-radius: ${PET_MARKER_SIZE / 2}px;
  border-width: 2px;
  border-color: ${({ $accent }) => $accent};
  overflow: hidden;
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
type PetPositionProps = {
  accent: string;
  image: string | null;
  onImageStatus?: (status: PetMarkerImageStatus) => void;
};
export const PetPosition = memo(function PetPositionLeaf(
  props: PetPositionProps,
) {
  return <PetMarkerPhoto key={props.image ?? 'no-image'} {...props} />;
});
function PetMarkerPhoto({ accent, image, onImageStatus }: PetPositionProps) {
  const [status, setStatus] = useState<PetMarkerImageStatus>(
    image ? 'LOADING' : 'NONE',
  );
  useEffect(() => {
    onImageStatus?.(status);
  }, [status, onImageStatus]);
  return (
    <Ring
      $accent={accent}
      collapsable={false}
      testID="walk-pet-ring"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {image && status !== 'FAILED' ? (
        <Image
          source={{ uri: image }}
          style={styles.photo}
          resizeMode="cover"
          fadeDuration={0}
          onLoad={() => setStatus('LOADED')}
          onError={() => setStatus('FAILED')}
        />
      ) : null}
      {status !== 'LOADED' ? (
        <View style={styles.fallback}>
          <NuriSemanticIcon
            family="material"
            name="paw"
            preserveOriginal
            size={20}
            color={accent}
          />
        </View>
      ) : null}
    </Ring>
  );
}

// Google Maps owns geographic attachment during camera gestures. The bitmap is
// refreshed only while the photo/ring settles, never by a JS screen projection.
const PetMapMarker = memo(function NativePetMarker({
  coordinate,
  accent,
  image,
  ready,
  preview,
  onImageStatus,
}: PetPositionProps & {
  coordinate: WalkMapPoint;
  ready: boolean;
  preview: boolean;
}) {
  const marker = useRef<React.ComponentRef<typeof Marker>>(null);
  const [tracking, setTracking] = useState(true);
  const [photoStatus, setPhotoStatus] = useState<PetMarkerImageStatus>(
    image ? 'LOADING' : 'NONE',
  );
  const onStatus = useCallback(
    (status: PetMarkerImageStatus) => {
      setPhotoStatus(status);
      onImageStatus?.(status);
    },
    [onImageStatus],
  );

  useEffect(() => {
    setTracking(true);
    if (!ready) return;
    let alive = true;
    let frame: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (!alive) return;
      marker.current?.redraw();
      setTracking(false);
    };
    if (photoStatus === 'LOADING') {
      // A slow image cannot keep native bitmap tracking alive forever. A late
      // onLoad/onError reopens this bounded settling window.
      timer = setTimeout(finish, 2000);
    } else {
      frame = requestAnimationFrame(() => {
        marker.current?.redraw();
        frame = requestAnimationFrame(() => {
          marker.current?.redraw();
          timer = setTimeout(finish, 180);
        });
      });
    }
    return () => {
      alive = false;
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [accent, image, photoStatus, ready]);

  return (
    <Marker
      ref={marker}
      identifier="walk-pet-position"
      testID={preview ? 'walk-fixture-marker' : 'walk-actual-marker'}
      coordinate={coordinate}
      anchor={PET_MARKER_ANCHOR}
      flat={false}
      tappable={false}
      zIndex={3}
      tracksViewChanges={tracking}
      style={styles.petMarker}
    >
      <PetPosition accent={accent} image={image} onImageStatus={onStatus} />
    </Marker>
  );
});

type Props = {
  preview: boolean;
  personalPreview?: boolean;
  displayLocation?: WalkMapPoint | null;
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
  onImageStatus?: (status: PetMarkerImageStatus) => void;
};
export default function WalkMapStage({
  preview,
  personalPreview = false,
  displayLocation = null,
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
  onImageStatus,
}: Props) {
  const mapLifetime = useId().replace(/[^a-zA-Z0-9]/g, '');
  const source = preview
    ? personalPreview
      ? 'local-pet-preview'
      : 'public-synthetic'
    : 'actual';
  useLayoutEffect(() => {
    if (!preview)
      timerTrace('MAP_COMMIT', { renderCommitMonoMs: performance.now() });
  });
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const candidate = preview
    ? PUBLIC_ROUTE.at(-1)!
    : displayLocation ?? page?.current ?? null;
  const target =
    candidate &&
    Number.isFinite(candidate.latitude) &&
    Number.isFinite(candidate.longitude) &&
    Math.abs(candidate.latitude) <= 90 &&
    Math.abs(candidate.longitude) <= 180
      ? candidate
      : null;
  const latitude = target?.latitude,
    longitude = target?.longitude;
  const coordinate = useMemo(
    () =>
      latitude === undefined || longitude === undefined
        ? null
        : { latitude, longitude },
    [latitude, longitude],
  );
  const userCamera = useRef(false);
  useLayoutEffect(() => {
    userCamera.current = false;
  }, [recenterRevision]);
  const claimUserCamera = useCallback(() => {
    if (userCamera.current) return;
    // Claim synchronously so a GPS update cannot recenter before the parent commits FREE_LOOK.
    userCamera.current = true;
    onDrag();
  }, [onDrag]);
  const onCameraChange = useCallback<
    NonNullable<React.ComponentProps<typeof MapView>['onRegionChange']>
  >(
    (_region, details) => {
      if (details?.isGesture) claimUserCamera();
    },
    [claimUserCamera],
  );
  // Actual mode uses only a filtered fix or an explicit, ephemeral current-location review.
  useEffect(() => {
    if (
      ready &&
      mode === 'FOLLOW' &&
      !userCamera.current &&
      latitude !== undefined &&
      longitude !== undefined
    ) {
      map.current?.animateCamera(
        { center: { latitude, longitude }, zoom: 17 },
        { duration: paused ? 0 : 250 },
      );
    }
  }, [latitude, longitude, mode, ready, recenterRevision, paused]);
  if (!target || !coordinate) return null;
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.mapStage]}
      collapsable={false}
      // Nonvisual QA provenance includes mount lifetime, so re-entry invalidates capture proof.
      testID={`walk-map-source-${source}-${mapLifetime}`}
    >
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={WALK_MAP_STYLE}
        mapPadding={{ top: 0, left: 0, right: 0, bottom: WALK_SHEET_OVERLAP }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        moveOnMarkerPress={false}
        toolbarEnabled={false}
        showsCompass={false}
        initialRegion={{
          ...target,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        onMapReady={() => {
          setReady(true);
          onReady();
        }}
        onMapLoaded={() => {
          onLoaded();
        }}
        onRegionChangeStart={onCameraChange}
        onRegionChange={onCameraChange}
        onRegionChangeComplete={onCameraChange}
        onPanDrag={claimUserCamera}
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
        <PetMapMarker
          key="walk-pet-position"
          coordinate={coordinate}
          accent={accent}
          image={preview && !personalPreview ? null : image}
          ready={ready}
          preview={preview}
          onImageStatus={onImageStatus}
        />
      </MapView>
    </View>
  );
}
const styles = StyleSheet.create({
  mapStage: { overflow: 'hidden' },
  petMarker: {
    width: PET_MARKER_SIZE,
    height: PET_MARKER_SIZE,
  },
  photo: {
    width: PET_PHOTO_SIZE,
    height: PET_PHOTO_SIZE,
    borderRadius: PET_PHOTO_SIZE / 2,
  },
  fallback: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: PET_PHOTO_SIZE,
    height: PET_PHOTO_SIZE,
    borderRadius: PET_PHOTO_SIZE / 2,
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
