import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

export const SCHEDULE_NOTIFICATION_TAP_EVENT = 'NuriScheduleNotificationTap';

export type ScheduleNotificationTapPayload = {
  type: 'schedule';
  scheduleId: string;
  petId: string;
};

type NativeScheduleNotificationTapModule = {
  getInitialScheduleNotificationTap?: () => Promise<unknown>;
  markScheduleNotificationTapConsumerReady?: () => void;
  markScheduleNotificationTapConsumerNotReady?: () => void;
};

type ScheduleTapRouteInput = {
  tap: ScheduleNotificationTapPayload | null;
  navigationReady: boolean;
  appBooted: boolean;
  currentRouteName: string | null;
  sessionUserId: string | null;
  pets: ReadonlyArray<{ id: string }>;
};

const ROUTES_THAT_MUST_NOT_BE_INTERRUPTED = new Set([
  'SignIn',
  'SignUp',
  'PasswordResetRequest',
  'PasswordResetRecovery',
  'PasswordResetForm',
  'OAuthCallback',
  'NicknameSetup',
  'WelcomeTransition',
  'PetCreate',
  'PetManagement',
  'PetProfileEdit',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNativeScheduleNotificationTapModule() {
  const nativeModule = NativeModules.NuriScheduleNotifications as unknown;
  if (!isRecord(nativeModule)) return undefined;
  return nativeModule as NativeScheduleNotificationTapModule;
}

export function normalizeScheduleNotificationTap(
  value: unknown,
): ScheduleNotificationTapPayload | null {
  if (!isRecord(value)) return null;

  const type = value.type;
  const scheduleId =
    typeof value.scheduleId === 'string' ? value.scheduleId.trim() : '';
  const petId = typeof value.petId === 'string' ? value.petId.trim() : '';

  if (type !== undefined && type !== 'schedule') return null;
  if (!scheduleId || !petId) return null;

  return { type: 'schedule', scheduleId, petId };
}

export async function getInitialScheduleNotificationTap(): Promise<ScheduleNotificationTapPayload | null> {
  if (Platform.OS !== 'android') return null;

  const nativeModule = getNativeScheduleNotificationTapModule();
  if (typeof nativeModule?.getInitialScheduleNotificationTap !== 'function') {
    return null;
  }

  try {
    // NURI-12 must consume this value once when it reads the launch intent.
    return normalizeScheduleNotificationTap(
      await nativeModule.getInitialScheduleNotificationTap(),
    );
  } catch {
    return null;
  }
}

export function markScheduleNotificationTapConsumerReady(): void {
  if (Platform.OS !== 'android') return;

  const nativeModule = getNativeScheduleNotificationTapModule();
  if (typeof nativeModule?.markScheduleNotificationTapConsumerReady !== 'function') {
    return;
  }

  try {
    nativeModule.markScheduleNotificationTapConsumerReady();
  } catch {
    // The initial getter remains the compatibility fallback if the native
    // readiness handshake is unavailable during a partial startup.
  }
}

export function markScheduleNotificationTapConsumerNotReady(): void {
  if (Platform.OS !== 'android') return;

  const nativeModule = getNativeScheduleNotificationTapModule();
  if (
    typeof nativeModule?.markScheduleNotificationTapConsumerNotReady !==
    'function'
  ) {
    return;
  }

  try {
    nativeModule.markScheduleNotificationTapConsumerNotReady();
  } catch {
    // React Native may already be tearing down the native module.
  }
}

export function subscribeToScheduleNotificationTaps(
  listener: (tap: ScheduleNotificationTapPayload) => void,
) {
  const subscription = DeviceEventEmitter.addListener(
    SCHEDULE_NOTIFICATION_TAP_EVENT,
    (value: unknown) => {
      const tap = normalizeScheduleNotificationTap(value);
      if (tap) listener(tap);
    },
  );

  return () => subscription.remove();
}

export function resolveScheduleNotificationTapRoute(
  input: ScheduleTapRouteInput,
): { petId: string } | null {
  if (!input.tap) return null;
  if (!input.navigationReady || !input.appBooted) return null;
  if (!input.sessionUserId?.trim()) return null;
  if (!input.currentRouteName || input.currentRouteName === 'Splash') {
    return null;
  }
  if (ROUTES_THAT_MUST_NOT_BE_INTERRUPTED.has(input.currentRouteName)) {
    return null;
  }

  const ownsPet = input.pets.some(pet => pet.id === input.tap?.petId);
  return ownsPet ? { petId: input.tap.petId } : null;
}
