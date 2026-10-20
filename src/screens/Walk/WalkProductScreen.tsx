import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { useIsFocused, usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useSeasonPreference } from '../../app/providers/SeasonPreferenceProvider';
import { getSeasonalThemeKey } from '../../theme/seasonal/season';
import AppText from '../../app/ui/AppText';
import {
  getLocationPermissionGrant,
  requestLocationPermissionGrant,
} from '../../services/location/permission';
import { createProductionWalkService } from '../../services/walk/runtime/productionWalkService';
import { createWalkProductNativePort } from '../../services/walk/runtime/productNative';
import { observeNativeWalk } from '../../services/walk/runtime/nativeWalk';
import { createWalkProductionController } from '../../services/walk/runtime/productionController';
import { startWalkWithPermission } from '../../services/walk/runtime/productStartPermission';
import { walkProductResultMetrics } from '../../services/walk/product/resultMetrics';
import type { WalkProductContext } from '../../services/walk/runtime/productWalkService';
import WalkView, { WalkAction } from '../DevTest/walkPresentation/WalkView';
import WalkMapStage from '../DevTest/walkPresentation/WalkMapStage';
import WalkNoticeSheet from '../DevTest/walkPresentation/WalkNoticeSheet';
import WalkRestSheet from '../DevTest/walkPresentation/WalkRestSheet';
import {
  minimizeNotice,
  noticeForError,
  type WalkProductNoticeKind,
} from '../DevTest/walkPresentation/noticeModel';
import { presentationState } from '../DevTest/walkPresentation/model';
import { SEASON_CTA } from '../../app/theme/ctaPalette';
import WalkResultIntegration from '../../components/records/WalkResultIntegration';
import type { WalkResultServerState } from '../../services/walk/product/presentation';
import {
  cachedWalkLevel,
  WALK_SESSION_FEEDBACK_COPY,
} from '../../services/walk/product/feedback';
import { showToast } from '../../store/uiStore';

