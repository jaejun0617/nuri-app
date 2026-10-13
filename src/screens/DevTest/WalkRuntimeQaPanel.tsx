import React, { useEffect, useRef, useState } from 'react';
import { Button, PermissionsAndroid, Text, View } from 'react-native';
import { usePetStore } from '../../store/petStore';
import {
  createWalkCommandId,
  getWalkSnapshot,
  isWalkQaEnabled,
  mutateNativeWalk,
  observeNativeWalk,
  startNativeWalk,
  type WalkNativeAction,
  type WalkNativeSnapshot,
} from '../../services/walk/runtime/nativeWalk';
import { performLogout } from '../../services/auth/session';

export default function WalkRuntimeQaPanel() {
  const [snapshot, setSnapshot] = useState<WalkNativeSnapshot | null>(null);
  const [error, setError] = useState('READY');
  const [busy, setBusy] = useState(false);
  const lastFinish = useRef<{
    snapshot: WalkNativeSnapshot;
    command: string;
  } | null>(null);
  const run = async (operation: () => Promise<WalkNativeSnapshot | null>) => {
    if (busy || !isWalkQaEnabled()) return;
    setBusy(true);
    try {
      setSnapshot(await operation());
      setError('PASS');
    } catch (value: unknown) {
      const code =
        typeof value === 'object' && value !== null && 'code' in value
          ? value.code
          : null;
      const message = value instanceof Error ? value.message : null;
      const safe =
        typeof code === 'string' && /^WALK_[A-Z_]+$/.test(code)
          ? code
          : typeof message === 'string' && /^WALK_[A-Z_]+$/.test(message)
          ? message
          : 'WALK_QA_FAILED';
      setError(safe);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!isWalkQaEnabled()) return;
    const stop = observeNativeWalk(setSnapshot);
    getWalkSnapshot().then(setSnapshot, () =>
      setError('WALK_SNAPSHOT_UNAVAILABLE'),
    );
    return stop;
  }, []);
  if (!isWalkQaEnabled()) return null;
  const mutate = (action: WalkNativeAction) =>
    run(async () => {
      const current = await getWalkSnapshot();
      if (!current) throw new Error('WALK_SESSION_UNAVAILABLE');
      const command = await createWalkCommandId();
      if (action === 'finishWalk')
        lastFinish.current = { snapshot: current, command };
      return mutateNativeWalk(action, current, command);
    });
  const receipt = snapshot
    ? {
        state: snapshot.runtimeState,
        revision: snapshot.revision,
        activeMs: snapshot.elapsedActiveMs,
        pausedMs: snapshot.elapsedPausedMs,
        fixCount: snapshot.fixCount,
        chunks: snapshot.encryptedChunkCount,
        segments: snapshot.segmentCount,
        serviceRunning: snapshot.serviceRunning,
        subscription: snapshot.subscriptionActive,
        recoverable: snapshot.recoverable,
        permission: snapshot.permissionState,
        notification: snapshot.notificationPermissionState,
        distance: snapshot.distanceStatus,
      }
    : { state: 'IDLE' };
  return (
    <View>
      <Text>WALK PHASE 2 QA</Text>
      <Text selectable testID="walk-runtime-receipt">
        {JSON.stringify(receipt, null, 2)}
      </Text>
      <Text testID="walk-runtime-error">{error}</Text>
      <Button
        title="Walk permissions"
        disabled={busy}
        onPress={() =>
          run(async () => {
            await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            ]);
            return getWalkSnapshot();
          })
        }
      />
      <Button
        title="Walk snapshot"
        disabled={busy}
        onPress={() => run(getWalkSnapshot)}
      />
      <Button
        title="Walk start"
        disabled={busy}
        onPress={() =>
          run(async () => {
            const petId = usePetStore.getState().selectedPetId;
            if (!petId) throw new Error('WALK_PET_REQUIRED');
            return startNativeWalk(petId, await createWalkCommandId());
          })
        }
      />
      <Button
        title="Walk pause"
        disabled={busy}
        onPress={() => mutate('pauseWalk')}
      />
      <Button
        title="Walk resume"
        disabled={busy}
        onPress={() => mutate('resumeWalk')}
      />
      <Button
        title="Walk finish"
        disabled={busy}
        onPress={() => mutate('finishWalk')}
      />
      <Button
        title="Walk duplicate finish"
        disabled={busy}
        onPress={() =>
          run(async () => {
            const finish = lastFinish.current;
            if (!finish) throw new Error('WALK_FINISH_NOT_READY');
            return mutateNativeWalk(
              'finishWalk',
              finish.snapshot,
              finish.command,
            );
          })
        }
      />
      <Button
        title="Walk recover pause"
        disabled={busy}
        onPress={() => mutate('recoverPause')}
      />
      <Button
        title="Walk recover resume"
        disabled={busy}
        onPress={() => mutate('resumeRecoveredWalk')}
      />
      <Button
        title="Walk discard recovered"
        disabled={busy}
        onPress={() => mutate('discardRecoverableWalk')}
      />
      <Button
        title="Walk logout QA"
        disabled={busy}
        onPress={() =>
          run(async () => {
            await performLogout();
            return null;
          })
        }
      />
    </View>
  );
}
