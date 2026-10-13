import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { createWalkCommandId, getWalkSnapshot, mutateNativeWalk, observeNativeWalk, type WalkNativeAction, type WalkNativeSnapshot } from '../../services/walk/runtime/nativeWalk';
import { getWalkRoutePage, isWalkDistanceQaEnabled, noteWalkQaMapVisible, runWalkQaCommand, walkCameraAction, type WalkCameraMode, type WalkMapPoint, type WalkRoutePage } from '../../services/walk/runtime/distanceProjection';
import { decodeWalkQaProtocol, walkQaReference, WALK_QA_STEP_COPY, type WalkQaProtocol } from '../../services/walk/runtime/qaProtocol';

// Public map-rendering fixture only. It never enters the native distance engine.
const PUBLIC_PREVIEW: WalkMapPoint[] = [
  { latitude: 37.5665, longitude: 126.978 }, { latitude: 37.5665, longitude: 126.979 },
  { latitude: 37.5673, longitude: 126.979 }, { latitude: 37.5673, longitude: 126.978 },
];
const RouteSegment = memo(function RoutePolyline({ points }: { points: readonly WalkMapPoint[] }) {
  const coordinates = useMemo(() => points.map(p => ({ ...p })), [points]);
  return coordinates.length > 1 ? <Polyline coordinates={coordinates} strokeWidth={4} strokeColor="#177D71" /> : null;
});
function safeError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : error instanceof Error ? error.message : null;
  return typeof code === 'string' && /^WALK_[A-Z_]+$/.test(code) ? code : 'WALK_QA_FAILED';
}
export default function WalkDistanceQaPanel() {
  const owner = useAuthStore(s => s.session?.user.id ?? null);
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const openedOwner = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<WalkNativeSnapshot | null>(null);
  const [page, setPage] = useState<WalkRoutePage | null>(null);
  const [protocol, setProtocol] = useState<WalkQaProtocol | null>(null);
  const [mode, setMode] = useState<WalkCameraMode>('FOLLOW');
  const [preview, setPreview] = useState(true);
  const [physical, setPhysical] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('READY');
  const [openLabel, setOpenLabel] = useState('OPEN_A');
  const [urbanLabel, setUrbanLabel] = useState('URBAN_A');
  const [openMeters, setOpenMeters] = useState('');
  const [urbanMeters, setUrbanMeters] = useState('');
  const map = useRef<MapView | null>(null);
  const generation = useRef(0);
  const latest = useRef<WalkNativeSnapshot | null>(null);
  const routeRequest = useRef<number | null>(null);
  const requestedRevision = useRef('');
  const selectedPage = useRef<WalkRoutePage | null>(null);
  const tail = useRef(true);
  const enabled = isWalkDistanceQaEnabled();
  const open = visible && owner !== null && owner === openedOwner.current && enabled;

  const loadPage = useCallback(async (current: WalkNativeSnapshot, direction: 'FIRST' | 'TAIL' | 'BEFORE' | 'AFTER' = 'TAIL', cursor = '-1') => {
    if (routeRequest.current || !current.distanceSummary) return;
    const token = generation.current; routeRequest.current = token;
    try {
      const value = await getWalkRoutePage(direction, cursor, current.distanceSummary.routeRevision);
      if (token === generation.current) { selectedPage.current = value; setPage(value); requestedRevision.current = current.sessionId + ':' + current.distanceSummary.routeRevision; }
    } catch (e: unknown) { if (token === generation.current) setError(safeError(e)); }
    finally { if (routeRequest.current === token) routeRequest.current = null; }
  }, []);
  useEffect(() => {
    const epoch = generation;
    epoch.current++; routeRequest.current = null; requestedRevision.current = ''; selectedPage.current = null; tail.current = true;
    if (!open) { setPage(null); setSnapshot(null); setProtocol(null); return; }
    const token = epoch.current;
    noteWalkQaMapVisible(true);
    const receive = (s: WalkNativeSnapshot | null) => {
      if (token !== generation.current) return;
      latest.current = s; setSnapshot(s);
      if (!s?.distanceSummary) { setPage(null); selectedPage.current = null; return; }
      const key = s.sessionId + ':' + s.distanceSummary.routeRevision;
      if (key !== requestedRevision.current) {
        const previous = selectedPage.current;
        loadPage(s, tail.current ? 'TAIL' : 'AFTER', previous ? String(Math.max(-1, Number(previous.startCursor) - 1)) : '-1').catch(() => {});
      }
    };
    getWalkSnapshot().then(receive).catch(e => { if (token === epoch.current) setError(safeError(e)); });
    runWalkQaCommand('GET').then(v => { if (token === epoch.current) setProtocol(decodeWalkQaProtocol(v)); }).catch(e => { if (token === epoch.current) setError(safeError(e)); });
    const stop = observeNativeWalk(receive);
    return () => { epoch.current++; stop(); noteWalkQaMapVisible(false); latest.current = null; };
  }, [open, loadPage]);
  const target = preview ? PUBLIC_PREVIEW.at(-1) : page?.current;
  useEffect(() => { if (open && mapReady && mode === 'FOLLOW' && target) map.current?.animateCamera({ center: target, zoom: 17 }, { duration: 250 }); }, [open, mapReady, mode, target]);
  const run = async (operation: (valid: () => boolean) => Promise<void>) => {
    if (busy || !open) return;
    const token = generation.current;
    const valid = () => token === generation.current;
    setBusy(true);
    try { await operation(valid); if (valid()) setError('PASS'); }
    catch (e: unknown) { if (valid()) setError(safeError(e)); }
    finally { if (valid()) setBusy(false); }
  };
  const qa = (operation: string) => run(async valid => {
    const result = decodeWalkQaProtocol(await runWalkQaCommand(operation));
    if (!valid()) return;
    setProtocol(result);
    const current = await getWalkSnapshot(); if (!valid()) return;
    latest.current = current; setSnapshot(current);
    if (!latest.current?.distanceSummary) { setPage(null); selectedPage.current = null; }
    else await loadPage(latest.current);
  });
  const mutate = (action: WalkNativeAction) => run(async valid => {
    const current = await getWalkSnapshot(); if (!current) throw new Error('WALK_SESSION_DELETED');
    if (!valid()) return;
    const result = await mutateNativeWalk(action, current, await createWalkCommandId());
    if (!valid()) return;
    latest.current = result; setSnapshot(result);
    const receipt = decodeWalkQaProtocol(await runWalkQaCommand('GET'));
    if (valid()) setProtocol(receipt);
  });
  if (!enabled) return null;
  const step = protocol?.steps[protocol.stepIndex];
  const quality = snapshot?.distanceSummary?.quality;
  return <>
    <Button title="Walk Phase 3 Map / Wizard" onPress={() => { openedOwner.current = owner; setBusy(false); setMapReady(false); setMapLoaded(false); setVisible(true); }} />
    <Modal visible={open} onRequestClose={() => setVisible(false)} animationType="none">
      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.row}><Text style={styles.heading}>Walk Phase 3 QA</Text><Button title="닫기" onPress={() => setVisible(false)} /></View>
        <View style={styles.map}>
          <MapView ref={map} style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE} showsUserLocation={false} showsMyLocationButton={false}
            initialRegion={{ ...PUBLIC_PREVIEW[0], latitudeDelta: 0.005, longitudeDelta: 0.005 }}
            onTouchStart={() => setScrollEnabled(false)} onTouchEnd={() => setScrollEnabled(true)}
            onMapReady={() => setMapReady(true)} onMapLoaded={() => setMapLoaded(true)} onPanDrag={() => setMode(walkCameraAction(mode, 'DRAG'))}>
            {preview ? <RouteSegment points={PUBLIC_PREVIEW} /> : page?.segments.map(s => <RouteSegment key={s.segmentId} points={s.points} />)}
            {target ? <Marker coordinate={target} title={preview ? 'PUBLIC_SYNTHETIC' : 'FILTERED_POSITION'} /> : null}
          </MapView>
        </View>
        <View style={styles.row}><Text>공개 합성 경로 미리보기</Text><Switch value={preview} onValueChange={setPreview} /></View>
        <Text testID="walk-map-receipt">{JSON.stringify({ mapReady, mapLoaded, mode, preview, renderedPointCount: preview ? PUBLIC_PREVIEW.length : page?.segments.reduce((n, s) => n + s.points.length, 0) ?? 0, markerPresent: !!target })}</Text>
        <View style={styles.row}><Text>{mode}</Text><Button title="내 위치" onPress={() => setMode(walkCameraAction(mode, 'RECENTER'))} /></View>
        {!preview ? <View style={styles.row}>
          <Button title="이전 경로 구간" disabled={!page?.hasEarlier || busy} onPress={() => { tail.current = false; const s = latest.current; if (s && page) run(() => loadPage(s, 'BEFORE', page.startCursor)).catch(() => {}); }} />
          <Button title="다음 경로 구간" disabled={!page?.hasLater || busy} onPress={() => { tail.current = false; const s = latest.current; if (s && page) run(() => loadPage(s, 'AFTER', page.endCursor)).catch(() => {}); }} />
          <Button title="최신 구간" disabled={busy} onPress={() => { tail.current = true; const s = latest.current; if (s) run(() => loadPage(s)).catch(() => {}); }} />
        </View> : null}
        <Text selectable testID="walk-distance-receipt">{JSON.stringify({ state: snapshot?.runtimeState ?? 'IDLE', activeMs: snapshot?.elapsedActiveMs ?? '0', measuredM: snapshot?.distanceSummary?.measuredDistanceM ?? null, candidateM: snapshot?.distanceSummary?.acceptedDistanceM ?? null, quality: quality ?? null, recommendation: snapshot?.distanceSummary?.recommendation ?? null, gps: snapshot?.distanceSummary?.gpsSignal ?? null }, null, 2)}</Text>
        <Text testID="walk-distance-error">{error}</Text>
        <View style={styles.row}><Button title="일시정지" disabled={busy || snapshot?.runtimeState !== 'WALKING'} onPress={() => mutate('pauseWalk')} />
          <Button title="재개" disabled={busy || !['PAUSED', 'RECOVERY_REQUIRED'].includes(snapshot?.runtimeState ?? '')} onPress={() => mutate(snapshot?.recoverable ? 'resumeRecoveredWalk' : 'resumeWalk')} /></View>
        {protocol && !protocol.cleaned ? <>
          <Text style={styles.title}>{protocol.mode} · {step?.stepType ?? '완료'}</Text>
          {step ? <Text>{WALK_QA_STEP_COPY[step.stepType]}</Text> : null}
          <Text testID="walk-wizard-receipt">{JSON.stringify(protocol)}</Text>
          {step?.stepType === 'CLEANUP' ? <>
            {protocol.mode === 'PHYSICAL' ? <View style={styles.row}><Text>귀가 후 결과 검토·정리 승인 완료</Text><Switch value={reviewComplete} onValueChange={setReviewComplete} /></View> : null}
            <Button title="영수증 보존 / QA 경로 정리" disabled={busy || protocol.mode === 'PHYSICAL' && !reviewComplete} onPress={() => run(async valid => {
              const result = decodeWalkQaProtocol(await runWalkQaCommand('CLEANUP', { postReturnReviewComplete: protocol.mode === 'READINESS' || reviewComplete }));
              if (!valid()) return;
              setProtocol(result);
              const current = await getWalkSnapshot(); if (!valid()) return;
              latest.current = current; setSnapshot(current); setPage(null); selectedPage.current = null;
            })} />
          </> : <>
            <Button title="단계 시작" disabled={busy || step?.status === 'IN_PROGRESS'} onPress={() => { if (protocol.mode === 'PHYSICAL') setPreview(false); qa('START_STEP'); }} />
            <Button title="단계 종료 / 영수증 저장" disabled={busy || step?.status !== 'IN_PROGRESS'} onPress={() => qa('FINISH_STEP')} />
            {step?.stepType === 'REBOOT' ? <Button title="재부팅 전 기준점 저장" disabled={busy} onPress={() => qa('MARK_REBOOT')} /> : null}
            <Button title="안전상 건너뛰기" disabled={busy || step?.status === 'IN_PROGRESS'} onPress={() => run(async valid => { const result = decodeWalkQaProtocol(await runWalkQaCommand('SKIP', { reason: 'SAFETY' })); if (valid()) setProtocol(result); })} />
          </>}
        </> : <>
          <View style={styles.row}><Text>실제 보행 모드 · PO 승인 후에만</Text><Switch value={physical} onValueChange={setPhysical} /></View>
          {physical ? <>
            <TextInput style={styles.input} accessibilityLabel="개방 구간 코드" value={openLabel} onChangeText={setOpenLabel} autoCapitalize="characters" />
            <TextInput style={styles.input} accessibilityLabel="개방 구간 독립 기준 미터" placeholder="독립 기준 거리(m)" value={openMeters} onChangeText={setOpenMeters} keyboardType="decimal-pad" />
            <TextInput style={styles.input} accessibilityLabel="도심 구간 코드" value={urbanLabel} onChangeText={setUrbanLabel} autoCapitalize="characters" />
            <TextInput style={styles.input} accessibilityLabel="도심 구간 독립 기준 미터" placeholder="독립 기준 거리(m)" value={urbanMeters} onChangeText={setUrbanMeters} keyboardType="decimal-pad" />
          </> : <Text>준비 점검만 수행합니다. 실제 1km 정확도 결과를 만들지 않습니다.</Text>}
          <Button title={physical ? '실제 보행 프로토콜 준비' : '준비 점검 프로토콜 만들기'} disabled={busy} onPress={() => run(async valid => {
            const petId = usePetStore.getState().selectedPetId; if (!petId) throw new Error('WALK_PET_REQUIRED');
            const openRef = physical ? walkQaReference(openLabel, openMeters) : { label: 'OPEN_A', meters: 0 };
            const urbanRef = physical ? walkQaReference(urbanLabel, urbanMeters) : { label: 'URBAN_A', meters: 0 };
            const result = decodeWalkQaProtocol(await runWalkQaCommand('CONFIGURE', { mode: physical ? 'PHYSICAL' : 'READINESS', petId, openLabel: openRef.label, openMeters: openRef.meters, urbanLabel: urbanRef.label, urbanMeters: urbanRef.meters, scenario: 'ALL' }));
            if (valid()) setProtocol(result);
          })} />
        </>}
      </ScrollView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({ content: { paddingHorizontal: 12, gap: 10 }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, heading: { fontSize: 20, fontWeight: '700', flex: 1 }, title: { fontSize: 18, fontWeight: '600' }, map: { height: 300, width: '100%' }, input: { borderWidth: 1, borderColor: '#737B80', padding: 10, minHeight: 48 }, });
