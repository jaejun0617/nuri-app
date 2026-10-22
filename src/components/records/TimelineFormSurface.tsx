import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { LavenderScreenBackground } from '../common/LavenderScreenBackground';
import { HomeReflectiveGlass } from '../home/HomeReflectiveGlass';
import { TIMELINE_DESIGN } from '../../theme/timelineDesign';

export type RecordSurfaceVariant = 'plain' | 'homeGlass';

/** Paint and layout only: no extra blur surface or nested inset ownership. */
export function SeasonalFormBackground({ uniform: _uniform }: {uniform?:boolean}) {
  return <LavenderScreenBackground testID="timeline-form-background" />;
}
export function SeasonalFormPanel({children,...props}:PropsWithChildren<ViewProps>) {
  return <View {...props}>{children}</View>;
}

/** Create-only paint behind a tile/input; never owns layout, focus, or touch. */
export function RecordFieldGlass({
  selected = false,
  borderRadius = 10,
}: {
  selected?: boolean;
  borderRadius?: number;
}) {
  return (
    <HomeReflectiveGlass
      testID="record-field-glass"
      borderRadius={borderRadius}
      style={glassStyles.paint}
    >
      {selected ? (
        <View
          testID="record-field-glass-selection"
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFill, glassStyles.selected, { borderRadius }]}
        />
      ) : null}
    </HomeReflectiveGlass>
  );
}

const glassStyles = StyleSheet.create({
  paint: { ...StyleSheet.absoluteFill, marginTop: 0, width: 'auto' },
  selected: {
    backgroundColor: 'rgba(125,77,250,0.08)',
    borderWidth: 1,
    borderColor: TIMELINE_DESIGN.primary,
  },
});
