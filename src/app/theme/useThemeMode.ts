// 파일: src/app/theme/useThemeMode.ts
import { useCallback, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemeMode } from './theme';

type Options = {
  /**
   * true면 시스템 다크모드(useColorScheme)를 그대로 따라감
   * false면 앱 내 토글로 관리
   */
  followSystem?: boolean;
  defaultMode?: ThemeMode;
};

export const useThemeMode = (options: Options = {}) => {
  const { followSystem = true, defaultMode = 'dark' } = options;

  const system = useColorScheme(); // 'dark' | 'light' | null
  const systemMode: ThemeMode = system === 'light' ? 'light' : 'dark';

  const [manualMode, setManualMode] = useState<ThemeMode>(defaultMode);

  const mode = useMemo<ThemeMode>(() => {
    return followSystem ? systemMode : manualMode;
  }, [followSystem, systemMode, manualMode]);

  const toggle = useCallback(() => {
    setManualMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setManualMode(next);
  }, []);

  return { mode, toggle, setMode };
};
