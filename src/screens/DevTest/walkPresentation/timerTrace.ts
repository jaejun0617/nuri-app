import { sha256 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';
import { AppState } from 'react-native';
import { isWalkDistanceQaEnabled } from '../../../services/walk/runtime/distanceProjection';

export type TimerScenario =
  | 'STATIC'
  | 'MAP'
  | 'PAUSE_RESUME'
  | 'APPSTATE'
  | 'FINAL_STATIC';
type EventType =
  | 'TICK'
  | 'ANCHOR'
  | 'FREEZE'
  | 'APP_STATE'
  | 'INTERVAL_START'
  | 'INTERVAL_STOP'
  | 'UNMOUNT'
  | 'SNAPSHOT'
  | 'HOST_COMMIT'
  | 'MAP_COMMIT';
type Fields = {
  nativeRevision?: number;
  nativeActiveMs?: number;
  nativeSnapshotMonoMs?: number;
  anchorMonoMs?: number;
  anchorActiveMs?: number;
  expectedTickMonoMs?: number;
  firedTickMonoMs?: number;
  tickLatenessMs?: number;
  computedElapsedMs?: number;
  displaySecondBefore?: number;
  displaySecondAfter?: number;
  anchorCorrectionMs?: number;
  stateSetMonoMs?: number;
  renderCommitMonoMs?: number;
};
export type TimerTraceEvent = Fields & {
  eventType: EventType;
  sequence: number;
  sessionHash: string | null;
  runtimeState: string;
  appState: string;
  mapMode: 'FOLLOW' | 'FREE_LOOK';
  routeRevision: number;
};
const LIMIT = 2000;
const SCENARIOS: readonly TimerScenario[] = [
  'STATIC',
  'MAP',
  'PAUSE_RESUME',
  'APPSTATE',
  'FINAL_STATIC',
];
let recording = false;
let scenario: TimerScenario = 'STATIC';
let startMonoMs = 0;
let sequence = 0;
let writeIndex = 0;
let events: TimerTraceEvent[] = [];
let context: Pick<
  TimerTraceEvent,
  'sessionHash' | 'runtimeState' | 'mapMode' | 'routeRevision'
> = {
  sessionHash: null,
  runtimeState: 'IDLE',
  mapMode: 'FOLLOW',
  routeRevision: 0,
};
let lastSession: string | null = null;

export function startTimerTrace(value: TimerScenario): boolean {
  if (!isWalkDistanceQaEnabled() || recording || !SCENARIOS.includes(value))
    return false;
  events = [];
  sequence = 0;
  writeIndex = 0;
  scenario = value;
  startMonoMs = performance.now();
  recording = true;
  return true;
}

// Only these scalar arguments cross the trace boundary. Never pass a snapshot or route.
export function timerTraceContext(
  session: string | null,
  runtimeState: string,
  nativeRevision: string,
  nativeActiveMs: string,
  mapMode: 'FOLLOW' | 'FREE_LOOK',
  routeRevision: string,
) {
  if (!isWalkDistanceQaEnabled()) return;
  if (session !== lastSession) {
    lastSession = session;
    context.sessionHash = session
      ? Buffer.from(
          sha256(Buffer.from(`walk-timer:${session}`, 'utf8')),
        ).toString('hex')
      : null;
  }
  context.runtimeState = /^[A-Z_]+$/.test(runtimeState)
    ? runtimeState
    : 'UNKNOWN';
  context.mapMode = mapMode;
  context.routeRevision = Number(routeRevision);
  timerTrace('SNAPSHOT', {
    nativeRevision: Number(nativeRevision),
    nativeActiveMs: Number(nativeActiveMs),
    nativeSnapshotMonoMs: performance.now(),
  });
}

export function timerTrace(
  eventType: EventType,
  fields: Fields = {},
): TimerTraceEvent | null {
  if (!recording) return null;
  const event: TimerTraceEvent = {
    eventType,
    sequence: ++sequence,
    ...context,
    appState: AppState.currentState ?? 'unknown',
    ...fields,
  };
  if (events.length < LIMIT) events.push(event);
  else {
    events[writeIndex] = event;
    writeIndex = (writeIndex + 1) % LIMIT;
  }
  return event;
}

export function timerTraceCommit(event: TimerTraceEvent | null) {
  if (recording && event) event.renderCommitMonoMs = performance.now();
}

export function stopTimerTrace() {
  if (!recording || !isWalkDistanceQaEnabled()) return null;
  recording = false;
  const ordered =
    events.length === LIMIT
      ? [...events.slice(writeIndex), ...events.slice(0, writeIndex)]
      : events;
  const receipt = {
    schemaVersion: 1,
    scenario,
    startMonoMs,
    endMonoMs: performance.now(),
    eventCount: sequence,
    retainedEvents: ordered.length,
    droppedEvents: Math.max(0, sequence - LIMIT),
    frameObserved: false,
    events: ordered,
  };
  events = [];
  writeIndex = 0;
  return receipt;
}

export function clearTimerTrace() {
  recording = false;
  events = [];
  sequence = 0;
  writeIndex = 0;
  lastSession = null;
  context = {
    sessionHash: null,
    runtimeState: 'IDLE',
    mapMode: 'FOLLOW',
    routeRevision: 0,
  };
}
