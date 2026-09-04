import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

const mockTapNativeModule = {
  getInitialScheduleNotificationTap: jest.fn(),
  markScheduleNotificationTapConsumerReady: jest.fn(),
  markScheduleNotificationTapConsumerNotReady: jest.fn(),
};
import {
  getInitialScheduleNotificationTap,
  markScheduleNotificationTapConsumerNotReady,
  markScheduleNotificationTapConsumerReady,
  normalizeScheduleNotificationTap,
  resolveScheduleNotificationTapRoute,
  SCHEDULE_NOTIFICATION_TAP_EVENT,
  subscribeToScheduleNotificationTaps,
} from '../src/services/schedules/notificationTap';

describe('schedule notification tap handoff', () => {
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
      value: mockTapNativeModule,
      writable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTapNativeModule.getInitialScheduleNotificationTap.mockResolvedValue(
      null,
    );
  });

  it('accepts only a complete schedule tap payload', () => {
    expect(
      normalizeScheduleNotificationTap({
        type: 'schedule',
        scheduleId: ' schedule-1 ',
        petId: 'pet-1',
      }),
    ).toEqual({
      type: 'schedule',
      scheduleId: 'schedule-1',
      petId: 'pet-1',
    });
    expect(normalizeScheduleNotificationTap({ type: 'health' })).toBeNull();
    expect(
      normalizeScheduleNotificationTap({ type: 'schedule', scheduleId: 'x' }),
    ).toBeNull();
  });

  it('reads a cold-start tap from the optional native bridge', async () => {
    mockTapNativeModule.getInitialScheduleNotificationTap.mockResolvedValue({
      type: 'schedule',
      scheduleId: 'schedule-1',
      petId: 'pet-1',
    });

    await expect(getInitialScheduleNotificationTap()).resolves.toEqual({
      type: 'schedule',
      scheduleId: 'schedule-1',
      petId: 'pet-1',
    });
  });

  it('uses the native readiness handshake after the listener is registered', () => {
    markScheduleNotificationTapConsumerReady();
    markScheduleNotificationTapConsumerNotReady();

    expect(
      mockTapNativeModule.markScheduleNotificationTapConsumerReady,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockTapNativeModule.markScheduleNotificationTapConsumerNotReady,
    ).toHaveBeenCalledTimes(1);
  });

  it('delivers warm taps through the additive event channel', () => {
    const received: Array<{ scheduleId: string; petId: string }> = [];
    const unsubscribe = subscribeToScheduleNotificationTaps(tap => {
      received.push(tap);
    });

    DeviceEventEmitter.emit(SCHEDULE_NOTIFICATION_TAP_EVENT, {
      type: 'schedule',
      scheduleId: 'schedule-2',
      petId: 'pet-2',
    });
    DeviceEventEmitter.emit(SCHEDULE_NOTIFICATION_TAP_EVENT, {
      type: 'schedule',
      scheduleId: 'missing-pet',
    });
    unsubscribe();

    expect(received).toEqual([
      { type: 'schedule', scheduleId: 'schedule-2', petId: 'pet-2' },
    ]);
  });

  it('waits for navigation and app bootstrap and enforces pet ownership', () => {
    const tap = {
      type: 'schedule' as const,
      scheduleId: 's-1',
      petId: 'pet-1',
    };
    const base = {
      tap,
      navigationReady: true,
      appBooted: true,
      currentRouteName: 'AppTabs',
      sessionUserId: 'user-1',
      pets: [{ id: 'pet-1' }],
    };

    expect(
      resolveScheduleNotificationTapRoute({
        ...base,
        currentRouteName: 'Splash',
      }),
    ).toBeNull();
    expect(
      resolveScheduleNotificationTapRoute({ ...base, appBooted: false }),
    ).toBeNull();
    expect(
      resolveScheduleNotificationTapRoute({ ...base, sessionUserId: null }),
    ).toBeNull();
    expect(
      resolveScheduleNotificationTapRoute({
        ...base,
        currentRouteName: 'PasswordResetForm',
      }),
    ).toBeNull();
    expect(
      resolveScheduleNotificationTapRoute({ ...base, pets: [{ id: 'pet-2' }] }),
    ).toBeNull();
    expect(resolveScheduleNotificationTapRoute(base)).toEqual({
      petId: 'pet-1',
    });
  });
});
