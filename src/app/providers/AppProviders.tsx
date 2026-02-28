// 파일: src/app/providers/AppProviders.tsx
// 목적:
// - ThemeProvider 제공
// - 앱 부팅 시 AuthStore hydrate + Supabase auth 리스너 연결
// - session 존재 시 profiles.nickname fetch하여 store 주입

import React, { useEffect, useMemo } from 'react';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../theme/theme';
import { useThemeMode } from '../theme/useThemeMode';

import { supabase } from '../../services/supabase/client';
import { fetchMyNickname } from '../../services/supabase/profile';
import { useAuthStore } from '../../store/authStore';

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

  useEffect(() => {
    let unsub: { unsubscribe: () => void } | null = null;

    const boot = async () => {
      // 1) 로컬 세션 복원
      await hydrate();

      // 2) Supabase 실제 세션도 확인(권장: 서버 토큰 상태와 로컬 불일치 방지)
      const { data } = await supabase.auth.getSession();
      const session = data.session ?? null;

      // store 갱신(로컬이든 서버든 최종은 여기로 정렬)
      await setSession(session);

      // 3) 로그인 상태면 nickname fetch
      if (session) {
        try {
          const nickname = await fetchMyNickname();
          await setNickname(nickname);
        } catch {
          // nickname fetch 실패는 앱 부팅을 막지 않음(네트워크/정책 이슈 대비)
        }
      } else {
        await setNickname(null);
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
          } else {
            await setNickname(null);
          }
        },
      );

      unsub = listener.subscription;
    };

    boot();

    return () => {
      if (unsub) unsub.unsubscribe();
    };
  }, [hydrate, setSession, setNickname]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
