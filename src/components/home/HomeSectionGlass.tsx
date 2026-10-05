import React, { useMemo, type PropsWithChildren } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import {
  getSeasonalProfileEditVisual,
  type SeasonalProfileEditPalette,
} from '../../theme/seasonal/profileEdit';
import type { SeasonKey } from '../../theme/seasonal/season';
import { getHomeAmbientVisual } from '../../theme/home/seasonalAmbient';
import { useHomeSeason } from './HomeSeasonContext';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { HomeFrostedGlass } from './HomeFrostedGlass';

export const HOME_SECTION_GLASS_RADIUS = 22;
export const HOME_SECTION_ROOT_STYLE: ViewStyle = {
  width: '100%',
  marginTop: 12,
  position: 'relative',
  backgroundColor: 'transparent',
  overflow: 'visible',
};
export const HOME_SECTION_GLASS_MATERIAL_STYLE: ViewStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  borderRadius: HOME_SECTION_GLASS_RADIUS,
  borderWidth: 1,
  backgroundColor: 'transparent',
  overflow: 'hidden',
};
export const HOME_SECTION_GLASS_SHADOW_EVALUATION_STYLE: ViewStyle = {
  shadowOpacity: 0,
  elevation: 0,
};

type HomeSectionGlassMaterial = {
  backgroundColor: string;
  borderColor: string;
};

export function resolveHomeSectionGlassMaterial(
  season: SeasonKey,
): HomeSectionGlassMaterial {
  const palette: SeasonalProfileEditPalette =
    getSeasonalProfileEditVisual(season).palette;

  return {
    backgroundColor: getHomeAmbientVisual(season).glassSurface,
    borderColor: palette.sectionBorderColor,
  };
}

/** Shared glass material, painted behind content without layout impact. */
export const HomeSectionGlassSurface = React.memo(
  function ProfileEditMaterialSurface({
    borderRadius = HOME_SECTION_GLASS_RADIUS,
  }: {
    borderRadius?: number;
  }) {
    const season = useHomeSeason();
    const materialStyle = useMemo(
      () => resolveHomeSectionGlassMaterial(season),
      [season],
    );

    return (
      <View
        testID="home-section-glass-surface"
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.canonicalMaterial,
          materialStyle,
          { borderRadius },
          styles.homeShadowEvaluation,
        ]}
      />
    );
  },
);

type HomeSectionGlassProps = PropsWithChildren<
  Omit<ViewProps, 'style'> & {
    style?: StyleProp<ViewStyle>;
  }
>;

/**
 * Keeps the existing transparent section root and its functional content intact.
 */
export function HomeSectionGlass({
  children,
  style,
  ...viewProps
}: HomeSectionGlassProps) {
  const season = useEffectiveSeason();
  return (
    <HomeFrostedGlass
      {...viewProps}
      season={season}
      style={[styles.transparentRoot, style, styles.forceTransparentRoot]}
    >
      {children}
    </HomeFrostedGlass>
  );
}

const styles = StyleSheet.create({
  transparentRoot: HOME_SECTION_ROOT_STYLE,
  forceTransparentRoot: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  canonicalMaterial: HOME_SECTION_GLASS_MATERIAL_STYLE,
  homeShadowEvaluation: HOME_SECTION_GLASS_SHADOW_EVALUATION_STYLE,
});
