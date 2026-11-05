import { APP_HEADER } from '../components/navigation/headerAppearance';
import { AppHeaderLayout } from '../components/navigation/AppHeaderLayout';
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
}: Pick<NativeStackHeaderProps, 'back' | 'options' | 'route'>) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const headerTopInset = Math.max(insets.top, 12);
  const headerColor = options.headerTintColor ?? theme.colors.textPrimary;
  const headerBackground = options.headerBackground?.();
  const headerTitle =
    typeof options.headerTitle === 'string'
      ? options.headerTitle
      : typeof options.title === 'string'
      ? options.title
      : route.name;
  const headerLeft = options.headerLeft?.({
    canGoBack: !!back,
    tintColor: headerColor,
  });
  const headerRight = options.headerRight?.({
    canGoBack: !!back,
    tintColor: headerColor,
  });

  return (
    <AppHeaderLayout
      background={headerBackground ? <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={StyleSheet.absoluteFill}>{headerBackground}</View> : null}
      subtitle={route.name === 'CommunityCreate' ? '나누고 싶은 이야기를 남겨요' : route.name === 'CommunityEdit' ? '나눴던 이야기를 다시 정리해요' : route.name === 'CommunityBlockedUsers' ? '내가 차단한 사용자를 확인해요' : route.name === 'CommunityComments' ? '이야기에 이어진 댓글을 살펴봐요' : '함께 돌보는 일상의 이야기를 나눠요'}
      style={[
        styles.header,
        {
          // The tab root no longer owns the top inset. Keep the custom native
          // stack header below the status bar on both root and nested screens.
          paddingTop: headerTopInset,
          backgroundColor:
            StyleSheet.flatten(options.headerStyle)?.backgroundColor ??
            '#FFFFFF',
        },
      ]}
    >
      <View style={styles.headerSide}>{headerLeft}</View>
      <AppText styleOverridesPreset
        preset="titleSm"
        maxFontSizeMultiplier={1.6}
        numberOfLines={1}
        style={[
          styles.headerTitle,
          { color: headerColor },
          options.headerTitleStyle,
          APP_HEADER.title,
        ]}
      >
        {headerTitle}
      </AppText>
      <View style={[styles.headerSide, styles.headerRight]}>{headerRight}</View>
    </AppHeaderLayout>
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
    textAlign: 'center', ...APP_HEADER.title },
});
