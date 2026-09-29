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
import { getSeasonalThemeKey, type SeasonKey } from '../../theme/seasonal/season';

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
  backgroundColor: 'rgba(255, 255, 255, 0.015)',
  overflow: 'hidden',
};
export const HOME_SECTION_GLASS_SHADOW_EVALUATION_STYLE: ViewStyle = {
  shadowColor: '#64748B',
  shadowOpacity: 0,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 3 },
  elevation: 0,
};
export const HOME_SECTION_GLASS_HIGHLIGHT_STYLE: ViewStyle = {
  position: 'absolute',
  top: 1,
  left: 14,
  right: 14,
  height: StyleSheet.hairlineWidth,
  borderRadius: 999,
};

type HomeSectionGlassMaterial = {
  borderColor: string;
  highlightColor: string;
};

export function resolveHomeSectionGlassMaterial(
  season: SeasonKey,
): HomeSectionGlassMaterial {
  const palette: SeasonalProfileEditPalette =
    getSeasonalProfileEditVisual(season).palette;

  return {
    borderColor: palette.controlBorderColor,
    highlightColor: palette.sectionBorderColor,
  };
}

type HomeSectionGlassProps = PropsWithChildren<
  Omit<ViewProps, 'style'> & {
    style?: StyleProp<ViewStyle>;
  }
>;

/**
 * Mirrors Profile Edit's edge language without introducing a filled card.
 * Android shadow/elevation stay disabled; visibility comes from edge light.
 */
export function HomeSectionGlass({
  children,
  style,
  ...viewProps
}: HomeSectionGlassProps) {
  const materialStyle = useMemo(
    () => resolveHomeSectionGlassMaterial(getSeasonalThemeKey()),
    [],
  );

  return (
    <View
      {...viewProps}
      style={[
        styles.transparentRoot,
        style,
        styles.forceTransparentRoot,
      ]}
    >
      <View
        pointerEvents="none"
        accessible={false}
        style={[
          styles.canonicalMaterial,
          { borderColor: materialStyle.borderColor },
          styles.homeShadowEvaluation,
        ]}
      >
        <View
          style={[
            styles.topEdgeHighlight,
            { backgroundColor: materialStyle.highlightColor },
          ]}
        />
      </View>
      {children}
    </View>
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
  topEdgeHighlight: HOME_SECTION_GLASS_HIGHLIGHT_STYLE,
  homeShadowEvaluation: HOME_SECTION_GLASS_SHADOW_EVALUATION_STYLE,
});
