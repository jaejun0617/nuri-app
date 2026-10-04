import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';

import type { SeasonKey } from '../../theme/seasonal/season';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';

const HomeSeasonContext = createContext<SeasonKey | null>(null);

/** Keep approved Home foreground materials independent of the seasonal background. */
export function HomeSeasonProvider({
  season,
  children,
}: PropsWithChildren<{ season: SeasonKey }>) {
  return (
    <HomeSeasonContext.Provider value={season}>
      {children}
    </HomeSeasonContext.Provider>
  );
}

export function useHomeSeason(): SeasonKey {
  const globalSeason = useEffectiveSeason();
  return useContext(HomeSeasonContext) ?? globalSeason;
}
