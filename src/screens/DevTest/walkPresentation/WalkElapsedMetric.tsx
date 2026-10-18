import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, type StyleProp, type TextStyle } from 'react-native';
import AppText from '../../../app/ui/AppText';
import { metricTime } from './model';
import {
  timerTrace,
  timerTraceCommit,
  type TimerTraceEvent,
} from './timerTrace';

type Props = {
  activeMs: string;
  sessionKey?: string | null;
  running: boolean;
  style: StyleProp<TextStyle>;
};
type Anchor = { sessionKey: string; activeMs: number; sampledAt: number };

export default function WalkElapsedMetric({
  activeMs,
  sessionKey,
  running,
  style,
}: Props) {
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const [displayMs, setDisplayMs] = useState(activeMs);
  const anchor = useRef<Anchor | null>(null);
  const pendingTrace = useRef<TimerTraceEvent | null>(null);
  const displayed = useRef(Number(activeMs));
  const nativeMs = /^\d+$/.test(activeMs) ? Number(activeMs) : NaN;
  const ticking =
    running && foreground && !!sessionKey && Number.isSafeInteger(nativeMs);

  useEffect(() => {
    let previousState = AppState.currentState;
    const listener = AppState.addEventListener('change', state => {
      if (state === previousState) return;
      previousState = state;
      timerTrace('APP_STATE', { firedTickMonoMs: performance.now() });
      // Background time belongs to native runtime, never a suspended JS interval.
      anchor.current = null;
      setForeground(state === 'active');
    });
    return () => {
      listener.remove();
      timerTrace('UNMOUNT', { firedTickMonoMs: performance.now() });
    };
  }, []);

  useLayoutEffect(() => {
    displayed.current = Number(ticking ? displayMs : activeMs);
    if (pendingTrace.current?.computedElapsedMs === Number(displayMs)) {
      timerTraceCommit(pendingTrace.current);
      pendingTrace.current = null;
    }
  });

  useEffect(() => {
    if (!ticking || !sessionKey) {
      pendingTrace.current = timerTrace('FREEZE', {
        nativeActiveMs: nativeMs,
        computedElapsedMs: nativeMs,
        stateSetMonoMs: performance.now(),
      });
      anchor.current = null;
      setDisplayMs(activeMs);
      return;
    }
    const now = performance.now();
    const previous = anchor.current;
    const projected =
      previous?.sessionKey === sessionKey
        ? previous.activeMs + Math.max(0, now - previous.sampledAt)
        : nativeMs;
    // Reconcile sparse checkpoints without double-counting or moving backwards.
    const nextMs = Math.max(nativeMs, projected);
    pendingTrace.current = timerTrace('ANCHOR', {
      nativeActiveMs: nativeMs,
      anchorMonoMs: now,
      anchorActiveMs: nextMs,
      computedElapsedMs: Math.floor(nextMs),
      anchorCorrectionMs: nextMs - projected,
      displaySecondBefore: Math.floor(displayed.current / 1000),
      displaySecondAfter: Math.floor(nextMs / 1000),
      stateSetMonoMs: now,
    });
    anchor.current = { sessionKey, activeMs: nextMs, sampledAt: now };
    setDisplayMs(String(Math.floor(nextMs)));
  }, [activeMs, nativeMs, sessionKey, ticking]);

  useEffect(() => {
    if (!ticking) return;
    let expected = performance.now() + 1000;
    timerTrace('INTERVAL_START', { expectedTickMonoMs: expected });
    const timer = setInterval(() => {
      const current = anchor.current;
      if (!current) return;
      const fired = performance.now();
      const computed = Math.floor(
        current.activeMs + Math.max(0, fired - current.sampledAt),
      );
      pendingTrace.current = timerTrace('TICK', {
        anchorMonoMs: current.sampledAt,
        anchorActiveMs: current.activeMs,
        expectedTickMonoMs: expected,
        firedTickMonoMs: fired,
        tickLatenessMs: fired - expected,
        computedElapsedMs: computed,
        displaySecondBefore: Math.floor(displayed.current / 1000),
        displaySecondAfter: Math.floor(computed / 1000),
        stateSetMonoMs: performance.now(),
      });
      expected += 1000;
      setDisplayMs(String(computed));
    }, 1000);
    return () => {
      clearInterval(timer);
      timerTrace('INTERVAL_STOP', { firedTickMonoMs: performance.now() });
    };
  }, [ticking]);

  return (
    <AppText
      preset="titleLg"
      style={style}
      fontModeOverride="pretendard"
      testID="walk-time-value"
    >
      {metricTime(ticking ? displayMs : activeMs)}
    </AppText>
  );
}
