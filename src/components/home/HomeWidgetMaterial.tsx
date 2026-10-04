import React, { memo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

/** An inner glass plate stays distinct without hiding the outer seasonal wash. */
export const HOME_WIDGET_MATERIAL: ViewStyle = {
  backgroundColor: 'rgba(255, 253, 250, 0.60)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.76)',
  borderTopColor: 'rgba(255, 255, 255, 0.98)',
  shadowOpacity: 0,
  elevation: 0,
};

/** Neutral glass inherits the season below it; elevation must not add an opaque backing. */
export const HOME_FLOATING_WIDGET_MATERIAL: ViewStyle = {
  ...HOME_WIDGET_MATERIAL,
  backgroundColor: 'rgba(255, 255, 255, 0.26)',
  borderColor: 'rgba(255, 255, 255, 0.78)',
  borderLeftColor: 'rgba(255, 255, 255, 0.88)',
  borderRightColor: 'rgba(255, 255, 255, 0.52)',
};

export const HOME_FLOATING_WIDGET_REFLECTION = {
  colors: [
    'rgba(255, 255, 255, 0.30)',
    'rgba(255, 255, 255, 0.06)',
    'rgba(255, 255, 255, 0.01)',
    'rgba(255, 255, 255, 0.10)',
  ],
  locations: [0, 0.24, 0.64, 1],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const HOME_FLOATING_WIDGET_GLINT = {
  colors: [
    'rgba(255, 255, 255, 0)',
    'rgba(255, 255, 255, 0.96)',
    'rgba(255, 255, 255, 0)',
  ],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
};

/** Keep reflections inside the plate, with no shadow painted below it. */
export const HomeFloatingWidgetSurface = memo(function HomeFloatingWidgetSurfaceView({
  radius,
  testIDPrefix,
}: {
  radius: number;
  testIDPrefix: string;
}) {
  return (
    <>
      <LinearGradient
        {...HOME_FLOATING_WIDGET_REFLECTION}
        testID={`${testIDPrefix}-reflection`}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[floatingStyles.reflection, { borderRadius: radius }]}
      />
      <LinearGradient
        {...HOME_FLOATING_WIDGET_GLINT}
        testID={`${testIDPrefix}-glint`}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[floatingStyles.glint, { left: radius, right: radius }]}
      />
    </>
  );
});

const floatingStyles = StyleSheet.create({
  reflection: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  glint: { position: 'absolute', top: 0, height: 1 },
});

export const HomeWidgetSheen = memo(function HomeWidgetSheenView({
  radius,
}: {
  radius: number;
}) {
  return (
    <LinearGradient
      testID="home-widget-sheen"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      colors={['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.03)']}
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />
  );
});
