import { ASSETS } from '../../assets';
import { getSeasonalSplashVisual } from './assets';
import { getSeasonalProfileEditVisual } from './profileEdit';
import type { SeasonKey } from './season';

/** Reuse approved seasonal assets; never tint a fall illustration into another season. */
export function getSeasonalOnboardingVisual(season: SeasonKey) {
  const profile = getSeasonalProfileEditVisual(season);
  return {
    ...profile,
    nicknameBackground: season === 'autumn' ? ASSETS.nicknameSetupBackground : profile.backgroundSource,
    loadingBackground: season === 'autumn' ? ASSETS.postRegistrationLoadingBackground : getSeasonalSplashVisual(season).source,
    welcomeSurface: season === 'autumn' ? 'rgba(255, 250, 242, 0.94)' : profile.palette.stickySurfaceColor,
  };
}
