import React, { useEffect, useRef, useState } from 'react';
import { AppState, type StyleProp, type TextStyle } from 'react-native';
import AppText from '../../../app/ui/AppText';
import { metricTime } from './model';

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
  const nativeMs = /^\d+$/.test(activeMs) ? Number(activeMs) : NaN;
  const ticking =
    running && foreground && !!sessionKey && Number.isSafeInteger(nativeMs);

  useEffect(() => {
    let previousState = AppState.currentState;
    const listener = AppState.addEventListener('change', state => {
      if (state === previousState) return;
      previousState = state;
      // Background time belongs to native runtime, never a suspended JS interval.
      anchor.current = null;
      setForeground(state === 'active');
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!ticking || !sessionKey) {
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
    anchor.current = { sessionKey, activeMs: nextMs, sampledAt: now };
    setDisplayMs(String(Math.floor(nextMs)));
  }, [activeMs, nativeMs, sessionKey, ticking]);

  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => {
      const current = anchor.current;
      if (!current) return;
      setDisplayMs(
        String(
          Math.floor(
            current.activeMs +
              Math.max(0, performance.now() - current.sampledAt),
          ),
        ),
      );
    }, 1000);
    return () => clearInterval(timer);
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
