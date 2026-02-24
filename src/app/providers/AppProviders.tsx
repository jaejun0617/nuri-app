// 파일: src/app/providers/AppProviders.tsx
import React, { useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../theme/theme';
import { useThemeMode } from '../theme/useThemeMode';

type Props = {
  children: React.ReactNode;
};

export default function AppProviders({ children }: Props) {
  // 기본값: 시스템 모드 따라감. (원하면 followSystem: false로 바꿔서 앱 토글로 관리)
  const { mode } = useThemeMode({ followSystem: true, defaultMode: 'dark' });

  const theme = useMemo(() => createTheme(mode), [mode]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </GestureHandlerRootView>
  );
}
