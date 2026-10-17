import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Button,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import AppText from '../../app/ui/AppText';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { SEASON_CTA } from '../../app/theme/ctaPalette';
import type { SeasonKey } from '../../theme/seasonal/season';
import {
  createWalkCommandId,
  getWalkSnapshot,
  mutateNativeWalk,
  observeNativeWalk,
  type WalkNativeAction,
  type WalkNativeSnapshot,
} from '../../services/walk/runtime/nativeWalk';
import {
  getWalkRoutePage,
  isWalkDistanceQaEnabled,
  noteWalkQaMapVisible,
  runWalkQaCommand,
  walkCameraAction,
  type WalkCameraMode,
  type WalkRoutePage,
} from '../../services/walk/runtime/distanceProjection';
import {
  decodeWalkQaProtocol,
  walkQaReference,
  WALK_QA_STEP_COPY,
  type WalkQaProtocol,
} from '../../services/walk/runtime/qaProtocol';
import WalkMapStage, {
  type PetMarkerImageStatus,
} from './walkPresentation/WalkMapStage';
import WalkView, { IconControl, WalkAction } from './walkPresentation/WalkView';
import {
  GALLERY_STATES,
  hasActiveWalk,
  presentationState,
  safeWalkError,
  type PresentationState,
} from './walkPresentation/model';
import { fixtureMetrics } from './walkPresentation/fixtures';
import { useWalkDesignLocation } from './walkPresentation/useWalkDesignLocation';

const SEASONS: { key: SeasonKey; label: string }[] = [
  { key: 'spring', label: '봄' },
  { key: 'summer', label: '여름' },
  { key: 'autumn', label: '가을' },
  { key: 'winter', label: '겨울' },
];
const STATE_LABELS = [
  '산책 전',
  '신호 찾기',
  '걷는 중',
  '일시정지',
  '신호 약함',
  '신호 끊김',
  '복구',
  '종료 확인',
  '기기 저장 완료',
  '향후 기록 시안',
];
type PageDirection = 'FIRST' | 'TAIL' | 'BEFORE' | 'AFTER';

