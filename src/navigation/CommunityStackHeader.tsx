import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import AppText from '../app/ui/AppText';

export default function CommunityStackHeader({
  back,
  options,
  route,
}: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const headerTitle =
    typeof options.headerTitle === 'string'
      ? options.headerTitle
      : typeof options.title === 'string'
      ? options.title
      : route.name;
  const headerLeft = options.headerLeft?.({
    canGoBack: !!back,
    tintColor: theme.colors.textPrimary,
  });
  const headerRight = options.headerRight?.({
    canGoBack: !!back,
    tintColor: theme.colors.textPrimary,
  });

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: Math.max(insets.top + 8, 20),
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <View style={styles.headerSide}>{headerLeft}</View>
      <AppText
        preset="headline"
        numberOfLines={1}
        style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
      >
        {headerTitle}
      </AppText>
      <View style={[styles.headerSide, styles.headerRight]}>{headerRight}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerSide: {
    width: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
});
