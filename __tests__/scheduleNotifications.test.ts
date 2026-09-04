import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const mockScheduleNativeModule = {
  schedule: jest.fn(),
  cancel: jest.fn(),
  cancelAll: jest.fn(),
  getSettings: jest.fn(),
  getRuntimeCapabilities: jest.fn(),
  setEnabled: jest.fn(),
  openAppNotificationSettings: jest.fn(),
};
const mockPermissionCheck = jest.fn();

import {
  captureScheduleNotificationLifecycle,
  clearAllScheduleNotifications,
  clearScheduleNotification,
  getScheduleNotificationHelperText,
  getScheduleNotificationSyncFeedback,
  upsertScheduleNotification,
  type SchedulableSchedule,
} from '../src/services/schedules/notifications';

function createSchedule(
  overrides: Partial<SchedulableSchedule> = {},
): SchedulableSchedule {
  return {
    id: 'schedule-1',
    petId: 'pet-1',
    title: '병원 방문',
    note: '비공개 건강 메모',
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    repeatRule: 'none',
    reminderMinutes: [10],
    completedAt: null,
    ...overrides,
  };
}

describe('schedule notification lifecycle', () => {
  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: 36,
    });
    Object.defineProperty(NativeModules, 'NuriScheduleNotifications', {
      configurable: true,
      value: mockScheduleNativeModule,
      writable: true,
    });
    jest
      .spyOn(PermissionsAndroid, 'check')
      .mockImplementation(mockPermissionCheck);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPermissionCheck.mockResolvedValue(true);
    mockScheduleNativeModule.getSettings.mockResolvedValue({ enabled: true });
    mockScheduleNativeModule.getRuntimeCapabilities.mockResolvedValue(
      undefined,
    );
    mockScheduleNativeModule.schedule.mockResolvedValue('scheduled');
    mockScheduleNativeModule.cancelAll.mockResolvedValue({
      status: 'cleared',
      delivery: 'not-applicable',
    });
  });

  it('clears the old device alarm before a missing permission result', async () => {
    mockPermissionCheck.mockResolvedValue(false);

    const result = await upsertScheduleNotification(createSchedule());

    expect(result.status).toBe('missing-permission');
    expect(result.deviceAlarm).toBe('cleared');
    expect(mockScheduleNativeModule.cancel).toHaveBeenCalledWith('schedule-1');
    expect(mockScheduleNativeModule.schedule).not.toHaveBeenCalled();
    expect(
      mockScheduleNativeModule.cancel.mock.invocationCallOrder[0],
    ).toBeLessThan(mockPermissionCheck.mock.invocationCallOrder[0]);
  });

  it('keeps saved record semantics separate and never sends the private note', async () => {
    const result = await upsertScheduleNotification(createSchedule());
    const payload = mockScheduleNativeModule.schedule.mock.calls[0][0];

    expect(result).toMatchObject({
      status: 'scheduled',
      persistedRecord: 'unchanged',
      deviceAlarm: 'scheduled',
      exactAlarm: 'unknown',
      channel: 'unknown',
    });
    expect(payload.title).toBe('NURI 일정 알림');
    expect(payload.body).not.toContain('비공개 건강 메모');
  });

  it('does not mask a later reminder failure as a full success', async () => {
    mockScheduleNativeModule.schedule
      .mockResolvedValueOnce('scheduled')
      .mockRejectedValueOnce(new Error('second reminder failed'));

    const result = await upsertScheduleNotification(
      createSchedule({ reminderMinutes: [10, 20] }),
    );

    expect(result.status).toBe('partial-failure');
    expect(result.deviceAlarm).toBe('partial');
    expect(mockScheduleNativeModule.schedule).toHaveBeenCalledTimes(2);
    expect(mockScheduleNativeModule.cancel).toHaveBeenCalledTimes(2);
    expect(getScheduleNotificationSyncFeedback(result)?.tone).toBe('error');
  });

  it('registers an on-time reminder with the event occurrence identity', async () => {
    const schedule = createSchedule({ reminderMinutes: [0], repeatRule: 'daily' });
    const result = await upsertScheduleNotification(schedule);
    expect(result.status).toBe('scheduled');
    expect(mockScheduleNativeModule.schedule).toHaveBeenCalledWith(expect.objectContaining({
      alarmId: 'schedule-1::0::0',
      fireAtMillis: new Date(schedule.startsAt).getTime(),
      occurrenceAtMillis: new Date(schedule.startsAt).getTime(),
      repeatRule: 'daily',
    }));
  });

  it('cancels a pending native schedule when clear-all wins the race', async () => {
    let resolveSchedule: (value: string) => void = () => {};
    let markScheduleStarted: () => void = () => {};
    const scheduleStarted = new Promise<void>(resolve => {
      markScheduleStarted = resolve;
    });
    mockScheduleNativeModule.schedule.mockImplementation(
      () =>
        new Promise<string>(resolve => {
          resolveSchedule = resolve;
          markScheduleStarted();
        }),
    );

    const pending = upsertScheduleNotification(createSchedule());
    await scheduleStarted;
    const clearResult = await clearAllScheduleNotifications();

    resolveSchedule('scheduled');
    const result = await pending;

    expect(clearResult.status).toBe('cleared');
    expect(result.status).toBe('cancelled');
    expect(mockScheduleNativeModule.cancelAll).toHaveBeenCalledTimes(1);
    expect(mockScheduleNativeModule.cancel).toHaveBeenCalledWith('schedule-1');
    expect(
      mockScheduleNativeModule.cancel.mock.invocationCallOrder[
        mockScheduleNativeModule.cancel.mock.invocationCallOrder.length - 1
      ],
    ).toBeGreaterThan(
      mockScheduleNativeModule.cancelAll.mock.invocationCallOrder[0],
    );
  });

  it('cancels old alarms before rescheduling a changed time', async () => {
    const first = await upsertScheduleNotification(createSchedule());
    const firstFireAt =
      mockScheduleNativeModule.schedule.mock.calls[0][0].fireAtMillis;
    mockScheduleNativeModule.schedule.mockClear();
    mockScheduleNativeModule.cancel.mockClear();

    const second = await upsertScheduleNotification(
      createSchedule({
        startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      }),
    );
    const secondFireAt =
      mockScheduleNativeModule.schedule.mock.calls[0][0].fireAtMillis;

    expect(first.status).toBe('scheduled');
    expect(second.status).toBe('scheduled');
    expect(secondFireAt).toBeGreaterThan(firstFireAt);
    expect(mockScheduleNativeModule.cancel).toHaveBeenCalledWith('schedule-1');
  });

  it('reports inexact delivery when exact-alarm access is not granted', async () => {
    mockScheduleNativeModule.getRuntimeCapabilities.mockResolvedValue({
      enabled: true,
      exactAlarm: 'not-granted',
      channel: 'ready',
    });

    const result = await upsertScheduleNotification(createSchedule());

    expect(result).toMatchObject({
      status: 'scheduled',
      delivery: 'inexact',
      exactAlarm: 'not-granted',
      channel: 'ready',
    });
    expect(getScheduleNotificationSyncFeedback(result)?.message).toContain(
      '정확한 시간 권한',
    );
  });

  it('does not report a device alarm when the notification channel is blocked', async () => {
    mockScheduleNativeModule.getRuntimeCapabilities.mockResolvedValue({
      enabled: true,
      exactAlarm: 'granted',
      channel: 'blocked',
    });

    const result = await upsertScheduleNotification(createSchedule());

    expect(result.status).toBe('channel-blocked');
    expect(result.deviceAlarm).toBe('not-scheduled');
    expect(mockScheduleNativeModule.schedule).not.toHaveBeenCalled();
  });

  it('supports explicit off/delete cancellation without changing the saved record', () => {
    const result = clearScheduleNotification('schedule-1');

    expect(result).toMatchObject({
      status: 'cleared',
      persistedRecord: 'unchanged',
      deviceAlarm: 'cleared',
    });
    expect(mockScheduleNativeModule.cancel).toHaveBeenCalledWith('schedule-1');
  });

  it('does not allow a pending schedule request to re-register after clear-all', async () => {
    let resolvePermission: (value: boolean) => void = () => {};
    mockPermissionCheck.mockImplementation(
      () =>
        new Promise<boolean>(resolve => {
          resolvePermission = resolve;
        }),
    );

    const pending = upsertScheduleNotification(createSchedule());
    await Promise.resolve();
    const clearResult = await clearAllScheduleNotifications();

    resolvePermission(true);
    const result = await pending;

    expect(clearResult.status).toBe('cleared');
    expect(mockScheduleNativeModule.cancelAll).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('cancelled');
    expect(mockScheduleNativeModule.schedule).not.toHaveBeenCalled();
  });

  it('cancels a late DB save side effect without touching native alarms', async () => {
    const lifecycle = captureScheduleNotificationLifecycle();
    let resolveDatabaseSave: () => void = () => {};
    const pendingDatabaseSave = new Promise<void>(resolve => {
      resolveDatabaseSave = resolve;
    });
    const lateNotificationSync = pendingDatabaseSave.then(() =>
      upsertScheduleNotification(createSchedule(), lifecycle),
    );

    const clearAllPromise = clearAllScheduleNotifications();
    await clearAllPromise;
    resolveDatabaseSave();

    const result = await lateNotificationSync;

    expect(result.status).toBe('cancelled');
    expect(mockScheduleNativeModule.cancelAll).toHaveBeenCalledTimes(1);
    expect(mockScheduleNativeModule.cancel).not.toHaveBeenCalled();
    expect(mockScheduleNativeModule.schedule).not.toHaveBeenCalled();
  });

  it('waits for native cancel-all acknowledgement and preserves a failure', async () => {
    let resolveCancelAll: (value: unknown) => void = () => {};
    mockScheduleNativeModule.cancelAll.mockReturnValue(
      new Promise(resolve => {
        resolveCancelAll = resolve;
      }),
    );

    const pending = clearAllScheduleNotifications();
    await Promise.resolve();

    let settled = false;
    pending.finally(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveCancelAll({
      status: 'failed',
      delivery: 'not-applicable',
      errorCode: 'alarm-registry-write-failed',
    });

    await expect(pending).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'alarm-registry-write-failed',
    });
  });

  it('clears completed schedules without scheduling a device alarm', async () => {
    const result = await upsertScheduleNotification(
      createSchedule({ completedAt: new Date().toISOString() }),
    );

    expect(result.status).toBe('cleared');
    expect(result.deviceAlarm).toBe('cleared');
    expect(mockPermissionCheck).not.toHaveBeenCalled();
    expect(mockScheduleNativeModule.schedule).not.toHaveBeenCalled();
  });

  it('does not claim a confirmed reservation when Android capability is unknown', () => {
    const helperText = getScheduleNotificationHelperText([10], 'granted', {
      enabled: true,
      platform: 'android',
      nativeSupported: true,
      permission: 'granted',
      exactAlarm: 'unknown',
      channel: 'unknown',
      delivery: 'unknown',
      canOpenExactAlarmSettings: false,
    });

    expect(helperText).toContain('예약을 시도');
    expect(helperText).not.toContain('예약됩니다');
  });
});
