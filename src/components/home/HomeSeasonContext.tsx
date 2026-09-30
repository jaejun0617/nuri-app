import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';

import {
  getSeasonalThemeKey,
  type SeasonKey,
} from '../../theme/seasonal/season';

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
  return useContext(HomeSeasonContext) ?? getSeasonalThemeKey();
}
