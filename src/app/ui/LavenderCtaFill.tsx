import React, { memo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LAVENDER_CTA } from '../theme/tokens/productAccent';

/** Color-only layer: the existing control retains its layout, interaction and label. */
function LavenderCtaFill({ radius = 8, pressed = false }: { radius?: ViewStyle['borderRadius']; pressed?: boolean }) {
  return <LinearGradient pointerEvents="none" accessible={false}
    colors={[...(pressed ? LAVENDER_CTA.pressedGradient : LAVENDER_CTA.gradient)]}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />;
}
export default memo(LavenderCtaFill);
