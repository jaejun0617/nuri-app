import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const requested = useRef(Number(activeMs));
  const reschedule = useRef<(() => void) | null>(null);
  const nativeMs = /^\d+$/.test(activeMs) ? Number(activeMs) : NaN;
  const projectable = running && !!sessionKey && Number.isSafeInteger(nativeMs);
  const ticking = projectable && foreground;
  const publish = useCallback((value: number, event: TimerTraceEvent | null) => {
    // Checkpoints may arrive between second boundaries. Only changed text needs a commit.
    if (Math.floor(requested.current / 1000) === Math.floor(value / 1000)) return;
    requested.current = value;
    pendingTrace.current = event;
    setDisplayMs(String(value));
  }, []);

  useEffect(() => {
    let previousState = AppState.currentState;
    const listener = AppState.addEventListener('change', state => {
      if (state === previousState) return;
      previousState = state;
      timerTrace('APP_STATE', { firedTickMonoMs: performance.now() });
      // Stop scheduling in background, but retain the active monotonic anchor until
      // the foreground GET resolves. Native pause/recovery still invalidates it.
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
    if (!projectable || !sessionKey) {
      const event = timerTrace('FREEZE', {
        nativeActiveMs: nativeMs,
        computedElapsedMs: nativeMs,
        stateSetMonoMs: performance.now(),
      });
      anchor.current = null;
      publish(nativeMs, event);
      return;
    }
    if (anchor.current?.sessionKey !== sessionKey) anchor.current = null;
    if (!foreground) return;
    const now = performance.now();
    const previous = anchor.current;
    const projected =
      previous?.sessionKey === sessionKey
        ? previous.activeMs + Math.max(0, now - previous.sampledAt)
        : nativeMs;
    // A stale/equal checkpoint must not reanchor or publish an off-cadence second.
    // A genuinely newer native duration remains authoritative; never smooth it away.
    if (previous && nativeMs <= projected) return;
    const nextMs = Math.max(nativeMs, projected);
    const event = timerTrace('ANCHOR', {
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
    publish(Math.floor(nextMs), event);
    reschedule.current?.();
  }, [foreground, nativeMs, projectable, publish, sessionKey]);

  useEffect(() => {
    if (!ticking) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer !== undefined) clearTimeout(timer);
      const current = anchor.current;
      if (!alive || current?.sessionKey !== sessionKey) return;
      const now = performance.now();
      const elapsed = current.activeMs + Math.max(0, now - current.sampledAt);
      // Recompute the next absolute second boundary after every callback. The
      // minimum avoids a hot loop when Android delivers a callback just early.
      const delay = Math.max(16, Math.ceil(1000 - (elapsed % 1000)));
      const expected = now + delay;
      timer = setTimeout(() => tick(expected), delay);
    };
    const tick = (expected: number) => {
      const current = anchor.current;
      if (!alive || current?.sessionKey !== sessionKey) return;
      const fired = performance.now();
      const computed = Math.floor(
        current.activeMs + Math.max(0, fired - current.sampledAt),
      );
      const event = timerTrace('TICK', {
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
      publish(computed, event);
      schedule();
    };
    reschedule.current = schedule;
    timerTrace('INTERVAL_START', { firedTickMonoMs: performance.now() });
    tick(performance.now());
    return () => {
      alive = false;
      if (timer !== undefined) clearTimeout(timer);
      if (reschedule.current === schedule) reschedule.current = null;
      timerTrace('INTERVAL_STOP', { firedTickMonoMs: performance.now() });
    };
  }, [publish, sessionKey, ticking]);

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
