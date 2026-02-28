// 파일: src/app/providers/AppProviders.tsx
// 목적:
// - ThemeProvider 제공
// - 앱 부팅 시 AuthStore hydrate + Supabase auth 리스너 연결
// - session 존재 시 profiles.nickname fetch + pets fetch하여 store 주입

import React, { useEffect, useMemo } from 'react';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../theme/theme';
import { useThemeMode } from '../theme/useThemeMode';

import { supabase } from '../../services/supabase/client';
import { fetchMyNickname } from '../../services/supabase/profile';
import { fetchMyPets } from '../../services/supabase/pets';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';

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
  // 1) App Boot: hydrate + auth listener
  // ---------------------------------------------------------
  const hydrate = useAuthStore(s => s.hydrate);
  const setSession = useAuthStore(s => s.setSession);
  const setNickname = useAuthStore(s => s.setNickname);

  const setPets = usePetStore(s => s.setPets);
  const clearPets = usePetStore(s => s.clear);
  const setPetLoading = usePetStore(s => s.setLoading);
  const setPetBooted = usePetStore(s => s.setBooted);

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

    const boot = async () => {
      // 1) 로컬 세션 복원
      await hydrate();

      // 2) Supabase 실제 세션 확인
      const { data } = await supabase.auth.getSession();
      const session = data.session ?? null;

      await setSession(session);

      // 3) 로그인 상태면 nickname + pets fetch
      if (session) {
        try {
          const nickname = await fetchMyNickname();
          await setNickname(nickname);
        } catch {
          // ignore
        }

        await loadPets();
      } else {
        await setNickname(null);
        clearPets();
      }

      // 4) auth 이벤트 동기화
      const { data: listener } = supabase.auth.onAuthStateChange(
        async (_event, nextSession) => {
          await setSession(nextSession ?? null);

          if (nextSession) {
            try {
              const nickname = await fetchMyNickname();
              await setNickname(nickname);
            } catch {
              // ignore
            }

            await loadPets();
          } else {
            await setNickname(null);
            clearPets();
          }
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
  ]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
