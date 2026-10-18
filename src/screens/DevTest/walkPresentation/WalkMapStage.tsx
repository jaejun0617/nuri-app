// @refresh reset
import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
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

const PET_MARKER_SIZE = 40;
const PET_PHOTO_SIZE = 32;

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
export function PetPosition(props: PetPositionProps) {
  return <PetMarkerPhoto key={props.image ?? 'no-image'} {...props} />;
}
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

// Android custom markers snapshot their children; keep photos in the regular RN hierarchy.
// SDK projection handles camera tilt/rotation/padding. Coalesce camera events without polling.
function usePetMapProjection(
  map: React.RefObject<MapView | null>,
  ready: boolean,
  latitude: number | undefined,
  longitude: number | undefined,
) {
  const position = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const request = useRef<() => void>(() => {});
  const update = useCallback(() => request.current(), []);
  useLayoutEffect(() => {
    opacity.setValue(0);
    if (!ready || latitude === undefined || longitude === undefined) return;
    let disposed = false;
    let inFlight = false;
    let pending = false;
    let lastRun = -Infinity;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (disposed) return;
      pending = true;
      if (inFlight || timer !== undefined) return;
      const delay = Math.max(0, 50 - (Date.now() - lastRun));
      if (delay === 0) project();
      else timer = setTimeout(project, delay);
    };
    const project = async () => {
      timer = undefined;
      if (disposed) return;
      pending = false;
      inFlight = true;
      lastRun = Date.now();
      try {
        const point = await map.current?.pointForCoordinate({
          latitude,
          longitude,
        });
        if (disposed) return;
        if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
          position.setValue({
            x: point.x - PET_MARKER_SIZE / 2,
            y: point.y - PET_MARKER_SIZE / 2,
          });
          opacity.setValue(1);
        } else opacity.setValue(0);
      } catch {
        if (!disposed) opacity.setValue(0);
      } finally {
        if (!disposed) {
          inFlight = false;
          if (pending) schedule();
        }
      }
    };
    request.current = schedule;
    schedule();
    return () => {
      disposed = true;
      request.current = () => {};
      if (timer !== undefined) clearTimeout(timer);
      opacity.setValue(0);
    };
  }, [map, ready, latitude, longitude, position, opacity]);
  return { position, opacity, update };
}

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
  useLayoutEffect(() => {
    if (!preview) timerTrace('MAP_COMMIT', { renderCommitMonoMs: performance.now() });
  });
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const target = preview
    ? PUBLIC_ROUTE.at(-1)!
    : displayLocation ?? page?.current ?? null;
  const latitude = target?.latitude,
    longitude = target?.longitude;
  const projection = usePetMapProjection(map, ready, latitude, longitude);
  // Actual mode uses only a filtered fix or an explicit, ephemeral current-location review.
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
    <View
      style={[StyleSheet.absoluteFill, styles.mapStage]}
      onLayout={projection.update}
    >
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={WALK_MAP_STYLE}
        mapPadding={{ top: 0, left: 0, right: 0, bottom: WALK_SHEET_OVERLAP }}
        showsUserLocation={false}
        showsMyLocationButton={false}
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
          projection.update();
          onLoaded();
        }}
        onRegionChange={projection.update}
        onRegionChangeComplete={projection.update}
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
      </MapView>
      <View
        testID="walk-pet-overlay"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          testID={preview ? 'walk-fixture-marker' : 'walk-actual-marker'}
          style={[
            styles.petPosition,
            {
              opacity: projection.opacity,
              transform: projection.position.getTranslateTransform(),
            },
          ]}
        >
          <PetPosition
            accent={accent}
            image={preview && !personalPreview ? null : image}
            onImageStatus={onImageStatus}
          />
        </Animated.View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  mapStage: { overflow: 'hidden' },
  petPosition: {
    position: 'absolute',
    top: 0,
    left: 0,
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
