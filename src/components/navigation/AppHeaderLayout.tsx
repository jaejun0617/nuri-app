import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import AppText from '../../app/ui/AppText';
import { APP_HEADER } from './headerAppearance';

type Props = ViewProps & {
  subtitle: string;
  horizontalInset?: number;
  topInset?: number;
  background?: React.ReactNode;
};

/** Owns header spacing only; existing actions, inset ownership and routing stay outside. */
export function AppHeaderLayout({
  children, style, subtitle, horizontalInset = 12, topInset, background, ...props
}: Props) {
  return (
    <View {...props} style={[style, styles.root, { paddingHorizontal: horizontalInset }, topInset !== undefined && { paddingTop: topInset + APP_HEADER.topGap }]}>
      {background}
      <View style={styles.row}>{children}</View>
      <HeaderSubtitle>{subtitle}</HeaderSubtitle>
    </View>
  );
}

export function HeaderSubtitle({ children }: { children: string }) {
  return <AppText testID="app-header-subtitle" preset="unifiedBody" styleOverridesPreset
    style={styles.subtitle}>{children}</AppText>;
}

const styles = StyleSheet.create({
  root: { flexDirection: 'column', alignItems: 'stretch', gap: 0, height: 'auto', paddingBottom: 7 },
  row: { minHeight: APP_HEADER.targetSize, flexDirection: 'row', alignItems: 'center' },
  subtitle: { ...APP_HEADER.subtitle, textAlign: 'center', marginTop: 2, flexShrink: 1 },
});
