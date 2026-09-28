import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  LEGACY_APP_FONT_MODE,
  type AppTypographyScope,
  type AppFontMode,
} from '../typography/appFontMode';
import {
  loadAppFontPreference,
  saveAppFontPreference,
} from '../../services/local/appFontPreference';
import { captureMonitoringException } from '../../services/monitoring/sentry';

type AppFontPreferenceContextValue = {
  mode: AppFontMode;
  hydrated: boolean;
  hasStoredPreference: boolean;
  setMode: (mode: AppFontMode) => Promise<void>;
};

const fallbackValue: AppFontPreferenceContextValue = {
  mode: LEGACY_APP_FONT_MODE,
  hydrated: false,
  hasStoredPreference: false,
  setMode: async () => {},
};

const AppFontPreferenceContext =
  createContext<AppFontPreferenceContextValue>(fallbackValue);
const TypographyScopeContext =
  createContext<AppTypographyScope>('app-preference');

export function AppFontPreferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<AppFontMode>(LEGACY_APP_FONT_MODE);
  const [hydrated, setHydrated] = useState(false);
  const [hasStoredPreference, setHasStoredPreference] = useState(false);
  const mutationRevisionRef = useRef(0);

  useEffect(() => {
    let active = true;
    const hydrateRevision = mutationRevisionRef.current;

    loadAppFontPreference()
      .then(preference => {
        if (!active || mutationRevisionRef.current !== hydrateRevision) return;
        setModeState(preference.mode);
        setHasStoredPreference(preference.hasStoredPreference);
      })
      .catch(error => {
        captureMonitoringException(error);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: AppFontMode) => {
    mutationRevisionRef.current += 1;
    await saveAppFontPreference(nextMode);
    setModeState(nextMode);
    setHasStoredPreference(true);
    setHydrated(true);
  }, []);

  const value = useMemo<AppFontPreferenceContextValue>(
    () => ({ mode, hydrated, hasStoredPreference, setMode }),
    [hasStoredPreference, hydrated, mode, setMode],
  );

  return (
    <AppFontPreferenceContext.Provider value={value}>
      {children}
    </AppFontPreferenceContext.Provider>
  );
}

export function useAppFontPreference(): AppFontPreferenceContextValue {
  return useContext(AppFontPreferenceContext);
}

export function useTypographyScope(): AppTypographyScope {
  return useContext(TypographyScopeContext);
}

export const FixedTypographyBoundary = memo(
  function FixedTypographyBoundaryComponent({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <TypographyScopeContext.Provider value="fixed">
        {children}
      </TypographyScopeContext.Provider>
    );
  },
);
