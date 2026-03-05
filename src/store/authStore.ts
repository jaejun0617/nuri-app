import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

const STORAGE_KEY = 'nuri.profile.v1';

export type AuthStatus = 'guest' | 'logged_in';

export type Profile = {
  nickname?: string | null;
};

type PersistedProfile = {
  profile: Profile;
};

type AuthState = {
  // ---------------------------------------------------------
  // 1) 상태
  // ---------------------------------------------------------
  status: AuthStatus;
  session: Session | null;
  profile: Profile;

  // ✅ 부트 게이트 (Splash 고정용)
  booted: boolean;

  // ---------------------------------------------------------
  // 2) 파생
  // ---------------------------------------------------------
  isLoggedIn: boolean;

  // ---------------------------------------------------------
  // 3) 액션
  // ---------------------------------------------------------
  hydrate: () => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
  setNickname: (nickname: string | null) => Promise<void>;
  setBooted: (v: boolean) => void;

  signOutLocal: () => Promise<void>;
};

async function saveProfile(profile: Profile) {
  const persist: PersistedProfile = { profile };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
}

async function loadProfile(): Promise<Profile> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { nickname: null };

  try {
    const parsed = JSON.parse(raw) as PersistedProfile;
    return parsed.profile ?? { nickname: null };
  } catch {
    return { nickname: null };
  }
}

async function clearProfile() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export const useAuthStore = create<AuthState>(set => ({
  // ---------------------------------------------------------
  // 1) 초기 상태
  // ---------------------------------------------------------
  status: 'guest',
  session: null,
  profile: { nickname: null },

  booted: false,

  isLoggedIn: false,

  // ---------------------------------------------------------
  // 2) hydrate (앱 시작 시 1회) - 닉네임만 복원
  // ---------------------------------------------------------
  hydrate: async () => {
    const profile = await loadProfile();
    set({ profile: profile ?? { nickname: null } });
  },

  // ---------------------------------------------------------
  // 3) 세션 반영(단일 소스: Supabase)
  // ---------------------------------------------------------
  setSession: async (session: Session | null) => {
    if (!session) {
      set({
        status: 'guest',
        session: null,
        isLoggedIn: false,
      });
      return;
    }

    set({
      status: 'logged_in',
      session,
      isLoggedIn: true,
    });
  },

  // ---------------------------------------------------------
  // 4) 닉네임 갱신 + 로컬 persist
  // ---------------------------------------------------------
  setNickname: async (nickname: string | null) => {
    const trimmed = nickname?.trim() ?? null;
    const nextProfile: Profile = { nickname: trimmed };

    set({ profile: nextProfile });
    await saveProfile(nextProfile);
  },

  // ---------------------------------------------------------
  // 5) booted 제어 (Splash 게이트)
  // ---------------------------------------------------------
  setBooted: (v: boolean) => set({ booted: v }),

  // ---------------------------------------------------------
  // 6) 로컬 로그아웃(스토어만 초기화)
  // ---------------------------------------------------------
  signOutLocal: async () => {
    set({
      status: 'guest',
      session: null,
      profile: { nickname: null },
      isLoggedIn: false,
      // 수동 로그아웃에서는 부트 게이트를 닫지 않는다.
      // Splash 최소 대기(4s)에 다시 걸리면 체감 지연이 발생한다.
      booted: true,
    });
    await clearProfile();
  },
}));
