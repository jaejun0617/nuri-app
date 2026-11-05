import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PRODUCT_CANVAS_COLOR } from '../../app/theme/tokens/colors';
import { HomeReflectiveGlass } from '../home/HomeReflectiveGlass';

export const MENU_GLASS_FRAME = {
  backgroundColor: 'transparent',
  borderColor: 'rgba(255,255,255,0.78)',
  shadowOpacity: 0,
  elevation: 0,
} as const;

/** Paint only: preserve the host's dimensions, inset ownership and interactions. */
export const MenuGlassSurface = memo(function MenuGlassSurfaceView({
  radius = 20,
  backed = false,
  testID = 'menu-glass-surface',
}: {
  radius?: number;
  backed?: boolean;
  testID?: string;
}) {
  return (
    <View testID={testID} pointerEvents="none" accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { borderRadius: radius }, backed && styles.backing]}>
      <HomeReflectiveGlass borderRadius={radius} style={styles.paint} />
    </View>
  );
});

const styles = StyleSheet.create({
  backing: { backgroundColor: PRODUCT_CANVAS_COLOR },
  paint: { ...StyleSheet.absoluteFill, width: 'auto', marginTop: 0 },
});
