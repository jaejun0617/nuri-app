// 파일: src/app/providers/AppProviders.tsx
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
  const hydrate = useAuthStore(s => s.hydrate);
  const setSession = useAuthStore(s => s.setSession);
  const setNickname = useAuthStore(s => s.setNickname);

  const setPets = usePetStore(s => s.setPets);
  const clearPets = usePetStore(s => s.clear);
  const setPetLoading = usePetStore(s => s.setLoading);
  const setPetBooted = usePetStore(s => s.setBooted);

  // (있다면) recordStore clear도 로그아웃에 쓰려고 가져옴
  const clearRecords = useRecordStore(s => (s as any).clear?.() ?? undefined);

  useEffect(() => {
    let unsub: { unsubscribe: () => void } | null = null;

    const loadPets = async () => {
      try {
        setPetLoading(true);
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
      // recordStore clear가 있으면 같이
      if (typeof clearRecords === 'function') clearRecords();
      setPetBooted(true);
    };

    const boot = async () => {
      // 1) 로컬(닉네임 등) 복원
      await hydrate();

      // 2) ✅ Supabase가 AsyncStorage에서 세션 복원(핵심)
      const { data } = await supabase.auth.getSession();
      const session = data.session ?? null;

      await setSession(session);

      if (session) await onLoggedIn();
      else await onGuest();

      // 3) auth 이벤트 동기화
      const { data: listener } = supabase.auth.onAuthStateChange(
        async (_event, nextSession) => {
          const s = nextSession ?? null;
          await setSession(s);

          if (s) await onLoggedIn();
          else await onGuest();
        },
      );

      unsub = listener.subscription;
    };

    boot();

    return () => {
      if (unsub) unsub.unsubscribe();
    };
  }, [
    hydrate,
    setSession,
    setNickname,
    setPets,
    clearPets,
    setPetLoading,
    setPetBooted,
    clearRecords,
  ]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
