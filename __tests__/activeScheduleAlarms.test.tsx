import React from 'react';
import {
  AppState,
  DeviceEventEmitter,
  NativeModules,
  Platform,
  TouchableOpacity,
} from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import {
  normalizeActiveScheduleAlarms,
  readActiveScheduleAlarms,
  stopActiveScheduleAlarm,
  type ActiveScheduleAlarm,
} from '../src/services/schedules/activeAlarm';
import { useActiveScheduleAlarms } from '../src/hooks/useActiveScheduleAlarms';
import HomeActiveAlarmNotice from '../src/screens/Main/components/LoggedInHome/HomeActiveAlarmNotice';

const native = { getActiveAlarms: jest.fn(), stopActiveAlarm: jest.fn() };
const alarm: ActiveScheduleAlarm = {
  alarmId: 'schedule::5::0',
  scheduleId: 'schedule',
  petId: 'pet',
  token: 'delivered-token',
  title: '병원 방문',
  body: '9월 4일 · 오후 8:40 · 5분 전 알림',
  occurrenceAtMillis: 1788522000000,
};
const pets = [{ id: 'pet' }];
let latest: ReturnType<typeof useActiveScheduleAlarms>;
function Harness({
  userId = 'qa',
  focused = true,
}: {
  userId?: string | null;
  focused?: boolean;
}) {
  latest = useActiveScheduleAlarms(userId, pets, focused);
  return null;
}
let tree: TestRenderer.ReactTestRenderer;

beforeAll(() => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: 'android',
  });
  Object.defineProperty(NativeModules, 'NuriScheduleNotifications', {
    configurable: true,
    value: native,
  });
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(AppState.addEventListener).mockReturnValue({ remove: jest.fn() });
  native.getActiveAlarms.mockResolvedValue([alarm]);
  native.stopActiveAlarm.mockResolvedValue(true);
});
afterEach(async () => {
  if (tree)
    await act(async () => {
      tree.unmount();
    });
});

