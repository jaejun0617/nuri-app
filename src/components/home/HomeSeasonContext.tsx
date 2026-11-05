import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';
import { StyleSheet } from 'react-native';

import type { SeasonKey } from '../../theme/seasonal/season';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { PRODUCT_ACCENT } from '../../app/theme/tokens/productAccent';

const HomeSeasonContext = createContext<SeasonKey | null>(null);
const HomeTextSeasonContext = createContext<SeasonKey | null>(null);
const contentTextStyles = StyleSheet.create({ fixed: { color: PRODUCT_ACCENT.ink } });

/** Seasonal imagery remains independent of fixed product text and pet accents. */
export function HomeSeasonProvider({
  season,
  headingSeason,
  children,
}: PropsWithChildren<{ season: SeasonKey; headingSeason?: SeasonKey }>) {
  return (
    <HomeSeasonContext.Provider value={season}>
      <HomeTextSeasonContext.Provider value={headingSeason ?? null}>
        {children}
      </HomeTextSeasonContext.Provider>
    </HomeSeasonContext.Provider>
  );
}

export function useHomeSeason(): SeasonKey {
  const globalSeason = useEffectiveSeason();
  return useContext(HomeSeasonContext) ?? globalSeason;
}

export function useHomeHeadingColor(): string | null {
  const season = useContext(HomeTextSeasonContext);
  return season ? PRODUCT_ACCENT.ink : null;
}

/** Stable, opt-in text styles leave unscoped callers and secondary copy unchanged. */
export function useHomeContentTextStyle() {
  const season = useContext(HomeTextSeasonContext);
  return season ? contentTextStyles.fixed : undefined;
}