export default function WalkDistanceQaPanel() {
  const owner = useAuthStore(s => s.session?.user.id ?? null);
  const pets = usePetStore(s => s.pets),
    selectedPetId = usePetStore(s => s.selectedPetId);
  const theme = useTheme(),
    effectiveSeason = useEffectiveSeason(),
    insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false),
    [qaOpen, setQaOpen] = useState(false);
  const openedOwner = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<WalkNativeSnapshot | null>(null);
  const [page, setPage] = useState<WalkRoutePage | null>(null);
  const [protocol, setProtocol] = useState<WalkQaProtocol | null>(null);
  const [mode, setMode] = useState<WalkCameraMode>('FOLLOW');
  const [preview, setPreview] = useState(true),
    [galleryState, setGalleryState] = useState<PresentationState>('WALKING');
  const [publicGallery, setPublicGallery] = useState(false);
  const [designReview, setDesignReview] = useState(false);
  const [petImageStatus, setPetImageStatus] =
    useState<PetMarkerImageStatus>('NONE');
  const [gallerySeason, setGallerySeason] = useState<SeasonKey | null>(null);
  const [finishConfirm, setFinishConfirm] = useState(false),
    [minimizeConfirm, setMinimizeConfirm] = useState(false);
  const [physical, setPhysical] = useState(false),
    [reviewComplete, setReviewComplete] = useState(false);
  const [mapReady, setMapReady] = useState(false),
    [mapLoaded, setMapLoaded] = useState(false);
  const [recenterRevision, setRecenterRevision] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('READY');
  const [openLabel, setOpenLabel] = useState('OPEN_A'),
    [urbanLabel, setUrbanLabel] = useState('URBAN_A');
  const [openMeters, setOpenMeters] = useState(''),
    [urbanMeters, setUrbanMeters] = useState('');
  const generation = useRef(0),
    latest = useRef<WalkNativeSnapshot | null>(null);
  const routeRequest = useRef<number | null>(null),
    requestedRevision = useRef('');
  const selectedPage = useRef<WalkRoutePage | null>(null),
    tail = useRef(true),
    operationRunning = useRef(false);
  const enabled = isWalkDistanceQaEnabled();
  const open =
    visible && owner !== null && owner === openedOwner.current && enabled;
  const designLocation = useWalkDesignLocation(open, owner);
  const season = preview ? gallerySeason ?? effectiveSeason : effectiveSeason;
  const pet = pets.find(
    p =>
      p.id ===
      (preview || designReview
        ? selectedPetId
        : snapshot?.petId ?? selectedPetId),
  );
  const petImage =
    preview && publicGallery ? null : pet?.avatarUrl?.trim() || null;

  const loadPage = useCallback(
    async (
      current: WalkNativeSnapshot,
      direction: PageDirection = 'TAIL',
      cursor = '-1',
    ) => {
      if (routeRequest.current !== null || !current.distanceSummary) return;
      const token = generation.current;
      routeRequest.current = token;
      try {
        const value = await getWalkRoutePage(
          direction,
          cursor,
          current.distanceSummary.routeRevision,
        );
        if (
          token === generation.current &&
          latest.current?.sessionId === current.sessionId
        ) {
          selectedPage.current = value;
          setPage(value);
          requestedRevision.current =
            current.sessionId + ':' + current.distanceSummary.routeRevision;
        }
      } catch (e: unknown) {
        if (token === generation.current) setError(safeWalkError(e));
      } finally {
        if (routeRequest.current === token) routeRequest.current = null;
      }
    },
    [],
  );
  useEffect(() => {
    const epoch = generation;
    epoch.current++;
    routeRequest.current = null;
    requestedRevision.current = '';
    selectedPage.current = null;
    tail.current = true;
    setPage(null);
    setMapReady(false);
    setMapLoaded(false);
    setMode('FOLLOW');
    if (!open) {
      setSnapshot(null);
      setProtocol(null);
      latest.current = null;
      return;
    }
    const token = epoch.current;
    const receive = (s: WalkNativeSnapshot | null) => {
      if (token !== epoch.current) return;
      if (latest.current?.sessionId !== s?.sessionId) {
        selectedPage.current = null;
        setPage(null);
        requestedRevision.current = '';
      }
      latest.current = s;
      setSnapshot(s);
      if (preview || !s?.distanceSummary) {
        setPage(null);
        selectedPage.current = null;
        return;
      }
      const key = s.sessionId + ':' + s.distanceSummary.routeRevision;
      if (key !== requestedRevision.current) {
        const previous = selectedPage.current;
        loadPage(
          s,
          tail.current ? 'TAIL' : 'AFTER',
          previous
            ? String(Math.max(-1, Number(previous.startCursor) - 1))
            : '-1',
        );
      }
    };
    getWalkSnapshot()
      .then(receive)
      .catch(e => {
        if (token === epoch.current) setError(safeWalkError(e));
      });
    runWalkQaCommand('GET')
      .then(v => {
        if (token === epoch.current) setProtocol(decodeWalkQaProtocol(v));
      })
      .catch(e => {
        if (token === epoch.current) setError(safeWalkError(e));
      });
    const stop = observeNativeWalk(receive);
    const foreground = AppState.addEventListener('change', state => {
      if (state !== 'active' || token !== epoch.current) return;
      getWalkSnapshot()
        .then(receive)
        .catch(e => {
          if (token === epoch.current) setError(safeWalkError(e));
        });
    });
    return () => {
      epoch.current++;
      stop();
      foreground.remove();
      latest.current = null;
    };
  }, [open, preview, loadPage]);
  useEffect(() => {
    if (!enabled) return;
    noteWalkQaMapVisible(open && !qaOpen);
    return () => noteWalkQaMapVisible(false);
  }, [enabled, open, qaOpen]);
  const run = async (operation: (valid: () => boolean) => Promise<void>) => {
    if (operationRunning.current || !open) return;
    const token = generation.current,
      valid = () => token === generation.current;
    operationRunning.current = true;
    setBusy(true);
    try {
      await operation(valid);
      if (valid()) setError('PASS');
    } catch (e: unknown) {
      if (valid()) setError(safeWalkError(e));
    } finally {
      operationRunning.current = false;
      if (valid()) setBusy(false);
    }
  };
  const refresh = async (valid: () => boolean) => {
    const current = await getWalkSnapshot();
    if (!valid()) return;
    latest.current = current;
    setSnapshot(current);
    if (!current?.distanceSummary || preview) {
      setPage(null);
      selectedPage.current = null;
    } else await loadPage(current);
  };
  const qa = (operation: string) =>
    run(async valid => {
      const result = decodeWalkQaProtocol(await runWalkQaCommand(operation));
      if (!valid()) return;
      setProtocol(result);
      await refresh(valid);
    });
  const mutate = (action: WalkNativeAction) =>
    run(async valid => {
      const current = await getWalkSnapshot();
      if (!current) throw new Error('WALK_SESSION_DELETED');
      if (!valid()) return;
      const commandId = await createWalkCommandId();
      if (!valid()) return;
      const result = await mutateNativeWalk(action, current, commandId);
      if (!valid()) return;
      latest.current = result;
      setSnapshot(result);
      const receipt = decodeWalkQaProtocol(await runWalkQaCommand('GET'));
      if (valid()) setProtocol(receipt);
    });
  const configure = async (valid: () => boolean, physicalMode: boolean) => {
    const petId = usePetStore.getState().selectedPetId;
    if (!petId) throw new Error('WALK_PET_REQUIRED');
    const openRef = physicalMode
      ? walkQaReference(openLabel, openMeters)
      : { label: 'OPEN_A', meters: 0 };
    const urbanRef = physicalMode
      ? walkQaReference(urbanLabel, urbanMeters)
      : { label: 'URBAN_A', meters: 0 };
    const result = decodeWalkQaProtocol(
      await runWalkQaCommand('CONFIGURE', {
        mode: physicalMode ? 'PHYSICAL' : 'READINESS',
        petId,
        openLabel: openRef.label,
        openMeters: openRef.meters,
        urbanLabel: urbanRef.label,
        urbanMeters: urbanRef.meters,
        scenario: 'ALL',
      }),
    );
    if (valid()) setProtocol(result);
    return result;
  };
  const switchMode = (nextPreview: boolean) => {
    if (operationRunning.current) return;
    setDesignReview(false);
    designLocation.clear();
    setPage(null);
    selectedPage.current = null;
    setFinishConfirm(false);
    setMode('FOLLOW');
    setPreview(nextPreview);
    setQaOpen(false);
    setError('READY');
  };
  const close = () => {
    if (operationRunning.current) return;
    if (!preview && hasActiveWalk(snapshot)) setMinimizeConfirm(true);
    else setVisible(false);
  };
  const primary = () => {
    if (preview) {
      if (
        galleryState === 'FINISHED_LOCAL' ||
        galleryState === 'FUTURE_RECORD_CTA_PREVIEW'
      ) {
        setVisible(false);
        return;
      }
      setGalleryState(
        galleryState === 'PRE_WALK' ||
          galleryState === 'PAUSED' ||
          galleryState === 'RECOVERY_REQUIRED'
          ? 'WALKING'
          : 'PAUSED',
      );
      return;
    }
    if (snapshot?.runtimeState === 'FINISHED_LOCAL') {
      setVisible(false);
      return;
    }
    if (snapshot?.runtimeState === 'PAUSED' || snapshot?.recoverable) {
      mutate(snapshot.recoverable ? 'resumeRecoveredWalk' : 'resumeWalk');
      return;
    }
    if (hasActiveWalk(snapshot)) {
      mutate('pauseWalk');
      return;
    }
    run(async valid => {
      if (protocol?.mode === 'PHYSICAL' && !protocol.cleaned)
        throw new Error('WALK_QA_PROTOCOL_INVALID');
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        if (!valid()) return;
        if (
          permission[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !==
          PermissionsAndroid.RESULTS.GRANTED
        )
          throw new Error('WALK_PRECISE_LOCATION_REQUIRED');
      }
      const configured =
        protocol && !protocol.cleaned
          ? protocol
          : await configure(valid, false);
      if (
        !valid() ||
        configured?.steps[configured.stepIndex]?.stepType !== 'READINESS'
      )
        throw new Error('WALK_QA_PROTOCOL_INVALID');
      const receipt = decodeWalkQaProtocol(
        await runWalkQaCommand('START_STEP'),
      );
      if (!valid()) return;
      setProtocol(receipt);
      await refresh(valid);
    });
  };
  const finish = () => {
    if (preview) {
      setGalleryState('FINISHED_LOCAL');
      setFinishConfirm(false);
      return;
    }
    setFinishConfirm(false);
    if (protocol?.steps[protocol.stepIndex]?.status === 'IN_PROGRESS')
      qa('FINISH_STEP');
    else mutate('finishWalk');
  };
  if (!enabled) return null;
  const step = protocol?.steps[protocol.stepIndex];
  const baseState = preview
    ? galleryState
    : presentationState(snapshot, !!page?.current);
  const state = designReview
    ? 'WALKING'
    : finishConfirm
    ? 'FINISH_CONFIRM'
    : baseState;
  const metrics = designReview
    ? { distanceM: null, activeMs: '0' }
    : preview
    ? fixtureMetrics(state)
    : {
        distanceM: snapshot?.distanceSummary?.acceptedDistanceM ?? null,
        activeMs: snapshot?.elapsedActiveMs ?? '0',
      };
  // Explicit scalar allowlist; never spread a snapshot, protocol, pet, or map point here.
  const diagnostics: readonly [string, string][] = [
    ['펫 사진 입력', petImage ? 'PRESENT' : 'MISSING'],
    ['펫 사진 상태', petImageStatus],
    [
      '모드',
      preview
        ? publicGallery
          ? 'PUBLIC_SYNTHETIC'
          : 'LOCAL_PET_PREVIEW'
        : 'ACTUAL',
    ],
    ['카메라', mode],
    ['지도 준비', String(mapReady)],
    ['지도 로드', String(mapLoaded)],
    ['상태', snapshot?.runtimeState ?? 'IDLE'],
    ['서비스', String(snapshot?.serviceRunning ?? false)],
    ['수집 중', String(snapshot?.subscriptionActive ?? false)],
    ['리비전', snapshot?.revision ?? '0'],
    ['수신 지점 수', snapshot?.fixCount ?? '0'],
    ['구간 수', snapshot?.segmentCount ?? '0'],
    [
      '인정 지점 수',
      String(snapshot?.distanceSummary?.quality.acceptedFixCount ?? 0),
    ],
    [
      '거절 지점 수',
      String(
        snapshot?.distanceSummary
          ? snapshot.distanceSummary.quality.totalFixCount -
              snapshot.distanceSummary.quality.acceptedFixCount
          : 0,
      ),
    ],
    [
      '지도 지점 수',
      String(
        preview
          ? 4
          : page?.segments.reduce((n, s) => n + s.points.length, 0) ?? 0,
      ),
    ],
    ['마커', String(preview || !!page?.current)],
    ['측정 후보 m', snapshot?.distanceSummary?.measuredDistanceM ?? '—'],
    ['인정 후보 m', snapshot?.distanceSummary?.acceptedDistanceM ?? '—'],
    ['GPS', snapshot?.distanceSummary?.gpsSignal ?? '—'],
    ['품질 판정', snapshot?.distanceSummary?.recommendation ?? '—'],
    ['알고리즘 버전', String(snapshot?.distanceSummary?.algorithmVersion ?? 1)],
    ['정책 버전', String(snapshot?.distanceSummary?.policyVersion ?? 1)],
    ['Wizard 모드', protocol?.mode ?? 'NONE'],
    ['Wizard 단계', step?.stepType ?? 'NONE'],
    ['Wizard 상태', step?.status ?? 'NONE'],
    ['영수증', step?.receipt ? 'PRESERVED' : 'NONE'],
    ['정리 완료', String(protocol?.cleaned ?? false)],
  ];
  return (
    <>
      <Button
        title="Walk Phase 3 Map / Wizard"
        onPress={() => {
          if (operationRunning.current) return;
          openedOwner.current = owner;
          setBusy(false);
          setQaOpen(false);
          setPreview(true);
          setPublicGallery(false);
          setDesignReview(false);
          designLocation.clear();
          setGalleryState('WALKING');
          setFinishConfirm(false);
          setVisible(true);
        }}
      />
      <Modal
        visible={open}
        onRequestClose={
          minimizeConfirm
            ? () => setMinimizeConfirm(false)
            : qaOpen
            ? () => setQaOpen(false)
            : close
        }
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
      >
        {open &&
          (qaOpen ? (
            <View
              style={[
                styles.inspector,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  paddingTop: insets.top + 8,
                  paddingBottom: insets.bottom,
                },
              ]}
            >
              <View style={styles.row}>
                <AppText preset="titleMd" style={styles.flex}>
                  QA 정보
                </AppText>
                <IconControl
                  label="QA 정보 닫기"
                  icon="x"
                  testID="walk-qa-close"
                  onPress={() => setQaOpen(false)}
                />
              </View>
              <ScrollView
                contentContainerStyle={styles.inspectorContent}
                keyboardShouldPersistTaps="handled"
              >
                <AppText preset="sectionTitle">공개 상태 미리보기</AppText>
                <View style={styles.row}>
                  {SEASONS.map(s => (
                    <View key={s.key} style={styles.season}>
                      <WalkAction
                        label={s.label}
                        icon="sun"
                        season={s.key}
                        role="primarySubtle"
                        testID={`walk-season-${s.key}`}
                        onPress={() => {
                          if (operationRunning.current) return;
                          switchMode(true);
                          setPublicGallery(true);
                          setGallerySeason(s.key);
                        }}
                      />
                    </View>
                  ))}
                </View>
                <View style={styles.row}>
                  {GALLERY_STATES.map((s, i) => (
                    <View key={s} style={styles.galleryCell}>
                      <WalkAction
                        label={STATE_LABELS[i]}
                        icon="eye"
                        season={season}
                        role="secondary"
                        testID={`walk-gallery-${s}`}
                        onPress={() => {
                          if (operationRunning.current) return;
                          switchMode(true);
                          setPublicGallery(true);
                          setGalleryState(s);
                        }}
                      />
                    </View>
                  ))}
                </View>
                <WalkAction
                  label="현재 위치로 디자인 보기"
                  icon="crosshair"
                  season={season}
                  role="secondary"
                  testID="walk-design-location"
                  onPress={async () => {
                    if (operationRunning.current) return;
                    switchMode(false);
                    setPublicGallery(false);
                    setDesignReview(true);
                    await designLocation.request();
                  }}
                />
                <WalkAction
                  label={preview ? '실제 GPS 화면 열기' : '합성 미리보기 열기'}
                  icon="map"
                  season={season}
                  role="secondary"
                  testID={preview ? 'walk-mode-actual' : 'walk-mode-preview'}
                  onPress={() => {
                    setPublicGallery(false);
                    switchMode(!preview);
                  }}
                />
                <AppText preset="sectionTitle">안전한 진단 정보</AppText>
                {diagnostics.map(([label, value]) => (
                  <View style={styles.row} key={label}>
                    <AppText preset="bodySm" style={styles.flex}>
                      {label}
                    </AppText>
                    <AppText
                      preset="bodySm"
                      testID={`walk-diagnostic-${label}`}
                    >
                      {value}
                    </AppText>
                  </View>
                ))}
                <AppText preset="bodySm" testID="walk-distance-error">
                  {error}
                </AppText>
                {!preview && (
                  <View style={styles.row}>
                    <Button
                      title="이전 경로 구간"
                      disabled={!page?.hasEarlier || busy}
                      onPress={() => {
                        tail.current = false;
                        const s = latest.current;
                        if (s && page)
                          run(() => loadPage(s, 'BEFORE', page.startCursor));
                      }}
                    />
                    <Button
                      title="다음 경로 구간"
                      disabled={!page?.hasLater || busy}
                      onPress={() => {
                        tail.current = false;
                        const s = latest.current;
                        if (s && page)
                          run(() => loadPage(s, 'AFTER', page.endCursor));
                      }}
                    />
                    <Button
                      title="최신 구간"
                      disabled={busy}
                      onPress={() => {
                        tail.current = true;
                        const s = latest.current;
                        if (s) run(() => loadPage(s));
                      }}
                    />
                  </View>
                )}
                <AppText preset="sectionTitle">기존 QA Wizard</AppText>
                {protocol && !protocol.cleaned ? (
                  <>
                    <AppText preset="bodyStrong">
                      {protocol.mode} · {step?.stepType ?? '완료'}
                    </AppText>
                    {step && (
                      <AppText preset="bodySm">
                        {WALK_QA_STEP_COPY[step.stepType]}
                      </AppText>
                    )}
                    {step?.stepType === 'CLEANUP' ? (
                      <>
                        {protocol.mode === 'PHYSICAL' && (
                          <View style={styles.row}>
                            <AppText preset="bodySm" style={styles.flex}>
                              귀가 후 결과 검토·정리 승인 완료
                            </AppText>
                            <Switch
                              value={reviewComplete}
                              onValueChange={setReviewComplete}
                            />
                          </View>
                        )}
                        <Button
                          title="영수증 보존 / QA 경로 정리"
                          disabled={
                            busy ||
                            (protocol.mode === 'PHYSICAL' && !reviewComplete)
                          }
                          onPress={() =>
                            run(async valid => {
                              const result = decodeWalkQaProtocol(
                                await runWalkQaCommand('CLEANUP', {
                                  postReturnReviewComplete:
                                    protocol.mode === 'READINESS' ||
                                    reviewComplete,
                                }),
                              );
                              if (!valid()) return;
                              setProtocol(result);
                              await refresh(valid);
                              setPage(null);
                              selectedPage.current = null;
                            })
                          }
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          title="단계 시작"
                          disabled={busy || step?.status === 'IN_PROGRESS'}
                          onPress={() => {
                            if (preview) {
                              switchMode(false);
                              return;
                            }
                            qa('START_STEP');
                          }}
                        />
                        <Button
                          title="단계 종료 / 영수증 저장"
                          disabled={busy || step?.status !== 'IN_PROGRESS'}
                          onPress={() => qa('FINISH_STEP')}
                        />
                        {step?.stepType === 'REBOOT' && (
                          <Button
                            title="재부팅 전 기준점 저장"
                            disabled={busy}
                            onPress={() => qa('MARK_REBOOT')}
                          />
                        )}
                        <Button
                          title="안전상 건너뛰기"
                          disabled={busy || step?.status === 'IN_PROGRESS'}
                          onPress={() =>
                            run(async valid => {
                              const result = decodeWalkQaProtocol(
                                await runWalkQaCommand('SKIP', {
                                  reason: 'SAFETY',
                                }),
                              );
                              if (valid()) setProtocol(result);
                            })
                          }
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.row}>
                      <AppText preset="bodySm" style={styles.flex}>
                        실제 보행 모드 · PO 승인 후에만
                      </AppText>
                      <Switch value={physical} onValueChange={setPhysical} />
                    </View>
                    {physical ? (
                      <>
                        <TextInput
                          style={styles.input}
                          accessibilityLabel="개방 구간 코드"
                          value={openLabel}
                          onChangeText={setOpenLabel}
                          autoCapitalize="characters"
                        />
                        <TextInput
                          style={styles.input}
                          accessibilityLabel="개방 구간 독립 기준 미터"
                          placeholder="독립 기준 거리(m)"
                          value={openMeters}
                          onChangeText={setOpenMeters}
                          keyboardType="decimal-pad"
                        />
                        <TextInput
                          style={styles.input}
                          accessibilityLabel="도심 구간 코드"
                          value={urbanLabel}
                          onChangeText={setUrbanLabel}
                          autoCapitalize="characters"
                        />
                        <TextInput
                          style={styles.input}
                          accessibilityLabel="도심 구간 독립 기준 미터"
                          placeholder="독립 기준 거리(m)"
                          value={urbanMeters}
                          onChangeText={setUrbanMeters}
                          keyboardType="decimal-pad"
                        />
                      </>
                    ) : (
                      <AppText preset="bodySm">
                        준비 점검만 수행합니다. 실제 1km 정확도 결과를 만들지
                        않습니다.
                      </AppText>
                    )}
                    <Button
                      title={
                        physical
                          ? '실제 보행 프로토콜 준비'
                          : '준비 점검 프로토콜 만들기'
                      }
                      disabled={busy}
                      onPress={() =>
                        run(async valid => {
                          await configure(valid, physical);
                        })
                      }
                    />
                  </>
                )}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.flex}>
              <WalkView
                state={state}
                petName={
                  preview && publicGallery ? '누리' : pet?.name ?? '반려동물'
                }
                season={season}
                preview={preview}
                publicPreview={preview && publicGallery}
                designReview={designReview}
                designMessage={designLocation.message}
                distanceM={metrics.distanceM}
                activeMs={metrics.activeMs}
                clockSessionKey={
                  preview || designReview ? null : snapshot?.sessionId
                }
                clockRunning={
                  !preview &&
                  !designReview &&
                  snapshot?.runtimeState === 'WALKING' &&
                  snapshot.serviceRunning
                }
                busy={busy}
                insetTop={insets.top}
                insetBottom={insets.bottom}
                freeLook={mode === 'FREE_LOOK'}
                error={error.startsWith('WALK_')}
                qualityLabel={
                  preview
                    ? '위치 기록 품질: 양호'
                    : snapshot?.distanceSummary?.recommendation ===
                      'ELIGIBLE_CANDIDATE'
                    ? '위치 기록 품질: 양호'
                    : '위치 기록 품질: 확인 필요'
                }
                onClose={close}
                onQa={() => setQaOpen(true)}
                onPrimary={primary}
                onRecenter={() => {
                  setMode(walkCameraAction(mode, 'RECENTER'));
                  setRecenterRevision(n => n + 1);
                }}
                onFinish={
                  state === 'FINISH_CONFIRM'
                    ? finish
                    : () => setFinishConfirm(true)
                }
                onCancelFinish={() => {
                  setFinishConfirm(false);
                  if (preview && galleryState === 'FINISH_CONFIRM')
                    setGalleryState('WALKING');
                }}
                map={
                  <WalkMapStage
                    key={`${
                      preview ? 'public' : snapshot?.sessionId ?? 'no-session'
                    }:${qaOpen}`}
                    preview={preview}
                    personalPreview={preview && !publicGallery}
                    displayLocation={designReview ? designLocation.point : null}
                    page={preview || designReview ? null : page}
                    accent={SEASON_CTA[season].primary}
                    image={petImage}
                    onImageStatus={setPetImageStatus}
                    mode={mode}
                    paused={state === 'PAUSED'}
                    showRoute={
                      !designReview &&
                      !['PRE_WALK', 'GPS_ACQUIRING'].includes(state)
                    }
                    recenterRevision={recenterRevision}
                    onReady={() => setMapReady(true)}
                    onLoaded={() => setMapLoaded(true)}
                    onDrag={() => setMode(walkCameraAction(mode, 'DRAG'))}
                  />
                }
              />
            </View>
          ))}
        {minimizeConfirm && open && (
          <View
            style={[
              styles.minimize,
              {
                backgroundColor: theme.colors.surfaceElevated,
                paddingTop: insets.top + 24,
                paddingBottom: insets.bottom + 24,
              },
            ]}
          >
            <AppText preset="titleLg">
              화면을 닫아도 산책은 계속 기록돼요.
            </AppText>
            <WalkAction
              label="계속 기록하고 닫기"
              season={season}
              onPress={() => {
                setMinimizeConfirm(false);
                setVisible(false);
              }}
              testID="walk-minimize-confirm"
            />
            <WalkAction
              label="산책 화면으로 돌아가기"
              season={season}
              role="secondary"
              onPress={() => setMinimizeConfirm(false)}
            />
          </View>
        )}
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  inspector: { flex: 1, paddingHorizontal: 16 },
  inspectorContent: { gap: 14, paddingBottom: 24 },
  season: { width: '47%' },
  galleryCell: { width: '47%' },
  input: {
    borderWidth: 1,
    borderColor: '#737B80',
    padding: 10,
    minHeight: 48,
    color: '#0B1220',
  },
  minimize: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 20,
  },
});