const ProductMap = memo(WalkMapStage);
const noop = () => undefined;
type Props = NativeStackScreenProps<RootStackParamList, 'WalkProduct'>;
export default function WalkProductScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets(),
    seasonPreference = useSeasonPreference(),
    theme = useTheme(),
    focused = useIsFocused();
  const pets = usePetStore(s => s.pets);
  const [, render] = useReducer((n: number) => n + 1, 0);
  const context = useRef<WalkProductContext>({
    ownerId: null,
    foreground: false,
    revision: 0,
  });
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const [notice, setNotice] = useState<WalkProductNoticeKind | null>(null),
    [rest, setRest] = useState(false),
    [confirm, setConfirm] = useState(false);
  const [freeLook, setFreeLook] = useState(false),
    [recenter, setRecenter] = useState(0),
    [allowExit, setAllowExit] = useState(false);
  const intro = useRef(false),
    permissionFlight = useRef(false),
    permissionRetry = useRef(false),
    syncRef = useRef<() => void>(noop),
    ownerAtEntry = useRef(useAuthStore.getState().session?.user.id ?? null);
  const levelBaseline = useRef<{
    owner: string;
    session: string;
    level: string | undefined;
  } | null>(null);
  const controller = useMemo(() => {
    const native = createWalkProductNativePort();
    return createWalkProductionController({
      petId: route.params.petId,
      context: () => context.current,
      native,
      service: createProductionWalkService(() => context.current),
      observe: observeNativeWalk,
      changed: render,
      feedback: items =>
        showToast({
          message: items.map(key => WALK_SESSION_FEEDBACK_COPY[key]).join(' '),
          tone: 'info',
        }),
    });
  }, [route.params.petId]);
  useEffect(() => {
    controller.attach();
    let app = AppState.currentState;
    const sync = () => {
      const auth = useAuthStore.getState(),
        currentPets = usePetStore.getState().pets;
      const owner = auth.session?.user.id ?? null;
      const petPresent = currentPets.some(
        p =>
          p.id === (controller.state().checkpoint?.petId ?? route.params.petId),
      );
      const foreground =
        app === 'active' &&
        focusedRef.current &&
        !auth.accountDeletionGate &&
        owner === ownerAtEntry.current &&
        petPresent;
      const old = context.current;
      if (old.ownerId === owner && old.foreground === foreground) return;
      context.current = {
        ownerId: owner,
        foreground,
        revision: old.revision + 1,
      };
      const retain =
        owner === old.ownerId &&
        owner === ownerAtEntry.current &&
        petPresent &&
        !auth.accountDeletionGate;
      controller.invalidate(retain);
      if (!retain) permissionRetry.current = false;
      setNotice(foreground && permissionRetry.current ? 'START_AGAIN' : null);
      if (foreground) permissionRetry.current = false;
      setRest(false);
      setConfirm(false);
      if (foreground)
        controller
          .open()
          .then(() => controller.sync())
          .catch(() => setNotice('REQUEST_FAILED'));
    };
    const auth = useAuthStore.subscribe(sync),
      pet = usePetStore.subscribe(sync);
    const appListener = AppState.addEventListener('change', next => {
      app = next;
      sync();
    });
    syncRef.current = sync;
    sync();
    return () => {
      auth();
      pet();
      appListener.remove();
      syncRef.current = noop;
      controller.invalidate();
      context.current = {
        ...context.current,
        foreground: false,
        revision: context.current.revision + 1,
      };
    };
  }, [controller, route.params.petId]);
  useEffect(() => {
    syncRef.current();
  }, [focused]);
  useEffect(() => () => controller.dispose(), [controller]);
  const value = controller.state(),
    checkpoint = value.checkpoint,
    snapshot = value.snapshot;
  // Native validates startedAt; midnight must not change an existing walk's season.
  const season =
    seasonPreference.override ??
    (checkpoint?.startedAt
      ? getSeasonalThemeKey(new Date(checkpoint.startedAt))
      : seasonPreference.season);
  const pet = pets.find(
    p => p.id === (checkpoint?.petId ?? route.params.petId),
  );
  const terminal =
    checkpoint?.phase === 'RESOLVED' && checkpoint.receipt?.state !== 'ACTIVE';
  const active =
    !!checkpoint &&
    !terminal &&
    !['IDLE', 'FINISHED_LOCAL'].includes(
      snapshot?.runtimeState ?? checkpoint.runtimeState,
    );
  const close = useCallback(() => {
    if (permissionFlight.current || controller.state().busy) return;
    const c = controller.state().checkpoint;
    if (c?.runtimeState === 'IDLE' && c.phase !== 'RESOLVED') {
      setNotice('CANCEL_START');
      return;
    }
    if (
      c &&
      c.phase !== 'RESOLVED' &&
      !['IDLE', 'FINISHED_LOCAL'].includes(
        controller.state().snapshot?.runtimeState ?? c.runtimeState,
      )
    )
      setNotice(
        minimizeNotice(
          controller.state().snapshot?.runtimeState ?? c.runtimeState,
        ),
      );
    else setAllowExit(true);
  }, [controller]);
  usePreventRemove(!allowExit && (active || value.busy), close);
  useEffect(() => {
    if (allowExit) navigation.goBack();
  }, [allowExit, navigation]);
  useEffect(() => {
    if (!focused) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (notice) setNotice(null);
      else if (confirm) setConfirm(false);
      else if (rest) setRest(false);
      else close();
      return true;
    });
    return () => back.remove();
  }, [focused, notice, confirm, rest, close]);
  useEffect(() => {
    if (value.error) setNotice(noticeForError(value.error));
  }, [value.error]);
  const start = async (explained = false) => {
    if (permissionFlight.current || value.busy) return;
    permissionFlight.current = true;
    try {
      const captured = context.current;
      const grant = await getLocationPermissionGrant();
      if (context.current !== captured || !captured.foreground) {
        if (context.current.ownerId === ownerAtEntry.current) {
          permissionRetry.current = !context.current.foreground;
          if (context.current.foreground) setNotice('START_AGAIN');
        }
        return;
      }
      if (
        !explained &&
        (grant.status !== 'granted' || grant.accuracy !== 'precise')
      ) {
        setNotice('LOCATION_EXPLANATION');
        return;
      }
      const result = await startWalkWithPermission({
        context: () => context.current,
        check: async () => grant,
        request: requestLocationPermissionGrant,
        start: async () => {
          const owner = context.current.ownerId!;
          const baseline = cachedWalkLevel(owner, route.params.petId);
          const startingContext = context.current;
          await controller.start();
          const c = controller.state().checkpoint;
          if (
            context.current === startingContext &&
            c &&
            !controller.state().error
          ) {
            levelBaseline.current = {
              owner,
              session: c.clientSessionId,
              level: baseline,
            };
          }
        },
      });
      if (
        result === 'RETRY_EXPLICITLY' &&
        context.current.ownerId === ownerAtEntry.current
      )
        permissionRetry.current = true;
      if (
        !context.current.foreground ||
        context.current.ownerId !== ownerAtEntry.current
      )
        return;
      if (result === 'DENIED') setNotice('PERMISSION_REQUIRED');
      else if (result === 'RETRY_EXPLICITLY') setNotice('START_AGAIN');
      else
        setNotice(
          controller.state().error
            ? noticeForError(controller.state().error!)
            : null,
        );
      permissionRetry.current = false;
    } finally {
      permissionFlight.current = false;
    }
  };
  const control = async (
    action: 'PAUSE' | 'RESUME' | 'RESUME_RECOVERED' | 'FINISH',
  ) => {
    if (controller.state().busy) return;
    const captured = context.current;
    await controller.control(action);
    if (context.current !== captured || !captured.foreground) return;
    if (!controller.state().error) {
      setConfirm(false);
      setRest(
        action === 'PAUSE' &&
          controller.state().checkpoint?.runtimeState === 'PAUSED',
      );
    }
  };
  const request = (work: Promise<unknown>) => {
    const captured = context.current;
    work.catch(() => {
      if (
        context.current === captured &&
        context.current.foreground &&
        context.current.ownerId === ownerAtEntry.current
      )
        setNotice('REQUEST_FAILED');
    });
  };
  const state = confirm
    ? 'FINISH_CONFIRM'
    : terminal || checkpoint?.runtimeState === 'FINISHED_LOCAL'
    ? 'FINISHED_LOCAL'
    : checkpoint?.runtimeState === 'RECOVERY_REQUIRED'
    ? 'RECOVERY_REQUIRED'
    : !snapshot && checkpoint?.runtimeState === 'PAUSED'
    ? 'PAUSED'
    : !snapshot &&
      checkpoint &&
      ['STARTING', 'WALKING'].includes(checkpoint.runtimeState)
    ? 'GPS_ACQUIRING'
    : presentationState(snapshot, !!value.page?.current);
  const resultState: WalkResultServerState =
    checkpoint?.receipt?.state === 'ACCEPTED_SERVER'
      ? 'ACCEPTED_SERVER'
      : checkpoint?.receipt?.state === 'REJECTED_SERVER' ||
        checkpoint?.phase === 'FINISH_INVALID' ||
        checkpoint?.receipt?.state === 'DELETED' ||
        checkpoint?.receipt?.state === 'NOT_ACCEPTED_FINAL'
      ? 'REJECTED_SERVER'
      : 'SYNC_PENDING';
  const { distanceM: distance, activeMs } = walkProductResultMetrics(
    checkpoint,
    snapshot,
  );
  const drag = useCallback(() => setFreeLook(true), []),
    recenterMap = useCallback(() => {
      setFreeLook(false);
      setRecenter(n => n + 1);
    }, []);
  const map = useMemo(
    () => (
      <ProductMap
        preview={false}
        page={value.page}
        accent={SEASON_CTA[season].primary}
        image={pet?.avatarUrl?.trim() || null}
        mode={freeLook ? 'FREE_LOOK' : 'FOLLOW'}
        recenterRevision={recenter}
        paused={
          snapshot?.runtimeState === 'PAUSED' ||
          snapshot?.runtimeState === 'RECOVERY_REQUIRED'
        }
        showRoute
        onReady={noop}
        onLoaded={noop}
        onDrag={drag}
      />
    ),
    [
      value.page,
      season,
      pet?.avatarUrl,
      freeLook,
      recenter,
      snapshot?.runtimeState,
      drag,
    ],
  );
  if (!value.ready && pet && ownerAtEntry.current)
    return (
      <View
        testID="walk-product-initializing"
        style={[styles.empty, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator />
        <AppText preset="bodySm">산책 상태를 확인하고 있어요.</AppText>
      </View>
    );
  if (
    !pet ||
    !context.current.ownerId ||
    context.current.ownerId !== ownerAtEntry.current
  )
    return (
      <View
        style={[styles.empty, { backgroundColor: theme.colors.background }]}
      >
        <AppText preset="bodySm">산책할 아이 프로필을 확인해 주세요.</AppText>
        <WalkAction
          season={season}
          label="아이 프로필 확인"
          onPress={() => navigation.replace('PetCreate', { from: 'cta' })}
        />
      </View>
    );
  return (
    <View style={styles.root}>
      <WalkView
        state={state}
        petName={pet.name}
        season={season}
        preview={false}
        distanceM={distance}
        activeMs={activeMs}
        productLocationNote="위치는 산책을 시작한 뒤 확인해요."
        clockSessionKey={checkpoint?.clientSessionId}
        clockRunning={
          !!snapshot &&
          snapshot.runtimeState === 'WALKING' &&
          context.current.foreground
        }
        busy={value.busy || !value.ready}
        map={map}
        insetTop={insets.top}
        insetBottom={insets.bottom}
        freeLook={freeLook}
        error={!!value.error}
        qualityLabel=""
        preWalkIntroSeen={intro}
        qualityNeedsReview={
          snapshot?.distanceSummary?.recommendation === 'INELIGIBLE_CANDIDATE'
        }
        routeAvailable={
          !!value.page?.segments.length && !checkpoint?.routeErased
        }
        routePartial={value.page?.hasEarlier || value.page?.hasLater}
        productStatus={resultState}
        productContent={
          checkpoint && state === 'FINISHED_LOCAL' ? (
            <>
              <WalkResultIntegration
                petId={checkpoint.petId}
                clientSessionId={checkpoint.clientSessionId}
                state={resultState}
                previousLevel={
                  resultState === 'ACCEPTED_SERVER' &&
                  levelBaseline.current?.owner === context.current.ownerId &&
                  levelBaseline.current.session === checkpoint.clientSessionId
                    ? levelBaseline.current.level
                    : undefined
                }
              />
              {resultState === 'SYNC_PENDING' && (
                <AppText preset="unifiedMeta">
                  거리 적립은 결과 확인 후 반영돼요.
                </AppText>
              )}
              {resultState === 'SYNC_PENDING' && (
                <WalkAction
                  season={season}
                  label="연결 후 다시 확인"
                  onPress={() => {
                    request(controller.sync());
                  }}
                />
              )}
            </>
          ) : undefined
        }
        onClose={close}
        onRecenter={recenterMap}
        onPrimary={() => {
          if (state === 'FINISHED_LOCAL') close();
          else if (state === 'PRE_WALK') request(start());
          else if (state === 'RECOVERY_REQUIRED')
            request(control('RESUME_RECOVERED'));
          else if (state === 'PAUSED') request(control('RESUME'));
          else request(control('PAUSE'));
        }}
        onFinish={() => {
          if (confirm) request(control('FINISH'));
          else setConfirm(true);
        }}
        onCancelFinish={() => setConfirm(false)}
      />
      <WalkRestSheet
        visible={rest}
        season={season}
        insetTop={insets.top}
        insetBottom={insets.bottom}
        busy={value.busy}
        error={!!value.error}
        onDismiss={() => setRest(false)}
        onResume={() => {
          request(control('RESUME'));
        }}
      />
      <WalkNoticeSheet
        kind={notice ?? 'REQUEST_FAILED'}
        visible={!!notice}
        season={season}
        insetTop={insets.top}
        insetBottom={insets.bottom}
        busy={value.busy}
        onDismiss={() => setNotice(null)}
        onPrimary={() => {
          if (notice === 'LOCATION_EXPLANATION' || notice === 'START_AGAIN') {
            request(start(notice === 'LOCATION_EXPLANATION'));
          } else if (notice === 'CANCEL_START') {
            const captured = context.current;
            request(
              controller.cancelStart().then(() => {
                if (
                  context.current === captured &&
                  captured.foreground &&
                  !controller.state().error
                ) {
                  setNotice(null);
                  setAllowExit(true);
                }
              }),
            );
          } else if (notice?.startsWith('MINIMIZE_')) {
            setNotice(null);
            setAllowExit(true);
          } else if (notice === 'PERMISSION_REQUIRED')
            request(Linking.openSettings());
          else if (notice === 'LOCATION_DISABLED')
            request(
              Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS'),
            );
          else {
            setNotice(null);
            request(controller.open());
          }
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
});
