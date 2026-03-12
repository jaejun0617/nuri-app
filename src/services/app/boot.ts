import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export type BootRouteName = 'AppTabs' | 'NicknameSetup' | 'PetCreate';

const SPLASH_DEFAULT_HOLD_MS = 700;
const SPLASH_FORM_HOLD_MS = 900;

export function getSessionUserId(session: Session | null | undefined) {
  return session?.user?.id ?? null;
}

export function createBootTimeoutError(label: string, timeoutMs: number) {
  return new Error(`${label} timed out after ${timeoutMs}ms`);
}

export async function withTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race<T>([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(createBootTimeoutError(label, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function shouldReloadUserScopedState(input: {
  event: AuthChangeEvent | 'boot';
  prevUserId: string | null;
  nextUserId: string | null;
}) {
  if (input.event === 'boot') return true;
  if (input.prevUserId !== input.nextUserId) return true;

  switch (input.event) {
    case 'SIGNED_OUT':
      return true;
    case 'SIGNED_IN':
    case 'INITIAL_SESSION':
      return !input.prevUserId && !!input.nextUserId;
    case 'TOKEN_REFRESHED':
    case 'USER_UPDATED':
    case 'PASSWORD_RECOVERY':
    default:
      return false;
  }
}

export function resolveBootRoute(input: {
  isLoggedIn: boolean;
  nickname: string | null | undefined;
  profileSyncStatus: 'idle' | 'loading' | 'ready' | 'error';
  petsCount: number;
  petErrorMessage: string | null;
}) {
  if (!input.isLoggedIn) {
    return { name: 'AppTabs' as const, params: undefined };
  }

  const trimmedNickname = input.nickname?.trim() ?? '';
  if (input.profileSyncStatus === 'ready' && !trimmedNickname) {
    return { name: 'NicknameSetup' as const, params: undefined };
  }

  if (!input.petErrorMessage && input.petsCount === 0) {
    return {
      name: 'PetCreate' as const,
      params: { from: 'auto' as const },
    };
  }

  return { name: 'AppTabs' as const, params: undefined };
}

export function getBootSplashHoldMs(routeName: BootRouteName) {
  if (routeName === 'PetCreate' || routeName === 'NicknameSetup') {
    return SPLASH_FORM_HOLD_MS;
  }
  return SPLASH_DEFAULT_HOLD_MS;
}