it('accepts only complete actual native alarm identities', () => {
  expect(
    normalizeActiveScheduleAlarms([
      alarm,
      { ...alarm, token: '' },
      { ...alarm, occurrenceAtMillis: NaN },
      null,
    ]),
  ).toEqual([alarm]);
  expect(() => normalizeActiveScheduleAlarms(null)).toThrow(
    'invalid-alarm-state',
  );
});
it('passes only the delivered alarm id and token to Stop', async () => {
  await expect(stopActiveScheduleAlarm(alarm)).resolves.toBe(true);
  expect(native.stopActiveAlarm).toHaveBeenCalledWith(
    alarm.alarmId,
    alarm.token,
  );
});
it('reports unavailable native reads rather than pretending no alarm is ringing', async () => {
  native.getActiveAlarms.mockRejectedValueOnce(new Error('unavailable'));
  await expect(readActiveScheduleAlarms()).rejects.toThrow('unavailable');
});
it('filters other pets and does not stop on mount/app open', async () => {
  native.getActiveAlarms.mockResolvedValue([
    alarm,
    { ...alarm, petId: 'another-user-pet', token: 'other' },
  ]);
  await act(async () => {
    tree = TestRenderer.create(<Harness />);
  });
  expect(latest.alarms).toEqual([alarm]);
  expect(latest.activeScheduleIds.has('schedule')).toBe(true);
  expect(native.stopActiveAlarm).not.toHaveBeenCalled();
});
it('updates ringing state on a native Stop/dismiss event', async () => {
  await act(async () => {
    tree = TestRenderer.create(<Harness />);
  });
  native.getActiveAlarms.mockResolvedValue([]);
  await act(async () => {
    DeviceEventEmitter.emit('NuriScheduleAlarmStateChanged');
  });
  expect(latest.alarms).toEqual([]);
  expect(latest.activeScheduleIds.size).toBe(0);
});
it('rejects stale reads after a newer native event', async () => {
  let resolveOld: (value: ActiveScheduleAlarm[]) => void = () => {};
  native.getActiveAlarms.mockImplementationOnce(
    () =>
      new Promise<ActiveScheduleAlarm[]>(resolve => {
        resolveOld = resolve;
      }),
  );
  await act(async () => {
    tree = TestRenderer.create(<Harness />);
  });
  native.getActiveAlarms.mockResolvedValue([]);
  await act(async () => {
    DeviceEventEmitter.emit('NuriScheduleAlarmStateChanged');
    resolveOld([alarm]);
  });
  expect(latest.alarms).toEqual([]);
});
it('hides old session content immediately and ignores late responses', async () => {
  let resolveOld: (value: ActiveScheduleAlarm[]) => void = () => {};
  native.getActiveAlarms.mockImplementationOnce(
    () =>
      new Promise<ActiveScheduleAlarm[]>(resolve => {
        resolveOld = resolve;
      }),
  );
  await act(async () => {
    tree = TestRenderer.create(<Harness />);
  });
  await act(async () => {
    tree.update(<Harness userId={null} />);
    resolveOld([alarm]);
  });
  expect(latest.alarms).toEqual([]);
  expect(latest.error).toBeNull();
});
it('rechecks native state on foreground return', async () => {
  const subscribe = jest.mocked(AppState.addEventListener);
  await act(async () => {
    tree = TestRenderer.create(<Harness />);
  });
  const listener = subscribe.mock.calls[subscribe.mock.calls.length - 1][1];
  native.getActiveAlarms.mockResolvedValue([]);
  await act(async () => {
    listener('background');
    listener('active');
  });
  expect(latest.alarms).toEqual([]);
});
it('stops one occurrence, keeps another, and refreshes from native acknowledgement', async () => {
  const second = { ...alarm, alarmId: 'b::0::0', scheduleId: 'b', token: 'b' };
  native.getActiveAlarms.mockResolvedValue([alarm, second]);
  await act(async () => {
    tree = TestRenderer.create(<Harness />);
  });
  native.getActiveAlarms.mockResolvedValue([second]);
  await act(async () => {
    await latest.stop(alarm);
  });
  expect(latest.alarms).toEqual([second]);
  expect(native.stopActiveAlarm).toHaveBeenCalledTimes(1);
});
it('retains the active alarm and exposes errors when Stop fails', async () => {
  await act(async () => {
    tree = TestRenderer.create(<Harness />);
  });
  native.stopActiveAlarm.mockRejectedValue(new Error('bridge-failed'));
  await act(async () => {
    await latest.stop(alarm);
  });
  expect(latest.alarms).toEqual([alarm]);
  expect(latest.error).toContain('중지하지 못했어요');
});
it('shows reason and explicit Stop without a modal or automatic Stop', async () => {
  const stop = jest.fn().mockResolvedValue(undefined);
  await act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <HomeActiveAlarmNotice
          alarms={[alarm]}
          error={null}
          stoppingKeys={new Set()}
          onStop={stop}
          onRefresh={jest.fn()}
        />
      </ThemeProvider>,
    );
  });
  expect(JSON.stringify(tree.toJSON())).toContain('병원 방문');
  expect(JSON.stringify(tree.toJSON())).toContain('5분 전 알림');
  expect(stop).not.toHaveBeenCalled();
  const button = tree.root.findByType(TouchableOpacity);
  expect(button.props.accessibilityLabel).toBe('병원 방문 알람 중지');
  await act(async () => {
    button.props.onPress();
  });
  expect(stop).toHaveBeenCalledWith(alarm);
});
it('removes the entire notice when there is no active alarm or error', async () => {
  await act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <HomeActiveAlarmNotice
          alarms={[]}
          error={null}
          stoppingKeys={new Set()}
          onStop={jest.fn()}
          onRefresh={jest.fn()}
        />
      </ThemeProvider>,
    );
  });
  expect(tree.toJSON()).toBeNull();
});
