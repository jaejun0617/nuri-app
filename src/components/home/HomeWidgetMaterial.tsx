import React, { memo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

/** An inner glass plate stays distinct without hiding the outer seasonal wash. */
export const HOME_WIDGET_MATERIAL: ViewStyle = {
  backgroundColor: 'rgba(255, 253, 250, 0.60)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.76)',
  borderTopColor: 'rgba(255, 255, 255, 0.98)',
  borderBottomColor: 'rgba(159, 144, 164, 0.18)',
  shadowOpacity: 0,
  elevation: 0,
};

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
