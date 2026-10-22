import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { LAVENDER_CANVAS } from '../../theme/lavenderCanvas';

/** A paint-only layer: no layout, touch handling, blur, or animation. */
export const LavenderScreenBackground = memo(function LavenderScreenBackgroundView({
  testID = 'lavender-screen-background',
  statusBarInset,
}: {
  testID?: string;
  statusBarInset?: number;
}) {
  const insets = useSafeAreaInsets();
  const top = statusBarInset ?? insets.top;
  return (
    <>
      <LinearGradient
        testID={testID}
        colors={LAVENDER_CANVAS.colors}
        locations={LAVENDER_CANVAS.locations}
        start={LAVENDER_CANVAS.start}
        end={LAVENDER_CANVAS.end}
        style={[StyleSheet.absoluteFill, { top }]}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
      {top > 0 ? (
        <View
          testID={`${testID}-status-bar`}
          style={[styles.statusBar, { height: top }]}
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: LAVENDER_CANVAS.statusBar,
  },
});
