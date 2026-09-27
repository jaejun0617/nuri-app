import type { ImageSourcePropType } from 'react-native';

import { getSeasonalThemeKey, type SeasonKey } from './season';

export type SeasonalProfileEditPalette = {
  pageBackgroundColor: string;
  ambientOverlayColor: string;
  sectionSurfaceColor: string;
  sectionBorderColor: string;
  controlSurfaceColor: string;
  controlBorderColor: string;
  stickySurfaceColor: string;
  stickyBorderColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  placeholderTextColor: string;
  neutralIconColor: string;
};

export type SeasonalProfileEditVisual = {
  season: SeasonKey;
  backgroundSource: ImageSourcePropType;
  palette: SeasonalProfileEditPalette;
};

const AUTUMN_PROFILE_EDIT_VISUAL: SeasonalProfileEditVisual = {
  season: 'autumn',
  backgroundSource: require('../../assets/seasonal/profile-edit/autumn/background.png'),
  palette: {
    pageBackgroundColor: '#FBF3E7',
    ambientOverlayColor: 'rgba(255, 248, 237, 0.06)',
    sectionSurfaceColor: 'rgba(255, 252, 246, 0.70)',
    sectionBorderColor: 'rgba(255, 255, 255, 0.72)',
    controlSurfaceColor: 'rgba(255, 253, 249, 0.78)',
    controlBorderColor: 'rgba(119, 91, 68, 0.08)',
    stickySurfaceColor: 'rgba(255, 249, 239, 0.92)',
    stickyBorderColor: 'rgba(255, 255, 255, 0.78)',
    primaryTextColor: '#352B25',
    secondaryTextColor: '#786B61',
    placeholderTextColor: '#A99586',
    neutralIconColor: '#8B7465',
  },
};

const WINTER_PROFILE_EDIT_VISUAL: SeasonalProfileEditVisual = {
  season: 'winter',
  backgroundSource: require('../../assets/seasonal/profile-edit/winter/background.png'),
  palette: {
    pageBackgroundColor: '#EEF7FD',
    ambientOverlayColor: 'rgba(232, 245, 255, 0.06)',
    sectionSurfaceColor: 'rgba(248, 252, 255, 0.70)',
    sectionBorderColor: 'rgba(255, 255, 255, 0.82)',
    controlSurfaceColor: 'rgba(249, 253, 255, 0.78)',
    controlBorderColor: 'rgba(67, 92, 125, 0.09)',
    stickySurfaceColor: 'rgba(244, 250, 255, 0.92)',
    stickyBorderColor: 'rgba(255, 255, 255, 0.86)',
    primaryTextColor: '#26384D',
    secondaryTextColor: '#5F7184',
    placeholderTextColor: '#8798A9',
    neutralIconColor: '#647B91',
  },
};

const SPRING_PROFILE_EDIT_VISUAL: SeasonalProfileEditVisual = {
  season: 'spring',
  backgroundSource: require('../../assets/seasonal/profile-edit/spring/background.png'),
  palette: {
    pageBackgroundColor: '#FFF2F5',
    ambientOverlayColor: 'rgba(255, 243, 247, 0.05)',
    sectionSurfaceColor: 'rgba(255, 249, 251, 0.70)',
    sectionBorderColor: 'rgba(255, 255, 255, 0.80)',
    controlSurfaceColor: 'rgba(255, 251, 252, 0.78)',
    controlBorderColor: 'rgba(126, 79, 96, 0.08)',
    stickySurfaceColor: 'rgba(255, 247, 250, 0.92)',
    stickyBorderColor: 'rgba(255, 255, 255, 0.84)',
    primaryTextColor: '#49343E',
    secondaryTextColor: '#765E69',
    placeholderTextColor: '#A48693',
    neutralIconColor: '#876978',
  },
};

const SUMMER_PROFILE_EDIT_VISUAL: SeasonalProfileEditVisual = {
  season: 'summer',
  backgroundSource: require('../../assets/seasonal/profile-edit/summer/background.png'),
  palette: {
    pageBackgroundColor: '#F1F9EB',
    ambientOverlayColor: 'rgba(246, 255, 238, 0.05)',
    sectionSurfaceColor: 'rgba(250, 255, 247, 0.70)',
    sectionBorderColor: 'rgba(255, 255, 255, 0.80)',
    controlSurfaceColor: 'rgba(251, 255, 249, 0.78)',
    controlBorderColor: 'rgba(69, 104, 72, 0.08)',
    stickySurfaceColor: 'rgba(247, 253, 242, 0.92)',
    stickyBorderColor: 'rgba(255, 255, 255, 0.84)',
    primaryTextColor: '#2E4638',
    secondaryTextColor: '#5E7667',
    placeholderTextColor: '#7F9A87',
    neutralIconColor: '#5F806C',
  },
};

const PROFILE_EDIT_VISUALS: Record<SeasonKey, SeasonalProfileEditVisual> = {
  spring: SPRING_PROFILE_EDIT_VISUAL,
  summer: SUMMER_PROFILE_EDIT_VISUAL,
  autumn: AUTUMN_PROFILE_EDIT_VISUAL,
  winter: WINTER_PROFILE_EDIT_VISUAL,
};

/**
 * Resolves only presentation tokens. Geometry and behavior remain owned by the
 * shared Profile Edit screen for every season.
 */
export function getSeasonalProfileEditVisual(
  season: SeasonKey,
  override: 'auto' | SeasonKey = 'auto',
): SeasonalProfileEditVisual {
  return PROFILE_EDIT_VISUALS[override === 'auto' ? season : override];
}

export function getProfileEditSeason(date: Date = new Date()): SeasonKey {
  return getSeasonalThemeKey(date);
}
