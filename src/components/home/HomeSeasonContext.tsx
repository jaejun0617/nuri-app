import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';
import { StyleSheet } from 'react-native';

import type { SeasonKey } from '../../theme/seasonal/season';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import {
  HOME_SEASONAL_HEADING_COLORS,
  HOME_SEASONAL_CONTENT_COLORS,
} from '../../theme/home/seasonalAmbient';

const HomeSeasonContext = createContext<SeasonKey | null>(null);
const HomeTextSeasonContext = createContext<SeasonKey | null>(null);
const contentTextStyles = StyleSheet.create({
  spring: { color: HOME_SEASONAL_CONTENT_COLORS.spring },
  summer: { color: HOME_SEASONAL_CONTENT_COLORS.summer },
  autumn: { color: HOME_SEASONAL_CONTENT_COLORS.autumn },
  winter: { color: HOME_SEASONAL_CONTENT_COLORS.winter },
});

/** Explicit Home text tones follow the background without changing materials or actions. */
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
  return season ? HOME_SEASONAL_HEADING_COLORS[season] : null;
}

/** Stable, opt-in text styles leave unscoped callers and secondary copy unchanged. */
export function useHomeContentTextStyle() {
  const season = useContext(HomeTextSeasonContext);
  return season ? contentTextStyles[season] : undefined;
}
