import React, { memo, type PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { HOME_FLOATING_WIDGET_MATERIAL, HomeFloatingWidgetSurface } from './HomeWidgetMaterial';

type Props = PropsWithChildren<Omit<ViewProps, 'style'> & {
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}>;

/** Paint widget glass behind content without adding a layout border or native blur. */
export const HomeReflectiveGlass = memo(function HomeReflectiveGlassView({
  children,
  style,
  borderRadius = 22,
  ...viewProps
}: Props) {
  const frame = StyleSheet.flatten(style);
  const corners = {
    borderRadius,
    borderTopLeftRadius: frame?.borderTopLeftRadius ?? borderRadius,
    borderTopRightRadius: frame?.borderTopRightRadius ?? borderRadius,
    borderBottomLeftRadius: frame?.borderBottomLeftRadius ?? borderRadius,
    borderBottomRightRadius: frame?.borderBottomRightRadius ?? borderRadius,
  };
  return (
    <View {...viewProps} pointerEvents="box-none" accessible={false}
      style={[styles.root, style, styles.frame, corners]}>
      <View testID="home-reflective-fill" pointerEvents="none" accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFill, HOME_FLOATING_WIDGET_MATERIAL, corners]} />
      <HomeFloatingWidgetSurface radius={borderRadius} testIDPrefix="home-reflective-glass" />
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { width: '100%', marginTop: 12, position: 'relative' },
  frame: { backgroundColor: 'transparent', borderWidth: 0, overflow: 'hidden', elevation: 0, shadowOpacity: 0 },
});
