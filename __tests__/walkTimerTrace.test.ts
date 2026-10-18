import { isWalkDistanceQaEnabled } from '../src/services/walk/runtime/distanceProjection';
import {
  clearTimerTrace,
  startTimerTrace,
  stopTimerTrace,
  timerTrace,
  timerTraceCommit,
  timerTraceContext,
} from '../src/screens/DevTest/walkPresentation/timerTrace';

jest.mock('../src/services/walk/runtime/distanceProjection', () => ({
  isWalkDistanceQaEnabled: jest.fn(() => true),
}));
const enabled = jest.mocked(isWalkDistanceQaEnabled);
beforeEach(() => {
  clearTimerTrace();
  enabled.mockReturnValue(true);
});
afterEach(clearTimerTrace);

it('records correlated tick and commit timing without a private identity', () => {
  expect(startTimerTrace('STATIC')).toBe(true);
  timerTraceContext(
    'private-session-test',
    'WALKING',
    '2',
    '1000',
    'FOLLOW',
    '3',
  );
  const event = timerTrace('TICK', {
    expectedTickMonoMs: 1000,
    firedTickMonoMs: 1400,
    tickLatenessMs: 400,
    displaySecondBefore: 0,
    displaySecondAfter: 1,
    stateSetMonoMs: 1400,
  });
  timerTraceCommit(event);
  const receipt = stopTimerTrace()!;
  expect(receipt.eventCount).toBe(2);
  expect(receipt.events[1].renderCommitMonoMs).toEqual(expect.any(Number));
  expect(receipt.events[1].sessionHash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(receipt)).not.toContain('private-session-test');
  expect(stopTimerTrace()).toBeNull();
});

it('retains only the latest 2000 events in sequence and reports dropped events', () => {
  startTimerTrace('MAP');
  for (let i = 0; i < 2015; i++) timerTrace('TICK', { firedTickMonoMs: i });
  const receipt = stopTimerTrace()!;
  expect(receipt.events).toHaveLength(2000);
  expect(receipt.events[0].sequence).toBe(16);
  expect(receipt.events.at(-1)?.sequence).toBe(2015);
  expect(receipt.droppedEvents).toBe(15);
});

it('disables recording and exporting when the native compile-time QA gate is closed', () => {
  enabled.mockReturnValue(false);
  expect(startTimerTrace('STATIC')).toBe(false);
  expect(timerTrace('TICK')).toBeNull();
  expect(stopTimerTrace()).toBeNull();
});

it('rejects duplicate starts and clears data explicitly', () => {
  expect(startTimerTrace('STATIC')).toBe(true);
  expect(startTimerTrace('MAP')).toBe(false);
  timerTrace('TICK');
  clearTimerTrace();
  expect(stopTimerTrace()).toBeNull();
  expect(startTimerTrace('MAP')).toBe(true);
  expect(stopTimerTrace()?.events).toHaveLength(0);
});
