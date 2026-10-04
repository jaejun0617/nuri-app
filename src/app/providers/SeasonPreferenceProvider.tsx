import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getSeasonalThemeKey, type SeasonKey } from '../../theme/seasonal/season';
import { loadSeasonOverride, saveSeasonOverride } from '../../services/local/seasonOverride';
import { captureMonitoringException } from '../../services/monitoring/sentry';

type SeasonPreference = {
  season: SeasonKey;
  override: SeasonKey | null;
  setOverride: (season: SeasonKey | null) => Promise<void>;
};

const SeasonContext = createContext<SeasonPreference | null>(null);

/** Device-local QA selection intentionally survives logout and account changes. */
export function SeasonPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverrideState] = useState<SeasonKey | null>(null);
  const [automaticSeason, setAutomaticSeason] = useState(getSeasonalThemeKey);
  const [hydrated, setHydrated] = useState(false);
  const writes = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    loadSeasonOverride()
      .then(value => { if (active) setOverrideState(value); })
      .catch(captureMonitoringException)
      .finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refresh = () => setAutomaticSeason(getSeasonalThemeKey());
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    // Resolve the next KST calendar boundary without polling every render.
    let timer: ReturnType<typeof setTimeout>;
    const scheduleBoundary = () => {
      const kst = Date.now() + 9 * 60 * 60 * 1000;
      timer = setTimeout(() => {
        refresh();
        scheduleBoundary();
      }, 86_400_000 - (kst % 86_400_000));
    };
    scheduleBoundary();
    return () => { subscription.remove(); clearTimeout(timer); };
  }, []);

  const setOverride = useCallback((next: SeasonKey | null) => {
    // Serialize rapid tab selections so persistence and visible selection agree.
    const write = writes.current.then(async () => {
      await saveSeasonOverride(next);
      setOverrideState(next);
    });
    writes.current = write.catch(() => {});
    return write;
  }, []);
  const value = useMemo(() => ({ season: override ?? automaticSeason, override, setOverride }),
    [automaticSeason, override, setOverride]);

  // Do not mount Splash with a guessed season before local storage is read.
  return <SeasonContext.Provider value={value}>{hydrated ? children : null}</SeasonContext.Provider>;
}

export function useSeasonPreference(): SeasonPreference {
  const preference = useContext(SeasonContext);
  if (!preference) throw new Error('SeasonPreferenceProvider is required for season selection.');
  return preference;
}

export function useEffectiveSeason(): SeasonKey {
  return useContext(SeasonContext)?.season ?? getSeasonalThemeKey();
}
