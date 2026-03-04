// 파일: src/app/providers/AppProviders.tsx
// 목적:
// - ThemeProvider
// - 앱 부트 시퀀스(세션/닉네임/펫/선택펫) 정렬
// - auth 이벤트 동기화
// - 로그아웃 시 pets/records 정리
//
// ✅ Chapter 5 반영
// - recordStore 전체 구독(useRecordStore()) 제거
// - clearAll만 selector로 구독하여 불필요 렌더/스냅샷 변동 리스크 최소화

import React, { useEffect, useMemo } from 'react';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../theme/theme';
import { useThemeMode } from '../theme/useThemeMode';

import { supabase } from '../../services/supabase/client';
import { fetchMyNickname } from '../../services/supabase/profile';
import { fetchMyPets } from '../../services/supabase/pets';

import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { useScheduleStore } from '../../store/scheduleStore';

type Props = {
  children: React.ReactNode;
};

export default function AppProviders({ children }: Props) {
  // ---------------------------------------------------------
  // 0) Theme
  // ---------------------------------------------------------
  const { mode } = useThemeMode({ followSystem: true, defaultMode: 'dark' });
  const theme = useMemo(() => createTheme(mode), [mode]);

  // ---------------------------------------------------------
  // 1) stores
  // ---------------------------------------------------------
  const hydrateAuth = useAuthStore(s => s.hydrate);
  const setSession = useAuthStore(s => s.setSession);
  const setNickname = useAuthStore(s => s.setNickname);
  const setAuthBooted = useAuthStore(s => s.setBooted);

  const hydrateSelectedPetId = usePetStore(s => s.hydrateSelectedPetId);
  const setPets = usePetStore(s => s.setPets);
  const clearPets = usePetStore(s => s.clear);
  const setPetLoading = usePetStore(s => s.setLoading);
  const setPetBooted = usePetStore(s => s.setBooted);

  const clearRecords = useRecordStore(s => s.clearAll);
  const clearSchedules = useScheduleStore(s => s.clearAll);

  useEffect(() => {
    let unsub: { unsubscribe: () => void } | null = null;
    let alive = true;

    const loadPets = async () => {
      try {
        setPetLoading(true);

        // ✅ selectedPetId 먼저 복원 (pets 들어오면 normalize됨)
        await hydrateSelectedPetId();

        const pets = await fetchMyPets();
        setPets(pets);
      } finally {
        setPetLoading(false);
        setPetBooted(true);
      }
    };

    const onLoggedIn = async () => {
      try {
        const nickname = await fetchMyNickname();
        await setNickname(nickname);
      } catch {
        // ignore
      }

      await loadPets();
    };

    const onGuest = async () => {
      await setNickname(null);
      clearPets();
      clearRecords();
      clearSchedules();
      setPetBooted(true);
    };

    const boot = async () => {
      // ---------------------------------------------------------
      // ✅ Splash 게이트 ON (부트 시작)
      // ---------------------------------------------------------
      setAuthBooted(false);
      setPetBooted(false);

      // 1) 로컬 복원
      await hydrateAuth();

      // 2) Supabase 세션 복원
      const { data } = await supabase.auth.getSession();
      const session = data.session ?? null;

      await setSession(session);

      // 3) 로그인/게스트 분기 처리
      if (session) await onLoggedIn();
      else await onGuest();

      if (!alive) return;
      setAuthBooted(true);

      // 4) auth 이벤트 동기화
      const { data: listener } = supabase.auth.onAuthStateChange(
        async (_event, nextSession) => {
          const s = nextSession ?? null;

          // 이벤트 들어오면 게이트 다시 닫고 정렬
          setAuthBooted(false);
          setPetBooted(false);

          await setSession(s);

          if (s) await onLoggedIn();
          else await onGuest();

          if (!alive) return;
          setAuthBooted(true);
        },
      );

      unsub = listener.subscription;
    };

    boot();

    return () => {
      alive = false;
      if (unsub) unsub.unsubscribe();
    };
  }, [
    hydrateAuth,
    setSession,
    setNickname,
    setAuthBooted,

    hydrateSelectedPetId,
    setPets,
    clearPets,
    setPetLoading,
    setPetBooted,

    clearRecords,
    clearSchedules,
  ]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
