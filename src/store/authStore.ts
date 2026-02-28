// 파일: src/store/authStore.ts
// 목적:
// - 앱 전역 인증 상태 관리 (guest / logged_in)
// - Supabase session 저장/복원(AsyncStorage) → 자동 로그인 기반
// - 닉네임은 profiles 테이블(또는 user_metadata)에서 주입될 예정
//
// 운영 원칙:
// - 초기엔 "guest 우선" 전략 유지
// - session 존재하면 logged_in으로 전환
// - nickname은 optional (없으면 '반가워요!'만 출력)

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

const STORAGE_KEY = 'nuri.auth.v1';

export type AuthStatus = 'guest' | 'logged_in';

export type Profile = {
  nickname?: string | null;
};

type PersistedAuth = {
  session: Session | null;
  profile: Profile;
};

type AuthState = {
  // ---------------------------------------------------------
  // 1) 상태
  // ---------------------------------------------------------
  status: AuthStatus;
  session: Session | null;
  profile: Profile;

  // ---------------------------------------------------------
  // 2) 파생 (값으로 제공: 컴포넌트에서 함수호출 금지)
  // ---------------------------------------------------------
  isLoggedIn: boolean;

  // ---------------------------------------------------------
  // 3) 액션
  // ---------------------------------------------------------
  hydrate: () => Promise<void>;
  setGuest: () => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
  setNickname: (nickname: string | null) => Promise<void>;
  signOutLocal: () => Promise<void>;
};

async function save(persist: PersistedAuth) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
}

async function load(): Promise<PersistedAuth | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedAuth;
  } catch {
    return null;
  }
}

async function clear() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // ---------------------------------------------------------
  // 1) 초기 상태
  // ---------------------------------------------------------
  status: 'guest',
  session: null,
  profile: { nickname: null },
  isLoggedIn: false,

  // ---------------------------------------------------------
  // 2) hydrate (앱 시작 시 1회)
  // ---------------------------------------------------------
  hydrate: async () => {
    const persisted = await load();

    // 세션 없으면 guest 고정
    if (!persisted?.session) {
      set({
        status: 'guest',
        session: null,
        profile: { nickname: null },
        isLoggedIn: false,
      });
      return;
    }

    set({
      status: 'logged_in',
      session: persisted.session,
      profile: persisted.profile ?? { nickname: null },
      isLoggedIn: true,
    });
  },

  // ---------------------------------------------------------
  // 3) 게스트 전환
  // ---------------------------------------------------------
  setGuest: async () => {
    set({
      status: 'guest',
      session: null,
      profile: { nickname: null },
      isLoggedIn: false,
    });
    await clear();
  },

  // ---------------------------------------------------------
  // 4) 세션 반영 + 저장
  // ---------------------------------------------------------
  setSession: async (session: Session | null) => {
    if (!session) {
      set({
        status: 'guest',
        session: null,
        profile: { nickname: null },
        isLoggedIn: false,
      });
      await clear();
      return;
    }

    const nextProfile = get().profile ?? { nickname: null };

    set({
      status: 'logged_in',
      session,
      profile: nextProfile,
      isLoggedIn: true,
    });

    await save({ session, profile: nextProfile });
  },

  // ---------------------------------------------------------
  // 5) 닉네임 갱신 + 저장
  // ---------------------------------------------------------
  setNickname: async (nickname: string | null) => {
    const trimmed = nickname?.trim() ?? null;
    const nextProfile = { nickname: trimmed };

    set({ profile: nextProfile });

    const session = get().session;
    if (session) {
      await save({ session, profile: nextProfile });
    }
  },

  // ---------------------------------------------------------
  // 6) 로컬 로그아웃
  // ---------------------------------------------------------
  signOutLocal: async () => {
    set({
      status: 'guest',
      session: null,
      profile: { nickname: null },
      isLoggedIn: false,
    });
    await clear();
  },
}));
