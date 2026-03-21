// 파일: src/store/authStore.ts
// 파일 목적:
// - 인증 세션과 사용자 프로필 요약 상태를 전역 store로 관리한다.
// 어디서 쓰이는지:
// - AppProviders, Auth 화면, 홈 가드, More 계정 기능, 관리자 권한 분기에서 공통으로 사용된다.
// 핵심 역할:
// - 로그인 여부, Supabase 세션, 닉네임, role, 프로필 동기화 상태, boot 완료 여부를 저장한다.
// - AsyncStorage에 최소 프로필 정보를 저장해 앱 재실행 시 빠른 복구를 돕는다.
// 데이터·상태 흐름:
// - 실제 프로필 원본은 Supabase에 있고, AppProviders가 가져온 값을 이 store에 반영한다.
// - Splash와 홈 가드는 `booted`, `status`, `profileSyncStatus`, `profile.nickname`을 기준으로 분기한다.
// 수정 시 주의:
// - 이 store의 shape를 바꾸면 앱 첫 진입 가드와 More 권한 분기가 같이 영향을 받는다.
// - 서버 source of truth를 대체하는 store가 아니므로, 서버 정책을 로컬 상태만으로 확정하면 안 된다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

const STORAGE_KEY = 'nuri.profile.v1';

export type AuthStatus = 'guest' | 'logged_in';
export type AppRole = 'user' | 'admin' | 'super_admin';

export type Profile = {
  nickname?: string | null;
  role?: AppRole;
};

type PersistedProfile = {
  profile: Profile;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeRole(value: unknown): AppRole {
  return value === 'admin' || value === 'super_admin' ? value : 'user';
}

function normalizePersistedProfile(value: unknown): Profile {
  if (!isRecord(value)) return { nickname: null, role: 'user' };

  const profile = isRecord(value.profile) ? value.profile : null;
  const nickname = profile?.nickname;
  const role = profile?.role;

  return {
    nickname: typeof nickname === 'string' ? nickname : null,
    role: normalizeRole(role),
  };
}

type AuthState = {
  // ---------------------------------------------------------
  // 1) 상태
  // ---------------------------------------------------------
  status: AuthStatus;
  session: Session | null;
  profile: Profile;
  profileSyncStatus: 'idle' | 'loading' | 'ready' | 'error';
  profileErrorMessage: string | null;

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
  setProfile: (profile: Profile) => Promise<void>;
  setNickname: (nickname: string | null) => Promise<void>;
  setProfileSyncState: (
    status: 'idle' | 'loading' | 'ready' | 'error',
    errorMessage?: string | null,
  ) => void;
  setBooted: (v: boolean) => void;

  signOutLocal: () => Promise<void>;
};

async function saveProfile(profile: Profile) {
  const persist: PersistedProfile = { profile };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
}

async function loadProfile(): Promise<Profile> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { nickname: null, role: 'user' };

  try {
    return normalizePersistedProfile(JSON.parse(raw));
  } catch {
    return { nickname: null, role: 'user' };
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
  profile: { nickname: null, role: 'user' },
  profileSyncStatus: 'idle',
  profileErrorMessage: null,

  booted: false,

  isLoggedIn: false,

  // ---------------------------------------------------------
  // 2) hydrate (앱 시작 시 1회) - 닉네임만 복원
  // ---------------------------------------------------------
  hydrate: async () => {
    const profile = await loadProfile();
    set({ profile: profile ?? { nickname: null, role: 'user' } });
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
        profileSyncStatus: 'idle',
        profileErrorMessage: null,
      });
      return;
    }

    set({
      status: 'logged_in',
      session,
      isLoggedIn: true,
    });
  },

  setProfile: async profile => {
    const nextProfile: Profile = {
      nickname: profile.nickname?.trim() ?? null,
      role: normalizeRole(profile.role),
    };

    set({ profile: nextProfile });
    await saveProfile(nextProfile);
  },

  // ---------------------------------------------------------
  // 4) 닉네임 갱신 + 로컬 persist
  // ---------------------------------------------------------
  setNickname: async (nickname: string | null) => {
    const trimmed = nickname?.trim() ?? null;
    const currentRole = useAuthStore.getState().profile.role ?? 'user';
    const nextProfile: Profile = { nickname: trimmed, role: currentRole };

    set({ profile: nextProfile });
    await saveProfile(nextProfile);
  },

  setProfileSyncState: (status, errorMessage = null) =>
    set({
      profileSyncStatus: status,
      profileErrorMessage:
        status === 'error' ? (errorMessage ?? '프로필 동기화 실패') : null,
    }),

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
      profile: { nickname: null, role: 'user' },
      profileSyncStatus: 'idle',
      profileErrorMessage: null,
      isLoggedIn: false,
      // 수동 로그아웃에서는 부트 게이트를 닫지 않는다.
      // 세션 종료 후에도 Splash 브랜딩 대기까지 다시 타면 체감 지연이 커진다.
      booted: true,
    });
    await clearProfile();
  },
}));
